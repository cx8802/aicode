import { z } from 'zod'

/**
 * Anthropic AI 提供商配置 Schema
 */
export const AnthropicConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('claude-3-5-sonnet-20241022'),
  maxTokens: z.number().int().min(1).default(4096),
  temperature: z.number().min(0).max(1).default(0.7)
})

/**
 * OpenAI 提供商配置 Schema
 */
export const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().default('gpt-4-turbo'),
  maxTokens: z.number().int().min(1).default(4096),
  temperature: z.number().min(0).max(1).default(0.7)
})

/**
 * AI 配置 Schema
 */
export const AIConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai']).default('anthropic'),
  anthropic: AnthropicConfigSchema.partial().optional(),
  openai: OpenAIConfigSchema.partial().optional()
})

/**
 * UI 配置 Schema
 */
export const UIConfigSchema = z.object({
  theme: z.enum(['light', 'dark']).default('dark'),
  streamOutput: z.boolean().default(true),
  showLineNumbers: z.boolean().default(true)
})

/**
 * 主配置原始 Schema
 */
const RawConfigSchema = z.object({
  ai: AIConfigSchema.optional(),
  ui: UIConfigSchema.optional(),
  workspace: z.string().optional()
})

/**
 * UI 配置默认值
 */
const defaultUIConfig = {
  theme: 'dark' as const,
  streamOutput: true,
  showLineNumbers: true
}

/**
 * AI 配置默认值
 */
const defaultAIConfig = {
  provider: 'anthropic' as const,
  anthropic: undefined,
  openai: undefined
}

/**
 * 主配置 Schema（带默认值合并）
 */
export const ConfigSchema: z.ZodType<{
  ai: z.infer<typeof AIConfigSchema>
  ui: z.infer<typeof UIConfigSchema>
  workspace: string
}> = RawConfigSchema.transform((data) => ({
  ai: data.ai ? { ...defaultAIConfig, ...data.ai } : defaultAIConfig,
  ui: data.ui ? { ...defaultUIConfig, ...data.ui } : defaultUIConfig,
  workspace: data.workspace ?? process.cwd()
}))

// 导出类型
export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>
export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>
export type AIConfig = z.infer<typeof AIConfigSchema>
export type UIConfig = z.infer<typeof UIConfigSchema>
export type Config = z.infer<typeof ConfigSchema>
