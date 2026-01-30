import { describe, it, expect } from 'vitest'
import {
  AnthropicConfigSchema,
  OpenAIConfigSchema,
  AIConfigSchema,
  UIConfigSchema,
  ConfigSchema,
  type AnthropicConfig,
  type OpenAIConfig,
  type AIConfig,
  type UIConfig,
  type Config
} from './schema'

describe('AnthropicConfigSchema', () => {
  it('应该验证有效的 Anthropic 配置', () => {
    const input = {
      apiKey: 'sk-ant-123456',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7
    }

    const result = AnthropicConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  it('应该接受部分配置', () => {
    const input = {
      apiKey: 'sk-ant-123456'
    }

    const result = AnthropicConfigSchema.partial().safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.apiKey).toBe('sk-ant-123456')
      // partial 不会应用默认值，只做字段可选
    }
  })

  it('应该拒绝缺少 API key 的配置', () => {
    const input = {
      model: 'claude-3-5-sonnet-20241022'
    }

    const result = AnthropicConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('应该拒绝无效的 maxTokens', () => {
    const input = {
      apiKey: 'sk-ant-123456',
      maxTokens: -1
    }

    const result = AnthropicConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('应该拒绝无效的 temperature', () => {
    const input = {
      apiKey: 'sk-ant-123456',
      temperature: 1.5
    }

    const result = AnthropicConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('OpenAIConfigSchema', () => {
  it('应该验证有效的 OpenAI 配置', () => {
    const input = {
      apiKey: 'sk-openai-123456',
      model: 'gpt-4-turbo',
      maxTokens: 4096,
      temperature: 0.7
    }

    const result = OpenAIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  it('应该拒绝缺少 API key 的配置', () => {
    const input = {
      model: 'gpt-4-turbo'
    }

    const result = OpenAIConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('AIConfigSchema', () => {
  it('应该验证有效的 AI 配置（Anthropic）', () => {
    const input = {
      provider: 'anthropic' as const,
      anthropic: {
        apiKey: 'sk-ant-123456'
      }
    }

    const result = AIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe('anthropic')
    }
  })

  it('应该验证有效的 AI 配置（OpenAI）', () => {
    const input = {
      provider: 'openai' as const,
      openai: {
        apiKey: 'sk-openai-123456'
      }
    }

    const result = AIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe('openai')
    }
  })

  it('应该应用默认 provider 为 anthropic', () => {
    const input = {}

    const result = AIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe('anthropic')
    }
  })

  it('应该拒绝无效的 provider', () => {
    const input = {
      provider: 'invalid'
    }

    const result = AIConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('UIConfigSchema', () => {
  it('应该验证有效的 UI 配置', () => {
    const input = {
      theme: 'dark' as const,
      streamOutput: true,
      showLineNumbers: true
    }

    const result = UIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  it('应该应用默认值', () => {
    const input = {}

    const result = UIConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.theme).toBe('dark')
      expect(result.data.streamOutput).toBe(true)
      expect(result.data.showLineNumbers).toBe(true)
    }
  })

  it('应该拒绝无效的 theme', () => {
    const input = {
      theme: 'invalid'
    }

    const result = UIConfigSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('ConfigSchema', () => {
  it('应该验证完整的配置', () => {
    const input = {
      ai: {
        provider: 'anthropic' as const,
        anthropic: {
          apiKey: 'sk-ant-123456'
        }
      },
      ui: {
        theme: 'dark' as const,
        streamOutput: true,
        showLineNumbers: true
      },
      workspace: '/path/to/workspace'
    }

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('应该应用所有默认值', () => {
    const input = {
      ai: {
        provider: 'anthropic' as const,
        anthropic: {
          apiKey: 'sk-ant-123456'
        }
      }
    }

    const result = ConfigSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ui.theme).toBe('dark')
      expect(result.data.ui.streamOutput).toBe(true)
      expect(result.data.ui.showLineNumbers).toBe(true)
      expect(result.data.workspace).toBeDefined()
    }
  })
})
