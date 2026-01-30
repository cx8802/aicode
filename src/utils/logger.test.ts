import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger } from './logger'

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    info: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('info', () => {
    it('应该输出信息消息', () => {
      const logger = new Logger()
      logger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalledWith('Test message')
    })

    it('应该支持格式化参数', () => {
      const logger = new Logger()
      logger.info('User %s logged in', 'Alice')

      expect(consoleSpy.info).toHaveBeenCalledWith('User %s logged in', 'Alice')
    })
  })

  describe('success', () => {
    it('应该输出成功消息', () => {
      const logger = new Logger()
      logger.success('Operation completed')

      expect(consoleSpy.log).toHaveBeenCalledWith('Operation completed')
    })
  })

  describe('warn', () => {
    it('应该输出警告消息', () => {
      const logger = new Logger()
      logger.warn('Deprecated feature used')

      expect(consoleSpy.warn).toHaveBeenCalledWith('Deprecated feature used')
    })
  })

  describe('error', () => {
    it('应该输出错误消息', () => {
      const logger = new Logger()
      logger.error('Operation failed')

      expect(consoleSpy.error).toHaveBeenCalledWith('Operation failed')
    })

    it('应该支持 Error 对象', () => {
      const logger = new Logger()
      const error = new Error('Test error')
      logger.error('Failed:', error)

      expect(consoleSpy.error).toHaveBeenCalledWith('Failed:', error)
    })
  })

  describe('debug', () => {
    it('应该在 DEBUG 模式下输出调试信息', () => {
      const logger = new Logger({ debug: true })
      logger.debug('Debug info')

      expect(consoleSpy.log).toHaveBeenCalledWith('Debug info')
    })

    it('应该在非 DEBUG 模式下不输出', () => {
      const logger = new Logger({ debug: false })
      logger.debug('Debug info')

      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })
})
