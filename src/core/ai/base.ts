/**
 * AI 提供商基础接口
 *
 * 定义所有 AI 提供商必须实现的基本接口
 */

/**
 * 聊天消息
 */
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

/**
 * 聊天选项
 */
export interface ChatOptions {
  /** 是否使用流式响应 */
  stream?: boolean
  /** 温度参数 (0-1) */
  temperature?: number
  /** 最大生成 tokens 数 */
  maxTokens?: number
}

/**
 * Token 使用信息
 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * AI 响应
 */
export interface AIResponse {
  content: string
  usage?: TokenUsage
}

/**
 * AI 提供商接口
 *
 * 所有 AI 提供商（Anthropic、OpenAI 等）都必须实现此接口
 */
export interface AIProvider {
  /**
   * 发送聊天请求并获取完整响应
   * @param messages 消息历史
   * @param options 聊天选项
   * @returns AI 响应
   */
  chat(messages: Message[], options?: ChatOptions): Promise<AIResponse>

  /**
   * 发送聊天请求并获取流式响应
   * @param messages 消息历史
   * @param options 聊天选项
   * @returns 异步迭代器，产生响应块
   */
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}
