/**
 * Anthropic AI 提供商配置
 */
export interface AnthropicConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

/**
 * OpenAI 提供商配置
 */
export interface OpenAIConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

/**
 * AI 提供商类型
 */
export type AIProvider = 'anthropic' | 'openai'

/**
 * AI 配置
 */
export interface AIConfig {
  provider: AIProvider
  anthropic?: Partial<AnthropicConfig>
  openai?: Partial<OpenAIConfig>
}

/**
 * UI 主题类型
 */
export type UITheme = 'light' | 'dark'

/**
 * UI 配置
 */
export interface UIConfig {
  theme: UITheme
  streamOutput: boolean
  showLineNumbers: boolean
}

/**
 * AICode 配置
 */
export interface Config {
  ai: AIConfig
  ui: UIConfig
  workspace: string
}
