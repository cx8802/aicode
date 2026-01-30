/**
 * OpenAI AI 提供商适配器
 *
 * 实现 AIProvider 接口以使用 OpenAI API
 */
import OpenAI from 'openai'
import type {
  AIProvider,
  Message,
  ChatOptions,
  AIResponse
} from './base'
import type { OpenAIConfig } from '../config/schema'
import { Logger } from '../../utils/logger'

/**
 * OpenAI 提供商错误类
 */
export class OpenAIProviderError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'OpenAIProviderError'
    this.cause = cause

    Object.setPrototypeOf(this, OpenAIProviderError.prototype)
  }
}

/**
 * OpenAI AI 提供商
 */
export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI
  private readonly config: OpenAIConfig
  private readonly logger: Logger

  constructor(config: OpenAIConfig, logger: Logger, client?: OpenAI) {
    // 先设置 logger，因为 validateConfig 需要使用
    this.logger = logger
    this.config = config

    // 验证配置
    this.validateConfig(config)

    // 初始化 OpenAI 客户端（使用注入的客户端或创建新的）
    this.client = client ?? new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })

    this.logger.debug(`OpenAI provider initialized with model: ${this.getModel()}`)
  }

  /**
   * 发送聊天请求并获取完整响应
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<AIResponse> {
    try {
      this.logger.debug('Sending chat request to OpenAI')

      // 构建请求参数
      const requestParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: this.getModel(),
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature
      }

      // 发送请求
      const response = await this.client.chat.completions.create(requestParams)

      // 提取响应文本
      const content = response.choices[0]?.message?.content ?? ''

      // 转换使用信息
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          }
        : undefined

      this.logger.debug('Received response from OpenAI', usage)

      return { content, usage }
    } catch (error) {
      this.logger.error('OpenAI API error:', error)
      throw new OpenAIProviderError(
        'Failed to get response from OpenAI',
        error as Error
      )
    }
  }

  /**
   * 发送聊天请求并获取流式响应
   */
  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    try {
      this.logger.debug('Sending stream chat request to OpenAI')

      // 构建请求参数
      const requestParams: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: this.getModel(),
        messages: messages as OpenAI.ChatCompletionMessageParam[],
        max_tokens: options?.maxTokens ?? this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        stream: true
      }

      // 发送流式请求
      const stream = await this.client.chat.completions.create(requestParams)

      // 处理流式响应
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }

      this.logger.debug('Stream completed')
    } catch (error) {
      this.logger.error('OpenAI stream error:', error)
      throw new OpenAIProviderError(
        'Failed to get stream response from OpenAI',
        error as Error
      )
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(config: OpenAIConfig): void {
    if (!config.apiKey || config.apiKey.trim() === '') {
      this.logger.warn('API key is empty, set it via environment variable or config')
    }
  }

  /**
   * 获取模型名称
   */
  private getModel(): string {
    return this.config.model || 'gpt-4-turbo'
  }
}
