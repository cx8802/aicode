/**
 * 调试日志工具
 * 用于诊断问题
 */

import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const LOG_FILE = path.join(os.homedir(), '.aicode', 'debug.log')

export class DebugLogger {
  private static instance: DebugLogger
  private enabled = true

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger()
    }
    return DebugLogger.instance
  }

  async log(message: string, data?: unknown): Promise<void> {
    if (!this.enabled) return

    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}`

    console.error(logEntry)

    try {
      await fs.appendFile(LOG_FILE, logEntry + '\n')
      if (data) {
        await fs.appendFile(LOG_FILE, `  Data: ${JSON.stringify(data, null, 2)}\n`)
      }
    } catch (error) {
      // 忽略日志写入错误
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.writeFile(LOG_FILE, '')
    } catch (error) {
      // 忽略错误
    }
  }

  async getLogPath(): Promise<string> {
    return LOG_FILE
  }
}

export const debug = DebugLogger.getInstance()
