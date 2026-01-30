/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  debug?: boolean
  silent?: boolean
}

/**
 * 简单的日志工具类
 * 遵循单一职责原则
 */
export class Logger {
  private readonly debugEnabled: boolean
  private readonly silent: boolean

  constructor(options: LoggerOptions = {}) {
    this.debugEnabled = options.debug ?? false
    this.silent = options.silent ?? false
  }

  /**
   * 输出信息级别日志
   */
  info(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.info(message, ...args)
    }
  }

  /**
   * 输出成功消息
   */
  success(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.log(message, ...args)
    }
  }

  /**
   * 输出警告消息
   */
  warn(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.warn(message, ...args)
    }
  }

  /**
   * 输出错误消息
   */
  error(message: string, ...args: unknown[]): void {
    if (!this.silent) {
      console.error(message, ...args)
    }
  }

  /**
   * 输出调试消息（仅在 debug 模式下）
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.debugEnabled && !this.silent) {
      console.log(message, ...args)
    }
  }
}
