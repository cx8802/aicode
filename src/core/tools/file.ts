/**
 * 文件工具实现
 * 提供文件读写、目录操作等文件系统工具
 */

import { promises as fs } from 'fs'
import { join, resolve, relative, isAbsolute } from 'path'
import { z } from 'zod'
import fg from 'fast-glob'
import type { Tool, ToolContext, ToolResult } from './base'

/**
 * 确保路径在工作区内（安全检查）
 * 路径解析规则：
 * - 绝对路径：直接使用，检查是否在 workspace 内
 * - 相对路径：从当前目录解析，检查是否在 workspace 内
 */
function resolveSafePath(workspace: string, filePath: string): string {
  const absoluteWorkspace = resolve(workspace)
  // 从当前目录解析路径（标准 Node.js 行为）
  const absolutePath = resolve(filePath)
  const relativePath = relative(absoluteWorkspace, absolutePath)

  // 检查路径是否逃逸出工作区
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Path is outside workspace')
  }

  return absolutePath
}

/**
 * 读取文件内容
 */
export const read_file: Tool = {
  name: 'read_file',
  description: 'Read the contents of a file. Supports different encodings including utf-8 and base64 for binary files.',
  parameters: z.object({
    path: z.string().describe('Path to the file to read'),
    encoding: z.enum(['utf-8', 'base64', 'utf-16le']).default('utf-8').describe('File encoding')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      const { path, encoding = 'utf-8' } = read_file.parameters.parse(params)

      // 安全检查
      const safePath = resolveSafePath(context.workspace, path)

      // 读取文件
      const content = await fs.readFile(safePath, encoding)

      return {
        success: true,
        data: {
          content,
          path
        }
      }
    } catch (error) {
      const err = error as Error
      // 优先检查路径是否在 workspace 外
      if (err.message.includes('outside workspace')) {
        return {
          success: false,
          error: err.message
        }
      }
      // 检查文件是否不存在
      if (err.message.includes('ENOENT')) {
        return {
          success: false,
          error: `File not found: ${typeof params === 'object' && params ? (params as any).path : params}`
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
 * 写入文件内容
 */
export const write_file: Tool = {
  name: 'write_file',
  description: 'Write content to a file. Creates parent directories if they do not exist.',
  parameters: z.object({
    path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Content to write to the file'),
    encoding: z.enum(['utf-8', 'base64', 'utf-16le']).default('utf-8').describe('File encoding')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      const { path, content, encoding = 'utf-8' } = write_file.parameters.parse(params)

      // 安全检查
      const safePath = resolveSafePath(context.workspace, path)

      // 确保父目录存在
      const parentDir = resolve(safePath, '..')
      await fs.mkdir(parentDir, { recursive: true })

      // 写入文件
      const buffer = Buffer.from(content, encoding as BufferEncoding)
      await fs.writeFile(safePath, buffer)

      return {
        success: true,
        data: {
          path,
          bytesWritten: buffer.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

/**
 * 创建目录
 */
export const create_dir: Tool = {
  name: 'create_dir',
  description: 'Create a directory at the specified path. Creates parent directories if needed.',
  parameters: z.object({
    path: z.string().describe('Path to the directory to create'),
    recursive: z.boolean().default(true).describe('Create parent directories if they do not exist')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      const { path, recursive = true } = create_dir.parameters.parse(params)

      // 安全检查
      const safePath = resolveSafePath(context.workspace, path)

      // 创建目录
      await fs.mkdir(safePath, { recursive })

      return {
        success: true,
        data: {
          path,
          created: true
        }
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

/**
 * 列出目录文件
 */
export const list_files: Tool = {
  name: 'list_files',
  description: 'List files and directories in a path. Supports pattern matching and recursion.',
  parameters: z.object({
    path: z.string().describe('Path to the directory to list'),
    pattern: z.string().default('*').describe('Glob pattern to filter files'),
    recursive: z.boolean().default(false).describe('Recursively list files in subdirectories'),
    includeStats: z.boolean().default(false).describe('Include file statistics')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      const { path, pattern = '*', recursive = false, includeStats = false } =
        list_files.parameters.parse(params)

      // 安全检查
      const safePath = resolveSafePath(context.workspace, path)

      // 检查路径是否存在
      try {
        await fs.access(safePath)
      } catch {
        return {
          success: false,
          error: `Directory not found: ${path}`
        }
      }

      // 使用 fast-glob 列出文件
      const globPattern = recursive ? `**/${pattern}` : pattern
      const files = await fg(globPattern, {
        cwd: safePath,
        absolute: false,
        onlyFiles: false,
        dot: true
      })

      // 如果需要统计信息
      let stats: Record<string, { size: number; isDirectory: boolean }> | undefined
      if (includeStats) {
        stats = {}
        for (const file of files) {
          const filePath = resolve(safePath, file)
          try {
            const stat = await fs.stat(filePath)
            stats[file] = {
              size: stat.size,
              isDirectory: stat.isDirectory()
            }
          } catch {
            stats[file] = { size: 0, isDirectory: false }
          }
        }
      }

      return {
        success: true,
        data: {
          files,
          stats,
          count: files.length
        }
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }
}

/**
 * 删除文件或目录
 */
export const delete_file: Tool = {
  name: 'delete_file',
  description: 'Delete a file or directory. Use recursive=true for non-empty directories.',
  parameters: z.object({
    path: z.string().describe('Path to the file or directory to delete'),
    recursive: z.boolean().default(false).describe('Recursively delete directories')
  }),
  execute: async (params: unknown, context: ToolContext): Promise<ToolResult> => {
    const { path, recursive = false } = delete_file.parameters.parse(params)

    try {
      // 安全检查
      const safePath = resolveSafePath(context.workspace, path)

      // 检查路径是否存在
      try {
        await fs.access(safePath)
      } catch (accessError) {
        return {
          success: false,
          error: `File or directory not found: ${path}`
        }
      }

      // 检查是否是目录
      const stat = await fs.stat(safePath)
      const isDirectory = stat.isDirectory()

      // 如果是目录且 recursive=false，检查是否为空
      if (isDirectory && !recursive) {
        const entries = await fs.readdir(safePath)
        if (entries.length > 0) {
          return {
            success: false,
            error: 'Directory not empty (use recursive=true to delete)'
          }
        }
      }

      // 删除文件或目录
      // 在 Windows 上，删除目录（即使是空目录）需要 recursive: true
      const deleteRecursive = isDirectory ? true : recursive
      await fs.rm(safePath, { recursive: deleteRecursive, force: true })

      return {
        success: true,
        data: {
          path,
          deleted: true
        }
      }
    } catch (error) {
      const err = error as Error
      // 处理各种错误消息格式
      if (err.message.includes('ENOTEMPTY') || err.message.includes('not empty')) {
        return {
          success: false,
          error: 'Directory not empty (use recursive=true to delete)'
        }
      }
      if (err.message.includes('EISDIR') && !recursive) {
        return {
          success: false,
          error: 'Directory not empty (use recursive=true to delete)'
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
 * 导出所有文件工具
 */
export const fileTools = {
  read_file,
  write_file,
  create_dir,
  list_files,
  delete_file
}
