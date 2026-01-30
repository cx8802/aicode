/**
 * Anthropic AI 提供商适配器测试
 *
 * 使用 TDD 方法测试 Anthropic 适配器
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnthropicProvider, AnthropicProviderError } from './anthropic'
import type { AnthropicConfig } from '../config/schema'
import { Logger } from '../../utils/logger'
import Anthropic from '@anthropic-ai/sdk'

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider
  let mockClient: Anthropic
  let mockMessagesCreate: ReturnType<typeof vi.fn>
  let logger: Logger
  let config: AnthropicConfig

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks()

    // 创建 logger
    logger = new Logger({ debug: true, silent: true })

    // 创建配置
    config = {
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7
    }

    // 创建 mock 客户端
    mockMessagesCreate = vi.fn()
    mockClient = {
      messages: {
        create: mockMessagesCreate
      }
    } as unknown as Anthropic

    // 创建提供商（注入 mock 客户端）
    provider = new AnthropicProvider(config, logger, mockClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('构造函数', () => {
    it('应该使用提供的配置创建实例', () => {
      const newProvider = new AnthropicProvider(config, logger)

      expect(newProvider).toBeInstanceOf(AnthropicProvider)
    })

    it('应该使用默认模型如果未提供', () => {
      const configWithoutModel: AnthropicConfig = {
        apiKey: 'test-api-key',
        maxTokens: 4096,
        temperature: 0.7
      }

      expect(() => new AnthropicProvider(configWithoutModel, logger)).not.toThrow()
    })

    it('应该允许空的 API key（发出警告）', () => {
      const invalidConfig = {
        apiKey: '',
        maxTokens: 4096,
        temperature: 0.7
      } as AnthropicConfig

      // 不应该抛出错误
      expect(() => new AnthropicProvider(invalidConfig, logger)).not.toThrow()
    })
  })

  describe('chat 方法', () => {
    it('应该成功发送消息并获取响应', async () => {
      // Mock 响应
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: 'Hello! How can I help you today?'
          }
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 20
        }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockResponse)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Hello! How can I help you today?')
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      })

      // 验证调用参数
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 4096,
        temperature: 0.7
      })
    })

    it('应该处理多条消息包括系统消息', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: 'Response to conversation'
          }
        ],
        usage: {
          input_tokens: 50,
          output_tokens: 30
        }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockResponse)

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'How are you?' }
      ]

      const response = await provider.chat(messages)

      expect(response.content).toBe('Response to conversation')
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1)

      // 验证系统消息被正确处理
      const callArgs = mockMessagesCreate.mock.calls[0][0]
      expect(callArgs).toHaveProperty('system', 'You are helpful')
      expect(callArgs.messages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ])
    })

    it('应该使用自定义选项', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text' as const,
            text: 'Custom response'
          }
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 25
        }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockResponse)

      const messages = [{ role: 'user' as const, content: 'Test' }]

      const response = await provider.chat(messages, {
        temperature: 0.5,
        maxTokens: 2000
      })

      expect(response.content).toBe('Custom response')
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 2000,
        temperature: 0.5
      })
    })

    it('应该正确处理空响应', async () => {
      const mockResponse = {
        content: [],
        usage: {
          input_tokens: 10,
          output_tokens: 0
        }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockResponse)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      const response = await provider.chat(messages)

      expect(response.content).toBe('')
      expect(response.usage?.completionTokens).toBe(0)
    })

    it('应该处理 API 错误', async () => {
      const apiError = new Error('API request failed')
      mockMessagesCreate.mockRejectedValueOnce(apiError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(AnthropicProviderError)
    })

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'
      mockMessagesCreate.mockRejectedValueOnce(networkError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(AnthropicProviderError)
    })

    it('应该处理认证错误', async () => {
      const authError = new Error('Unauthorized')
      authError.name = 'AuthenticationError'
      mockMessagesCreate.mockRejectedValueOnce(authError)

      const messages = [{ role: 'user' as const, content: 'Hello' }]

      await expect(provider.chat(messages)).rejects.toThrow(AnthropicProviderError)
    })
  })

  describe('chatStream 方法', () => {
    it('应该成功获取流式响应', async () => {
      // 创建流式响应 mock
      async function* mockStream() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '!' } }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Hello', '!'])
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
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

      mockMessagesCreate.mockResolvedValueOnce(mockEmptyStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages)) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual([])
    })

    it('应该处理流式错误', async () => {
      async function* mockErrorStream() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Error' } }
        throw new Error('Stream interrupted')
      }

      mockMessagesCreate.mockResolvedValueOnce(mockErrorStream())

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
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Test' } }
      }

      mockMessagesCreate.mockResolvedValueOnce(mockStream())

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const chunks: string[] = []

      for await (const chunk of provider.chatStream(messages, {
        temperature: 0.3,
        maxTokens: 1000
      })) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Test'])
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1000,
        temperature: 0.3,
        stream: true
      })
    })
  })
})
