import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadConfig, saveConfig, getConfigPath, ConfigLoaderError } from './loader'
import { Logger } from '../../utils/logger'

// Mock fs 模块
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn()
    },
    existsSync: vi.fn()
  }
})

// Mock os 模块
vi.mock('os', async () => {
  const actual = await vi.importActual('os')
  return {
    ...actual,
    homedir: vi.fn(() => '/mock/home')
  }
})

describe('ConfigLoader', () => {
  const mockLogger = new Logger({ silent: true })

  beforeEach(() => {
    vi.clearAllMocks()
    // 清除环境变量
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getConfigPath', () => {
    it('应该返回正确的配置文件路径', () => {
      const path = getConfigPath()
      expect(path).toContain('.aicode')
      expect(path).toContain('config.json')
    })
  })

  describe('loadConfig', () => {
    it('应该从文件加载有效配置', async () => {
      const { promises: fsPromises } = await import('fs')
      const validConfig = {
        ai: {
          provider: 'anthropic',
          anthropic: {
            apiKey: 'sk-ant-test123'
          }
        },
        ui: {
          theme: 'dark',
          streamOutput: true,
          showLineNumbers: true
        },
        workspace: '/test/workspace'
      }

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(validConfig))

      const config = await loadConfig(mockLogger)

      expect(config.ai.provider).toBe('anthropic')
      expect(config.ai.anthropic?.apiKey).toBe('sk-ant-test123')
      expect(config.ui.theme).toBe('dark')
    })

    it('当配置文件不存在时应该使用默认值', async () => {
      const { promises: fsPromises } = await import('fs')
      const error = new Error('File not found') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      vi.mocked(fsPromises.readFile).mockRejectedValue(error)

      const config = await loadConfig(mockLogger)

      expect(config.ai.provider).toBe('anthropic')
      expect(config.ui.theme).toBe('dark')
      expect(config.ui.streamOutput).toBe(true)
    })

    it('环境变量应该覆盖配置文件中的 API key', async () => {
      const { promises: fsPromises } = await import('fs')
      const configFromFile = {
        ai: {
          provider: 'anthropic',
          anthropic: {
            apiKey: 'sk-ant-file-key'
          }
        },
        ui: {
          theme: 'dark',
          streamOutput: true,
          showLineNumbers: true
        }
      }

      process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key'

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(configFromFile))

      const config = await loadConfig(mockLogger)

      expect(config.ai.anthropic?.apiKey).toBe('sk-ant-env-key')
    })

    it('应该拒绝无效的配置并抛出 ConfigLoaderError', async () => {
      const { promises: fsPromises } = await import('fs')
      const invalidConfig = {
        ai: {
          provider: 'invalid-provider'
        }
      }

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(invalidConfig))

      await expect(loadConfig(mockLogger)).rejects.toThrow(ConfigLoaderError)
    })

    it('应该拒绝格式错误的 JSON', async () => {
      const { promises: fsPromises } = await import('fs')
      vi.mocked(fsPromises.readFile).mockResolvedValue('{ invalid json }')

      await expect(loadConfig(mockLogger)).rejects.toThrow(ConfigLoaderError)
    })

    it('OpenAI 环境变量应该覆盖配置', async () => {
      const { promises: fsPromises } = await import('fs')
      const configFromFile = {
        ai: {
          provider: 'openai',
          openai: {
            apiKey: 'sk-openai-file-key'
          }
        },
        ui: {
          theme: 'dark',
          streamOutput: true,
          showLineNumbers: true
        }
      }

      process.env.OPENAI_API_KEY = 'sk-openai-env-key'

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(configFromFile))

      const config = await loadConfig(mockLogger)

      expect(config.ai.openai?.apiKey).toBe('sk-openai-env-key')
    })

    it('应该合并部分配置与默认值', async () => {
      const { promises: fsPromises } = await import('fs')
      const partialConfig = {
        ai: {
          provider: 'anthropic',
          anthropic: {
            apiKey: 'sk-ant-test'
          }
        }
      }

      vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(partialConfig))

      const config = await loadConfig(mockLogger)

      expect(config.ai.provider).toBe('anthropic')
      expect(config.ui.theme).toBe('dark') // 默认值
      expect(config.ui.streamOutput).toBe(true) // 默认值
      expect(config.workspace).toBeDefined()
    })
  })

  describe('saveConfig', () => {
    it('应该保存配置到文件', async () => {
      const { promises: fsPromises } = await import('fs')
      const configToSave = {
        ai: {
          provider: 'anthropic' as const,
          anthropic: {
            apiKey: 'sk-ant-new-key'
          }
        },
        ui: {
          theme: 'light' as const,
          streamOutput: false,
          showLineNumbers: false
        },
        workspace: '/new/workspace'
      }

      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined)
      vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined)

      await saveConfig(configToSave, mockLogger)

      expect(fsPromises.mkdir).toHaveBeenCalledWith(expect.anything(), { recursive: true })
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        expect.stringContaining('sk-ant-new-key'),
        'utf-8'
      )
    })

    it('保存失败时应该抛出 ConfigLoaderError', async () => {
      const { promises: fsPromises } = await import('fs')
      const config = {
        ai: {
          provider: 'anthropic' as const,
          anthropic: {
            apiKey: 'sk-ant-test'
          }
        },
        ui: {
          theme: 'dark' as const,
          streamOutput: true,
          showLineNumbers: true
        },
        workspace: '/test'
      }

      vi.mocked(fsPromises.mkdir).mockRejectedValue(new Error('Permission denied'))

      await expect(saveConfig(config, mockLogger)).rejects.toThrow(ConfigLoaderError)
    })
  })

  describe('ConfigLoaderError', () => {
    it('应该是 Error 的实例', () => {
      const error = new ConfigLoaderError('Test error')
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
    })

    it('应该支持原因链', () => {
      const cause = new Error('Original error')
      const error = new ConfigLoaderError('Wrapper error', cause)

      expect(error.cause).toBe(cause)
      expect(error.message).toBe('Wrapper error')
    })
  })
})
