/**
 * 工具系统导出
 * 统一导出所有工具
 */

export * from './base'
export { fileTools } from './file'
export { shellTools } from './shell'

import { fileTools } from './file'
import { shellTools } from './shell'
import type { Tool } from './base'

/**
 * 所有内置工具的注册表
 */
export const builtInTools: Record<string, Tool> = {
  ...Object.entries(fileTools).reduce((acc, [name, tool]) => ({ ...acc, [name]: tool }), {} as Record<string, Tool>),
  ...Object.entries(shellTools).reduce((acc, [name, tool]) => ({ ...acc, [name]: tool }), {} as Record<string, Tool>)
}

/**
 * 获取所有工具列表
 */
export function getAllTools(): Tool[] {
  return Object.values(builtInTools)
}

/**
 * 根据名称获取工具
 */
export function getTool(name: string): Tool | undefined {
  return builtInTools[name]
}

/**
 * 检查工具是否存在
 */
export function hasTool(name: string): boolean {
  return name in builtInTools
}
