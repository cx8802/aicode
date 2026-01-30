/**
 * 工具系统基础接口测试
 * 测试驱动开发 - 红灯阶段
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { Tool, ToolContext, ToolResult, createToolError, isToolError } from './base'

describe('Tool 基础接口', () => {
  it('应该定义工具接口', () => {
    const mockTool: Tool = {
      name: 'test_tool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string()
      }),
      execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
        return {
          success: true,
          data: { result: 'ok' }
        }
      }
    }

    expect(mockTool.name).toBe('test_tool')
    expect(mockTool.description).toBe('A test tool')
    expect(typeof mockTool.execute).toBe('function')
  })

  it('应该验证工具参数', async () => {
    const mockTool: Tool = {
      name: 'validated_tool',
      description: 'A tool with parameter validation',
      parameters: z.object({
        count: z.number().int().min(0).max(100)
      }),
      execute: async (params: unknown): Promise<ToolResult> => {
        const validated = mockTool.parameters.parse(params)
        return {
          success: true,
          data: { count: validated.count }
        }
      }
    }

    // 有效参数应该通过
    const validResult = await mockTool.execute({ count: 50 }, { workspace: '/test', logger: console as any })
    expect(validResult.success).toBe(true)
    expect(validResult.data).toEqual({ count: 50 })

    // 无效参数应该抛出 ZodError
    await expect(mockTool.execute({ count: 150 }, { workspace: '/test', logger: console as any }))
      .rejects.toThrow()
  })

  it('应该使用工具上下文', async () => {
    let capturedContext: ToolContext | undefined

    const mockTool: Tool = {
      name: 'context_tool',
      description: 'A tool that uses context',
      parameters: z.object({}),
      execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
        capturedContext = context
        return {
          success: true,
          data: { workspace: context.workspace }
        }
      }
    }

    const testContext: ToolContext = {
      workspace: '/test/workspace',
      logger: console as any
    }

    const result = await mockTool.execute({}, testContext)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ workspace: '/test/workspace' })
    expect(capturedContext).toEqual(testContext)
  })

  it('应该返回工具结果', async () => {
    const successResult: ToolResult = {
      success: true,
      data: { value: 42 }
    }

    expect(successResult.success).toBe(true)
    expect(successResult.data).toEqual({ value: 42 })

    const failureResult: ToolResult = {
      success: false,
      error: 'Something went wrong'
    }

    expect(failureResult.success).toBe(false)
    expect(failureResult.error).toBe('Something went wrong')
  })
})

describe('createToolError', () => {
  it('应该创建工具错误对象', () => {
    const error = createToolError('TEST_ERROR', 'Test error message', { detail: 'info' })

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Test error message')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.details).toEqual({ detail: 'info' })
  })

  it('应该创建不带详情的工具错误', () => {
    const error = createToolError('SIMPLE_ERROR', 'Simple error')

    expect(error.message).toBe('Simple error')
    expect(error.code).toBe('SIMPLE_ERROR')
    expect(error.details).toBeUndefined()
  })
})

describe('isToolError', () => {
  it('应该识别工具错误', () => {
    const toolError = createToolError('TEST', 'Test message')
    expect(isToolError(toolError)).toBe(true)
  })

  it('应该区分普通错误和工具错误', () => {
    const normalError = new Error('Normal error')
    expect(isToolError(normalError)).toBe(false)
  })

  it('应该处理 undefined/null', () => {
    expect(isToolError(undefined)).toBe(false)
    expect(isToolError(null)).toBe(false)
  })
})

describe('ToolContext', () => {
  it('应该验证工具上下文结构', () => {
    const context: ToolContext = {
      workspace: '/workspace',
      logger: console as any
    }

    expect(context.workspace).toBe('/workspace')
    expect(context.logger).toBeDefined()
  })

  it('应该允许不同类型的 logger', () => {
    const customLogger = {
      info: () => {},
      error: () => {}
    }

    const context: ToolContext = {
      workspace: '/workspace',
      logger: customLogger as any
    }

    expect(context.logger.info).toBeDefined()
    expect(context.logger.error).toBeDefined()
  })
})

describe('ToolResult', () => {
  it('应该支持成功的带数据结果', () => {
    const result: ToolResult = {
      success: true,
      data: { items: ['a', 'b', 'c'], count: 3 }
    }

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ items: ['a', 'b', 'c'], count: 3 })
    expect(result.error).toBeUndefined()
  })

  it('应该支持成功的不带数据结果', () => {
    const result: ToolResult = {
      success: true
    }

    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeUndefined()
  })

  it('应该支持失败结果', () => {
    const result: ToolResult = {
      success: false,
      error: 'File not found'
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('File not found')
    expect(result.data).toBeUndefined()
  })

  it('应该支持失败结果同时包含数据和错误', () => {
    const result: ToolResult = {
      success: false,
      error: 'Partial failure',
      data: { processed: 5, failed: 2 }
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('Partial failure')
    expect(result.data).toEqual({ processed: 5, failed: 2 })
  })
})
