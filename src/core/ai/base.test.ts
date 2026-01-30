/**
 * AI 提供商基础接口测试
 *
 * 测试 AI 提供商接口的类型定义和基本行为
 */
import { describe, it, expect } from 'vitest'

// 导出类型以供测试
import type {
  Message,
  ChatOptions,
  AIResponse,
  AIProvider
} from './base'

describe('AI 提供商基础接口', () => {
  describe('Message 类型', () => {
    it('应该接受有效的用户消息', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello, AI!',
        timestamp: new Date()
      }

      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, AI!')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('应该接受有效的助手消息', () => {
      const message: Message = {
        role: 'assistant',
        content: 'Hello! How can I help you?'
      }

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Hello! How can I help you?')
    })

    it('应该接受有效的系统消息', () => {
      const message: Message = {
        role: 'system',
        content: 'You are a helpful assistant.'
      }

      expect(message.role).toBe('system')
      expect(message.content).toBe('You are a helpful assistant.')
    })

    it('timestamp 应该是可选的', () => {
      const message: Message = {
        role: 'user',
        content: 'Test message'
      }

      expect(message.timestamp).toBeUndefined()
    })
  })

  describe('ChatOptions 类型', () => {
    it('应该接受空的选项', () => {
      const options: ChatOptions = {}

      expect(options.stream).toBeUndefined()
      expect(options.temperature).toBeUndefined()
      expect(options.maxTokens).toBeUndefined()
    })

    it('应该接受流式选项', () => {
      const options: ChatOptions = {
        stream: true
      }

      expect(options.stream).toBe(true)
    })

    it('应该接受温度选项', () => {
      const options: ChatOptions = {
        temperature: 0.8
      }

      expect(options.temperature).toBe(0.8)
    })

    it('应该接受最大 tokens 选项', () => {
      const options: ChatOptions = {
        maxTokens: 2000
      }

      expect(options.maxTokens).toBe(2000)
    })

    it('应该接受所有选项', () => {
      const options: ChatOptions = {
        stream: true,
        temperature: 0.5,
        maxTokens: 4096
      }

      expect(options).toMatchObject({
        stream: true,
        temperature: 0.5,
        maxTokens: 4096
      })
    })
  })

  describe('AIResponse 类型', () => {
    it('应该接受只包含内容的响应', () => {
      const response: AIResponse = {
        content: 'This is a response'
      }

      expect(response.content).toBe('This is a response')
      expect(response.usage).toBeUndefined()
    })

    it('应该接受包含使用信息的响应', () => {
      const response: AIResponse = {
        content: 'This is a response',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      }

      expect(response.content).toBe('This is a response')
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      })
    })

    it('使用信息应该包含所有必需字段', () => {
      const usage: AIResponse['usage'] = {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300
      }

      expect(usage.promptTokens).toBe(100)
      expect(usage.completionTokens).toBe(200)
      expect(usage.totalTokens).toBe(300)
    })
  })

  describe('AIProvider 接口契约', () => {
    it('AIProvider 实现应该有 chat 方法', async () => {
      // 这是一个类型测试，确保接口正确定义
      const createMockProvider = (): AIProvider => ({
        chat: async () => ({
          content: 'Mock response'
        }),
        chatStream: async function* () {
          yield 'Mock'
          yield ' stream'
        }
      })

      const provider = createMockProvider()

      // 测试 chat 方法
      const response = await provider.chat([
        { role: 'user', content: 'Hello' }
      ])

      expect(response.content).toBe('Mock response')
    })

    it('AIProvider 实现应该有 chatStream 方法', async () => {
      const createMockProvider = (): AIProvider => ({
        chat: async () => ({
          content: 'Mock response'
        }),
        chatStream: async function* () {
          yield 'Stream'
          yield ' chunk'
        }
      })

      const provider = createMockProvider()
      const chunks: string[] = []

      // 测试 chatStream 方法
      for await (const chunk of provider.chatStream([
        { role: 'user', content: 'Hello' }
      ])) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['Stream', ' chunk'])
    })
  })
})
