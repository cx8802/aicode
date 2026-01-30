#!/usr/bin/env node
/**
 * AICode CLI 可执行入口文件
 */
import { createCli } from './cli/cli.js'
import { Logger } from './utils/logger.js'

const logger = new Logger()

async function main(): Promise<void> {
  try {
    const cli = createCli()
    await cli.parseAsync(process.argv)
  } catch (error) {
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
