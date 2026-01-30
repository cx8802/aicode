/**
 * 原始模式输入处理器
 * 实现按键级的即时响应，类似 Claude Code CLI
 */

import { stdin, stdout } from 'process'
import { createInterface } from 'readline'

/**
 * 输入状态
 */
interface InputState {
  /** 当前输入的文本 */
  buffer: string
  /** 光标位置 */
  cursor: number
  /** 是否显示命令菜单 */
  showMenu: boolean
  /** 菜单选择的索引 */
  selectedIndex: number
}

/**
 * 命令补全选项
 */
export interface CommandOption {
  /** 命令名称 */
  name: string
  /** 命令描述 */
  description: string
}

/**
 * 输入事件
 */
export interface InputEvent {
  /** 事件类型 */
  type: 'char' | 'special' | 'submit' | 'cancel'
  /** 输入的字符或按键 */
  value: string
  /** 完整的输入缓冲区 */
  buffer: string
}

/**
 * 原始输入处理器
 */
export class RawInputHandler {
  private state: InputState = {
    buffer: '',
    cursor: 0,
    showMenu: false,
    selectedIndex: 0
  }

  private commands: CommandOption[] = []
  private filteredCommands: CommandOption[] = []
  private prompt = '> '
  private renderedLines = 0
  private resolveInput: ((value: string | null) => void) | null = null
  private active = false

  /**
   * 设置可用命令
   */
  setCommands(commands: CommandOption[]): void {
    this.commands = commands
  }

  /**
   * 开始读取输入
   */
  async readLine(prompt: string = '> '): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolveInput = resolve
      this.active = true
      this.prompt = prompt
      this.renderedLines = 0
      this.state = {
        buffer: '',
        cursor: 0,
        showMenu: false,
        selectedIndex: 0
      }
      this.filteredCommands = []

      // 检查 stdin 是否支持 raw mode
      if (!stdin.isTTY) {
        // 不支持 raw mode，使用 readline
        this.useReadline(prompt)
        return
      }

      // 显示提示符
      stdout.write(this.prompt)
      this.renderedLines = 1

      // 启用原始模式
      try {
        stdin.setRawMode(true)
      } catch (e) {
        // 不支持 raw mode，使用 readline
        this.useReadline(prompt)
        return
      }

      stdin.resume()
      stdin.setEncoding('utf-8')

      stdin.on('data', this.handleData)
    })
  }

  /**
   * 使用 readline 作为后备方案（支持菜单）
   */
  private useReadline(prompt: string): void {
    const rl = createInterface({
      input: stdin,
      output: stdout
    })

    // 第一轮：读取输入
    rl.question(prompt, async (answer: string) => {
      // 设置状态用于过滤
      this.state.buffer = answer
      this.state.cursor = answer.length

      // 检查是否输入了 `/`
      if (answer.trim() === '/' || answer.trim().startsWith('/')) {
        // 显示菜单
        const query = this.getCommandQuery()
        if (query !== null) {
          this.filterCommands(query)
        }

        if (this.filteredCommands.length > 0) {
          // 显示菜单
          this.renderMenuList()

          // 第二轮：等待选择
          rl.question('Enter selection (number/name, or empty to cancel): ', (selection: string) => {
            rl.close()

            const selected = this.handleSelection(selection)
            if (this.resolveInput) {
              this.resolveInput(selected ? `/${selected}` : answer)
              this.resolveInput = null
            }
            this.active = false
          })
        } else {
          // 没有匹配的命令
          rl.close()
          if (this.resolveInput) {
            this.resolveInput(answer)
            this.resolveInput = null
          }
          this.active = false
        }
      } else {
        // 普通，不是 `/` 开头的命令
        rl.close()
        if (this.resolveInput) {
          this.resolveInput(answer || null)
          this.resolveInput = null
        }
        this.active = false
      }
    })
  }

  /**
   * 处理选择输入
   */
  private handleSelection(input: string): string | null {
    const trimmed = input.trim()

    if (!trimmed || trimmed === 'q' || trimmed === 'Q') {
      return null
    }

    // 数字选择
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && num >= 1 && num <= this.filteredCommands.length) {
      return this.filteredCommands[num - 1].name
    }

    // 命令名选择
    const selected = this.filteredCommands.find(cmd =>
      cmd.name.toLowerCase() === trimmed.toLowerCase()
    )

    return selected ? selected.name : null
  }

  /**
   * 渲染菜单列表
   */
  private renderMenuList(): void {
    console.log('')
    this.filteredCommands.forEach((cmd, index) => {
      console.log(`  ${index + 1}. /${cmd.name.padEnd(15)}  ${cmd.description}`)
    })
    console.log('')
  }

  /**
   * 停止读取
   */
  stop(): void {
    this.active = false

    stdin.removeListener('data', this.handleData)
    stdin.setRawMode(false)
    stdin.pause()

    if (this.resolveInput) {
      this.resolveInput(null)
      this.resolveInput = null
    }
  }

  /**
   * 处理输入数据
   */
  private handleData = (data: Buffer | string): void => {
    if (!this.active) return

    const str = String(data)

    // 处理特殊按键
    if (str === '\r' || str === '\n') {
      // 回车 - 提交
      this.handleSubmit()
      return
    }

    if (str === '\x03') {
      // Ctrl+C - 取消
      this.handleCancel()
      return
    }

    if (str === '\x04') {
      // Ctrl+D - 退出
      this.handleCancel()
      return
    }

    if (str === '\x7f' || str === '\x08') {
      // 退格
      this.handleBackspace()
      return
    }

    if (str === '\x1b[A') {
      // 上箭头
      this.handleArrowUp()
      return
    }

    if (str === '\x1b[B') {
      // 下箭头
      this.handleArrowDown()
      return
    }

    if (str === '\x1b[C') {
      // 右箭头
      this.handleArrowRight()
      return
    }

    if (str === '\x1b[D') {
      // 左箭头
      this.handleArrowLeft()
      return
    }

    // 普通字符
    if (str.length === 1 && str.charCodeAt(0) >= 32) {
      this.handleChar(str)
    }
  }

  /**
   * 处理字符输入
   */
  private handleChar(char: string): void {
    // 在光标位置插入字符
    this.state.buffer =
      this.state.buffer.slice(0, this.state.cursor) +
      char +
      this.state.buffer.slice(this.state.cursor)
    this.state.cursor++

    this.updateMenuState()

    this.render()
  }

  /**
   * 处理退格
   */
  private handleBackspace(): void {
    if (this.state.cursor > 0) {
      this.state.buffer =
        this.state.buffer.slice(0, this.state.cursor - 1) +
        this.state.buffer.slice(this.state.cursor)
      this.state.cursor--

      this.updateMenuState()

      this.render()
    }
  }

  /**
   * 处理上箭头
   */
  private handleArrowUp(): void {
    if (this.state.showMenu && this.filteredCommands.length > 0) {
      this.state.selectedIndex =
        (this.state.selectedIndex - 1 + this.filteredCommands.length) %
        this.filteredCommands.length
      this.render()
    }
  }

  /**
   * 处理下箭头
   */
  private handleArrowDown(): void {
    if (this.state.showMenu && this.filteredCommands.length > 0) {
      this.state.selectedIndex =
        (this.state.selectedIndex + 1) % this.filteredCommands.length
      this.render()
    }
  }

  /**
   * 处理右箭头
   */
  private handleArrowRight(): void {
    if (this.state.cursor < this.state.buffer.length) {
      this.state.cursor++
      this.updateMenuState()
      this.render()
    }
  }

  /**
   * 处理左箭头
   */
  private handleArrowLeft(): void {
    if (this.state.cursor > 0) {
      this.state.cursor--
      this.updateMenuState()
      this.render()
    }
  }

  /**
   * 过滤命令
   */
  private filterCommands(query: string): void {
    const input = query.toLowerCase()

    this.filteredCommands = this.commands.filter(cmd =>
      cmd.name.toLowerCase().startsWith(input)
    )

    if (this.filteredCommands.length > 0) {
      this.state.selectedIndex = 0
    }
  }

  /**
   * 渲染界面
   */
  private render(): void {
    this.clearRender()

    // 显示提示符和输入
    stdout.write(`${this.prompt}${this.state.buffer}`)

    const showMenu = this.state.showMenu && this.filteredCommands.length > 0

    // 显示命令菜单
    if (showMenu) {
      this.renderMenu()
    }

    const menuLines = showMenu ? this.filteredCommands.length + 2 : 0
    this.renderedLines = 1 + menuLines

    const cursorOffset = this.state.buffer.length - this.state.cursor
    if (showMenu) {
      stdout.write(`\x1b[${menuLines}A\r`)
      const targetOffset = this.prompt.length + this.state.cursor
      if (targetOffset > 0) {
        stdout.write(`\x1b[${targetOffset}C`)
      }
      return
    }

    if (cursorOffset > 0) {
      stdout.write(`\x1b[${cursorOffset}D`)
    }
  }

  /**
   * 渲染菜单
   */
  private renderMenu(): void {
    const columns = stdout.columns || 80
    const line = '-'.repeat(Math.min(columns, 100))

    stdout.write('\r\n')
    stdout.write(`${line}\r\n`)

    // 显示命令列表
    this.filteredCommands.forEach((cmd, index) => {
      const isSelected = index === this.state.selectedIndex
      const prefix = isSelected ? '\x1b[36m> ' : '  '
      const suffix = isSelected ? '\x1b[0m' : ''
      const name = `/${cmd.name}`.padEnd(26)

      if (isSelected) {
        stdout.write(`${prefix}${name}${suffix} ${cmd.description}\r\n`)
      } else {
        stdout.write(`  ${name} ${cmd.description}\r\n`)
      }
    })
  }

  /**
   * 处理提交
   */
  private handleSubmit(): void {
    const input = this.state.buffer

    // 如果菜单显示且有选中项，使用选中的命令
    if (this.state.showMenu && this.filteredCommands.length > 0) {
      const selected = this.filteredCommands[this.state.selectedIndex]
      this.finalizeInput(`/${selected.name}`)
      if (this.resolveInput) {
        this.resolveInput(`/${selected.name}`)
      }
      return
    }

    // 否则使用输入的文本
    this.finalizeInput(input || null)
    if (this.resolveInput) {
      this.resolveInput(input || null)
    }
  }

  /**
   * 处理取消
   */
  private handleCancel(): void {
    this.finalizeInput(null, true)
    if (this.resolveInput) {
      this.resolveInput(null)
    }
  }

  /**
   * 判断是否需要显示命令菜单
   */
  private updateMenuState(): void {
    const query = this.getCommandQuery()
    if (query === null) {
      this.state.showMenu = false
      this.filteredCommands = []
      this.state.selectedIndex = 0
      return
    }

    this.state.showMenu = true
    this.filterCommands(query)
  }

  /**
   * 获取命令查询字符串
   */
  private getCommandQuery(): string | null {
    const buffer = this.state.buffer
    const firstNonSpace = buffer.search(/\S/)
    if (firstNonSpace === -1) {
      return null
    }

    if (buffer[firstNonSpace] !== '/') {
      return null
    }

    const slashIndex = buffer.indexOf('/', firstNonSpace)
    if (this.state.cursor <= slashIndex) {
      return ''
    }

    const afterSlash = buffer.slice(slashIndex + 1, this.state.cursor)
    if (/\s/.test(afterSlash)) {
      return null
    }

    return afterSlash
  }

  /**
   * 清理渲染内容
   */
  private clearRender(): void {
    if (this.renderedLines === 0) return

    stdout.write('\r')
    for (let i = 0; i < this.renderedLines; i++) {
      stdout.write('\x1b[2K')
      if (i < this.renderedLines - 1) {
        stdout.write('\x1b[1B')
      }
    }
    if (this.renderedLines > 1) {
      stdout.write(`\x1b[${this.renderedLines - 1}A`)
    }
    stdout.write('\r')
  }

  /**
   * 完成输入并保留最终显示
   */
  private finalizeInput(value: string | null, cancel: boolean = false): void {
    this.clearRender()

    if (!cancel) {
      const outputValue = value ?? ''
      stdout.write(`${this.prompt}${outputValue}`)
    }

    this.cleanup()
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.active = false
    stdin.removeListener('data', this.handleData)
    stdin.setRawMode(false)
    stdin.pause()

    // 输出换行
    stdout.write('\r\n')
  }
}


