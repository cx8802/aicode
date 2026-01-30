import { describe, it, expect } from 'vitest'
import type { Message, ToolCall, ToolResult } from './index'

describe('Message 类型', () => {
  it('应该接受有效的用户消息', () => {
    const message: Message = {
      role: 'user',
      content: 'Hello AI',
      timestamp: new Date()
    }
    expect(message.role).toBe('user')
    expect(message.content).toBe('Hello AI')
    expect(message.timestamp).toBeInstanceOf(Date)
  })

  it('应该接受有效的助手消息', () => {
    const message: Message = {
      role: 'assistant',
      content: 'Here is your code'
    }
    expect(message.role).toBe('assistant')
    expect(message.content).toBe('Here is your code')
  })

  it('应该接受有效的系统消息', () => {
    const message: Message = {
      role: 'system',
      content: 'You are a helpful assistant'
    }
    expect(message.role).toBe('system')
  })

  it('timestamp 应该是可选的', () => {
    const message: Message = {
      role: 'user',
      content: 'Test message'
    }
    expect(message.timestamp).toBeUndefined()
  })
})

describe('ToolCall 类型', () => {
  it('应该接受有效的工具调用', () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      parameters: {
        path: '/test/file.txt'
      }
    }
    expect(toolCall.name).toBe('readFile')
    expect(toolCall.parameters).toEqual({ path: '/test/file.txt' })
  })

  it('应该接受复杂的参数', () => {
    const toolCall: ToolCall = {
      name: 'searchCode',
      parameters: {
        query: 'test',
        filters: { language: 'typescript' },
        limit: 10
      }
    }
    expect(toolCall.parameters.filters).toEqual({ language: 'typescript' })
  })
})

describe('ToolResult 类型', () => {
  it('应该接受成功的结果', () => {
    const result: ToolResult = {
      success: true,
      data: { content: 'file content' }
    }
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ content: 'file content' })
  })

  it('应该接受失败的结果', () => {
    const result: ToolResult = {
      success: false,
      error: 'File not found'
    }
    expect(result.success).toBe(false)
    expect(result.error).toBe('File not found')
  })

  it('data 应该是可选的', () => {
    const result: ToolResult = {
      success: true
    }
    expect(result.data).toBeUndefined()
  })

  it('error 应该是可选的', () => {
    const result: ToolResult = {
      success: false
    }
    expect(result.error).toBeUndefined()
  })
})
