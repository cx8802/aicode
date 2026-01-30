import { Command } from 'commander'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { Logger } from '../utils/logger.js'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json')
const packageVersion = pkg.version

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
      // 显示欢迎消息
      displayWelcome(logger)

      // 如果启用了调试模式
      if (options.debug) {
        logger.debug('Debug mode enabled')
      }

      // 如果启用了详细模式
      if (options.verbose) {
        logger.info('Verbose mode enabled')
      }

      // 显示配置信息
      if (options.config) {
        // 验证配置文件是否存在
        if (!existsSync(options.config)) {
          logger.error(`Config file not found: ${options.config}`)
          process.exit(1)
        }
        logger.info(`Using config: ${options.config}`)
      }
    })

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
