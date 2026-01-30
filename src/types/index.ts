/**
 * 聊天消息类型
 */
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

/**
 * 工具调用请求
 */
export interface ToolCall {
  name: string
  parameters: Record<string, unknown>
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}
