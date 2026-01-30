import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Command } from 'commander'
import { configCommand } from './config'
import { loadConfig, saveConfig } from '../../core/config/loader'
import { ConfigLoaderError } from '../../core/config/loader'

vi.mock('../../core/config/loader', async () => {
  const actual = await vi.importActual('../../core/config/loader')
  return {
    ...(actual as object),
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    getConfigPath: vi.fn(() => '/mock/.aicode/config.json')
  }
})

describe('ConfigCommand', () => {
  let program: Command
  let consoleOutput: string[] = []
  let consoleError: string[] = []
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleOutput = []
    consoleError = []
    vi.spyOn(console, 'log').mockImplementation(((...args: unknown[]) => {
      consoleOutput.push(args.join(' '))
    }) as never)
    vi.spyOn(console, 'error').mockImplementation(((...args: unknown[]) => {
      consoleError.push(args.join(' '))
    }) as never)
    vi.spyOn(console, 'info').mockImplementation(((...args: unknown[]) => {
      consoleOutput.push(args.join(' '))
    }) as never)

    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error('process.exit called')
    }) as never)

    program = new Command()
    program.exitOverride((err) => { throw err })
  })

  afterEach(() => {
    exitSpy.mockRestore()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('config init', () => {
    it('should create default config file', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        ai: { provider: 'anthropic' },
        ui: { theme: 'dark', streamOutput: true, showLineNumbers: true },
        workspace: '/default'
      })
      vi.mocked(saveConfig).mockResolvedValue(undefined)

      program.addCommand(configCommand())
      await program.parseAsync(['node', 'test', 'config', 'init'])

      expect(saveConfig).toHaveBeenCalled()
      expect(consoleOutput.some((o) => o.includes('created'))).toBe(true)
    })
  })

  describe('config get', () => {
    it('should display config value', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        ai: {
          provider: 'anthropic',
          anthropic: { apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-20241022' }
        },
        ui: { theme: 'dark', streamOutput: true, showLineNumbers: true },
        workspace: '/test'
      })

      program.addCommand(configCommand())
      await program.parseAsync(['node', 'test', 'config', 'get', 'ai.provider'])

      expect(consoleOutput.some((o) => o.includes('anthropic'))).toBe(true)
    })
  })

  describe('config set', () => {
    it('should set string config value', async () => {
      const existingConfig = {
        ai: { provider: 'anthropic' as const },
        ui: { theme: 'dark' as const, streamOutput: true, showLineNumbers: true },
        workspace: '/test'
      }

      vi.mocked(loadConfig).mockResolvedValue(existingConfig)
      vi.mocked(saveConfig).mockResolvedValue(undefined)

      program.addCommand(configCommand())
      await program.parseAsync(['node', 'test', 'config', 'set', 'ui.theme', 'light'])

      expect(saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({ theme: 'light' })
        }),
        expect.anything()
      )
    })
  })

  describe('config list', () => {
    it('should list all configuration', async () => {
      vi.mocked(loadConfig).mockResolvedValue({
        ai: {
          provider: 'anthropic',
          anthropic: { apiKey: 'sk-ant-test12345678', model: 'claude-3-5-sonnet-20241022' }
        },
        ui: { theme: 'dark', streamOutput: true, showLineNumbers: true },
        workspace: '/test/workspace'
      })

      program.addCommand(configCommand())
      await program.parseAsync(['node', 'test', 'config', 'list'])

      const output = consoleOutput.join(' ')
      expect(output).toContain('AI:')
      expect(output).toContain('UI:')
    })
  })
})
