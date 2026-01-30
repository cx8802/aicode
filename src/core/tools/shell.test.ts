/**
 * Shell 工具测试
 * 测试驱动开发 - 红灯阶段
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { shellTools } from './shell'
import { Logger } from '../../utils/logger'

describe('exec 工具', () => {
  let logger: Logger

  beforeEach(() => {
    logger = new Logger({ silent: true })
  })

  it('应该成功执行命令', async () => {
    const result = await shellTools.exec.execute(
      { command: 'echo', args: ['hello', 'world'] },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('stdout')
    expect(result.data?.stdout).toContain('hello world')
  })

  it('应该捕获 stderr', async () => {
    const result = await shellTools.exec.execute(
      { command: 'node', args: ['-e', 'console.error("error message")'] },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('stderr')
    expect(result.data?.stderr).toContain('error message')
  })

  it('应该处理命令失败', async () => {
    const result = await shellTools.exec.execute(
      { command: 'exit', args: ['1'] },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(false)
    expect(result.data).toHaveProperty('exitCode')
    expect(result.data?.exitCode).toBe(1)
  })

  it('应该支持超时控制', async () => {
    const result = await shellTools.exec.execute(
      { command: 'node', args: ['-e', 'setTimeout(() => {}, 10000)'], timeout: 100 },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('timeout')
  })

  it('应该验证必需参数', async () => {
    const result = await shellTools.exec.execute(
      { args: ['test'] },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(false)
  })

  it('应该支持空参数数组', async () => {
    const result = await shellTools.exec.execute(
      { command: 'echo', args: [] },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(true)
  })

  it('应该支持环境变量', async () => {
    const result = await shellTools.exec.execute(
      {
        command: 'node',
        args: ['-e', 'console.log(process.env.TEST_VAR)'],
        env: { TEST_VAR: 'test-value' }
      },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(true)
    expect(result.data?.stdout).toContain('test-value')
  })

  it('应该支持工作目录', async () => {
    const result = await shellTools.exec.execute(
      {
        command: 'node',
        args: ['-e', 'console.log(process.cwd())'],
        cwd: '/tmp'
      },
      { workspace: process.cwd(), logger }
    )

    expect(result.success).toBe(true)
    // Windows 和 Unix 路径不同
    expect(result.data?.stdout).toBeTruthy()
  })
})
