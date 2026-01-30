import { Command } from 'commander'
import { existsSync } from 'fs'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Logger } from '../utils/logger.js'
import { initializeConfig } from '../core/config/loader.js'
import { configCommand } from './commands/config.js'
import { chatCommand } from './commands/chat.js'

// 获取版本号
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)

    // 尝试从 package.json 读取版本
    const packagePath = join(__dirname, '../../package.json')
    const pkgContent = readFileSync(packagePath, 'utf-8')
    const pkg = JSON.parse(pkgContent)
    return pkg.version || '0.1.0'
  } catch {
    return '0.1.0'
  }
}

const packageVersion = getVersion()

/**
 * CLI 配置接口
 */
export interface CliOptions {
  config?: string
  debug?: boolean
  verbose?: boolean
}

/**
 * 创建 CLI 应用程序
 */
export function createCli(): Command {
  const logger = new Logger()
  const program = new Command()

  program
    .name('aicode')
    .description('AI-powered CLI code generation tool')
    .version(packageVersion)
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-d, --debug', 'Enable debug mode', false)
    .option('-v, --verbose', 'Enable verbose output', false)
    .action((options: CliOptions) => {
      // 初始化配置文件（如果不存在）
      initializeConfig(logger).catch(() => {
        // 静默失败
      })

      // 默认行为：显示帮助信息
      // 用户应该使用明确的子命令
      displayWelcome(logger)

      if (options.debug) {
        logger.debug('Debug mode enabled')
      }

      if (options.verbose) {
        logger.info('Verbose mode enabled')
      }

      if (options.config) {
        if (!existsSync(options.config)) {
          logger.error(`Config file not found: ${options.config}`)
          process.exit(1)
        }
        logger.info(`Using config: ${options.config}`)
      }

      // 提示用户使用 chat 命令
      logger.info('Run "aicode chat" to start interactive mode')
    })

  // 添加 config 子命令
  program.addCommand(configCommand())

  // 添加 chat 子命令
  program.addCommand(chatCommand())

  return program
}

/**
 * 显示欢迎消息
 */
function displayWelcome(logger: Logger): void {
  const welcomeMessage = `
╔═══════════════════════════════════════╗
║   Welcome to AICode CLI              ║
║   AI-Powered Code Generation         ║
╚═══════════════════════════════════════╝
  `.trim()

  logger.info(welcomeMessage)
  logger.info(`Version: ${packageVersion}`)
  logger.info('Run "aicode --help" for available commands')
}
