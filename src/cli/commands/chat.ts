/**
 * Chat 命令
 * 启动交互式 REPL 环境
 */

import { Command } from 'commander'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output, stdin } from 'process'
import { loadConfig } from '../../core/config/loader.js'
import { Logger } from '../../utils/logger.js'
import { createAIProviderFromConfig } from '../../core/ai/index.js'
import { SessionManager } from '../../core/session/index.js'
import { createREPL, type REPLContext } from '../repl.js'
import { getAllTools } from '../../core/tools/index.js'
import { CommandMenu } from '../command-menu.js'
import { debug } from '../../utils/debug-logger.js'
import { RawInputHandler } from '../raw-input.js'

/**
 * 输出格式类型
 */
type OutputFormat = 'text' | 'json'

/**
 * Chat 命令选项
 */
interface ChatOptions {
  model?: string
  provider?: string
  print?: boolean
  outputFormat?: OutputFormat
  prompt?: string
}

/**
 * 读取 stdin 内容（用于管道输入）
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''

    // 检查 stdin 是否是 TTY（即是否有管道输入）
    if (process.stdin.isTTY) {
      resolve('')
      return
    }

    stdin.setEncoding('utf-8')

    stdin.on('data', (chunk) => {
      data += chunk
    })

    stdin.on('end', () => {
      resolve(data)
    })

    stdin.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * 打印模式：执行单次查询后退出
 */
async function runPrintMode(
  query: string,
  context: REPLContext,
  logger: Logger,
  outputFormat: OutputFormat
): Promise<void> {
  const repl = createREPL(context)

  try {
    // 执行查询
    await repl.processInput(query, (text: string) => {
      if (outputFormat === 'json') {
        // JSON 输出模式
        console.log(JSON.stringify({ content: text }, null, 2))
      } else {
        // 文本输出模式
        console.log(text)
      }
    })
  } catch (error) {
    logger.error(`Error: ${error}`)
    process.exit(1)
  }
}

/**
 * 创建 chat 命令
 */
export function chatCommand(): Command {
  const cmd = new Command('chat')

  cmd.description('Start interactive chat REPL')
    .argument('[query]', 'Optional query to execute (use with -p for print mode)')
    .option('-m, --model <model>', 'AI model to use')
    .option('-p, --print', 'Print mode: execute query and exit (no interactive mode)')
    .option('-P, --provider <provider>', 'AI provider (anthropic|openai)')
    .option('-o, --output-format <format>', 'Output format for print mode (text|json)', 'text')
    .action(async (query: string = '', options: ChatOptions, command: Command) => {
      const logger = new Logger()

      try {
        // 获取全局选项（包括 -c config 路径）
        const globalOptions = command.parent?.opts() || {}
        const configPath = globalOptions.config

        // 加载配置（使用指定路径或默认路径）
        const config = await loadConfig(logger, configPath)

        // 应用命令行选项覆盖
        if (options.provider) {
          config.ai.provider = options.provider
        }
        if (options.model) {
          if (config.ai.provider === 'anthropic' && config.ai.anthropic) {
            config.ai.anthropic.model = options.model
          } else if (config.ai.provider === 'openai' && config.ai.openai) {
            config.ai.openai.model = options.model
          }
        }

        // 创建 AI 提供商
        const aiProvider = createAIProviderFromConfig(config.ai, logger)

        // 创建会话管理器
        const session = new SessionManager({
          maxTokens: 100000
        })

        // 获取所有工具
        const tools = new Map(Object.entries(getAllTools()))

        // 创建 REPL 上下文
        const context: REPLContext = {
          config,
          aiProvider,
          session,
          tools
        }

        // 打印模式：执行单次查询后退出
        if (options.print) {
          // 读取 stdin 内容（管道输入）
          const stdinContent = await readStdin()

          // 组合查询：stdin 内容 + 命令行参数
          let fullQuery = query
          if (stdinContent) {
            fullQuery = stdinContent + (query ? '\n\n' + query : '')
          }

          if (!fullQuery) {
            logger.error('Error: No query provided. Use: aicode chat -p "your query" or pipe input')
            process.exit(1)
          }

          await runPrintMode(fullQuery, context, logger, options.outputFormat || 'text')
          return
        }

        // 交互模式
        const repl = createREPL(context)

        // 显示欢迎信息
        displayWelcome(logger, config)

        // 创建原始输入处理器
        const inputHandler = new RawInputHandler()

        // 设置可用命令
        inputHandler.setCommands([
          { name: 'help', description: 'Show help information' },
          { name: 'clear', description: 'Clear conversation history' },
          { name: 'exit', description: 'Exit the program' },
          { name: 'quit', description: 'Exit the program (same as exit)' },
          { name: 'config', description: 'Show current configuration' },
          { name: 'tools', description: 'List available tools' },
          { name: 'history', description: 'Show conversation history' }
        ])

        // REPL 主循环
        let running = true

        // 清除旧日志
        await debug.clear()
        await debug.log('=== AICode Session Started ===')

        while (running) {
          try {
            const prompt = repl.getPrompt()
            const line = await inputHandler.readLine(prompt)

            await debug.log('Received input', { input: line })

            // 如果用户取消（Ctrl+C 或 Ctrl+D）
            if (line === null) {
              running = false
              continue
            }

            // 处理输入
            await repl.processInput(line, (text: string) => {
              console.log(text)
            })

            // 检查是否应该退出
            // 如果输入是 /exit 或 /quit，processInput 会处理
            // 但我们需要检查会话是否被清除（退出信号）
            if (line.trim().toLowerCase() === '/exit' ||
                line.trim().toLowerCase() === '/quit') {
              running = false
            }
          } catch (error) {
            await debug.log('Error in REPL loop', error)
            if ((error as Error).message === 'EOF') {
              // Ctrl+D
              running = false
            } else {
              logger.error(`Error: ${error}`)
            }
          }
        }

        await debug.log('=== Session Ended ===')
        const logPath = await debug.getLogPath()
        console.log(`\n[Debug] Log saved to: ${logPath}`)

        // 停止输入处理器
        inputHandler.stop()
        logger.info('REPL exited')

      } catch (error) {
        logger.error(`Failed to start chat: ${error}`)
        process.exit(1)
      }
    })

  return cmd
}

/**
 * 显示欢迎信息
 */
function displayWelcome(logger: Logger, config: any): void {
  const provider = config.ai.provider
  const model = config.ai[provider]?.model || 'unknown'

  logger.info('')
  logger.info('╔═══════════════════════════════════════╗')
  logger.info('║   AICode Interactive Chat            ║')
  logger.info('╚═══════════════════════════════════════╝')
  logger.info('')
  logger.info(`Provider: ${provider}`)
  logger.info(`Model: ${model}`)
  logger.info('')
  logger.info('Type /help for available commands')
  logger.info('Type /exit or /quit to leave')
  logger.info('')
}
