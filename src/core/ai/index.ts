/**
 * AI 提供商工厂和导出
 *
 * 提供统一的接口来创建不同的 AI 提供商实例
 */
import type { AIProvider } from './base'
import type { AIConfig, AnthropicConfig, OpenAIConfig } from '../config/schema'
import { Logger } from '../../utils/logger'
import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'

/**
 * 创建 AI 提供商实例
 *
 * @param provider 提供商类型 ('anthropic' | 'openai')
 * @param config 提供商配置
 * @param logger Logger 实例
 * @returns AI 提供商实例
 */
export function createAIProvider(
  provider: 'anthropic',
  config: AnthropicConfig,
  logger: Logger
): AnthropicProvider
export function createAIProvider(
  provider: 'openai',
  config: OpenAIConfig,
  logger: Logger
): OpenAIProvider
export function createAIProvider(
  provider: 'anthropic' | 'openai',
  config: AnthropicConfig | OpenAIConfig,
  logger: Logger
): AIProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(config as AnthropicConfig, logger)
    case 'openai':
      return new OpenAIProvider(config as OpenAIConfig, logger)
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

/**
 * 从 AI 配置创建提供商实例
 *
 * @param aiConfig AI 配置
 * @param logger Logger 实例
 * @returns AI 提供商实例
 */
export function createAIProviderFromConfig(aiConfig: AIConfig, logger: Logger): AIProvider {
  const { provider } = aiConfig

  switch (provider) {
    case 'anthropic': {
      if (!aiConfig.anthropic) {
        throw new Error('Anthropic configuration is missing')
      }

      // 验证 API key 存在
      if (!aiConfig.anthropic.apiKey || aiConfig.anthropic.apiKey.trim() === '') {
        throw new Error('Anthropic API key is required')
      }

      return new AnthropicProvider(aiConfig.anthropic, logger)
    }

    case 'openai': {
      if (!aiConfig.openai) {
        throw new Error('OpenAI configuration is missing')
      }

      // 验证 API key 存在
      if (!aiConfig.openai.apiKey || aiConfig.openai.apiKey.trim() === '') {
        throw new Error('OpenAI API key is required')
      }

      return new OpenAIProvider(aiConfig.openai, logger)
    }

    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}

// 导出所有类型和类
export * from './base'
export { AnthropicProvider, AnthropicProviderError } from './anthropic'
export { OpenAIProvider, OpenAIProviderError } from './openai'
