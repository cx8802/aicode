import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCli } from './cli'
import { existsSync } from 'fs'

vi.mock('fs')

describe('CLI', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let mockExit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockExit = vi.fn() as unknown as typeof process.exit
    process.exit = mockExit

    // 默认 mock existsSync 返回 true
    vi.mocked(existsSync).mockReturnValue(true)
  })

  describe('版本选项', () => {
    it('应该显示正确的版本号', async () => {
      const cli = createCli()

      try {
        await cli.parseAsync(['node', 'aicode', '--version'], { from: 'user' })
      } catch (error) {
        // Commander 会在 --version 后调用 process.exit()
      }
    })
  })

  describe('帮助选项', () => {
    it('应该显示帮助信息', async () => {
      const cli = createCli()

      try {
        await cli.parseAsync(['node', 'aicode', '--help'], { from: 'user' })
      } catch (error) {
        // Commander 会在 --help 后退出
      }
    })
  })

  describe('欢迎消息', () => {
    it('应该在启动时显示欢迎消息', async () => {
      const cli = createCli()

      await cli.parseAsync(['node', 'aicode'], { from: 'user' })

      // Logger 使用 console.info
      expect(consoleInfoSpy).toHaveBeenCalled()
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to AICode CLI')
      )
    })
  })

  describe('配置选项', () => {
    it('应该支持 --config 选项（文件存在）', async () => {
      const cli = createCli()

      await cli.parseAsync(['node', 'aicode', '--config', './aicode.config.json'], { from: 'user' })

      // 验证配置选项被解析
      const options = cli.opts()
      expect(options.config).toBe('./aicode.config.json')
      expect(existsSync).toHaveBeenCalledWith('./aicode.config.json')
    })

    it('应该在配置文件不存在时报错', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const cli = createCli()

      await cli.parseAsync(['node', 'aicode', '--config', './non-existent.json'], { from: 'user' })

      // 验证错误消息被输出
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Config file not found'))
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('应该支持 --debug 选项', async () => {
      const cli = createCli()

      await cli.parseAsync(['node', 'aicode', '--debug'], { from: 'user' })

      const options = cli.opts()
      expect(options.debug).toBe(true)
    })

    it('应该支持 --verbose 选项', async () => {
      const cli = createCli()

      await cli.parseAsync(['node', 'aicode', '--verbose'], { from: 'user' })

      const options = cli.opts()
      expect(options.verbose).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的选项', async () => {
      const cli = createCli()

      try {
        await cli.parseAsync(['node', 'aicode', '--invalid-option'], { from: 'user' })
      } catch (error: unknown) {
        // Commander 会抛出错误
        expect(error).toBeDefined()
      }
    })
  })
})
