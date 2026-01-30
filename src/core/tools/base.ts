/**
 * 工具系统基础接口
 * 定义工具的核心类型和工具函数
 */

import { z } from 'zod'

/**
 * 工具上下文 - 提供给工具执行的运行时环境
 */
export interface ToolContext {
  /** 工作区路径 */
  workspace: string
  /** 日志记录器 */
  logger: Logger
}

/**
 * 简单的日志接口
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug?(message: string, ...args: unknown[]): void
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  /** 执行是否成功 */
  success: boolean
  /** 返回的数据（成功时） */
  data?: unknown
  /** 错误信息（失败时） */
  error?: string
}

/**
 * 工具接口 - 所有工具必须实现此接口
 */
export interface Tool {
  /** 工具名称（唯一标识符） */
  name: string
  /** 工具描述 */
  description: string
  /** 参数验证 Schema（使用 Zod） */
  parameters: z.ZodSchema
  /** 执行工具 */
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>
}

/**
 * 工具错误类型
 */
export interface ToolError extends Error {
  /** 错误代码 */
  code: string
  /** 额外的错误详情 */
  details?: unknown
}

/**
 * 创建工具错误对象
 * @param code - 错误代码
 * @param message - 错误消息
 * @param details - 额外详情
 * @returns ToolError 对象
 */
export function createToolError(
  code: string,
  message: string,
  details?: unknown
): ToolError {
  const error = new Error(message) as ToolError
  error.code = code
  if (details !== undefined) {
    error.details = details
  }
  return error
}

/**
 * 检查错误是否为工具错误
 * @param error - 要检查的错误对象
 * @returns 是否为工具错误
 */
export function isToolError(error: unknown): error is ToolError {
  if (error === null || error === undefined) {
    return false
  }
  const err = error as Partial<ToolError>
  return (
    err instanceof Error &&
    typeof err.code === 'string' &&
    err.code.length > 0
  )
}
