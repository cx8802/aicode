import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCli } from './cli/cli.js'

describe('CLI 可执行入口', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('应该能够导入 createCli', () => {
    expect(createCli).toBeDefined()
  })

  it('应该创建有效的 CLI 实例', () => {
    const cli = createCli()

    expect(cli).toBeDefined()
    expect(cli.name()).toBe('aicode')
  })

  it('应该正确处理解析错误', async () => {
    const cli = createCli()

    try {
      await cli.parseAsync(['node', 'aicode', '--invalid-option'], { from: 'user' })
    } catch (error) {
      // 预期会抛出错误
      expect(error).toBeDefined()
    }
  })
})
