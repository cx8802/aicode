/**
 * Anthropic AI 提供商适配器
 *
 * 实现 AIProvider 接口以使用 Anthropic Claude API
 */
import Anthropic from '@anthropic-ai/sdk'
import type {
  AIProvider,
  Message,
  ChatOptions,
  AIResponse
} from './base'
import type { AnthropicConfig } from '../config/schema'
import { Logger } from '../../utils/logger'

/**
 * Anthropic 提供商错误类
 */
export class AnthropicProviderError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'AnthropicProviderError'
    this.cause = cause

    Object.setPrototypeOf(this, AnthropicProviderError.prototype)
  }
}

/**
 * Anthropic AI 提供商
 */
export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic
  private readonly config: AnthropicConfig
  private readonly logger: Logger

  constructor(config: AnthropicConfig, logger: Logger, client?: Anthropic) {
    // 验证配置
    this.validateConfig(config)

    this.config = config
    this.logger = logger

    // 初始化 Anthropic 客户端（使用注入的客户端或创建新的）
    this.client = client ?? new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })

    this.logger.debug(`Anthropic provider initialized with model: ${this.getModel()}`)
  }

  /**
   * 发送聊天请求并获取完整响应
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<AIResponse> {
    try {
      this.logger.debug('Sending chat request to Anthropic')

      // 转换消息格式
      const anthropicMessages = this.convertMessages(messages)

      // 获取系统消息（如果有）
      const systemMessage = this.extractSystemMessage(messages)

      // 构建请求参数
      const requestParams: Anthropic.MessageCreateParams = {
        model: this.getModel(),
        messages: anthropicMessages,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature
      }

      // 添加系统消息（如果存在）
      const finalParams = systemMessage
        ? { ...requestParams, system: systemMessage }
        : requestParams

      // 发送请求
      const response = await this.client.messages.create(finalParams)

      // 提取响应文本
      const content = this.extractContent(response)

      // 转换使用信息
      const usage = response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens
          }
        : undefined

      this.logger.debug('Received response from Anthropic', usage)

      return { content, usage }
    } catch (error) {
      this.logger.error('Anthropic API error:', error)
      throw new AnthropicProviderError(
        'Failed to get response from Anthropic',
        error as Error
      )
    }
  }

  /**
   * 发送聊天请求并获取流式响应
   */
  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    try {
      this.logger.debug('Sending stream chat request to Anthropic')

      // 转换消息格式
      const anthropicMessages = this.convertMessages(messages)

      // 获取系统消息（如果有）
      const systemMessage = this.extractSystemMessage(messages)

      // 构建请求参数
      const requestParams: Anthropic.MessageCreateParams = {
        model: this.getModel(),
        messages: anthropicMessages,
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        stream: true
      }

      // 添加系统消息（如果存在）
      const finalParams = systemMessage
        ? { ...requestParams, system: systemMessage }
        : requestParams

      // 发送流式请求
      const stream = await this.client.messages.create(finalParams)

      // 处理流式响应
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield event.delta.text
          }
        }
      }

      this.logger.debug('Stream completed')
    } catch (error) {
      this.logger.error('Anthropic stream error:', error)
      throw new AnthropicProviderError(
        'Failed to get stream response from Anthropic',
        error as Error
      )
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: AnthropicConfig): void {
    if (!config.apiKey || config.apiKey.trim() === '') {
      this.logger.warn('API key is empty, set it via environment variable or config')
    }
  }

  /**
   * 获取模型名称
   */
  private getModel(): string {
    return this.config.model || 'claude-3-5-sonnet-20241022'
  }

  /**
   * 转换消息格式为 Anthropic 格式
   * Anthropic 不支持在前端使用 system 角色，需要单独处理
   */
  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
  }

  /**
   * 提取系统消息
   */
  private extractSystemMessage(messages: Message[]): string | undefined {
    const systemMsg = messages.find((msg) => msg.role === 'system')
    return systemMsg?.content
  }

  /**
   * 从响应中提取文本内容
   */
  private extractContent(response: Anthropic.Message): string {
    const textBlocks = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))

    return textBlocks.join('')
  }
}
