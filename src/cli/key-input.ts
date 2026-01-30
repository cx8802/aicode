/**
 * 按键输入处理器
 * 支持按键级别的即时响应，类似 Claude Code CLI
 */

import { stdin, stdout } from 'process'

/**
 * 按键事件
 */
export interface KeyEvent {
  /** 按键字符 */
  char: string
  /** 是特殊键 */
  isSpecial: boolean
  /** 原始数据 */
  raw: string
}

/**
 * 按键输入监听器
 */
export class KeyInputListener {
  private callbacks: Set<(key: KeyEvent) => void> = new Set()
  private active = false

  /**
   * 开始监听按键
   */
  start(): void {
    if (this.active) return

    this.active = true

    // 启用原始模式
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf-8')

    stdin.on('data', this.handleData)
  }

  /**
   * 停止监听按键
   */
  stop(): void {
    if (!this.active) return

    this.active = false

    stdin.removeListener('data', this.handleData)

    // 恢复正常模式
    stdin.setRawMode(false)
    stdin.pause()
  }

  /**
   * 添加按键监听回调
   */
  onKey(callback: (key: KeyEvent) => void): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * 处理输入数据
   */
  private handleData = (data: Buffer | string): void => {
    const str = String(data)

    // 解析特殊按键序列
    const key = this.parseKey(str)

    // 通知所有监听器
    for (const callback of this.callbacks) {
      callback(key)
    }
  }

  /**
   * 解析按键
   */
  private parseKey(data: string): KeyEvent {
    // 特殊键序列
    const specialKeys: Record<string, string> = {
      '\r': 'Enter',
      '\n': 'Enter',
      '\t': 'Tab',
      '\x7f': 'Backspace',
      '\x08': 'Backspace',
      '\x1b': 'Escape',
      '\x03': 'CtrlC',
      '\x04': 'CtrlD',
      '\x1b[A': 'Up',
      '\x1b[B': 'Down',
      '\x1b[C': 'Right',
      '\x1b[D': 'Left',
      '\x1b[1~': 'Home',
      '\x1b[4~': 'End',
      '\x1b[5~': 'PageUp',
      '\x1b[6~': 'PageDown',
      '\x1b[2~': 'Insert',
      '\x1b[3~': 'Delete'
    }

    // 检查是否是特殊键
    if (specialKeys[data]) {
      return {
        char: specialKeys[data],
        isSpecial: true,
        raw: data
      }
    }

    // 检查箭头键等 ANSI 转义序列
    if (data.startsWith('\x1b[')) {
      return {
        char: data,
        isSpecial: true,
        raw: data
      }
    }

    // 普通字符
    return {
      char: data,
      isSpecial: false,
      raw: data
    }
  }
}

/**
 * 单例实例
 */
let globalListener: KeyInputListener | null = null

/**
 * 获取全局按键监听器
 */
export function getKeyListener(): KeyInputListener {
  if (!globalListener) {
    globalListener = new KeyInputListener()
  }
  return globalListener
}
