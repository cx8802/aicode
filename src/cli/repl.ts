/**
 * REPL (Read-Eval-Print Loop) 交互环境
 * 提供交互式 AI 聊天界面
 */

import type { AIProvider, Message } from '../core/ai/base'
import type { SessionManager } from '../core/session/manager'
import type { Config } from '../types/config'
import type { Tool } from '../core/tools/base'

/**
 * REPL 上下文
 */
export interface REPLContext {
  config: Config
  aiProvider: AIProvider
  session: SessionManager
  tools: Map<string, Tool>
}

/**
 * 输入处理函数类型
 */
export interface REPLInputHandler {
  (): Promise<string>
}

/**
 * 输出处理函数类型
 */
export type REPOLOutputHandler = (text: string) => void

/**
 * REPL 命令处理器类型
 */
type CommandHandler = (
  output: REPOLOutputHandler
) => Promise<boolean | void>

/**
 * REPL 类
 */
export class REPL {
  private readonly context: REPLContext
  private readonly commands: Map<string, CommandHandler>

  constructor(context: REPLContext) {
    this.context = context
    this.commands = new Map()

    // 注册内置命令
    this.registerBuiltinCommands()
  }

  /**
   * 获取 REPL 上下文
   */
  getContext(): REPLContext {
    return this.context
  }

  /**
   * 注册内置命令
   */
  private registerBuiltinCommands(): void {
    this.commands.set('help', this.cmdHelp.bind(this))
    this.commands.set('clear', this.cmdClear.bind(this))
    this.commands.set('exit', this.cmdExit.bind(this))
    this.commands.set('quit', this.cmdExit.bind(this))
    this.commands.set('config', this.cmdConfig.bind(this))
    this.commands.set('tools', this.cmdTools.bind(this))
    this.commands.set('history', this.cmdHistory.bind(this))
  }

  /**
   * 处理命令
   * @returns 是否应该退出 REPL
   */
  async handleCommand(
    input: string,
    output: REPOLOutputHandler
  ): Promise<boolean> {
    const trimmed = input.trim()
    const parts = trimmed.split(/\s+/)
    const commandName = parts[0]?.toLowerCase().replace(/^\//, '')

    const handler = this.commands.get(commandName)

    if (!handler) {
      output(`Unknown command: ${parts[0]}`)
      output('Type /help for available commands')
      return false
    }

    const result = await handler.call(this, output)
    return result === true
  }

  /**
   * 处理用户输入
   */
  async processInput(input: string, output: REPOLOutputHandler): Promise<void> {
    const trimmed = input.trim()

    // 空输入
    if (!trimmed) {
      return
    }

    // 检查是否是命令
    if (trimmed.startsWith('/')) {
      const shouldExit = await this.handleCommand(trimmed, output)
      if (shouldExit) {
        return
      }
      return
    }

    // 普通用户消息
    await this.processUserMessage(trimmed, output)
  }

  /**
   * 处理用户消息
   */
  private async processUserMessage(
    content: string,
    output: REPOLOutputHandler
  ): Promise<void> {
    const { session, aiProvider, config } = this.context

    // 添加用户消息
    session.addMessage('user', content)

    // 检查 token 限制
    await this.ensureTokenLimit()

    // 获取消息历史
    const messages = session.getMessagesForAI() as Message[]

    try {
      let response: string

      // 根据配置选择流式或非流式
      if (config.ui.streamOutput) {
        response = await this.streamResponse(messages, output)
      } else {
        const result = await aiProvider.chat(messages)
        response = result.content
        output(response)
      }

      // 添加助手响应到会话
      session.addMessage('assistant', response)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      output(`Error: ${errorMessage}`)
    }
  }

  /**
   * 流式输出响应
   */
  private async streamResponse(
    messages: Message[],
    output: REPOLOutputHandler
  ): Promise<string> {
    const { aiProvider } = this.context
    let fullResponse = ''

    for await (const chunk of aiProvider.chatStream(messages)) {
      process.stdout.write(chunk)
      fullResponse += chunk
    }

    // 输出换行
    process.stdout.write('\n')

    return fullResponse
  }

  /**
   * 确保 token 在限制内
   */
  private async ensureTokenLimit(): Promise<void> {
    const { session } = this.context
    const wasTrimmed = session.trimToTokenLimit()

    if (wasTrimmed) {
      console.log('Note: Conversation history was trimmed to fit token limit')
    }
  }

  /**
   * 检测是否是多行输入
   */
  isMultilineInput(line: string): boolean {
    return line.trim().endsWith('\\')
  }

  /**
   * 获取提示符
   */
  getPrompt(): string {
    const count = this.context.session.getMessageCount()
    return `[${count}] > `
  }

  /**
   * 命令: /help
   */
  private async cmdHelp(output: REPOLOutputHandler): Promise<void> {
    output('Available Commands:')
    output('  /help     - Show this help message')
    output('  /clear    - Clear conversation history')
    output('  /exit     - Exit the REPL')
    output('  /quit     - Exit the REPL (same as /exit)')
    output('  /config   - Show current configuration')
    output('  /tools    - List available tools')
    output('  /history  - Show conversation history')
  }

  /**
   * 命令: /clear
   */
  private async cmdClear(output: REPOLOutputHandler): Promise<void> {
    this.context.session.clear()
    output('Session cleared')
  }

  /**
   * 命令: /exit 或 /quit
   */
  private async cmdExit(output: REPOLOutputHandler): Promise<boolean> {
    output('Goodbye!')
    return true
  }

  /**
   * 命令: /config
   */
  private async cmdConfig(output: REPOLOutputHandler): Promise<void> {
    const { config } = this.context
    output('Current Configuration:')
    output(JSON.stringify(config, null, 2))
  }

  /**
   * 命令: /tools
   */
  private async cmdTools(output: REPOLOutputHandler): Promise<void> {
    const { tools } = this.context
    output(`Available Tools (${tools.size}):`)

    for (const [name, tool] of tools) {
      output(`  - ${name}: ${tool.description}`)
    }
  }

  /**
   * 命令: /history
   */
  private async cmdHistory(output: REPOLOutputHandler): Promise<void> {
    const messages = this.context.session.getMessages()

    if (messages.length === 0) {
      output('No conversation history')
      return
    }

    output(`Conversation History (${messages.length} messages):`)

    for (const msg of messages) {
      const role = msg.role.toUpperCase().padEnd(10)
      const time = msg.timestamp.toLocaleTimeString()
      output(`  [${time}] ${role}: ${msg.content.substring(0, 100)}`)
    }
  }
}

/**
 * 创建 REPL 实例
 */
export function createREPL(context: REPLContext): REPL {
  return new REPL(context)
}
