/**
 * 交互式命令菜单
 * 类似 Claude Code CLI 的 / 命令选择体验
 */

import { createInterface, type Interface as ReadlineInterface } from 'readline'
import { stdin, stdout } from 'process'

/**
 * 命令菜单项
 */
export interface MenuItem {
  /** 命令名称（不含 /） */
  name: string
  /** 命令描述 */
  description: string
  /** 命令别名 */
  alias?: string
}

/**
 * 命令菜单配置
 */
export interface CommandMenuConfig {
  /** 菜单项列表 */
  items: MenuItem[]
  /** 提示文本 */
  prompt?: string
  /** 是否显示序号 */
  showNumbers?: boolean
}

/**
 * 命令菜单类
 */
export class CommandMenu {
  private readonly config: CommandMenuConfig
  private rl: ReadlineInterface | null = null
  private selectedIndex = 0

  constructor(config: CommandMenuConfig) {
    this.config = {
      prompt: 'Select a command:',
      showNumbers: true,
      ...config
    }
  }

  /**
   * 显示菜单并获取用户选择
   * @returns 选中的命令名称，如果取消则返回 null
   */
  async show(): Promise<string | null> {
    // 在 REPL 中，直接显示菜单列表，返回 null 让调用者处理后续输入
    this.renderMenu()
    return null
  }

  /**
   * 处理用户输入的命令选择
   * @param input 用户输入
   * @returns 选中的命令名称，如果无效则返回 null
   */
  handleInput(input: string): string | null {
    const trimmed = input.trim()

    // 空输入或取消
    if (trimmed === '' || trimmed === 'q' || trimmed === 'Q') {
      return null
    }

    // 数字选择
    const num = parseInt(trimmed, 10)
    if (!isNaN(num) && num >= 1 && num <= this.config.items.length) {
      return this.config.items[num - 1].name
    }

    // 命令名选择
    const selected = this.config.items.find(item => item.name === trimmed)
    if (selected) {
      return selected.name
    }

    // 无效输入
    return null
  }

  /**
   * 移动选择
   */
  private moveSelection(delta: number): void {
    this.selectedIndex = (this.selectedIndex + delta + this.config.items.length) % this.config.items.length
    this.renderMenu()
  }

  /**
   * 渲染菜单
   */
  private renderMenu(): void {
    // 清屏并移动光标到顶部
    console.clear()

    // 显示标题
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    Available Commands                       ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log('')

    // 显示菜单项
    this.config.items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex
      const number = this.config.showNumbers ? `${index + 1}. ` : ''
      const prefix = isSelected ? '➤ ' : '  '
      const indicator = isSelected ? '◀' : ' '

      // 高亮选中项
      if (isSelected) {
        console.log(`\x1b[36m${prefix}${number}/${item.name.padEnd(15)}${indicator} ${item.description}\x1b[0m`)
      } else {
        console.log(`${prefix}${number}/${item.name.padEnd(15)}  ${item.description}`)
      }
    })

    console.log('')
    console.log('\x1b[90mUse ↑↓ or j/k to navigate, Enter to select, number to jump, q to quit\x1b[0m')
    console.log('')
  }

  /**
   * 获取默认菜单项
   */
  static getDefaultItems(): MenuItem[] {
    return [
      { name: 'help', description: '显示帮助信息' },
      { name: 'clear', description: '清空对话历史' },
      { name: 'exit', description: '退出程序', alias: 'quit' },
      { name: 'config', description: '显示当前配置' },
      { name: 'tools', description: '列出可用工具' },
      { name: 'history', description: '显示对话历史' }
    ]
  }
}

/**
 * 创建命令菜单
 */
export function createCommandMenu(items?: MenuItem[]): CommandMenu {
  const menuItems = items || CommandMenu.getDefaultItems()
  return new CommandMenu({ items: menuItems })
}

/**
 * 显示命令菜单并返回选中的命令
 */
export async function showCommandMenu(items?: MenuItem[]): Promise<string | null> {
  const menu = createCommandMenu(items)
  return await menu.show()
}
