/**
 * 文件工具测试
 * 测试驱动开发 - 红灯阶段
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { fileTools } from './file'
import { Logger } from '../../utils/logger'

describe('read_file 工具', () => {
  const testDir = 'test-file-tools'
  const testFile = join(testDir, 'test.txt')
  let logger: Logger

  beforeEach(async () => {
    logger = new Logger({ silent: true })
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('应该成功读取文件', async () => {
    const content = 'Hello, World!'
    await fs.writeFile(testFile, content, 'utf-8')

    const result = await fileTools.read_file.execute(
      { path: testFile },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ content, path: testFile })
  })

  it('应该处理文件不存在的情况', async () => {
    const result = await fileTools.read_file.execute(
      { path: 'non-existent.txt' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('应该拒绝路径遍历攻击', async () => {
    const result = await fileTools.read_file.execute(
      { path: '../../../etc/passwd' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('outside workspace')
  })

  it('应该验证必需参数', async () => {
    const result = await fileTools.read_file.execute(
      {},
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('应该读取二进制文件（base64编码）', async () => {
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff])
    await fs.writeFile(join(testDir, 'binary.bin'), binaryContent)

    const result = await fileTools.read_file.execute(
      { path: join(testDir, 'binary.bin'), encoding: 'base64' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('content')
  })

  it('应该处理空文件', async () => {
    await fs.writeFile(testFile, '', 'utf-8')

    const result = await fileTools.read_file.execute(
      { path: testFile },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ content: '', path: testFile })
  })
})

describe('write_file 工具', () => {
  const testDir = 'test-file-tools-write'
  const testFile = join(testDir, 'output.txt')
  let logger: Logger

  beforeEach(async () => {
    logger = new Logger({ silent: true })
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('应该成功写入文件', async () => {
    const content = 'New content'

    const result = await fileTools.write_file.execute(
      { path: testFile, content },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ path: testFile, bytesWritten: content.length })

    const writtenContent = await fs.readFile(testFile, 'utf-8')
    expect(writtenContent).toBe(content)
  })

  it('应该覆盖已存在的文件', async () => {
    await fs.writeFile(testFile, 'Old content', 'utf-8')

    const newContent = 'Updated content'
    const result = await fileTools.write_file.execute(
      { path: testFile, content: newContent },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)

    const writtenContent = await fs.readFile(testFile, 'utf-8')
    expect(writtenContent).toBe(newContent)
  })

  it('应该创建不存在的目录', async () => {
    const nestedFile = join(testDir, 'subdir', 'nested', 'file.txt')

    const result = await fileTools.write_file.execute(
      { path: nestedFile, content: 'nested content' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)

    const exists = await fs.access(nestedFile).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('应该拒绝路径遍历攻击', async () => {
    const result = await fileTools.write_file.execute(
      { path: '../../../etc/passwd', content: 'malicious' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('outside workspace')
  })

  it('应该验证必需参数', async () => {
    const result = await fileTools.write_file.execute(
      { path: testFile },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
  })

  it('应该支持创建目录', async () => {
    const dirPath = join(testDir, 'newdir')

    const result = await fileTools.create_dir.execute(
      { path: dirPath },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)

    const stat = await fs.stat(dirPath)
    expect(stat.isDirectory()).toBe(true)
  })

  it('应该处理已存在的目录（创建目录）', async () => {
    const dirPath = join(testDir, 'existing')
    await fs.mkdir(dirPath)

    const result = await fileTools.create_dir.execute(
      { path: dirPath },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
  })
})

describe('list_files 工具', () => {
  const testDir = 'test-file-tools-list'
  let logger: Logger

  beforeEach(async () => {
    logger = new Logger({ silent: true })
    await fs.mkdir(testDir, { recursive: true })

    // 创建测试文件结构
    await fs.writeFile(join(testDir, 'file1.txt'), 'content1')
    await fs.writeFile(join(testDir, 'file2.md'), 'content2')
    await fs.mkdir(join(testDir, 'subdir'), { recursive: true })
    await fs.writeFile(join(testDir, 'subdir', 'nested.txt'), 'nested')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('应该列出目录中的文件', async () => {
    const result = await fileTools.list_files.execute(
      { path: testDir },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('files')
    const files = result.data?.files as string[]
    expect(files).toContain('file1.txt')
    expect(files).toContain('file2.md')
    expect(files).toContain('subdir')
  })

  it('应该支持递归列出', async () => {
    const result = await fileTools.list_files.execute(
      { path: testDir, recursive: true },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    const files = result.data?.files as string[]
    expect(files.length).toBeGreaterThan(3)
    expect(files.some(f => f.includes('nested.txt'))).toBe(true)
  })

  it('应该支持模式过滤', async () => {
    const result = await fileTools.list_files.execute(
      { path: testDir, pattern: '*.txt' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    const files = result.data?.files as string[]
    expect(files).toContain('file1.txt')
    expect(files).not.toContain('file2.md')
  })

  it('应该处理不存在的目录', async () => {
    const result = await fileTools.list_files.execute(
      { path: join(testDir, 'nonexistent') },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('应该拒绝路径遍历攻击', async () => {
    const result = await fileTools.list_files.execute(
      { path: '../../../' },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('outside workspace')
  })

  it('应该返回文件统计信息', async () => {
    const result = await fileTools.list_files.execute(
      { path: testDir, includeStats: true },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('files')
    expect(result.data).toHaveProperty('stats')
  })
})

describe('delete_file 工具', () => {
  const testDir = 'test-file-tools-delete'
  let logger: Logger

  beforeEach(async () => {
    logger = new Logger({ silent: true })
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(join(testDir, 'to-delete.txt'), 'content')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('应该成功删除文件', async () => {
    const filePath = join(testDir, 'to-delete.txt')

    const result = await fileTools.delete_file.execute(
      { path: filePath },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)

    const exists = await fs.access(filePath).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('应该成功删除空目录', async () => {
    const dirPath = join(testDir, 'empty-dir')
    await fs.mkdir(dirPath)

    const result = await fileTools.delete_file.execute(
      { path: dirPath },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)

    const exists = await fs.access(dirPath).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })

  it('应该支持递归删除目录', async () => {
    const dirPath = join(testDir, 'non-empty')
    await fs.mkdir(join(dirPath, 'nested'), { recursive: true })
    await fs.writeFile(join(dirPath, 'nested', 'file.txt'), 'content')

    const result = await fileTools.delete_file.execute(
      { path: dirPath, recursive: true },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(true)
  })

  it('应该拒绝删除非空目录（非递归）', async () => {
    const dirPath = join(testDir, 'non-empty')
    await fs.mkdir(join(dirPath, 'nested'), { recursive: true })
    await fs.writeFile(join(dirPath, 'nested', 'file.txt'), 'content')

    const result = await fileTools.delete_file.execute(
      { path: dirPath, recursive: false },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not empty')
  })

  it('应该处理不存在的文件', async () => {
    const result = await fileTools.delete_file.execute(
      { path: join(testDir, 'non-existent.txt') },
      { workspace: testDir, logger }
    )

    expect(result.success).toBe(false)
  })
})
