import { describe, it, expect } from 'vitest'
import { createCli, Logger } from './index.js'

describe('主入口模块导出', () => {
  it('应该导出 createCli 函数', () => {
    expect(createCli).toBeDefined()
    expect(typeof createCli).toBe('function')
  })

  it('应该导出 Logger 类', () => {
    expect(Logger).toBeDefined()
    expect(typeof Logger).toBe('function')
  })

  it('createCli 应该返回有效的 Command 对象', () => {
    const cli = createCli()

    expect(cli).toBeDefined()
    expect(cli).toHaveProperty('name')
    expect(cli.name()).toBe('aicode')
  })

  it('Logger 应该可以实例化', () => {
    const logger = new Logger()

    expect(logger).toBeDefined()
    expect(logger).toBeInstanceOf(Logger)
  })
})
