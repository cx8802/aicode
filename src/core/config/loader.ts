import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { ConfigSchema, type Config } from './schema'
import { Logger } from '../../utils/logger'

/**
 * 配置加载器错误类
 */
export class ConfigLoaderError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'ConfigLoaderError'
    this.cause = cause

    // 维护正确的原型链
    Object.setPrototypeOf(this, ConfigLoaderError.prototype)
  }
}

/**
 * 获取配置文件路径
 */
export function getConfigPath(): string {
  const homeDir = os.homedir()
  return path.join(homeDir, '.aicode', 'aicode.config.json')
}

/**
 * 加载配置
 * 从配置文件读取，文件不存在时使用默认值
 *
 * @param logger Logger 实例
 * @param customPath 可选的自定义配置文件路径
 */
export async function loadConfig(logger: Logger, customPath?: string): Promise<Config> {
  // 使用自定义路径或默认路径
  const configPath = customPath || getConfigPath()

  try {
    // 尝试读取配置文件
    const fileContent = await fs.readFile(configPath, 'utf-8')
    const rawConfig = JSON.parse(fileContent)

    // 验证配置
    const validationResult = ConfigSchema.safeParse(rawConfig)

    if (!validationResult.success) {
      const errorMessage = `Invalid configuration: ${validationResult.error.issues
        .map((e: { message: string }) => e.message)
        .join(', ')}`
      throw new ConfigLoaderError(errorMessage)
    }

    const config = validationResult.data

    logger.debug(`Loaded configuration from ${configPath}`)
    return config
  } catch (error) {
    // 如果文件不存在，返回默认配置
    if (isFileNotFoundError(error)) {
      logger.debug('Config file not found, using defaults')
      return getDefaultConfig()
    }

    // JSON 解析错误
    if (error instanceof SyntaxError) {
      throw new ConfigLoaderError('Failed to parse configuration file', error)
    }

    // 其他错误
    if (error instanceof ConfigLoaderError) {
      throw error
    }

    throw new ConfigLoaderError('Failed to load configuration', error as Error)
  }
}

/**
 * 初始化配置文件
 * 如果配置文件不存在，则创建默认配置文件
 *
 * @param logger Logger 实例
 */
export async function initializeConfig(logger: Logger): Promise<void> {
  const configPath = getConfigPath()

  try {
    // 检查配置文件是否存在
    await fs.access(configPath)
    logger.debug('Configuration file already exists')
  } catch {
    // 文件不存在，创建默认配置
    logger.info('Initializing configuration file...')
    const defaultConfig = getDefaultConfig()
    await saveConfig(defaultConfig, logger)
    logger.info(`Configuration file created at: ${configPath}`)
  }
}

/**
 * 保存配置到文件
 */
export async function saveConfig(config: Config, logger: Logger): Promise<void> {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  try {
    // 确保配置目录存在
    await fs.mkdir(configDir, { recursive: true })

    // 写入配置文件
    const content = JSON.stringify(config, null, 2)
    await fs.writeFile(configPath, content, 'utf-8')

    logger.debug(`Configuration saved to ${configPath}`)
  } catch (error) {
    throw new ConfigLoaderError('Failed to save configuration', error as Error)
  }
}

/**
 * 获取默认配置
 */
function getDefaultConfig(): Config {
  const result = ConfigSchema.safeParse({})

  if (!result.success) {
    // 如果默认配置验证失败（不应该发生），返回硬编码的默认值
    return {
      ai: {
        provider: 'anthropic'
      },
      ui: {
        theme: 'dark',
        streamOutput: true,
        showLineNumbers: true
      },
      workspace: process.cwd()
    }
  }

  return result.data
}

/**
 * 检查错误是否为文件未找到错误
 */
function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
