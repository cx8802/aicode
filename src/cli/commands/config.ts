import { Command } from 'commander'
import { loadConfig, saveConfig, getConfigPath } from '../../core/config/loader'
import { ConfigLoaderError } from '../../core/config/loader'
import { Config } from '../../core/config/schema'
import { Logger } from '../../utils/logger'

/**
 * 配置命令
 */
export function configCommand(): Command {
  const cmd = new Command('config')
  const logger = new Logger()

  cmd.description('管理 AICode 配置')

  // config init - 初始化配置
  cmd
    .command('init')
    .description('初始化配置文件')
    .action(async () => {
      try {
        logger.info('Creating default configuration...')

        // 获取默认配置
        const config = await loadConfig(logger)

        // 保存配置
        await saveConfig(config, logger)

        logger.success(`Configuration created at ${getConfigPath()}`)
      } catch (error) {
        if (error instanceof ConfigLoaderError) {
          logger.error(`Failed to create configuration: ${error.message}`)
          if (error.cause) {
            logger.debug(`Cause: ${error.cause.message}`)
          }
        } else {
          logger.error('Unexpected error occurred')
        }
        process.exit(1)
      }
    })

  // config get - 获取配置值
  cmd
    .command('get')
    .description('获取配置项的值')
    .argument('<key>', '配置键 (例如: ai.provider, ui.theme)')
    .action(async (key: string) => {
      try {
        const config = await loadConfig(logger)
        const value = getNestedValue(config, key)

        if (value === undefined) {
          logger.info(`undefined`)
        } else if (typeof value === 'object') {
          logger.info(JSON.stringify(value, null, 2))
        } else {
          logger.info(String(value))
        }
      } catch (error) {
        if (error instanceof ConfigLoaderError) {
          logger.error(`Failed to load configuration: ${error.message}`)
        } else {
          logger.error('Unexpected error occurred')
        }
        process.exit(1)
      }
    })

  // config set - 设置配置值
  cmd
    .command('set')
    .description('设置配置项的值')
    .argument('<key>', '配置键 (例如: ui.theme, ai.anthropic.model)')
    .argument('<value>', '配置值')
    .action(async (key: string, value: string) => {
      try {
        // 加载现有配置
        const config = await loadConfig(logger)

        // 解析值
        const parsedValue = parseValue(value)

        // 设置新值
        const updatedConfig = setNestedValue(config, key, parsedValue)

        // 保存配置
        await saveConfig(updatedConfig, logger)

        logger.success(`Configuration updated: ${key} = ${value}`)
      } catch (error) {
        if (error instanceof ConfigLoaderError) {
          logger.error(`Failed to update configuration: ${error.message}`)
          if (error.cause) {
            logger.debug(`Cause: ${error.cause.message}`)
          }
        } else {
          logger.error('Unexpected error occurred')
        }
        process.exit(1)
      }
    })

  // config list - 列出所有配置
  cmd
    .command('list')
    .description('列出所有配置')
    .action(async () => {
      try {
        const config = await loadConfig(logger)
        displayConfig(config)
      } catch (error) {
        if (error instanceof ConfigLoaderError) {
          logger.error(`Failed to load configuration: ${error.message}`)
        } else {
          logger.error('Unexpected error occurred')
        }
        process.exit(1)
      }
    })

  return cmd
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * 设置嵌套对象的值（不可变）
 */
function setNestedValue<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')

  if (keys.length === 1) {
    return {
      ...obj,
      [keys[0]]: value
    } as T
  }

  const [first, ...rest] = keys

  if (obj && typeof obj === 'object' && first in obj) {
    return {
      ...obj,
      [first]: setNestedValue(
        (obj as Record<string, unknown>)[first] as T,
        rest.join('.'),
        value
      )
    } as T
  }

  // 如果路径不存在，创建新对象
  return {
    ...obj,
    [first]: setNestedValue(
      {} as T,
      rest.join('.'),
      value
    )
  } as T
}

/**
 * 解析字符串值为正确的类型
 */
function parseValue(value: string): string | number | boolean {
  // 布尔值
  if (value === 'true') return true
  if (value === 'false') return false

  // 数字
  const num = Number(value)
  if (!isNaN(num) && value !== '') {
    return num
  }

  // 字符串
  return value
}

/**
 * 显示配置
 */
function displayConfig(config: Config): void {
  const logger = new Logger()

  logger.info('Current configuration:')
  logger.info('')
  logger.info('AI:')
  displayNested(config.ai, '  ')
  logger.info('')
  logger.info('UI:')
  displayNested(config.ui, '  ')
  logger.info('')
  logger.info(`Workspace: ${config.workspace}`)
}

/**
 * 显示嵌套对象
 */
function displayNested(obj: unknown, indent: string): void {
  const logger = new Logger()

  if (!obj || typeof obj !== 'object') {
    logger.info(`${indent}${obj}`)
    return
  }

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      logger.info(`${indent}${key}:`)
      displayNested(value, indent + '  ')
    } else {
      // 隐藏 API keys
      if (key === 'apiKey' && typeof value === 'string') {
        logger.info(`${indent}${key}: ${value.slice(0, 8)}...`)
      } else {
        logger.info(`${indent}${key}: ${JSON.stringify(value)}`)
      }
    }
  }
}
