/**
 * AI 提供商工厂测试
 *
 * 使用 TDD 方法测试 AI 提供商工厂
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAIProvider, createAIProviderFromConfig } from './index'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import type { AIProvider } from './base'
import type { AIConfig, AnthropicConfig, OpenAIConfig } from '../config/schema'
import { Logger } from '../../utils/logger'

describe('AI Provider 工厂', () => {
  let logger: Logger

  beforeEach(() => {
    logger = new Logger({ debug: true, silent: true })
  })

  describe('createAIProvider', () => {
    it('应该创建 Anthropic 提供商', () => {
      const anthropicConfig: AnthropicConfig = {
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4096,
        temperature: 0.7
      }

      const provider = createAIProvider('anthropic', anthropicConfig, logger)

      expect(provider).toBeInstanceOf(AnthropicProvider)
    })

    it('应该创建 OpenAI 提供商', () => {
      const openaiConfig: OpenAIConfig = {
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
        maxTokens: 4096,
        temperature: 0.7
      }

      const provider = createAIProvider('openai', openaiConfig, logger)

      expect(provider).toBeInstanceOf(OpenAIProvider)
    })

    it('应该拒绝未知的提供商类型', () => {
      const invalidConfig = {
        apiKey: 'test-key'
      } as any

      expect(() => createAIProvider('unknown' as any, invalidConfig, logger)).toThrow()
    })

    it('应该拒绝无效的 Anthropic 配置', () => {
      const invalidConfig = {
        apiKey: '',
        maxTokens: 4096,
        temperature: 0.7
      } as AnthropicConfig

      expect(() => createAIProvider('anthropic', invalidConfig, logger)).toThrow()
    })

    it('应该拒绝无效的 OpenAI 配置', () => {
      const invalidConfig = {
        apiKey: '',
        maxTokens: 4096,
        temperature: 0.7
      } as OpenAIConfig

      expect(() => createAIProvider('openai', invalidConfig, logger)).toThrow()
    })
  })

  describe('createAIProviderFromConfig', () => {
    it('应该根据配置创建 Anthropic 提供商', () => {
      const aiConfig: AIConfig = {
        provider: 'anthropic',
        anthropic: {
          apiKey: 'test-key',
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 4096,
          temperature: 0.7
        }
      }

      const provider = createAIProviderFromConfig(aiConfig, logger)

      expect(provider).toBeInstanceOf(AnthropicProvider)
    })

    it('应该根据配置创建 OpenAI 提供商', () => {
      const aiConfig: AIConfig = {
        provider: 'openai',
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4-turbo',
          maxTokens: 4096,
          temperature: 0.7
        }
      }

      const provider = createAIProviderFromConfig(aiConfig, logger)

      expect(provider).toBeInstanceOf(OpenAIProvider)
    })

    it('应该在提供商配置缺失时抛出错误', () => {
      const aiConfig: AIConfig = {
        provider: 'anthropic'
        // 缺少 anthropic 配置
      }

      expect(() => createAIProviderFromConfig(aiConfig, logger)).toThrow()
    })

    it('应该使用默认提供商如果未指定', () => {
      const aiConfig: AIConfig = {
        provider: 'anthropic', // 默认值
        anthropic: {
          apiKey: 'test-key',
          maxTokens: 4096,
          temperature: 0.7
        }
      }

      const provider = createAIProviderFromConfig(aiConfig, logger)

      expect(provider).toBeInstanceOf(AnthropicProvider)
    })

    it('应该在 API key 缺失时抛出错误', () => {
      const aiConfig: AIConfig = {
        provider: 'anthropic',
        anthropic: {
          apiKey: '', // 空 API key
          maxTokens: 4096,
          temperature: 0.7
        }
      }

      expect(() => createAIProviderFromConfig(aiConfig, logger)).toThrow()
    })
  })
})
