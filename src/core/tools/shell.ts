/**
 * Shell 工具实现
 * 提供命令执行功能
 */

import { z } from 'zod'
import { execa } from 'execa'
import type { Tool, ToolContext, ToolResult } from './base'

/**
 * 执行 shell 命令
 */
export const exec: Tool = {
  name: 'exec',
  description: 'Execute a shell command. Supports timeout, environment variables, and custom working directory.',
  parameters: z.object({
    command: z.string().describe('Command to execute'),
    args: z.array(z.string()).default([]).describe('Command arguments'),
    timeout: z.number().int().positive().default(30000).describe('Timeout in milliseconds'),
    cwd: z.string().optional().describe('Working directory'),
    env: z.record(z.string()).optional().describe('Environment variables')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      const { command, args = [], timeout, cwd, env } = exec.parameters.parse(params)

      // 准备环境变量（只包含字符串值）
      const execEnv: Record<string, string> = {}
      if (env) {
        Object.assign(execEnv, process.env)
        Object.assign(execEnv, env)
      } else {
        Object.assign(execEnv, process.env)
      }

      // 执行命令
      const result = await execa(command, args, {
        timeout,
        cwd: cwd || context.workspace,
        env: execEnv,
        reject: false,
        stdout: 'pipe',
        stderr: 'pipe'
      })

      // 检查退出码
      if (result.exitCode !== 0) {
        return {
          success: false,
          data: {
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
            exitCode: result.exitCode,
            failed: true
          }
        }
      }

      return {
        success: true,
        data: {
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString(),
          exitCode: result.exitCode
        }
      }
    } catch (error) {
      const err = error as Error & { timedOut?: boolean }
      // 处理超时
      if (err.timedOut || err.message.includes('timed out')) {
        return {
          success: false,
          error: `Command timed out`
        }
      }
      // 处理命令未找到
      if (err.message.includes('command not found') || err.message.includes('ENOENT')) {
        return {
          success: false,
          error: `Command not found`
        }
      }
      return {
        success: false,
        error: err.message
      }
    }
  }
}

/**
 * 导出所有 shell 工具
 */
export const shellTools = {
  exec
}
