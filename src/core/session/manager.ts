/**
 * 会话管理器
 * 管理对话历史和上下文窗口
 */

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface SessionManagerOptions {
  /** 最大 token 数（默认 100000） */
  maxTokens?: number
}

/**
 * 会话管理器类
 * 负责管理对话历史和 token 限制
 */
export class SessionManager {
  private messages: SessionMessage[] = []
  private readonly maxTokens: number

  constructor(options: SessionManagerOptions = {}) {
    this.maxTokens = options.maxTokens ?? 100000
  }

  /**
   * 添加消息到会话
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: new Date()
    })
  }

  /**
   * 获取所有消息
   */
  getMessages(): SessionMessage[] {
    // 返回副本以防止外部修改
    return this.messages.map((msg) => ({ ...msg }))
  }

  /**
   * 清除所有消息
   */
  clear(): void {
    this.messages = []
  }

  /**
   * 获取最大 token 限制
   */
  getMaxTokens(): number {
    return this.maxTokens
  }

  /**
   * 估算当前消息的 token 数量
   * 这是一个粗略估算，实际 token 数取决于编码器
   * 估算规则：
   * - 英文：约 4 字符/token
   * - 中文：约 2 字符/token
   * - 其他：约 3 字符/token
   */
  getEstimatedTokenCount(): number {
    let total = 0

    for (const message of this.messages) {
      total += this.estimateTokens(message.content)
      // 添加每个消息的元数据开销
      total += 10
    }

    return total
  }

  /**
   * 估算单个字符串的 token 数
   */
  private estimateTokens(text: string): number {
    // 检测中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars

    // 中文约 2 字符/token，其他约 4 字符/token
    return Math.ceil(chineseChars / 2) + Math.ceil(otherChars / 4)
  }

  /**
   * 裁剪消息以适应 token 限制
   * 保留最近的消息
   * @returns 是否进行了裁剪
   */
  trimToTokenLimit(): boolean {
    const currentCount = this.getEstimatedTokenCount()

    if (currentCount <= this.maxTokens) {
      return false
    }

    // 从开头删除旧消息，直到在限制内
    while (this.getEstimatedTokenCount() > this.maxTokens && this.messages.length > 0) {
      this.messages.shift()
    }

    return true
  }

  /**
   * 获取最后 N 条消息
   */
  getLastNMessages(n: number): SessionMessage[] {
    if (n <= 0) {
      return []
    }

    const start = Math.max(0, this.messages.length - n)
    // 返回副本
    return this.messages.slice(start).map((msg) => ({ ...msg }))
  }

  /**
   * 获取用于 AI 的消息格式（移除 timestamp）
   */
  getMessagesForAI(): Array<{ role: string; content: string }> {
    return this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))
  }

  /**
   * 获取消息总数
   */
  getMessageCount(): number {
    return this.messages.length
  }
}
