/**
 * OpenAI AI 提供商适配器测试
 *
 * 使用 TDD 方法测试 OpenAI 适配器
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenAIProvider, OpenAIProviderError } from './openai'
import type { OpenAIConfig } from '../config/schema'
import { Logger } from '../../utils/logger'
import OpenAI from 'openai'

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider
  let mockClient: OpenAI
  let mockChatCompletionsCreate: ReturnType<typeof vi.fn>
  let logger: Logger
  let config: OpenAIConfig

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 创建 logger
    logger = new Logger({ debug: true, silent: true })

    // 创建配置
    config = {
      apiKey: 'test-api-key',
      model: 'gpt-4-turbo',
      maxTokens: 4096,
      temperature: 0.7
    }

    // 创建 mock 客户端
    mockChatCompletionsCreate = vi.fn()
    mockClient = {
      chat: {
        completions: {
          create: mockChatCompletionsCreate
        }
      }
    } as unknown as OpenAI

    // 创建提供商（注入 mock 客户端）
    provider = new OpenAIProvider(config, logger, mockClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('构造函数', () => {
    it('应该使用提供的配置创建实例', () => {
      const newProvider = new OpenAIProvider(config, logger)

      expect(newProvider).toBeInstanceOf(OpenAIProvider)
    })

    it('应该使用默认模型如果未提供', () => {
      const configWithoutModel: OpenAIConfig = {
        apiKey: 'test-api-key',
        maxTokens: 4096,
        temperature: 0.7
      }

      expect(() => new OpenAIProvider(configWithoutModel, logger)).not.toThrow()
    })

    it('应该验证 API key 存在', () => {
      const invalidConfig = {
        apiKey: '',
        maxTokens: 4096,
        temperature: 0.7
      } as OpenAIConfig

      expect(() => new OpenAIProvider(invalidConfig, logger)).toThrow(OpenAIProviderError)
    })
  })

  describe('chat 方法', () => {
    it('应该成功发送消息并获取响应', async () => {
      // Mock 响应
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?'
            }
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Hello! How can I help you today?')
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      })

      // 验证调用参数
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1)
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        temperature: 0.7
      })
    })

    it('应该处理多条消息包括系统消息', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response to conversation'
            }
          }
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 30,
          total_tokens: 80
        }
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse)

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'How are you?' }
      ]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Response to conversation')
      expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(1)

      // 验证所有消息都被发送（OpenAI 支持系统消息）
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' }
        ],
        max_tokens: 4096,
        temperature: 0.7
      })
    })

    it('应该使用自定义选项', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Custom response'
            }
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40
        }
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockResponse)

      const messages = [{ role: 'user' as const, content: 'Test' }]

      const response = await provider.chat(messages, {
        temperature: 0.5,
        maxTokens: 2000
      })

      expect(response.content).toBe('Custom response')
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 2000,
        temperature: 0.5
      })
    })

    it('应该处理 API 错误', async () => {
      const apiError = new Error('API request failed')
      mockChatCompletionsCreate.mockRejectedValueOnce(apiError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(OpenAIProviderError)
    })

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      mockChatCompletionsCreate.mockRejectedValueOnce(networkError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(OpenAIProviderError)
    })

    it('应该处理认证错误', async () => {
      const authError = new Error('Unauthorized')
      authError.name = 'AuthenticationError'
      mockChatCompletionsCreate.mockRejectedValueOnce(authError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(OpenAIProviderError)
    })
  })

  describe('chatStream 方法', () => {
    it('应该成功获取流式响应', async () => {
      // 创建流式响应 mock
      async function* mockStream() {
        yield {
          choices: [
            {
              delta: {
                content: 'Hello'
              }
            }
          ]
        }
        yield {
          choices: [
            {
              delta: {
                content: '!'
              }
            }
          ]
        }
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', '!'])
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        temperature: 0.7,
        stream: true
      })
    })

    it('应该处理空流', async () => {
      async function* mockEmptyStream() {
        // 不产生任何内容
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockEmptyStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual([])
    })

    it('应该处理流式错误', async () => {
      async function* mockErrorStream() {
        yield {
          choices: [
            {
              delta: {
                content: 'Error'
              }
            }
          ]
        }
        throw new Error('Stream interrupted')
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockErrorStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(async () => {
        const chunks: string[] = []
        for await (const chunk of provider.chatStream(messages)) {
          chunks.push(chunk)
        }
      }).rejects.toThrow()
    })

    it('应该使用流式自定义选项', async () => {
      async function* mockStream() {
        yield {
          choices: [
            {
              delta: {
                content: 'Test'
              }
            }
          ]
        }
      }

      mockChatCompletionsCreate.mockResolvedValueOnce(mockStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages, {
        temperature: 0.3,
        maxTokens: 1000
      })) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Test'])
      expect(mockChatCompletionsCreate).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1000,
        temperature: 0.3,
        stream: true
      })
    })
  })
})
