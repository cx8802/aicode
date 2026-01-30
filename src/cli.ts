#!/usr/bin/env node
/**
 * AICode CLI 可执行入口文件
 */
import { createCli } from './cli/cli.js'
import { Logger } from './utils/logger.js'
import { existsSync } from 'fs'
import { getConfigPath } from './core/config/loader.js'

const logger = new Logger()

async function main(): Promise<void> {
  try {
    const cli = createCli()

    // 如果没有提供子命令（只是 `aicode`），检查配置文件
    // 如果配置存在，自动进入 chat 模式
    const args = process.argv.slice(2)
    const hasSubCommand = args.some(arg => !arg.startsWith('-'))
    const configExists = existsSync(getConfigPath())

    if (!hasSubCommand && configExists) {
      // 修改 process.argv 来添加 chat 命令
      const newArgv = [process.argv[0], process.argv[1], 'chat', ...args]
      process.argv = newArgv
    }

    await cli.parseAsync(process.argv)
  } catch (error) {
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
