/**
 * Chat 命令
 * 启动交互式 REPL 环境
 */

import { Command } from 'commander'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
import { loadConfig } from '../../core/config/loader.js'
import { Logger } from '../../utils/logger.js'
import { createAIProvider } from '../../core/ai/index.js'
import { SessionManager } from '../../core/session/index.js'
import { createREPL, type REPLContext } from '../repl.js'
import { getAllTools } from '../../core/tools/index.js'

/**
 * 创建 chat 命令
 */
export function chatCommand(): Command {
  const cmd = new Command('chat')

  cmd.description('Start interactive chat REPL')
    .option('-m, --model <model>', 'AI model to use')
    .option('-p, --provider <provider>', 'AI provider (anthropic|openai)')
    .action(async (options) => {
      const logger = new Logger()

      try {
        // 加载配置
        const config = await loadConfig(logger)

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
        const aiProvider = createAIProvider(config.ai, logger)

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

        // 创建 REPL
        const repl = createREPL(context)

        // 显示欢迎信息
        displayWelcome(logger, config)

        // 创建 readline 接口
        const rl = createInterface({
          input,
          output
        })

        // REPL 主循环
        let running = true

        while (running) {
          try {
            const prompt = repl.getPrompt()
            const line = await rl.question(prompt)

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
            if ((error as Error).message === 'EOF') {
              // Ctrl+D
              running = false
            } else {
              logger.error(`Error: ${error}`)
            }
          }
        }

        // 关闭 readline
        rl.close()
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
