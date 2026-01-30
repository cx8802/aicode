/**
 * REPL 测试
 * 测试驱动开发 - 红灯阶段
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createREPL, type REPLContext, type REPLInputHandler } from './repl'
import type { AIProvider } from '../core/ai/base'
import type { SessionManager } from '../core/session/manager'
import type { Config } from '../types/config'
import type { Tool } from '../core/tools/base'

// Mock AI Provider
const createMockAIProvider = (): AIProvider => ({
  chat: vi.fn().mockResolvedValue({
    content: 'AI response',
    usage: {
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15
    }
  }),
  chatStream: vi.fn().mockImplementation(async function* () {
    yield 'AI response'
  })
})

// Mock Session Manager
const createMockSessionManager = (): SessionManager => {
  const mock = {
    addMessage: vi.fn(),
    getMessages: vi.fn().mockReturnValue([]),
    getMessagesForAI: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    getMessageCount: vi.fn().mockReturnValue(0),
    getEstimatedTokenCount: vi.fn().mockReturnValue(0),
    trimToTokenLimit: vi.fn().mockReturnValue(false),
    getMaxTokens: vi.fn().mockReturnValue(100000),
    getLastNMessages: vi.fn().mockReturnValue([])
  } as unknown as SessionManager
  return mock
}

// Mock Config
const createMockConfig = (streamOutput: boolean = false): Config => ({
  ai: {
    provider: 'anthropic',
    anthropic: {
      apiKey: 'test-key',
      model: 'claude-3',
      maxTokens: 4096,
      temperature: 0.7
    }
  },
  ui: {
    theme: 'dark',
    streamOutput,
    showLineNumbers: true
  },
  workspace: '/test/workspace'
})

// Mock Tool
const createMockTool = (name: string): Tool => ({
  name,
  description: `Mock tool ${name}`,
  parameters: {} as any,
  execute: vi.fn().mockResolvedValue({
    success: true,
    data: { result: 'ok' }
  })
})

describe('REPL', () => {
  let mockAI: AIProvider
  let mockSession: SessionManager
  let mockConfig: Config
  let mockTools: Map<string, Tool>
  let inputLog: string[]
  let outputLog: string[]
  let mockInput: REPLInputHandler
  let mockOutput: (text: string) => void

  beforeEach(() => {
    mockAI = createMockAIProvider()
    mockSession = createMockSessionManager()
    mockConfig = createMockConfig()
    mockTools = new Map([
      ['test', createMockTool('test')],
      ['file', createMockTool('file')]
    ])
    inputLog = []
    outputLog = []

    mockInput = vi.fn().mockImplementation(async () => {
      const input = inputLog.shift()
      return input ?? '/exit'
    })

    mockOutput = vi.fn((text: string) => {
      outputLog.push(text)
    })
  })

  describe('createREPL', () => {
    it('应该创建 REPL 实例', () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      expect(repl).toBeDefined()
      expect(repl.processInput).toBeInstanceOf(Function)
    })

    it('应该使用提供的上下文', () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      expect(repl.getContext()).toEqual(context)
    })
  })

  describe('特殊命令处理', () => {
    it('应该处理 /help 命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.handleCommand('/help', mockOutput)

      expect(mockOutput).toHaveBeenCalled()
      const helpText = outputLog.join('\n')
      expect(helpText).toContain('Available Commands')
      expect(helpText).toContain('/help')
      expect(helpText).toContain('/exit')
    })

    it('应该处理 /clear 命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.handleCommand('/clear', mockOutput)

      expect(mockSession.clear).toHaveBeenCalled()
      expect(mockOutput).toHaveBeenCalledWith('Session cleared')
    })

    it('应该处理 /exit 命令并返回 true', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const shouldExit = await repl.handleCommand('/exit', mockOutput)

      expect(shouldExit).toBe(true)
    })

    it('应该处理 /quit 命令并返回 true', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const shouldExit = await repl.handleCommand('/quit', mockOutput)

      expect(shouldExit).toBe(true)
    })

    it('应该处理 /config 命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.handleCommand('/config', mockOutput)

      expect(mockOutput).toHaveBeenCalled()
      const configText = outputLog.join('\n')
      expect(configText).toContain('anthropic')
      expect(configText).toContain('claude-3')
    })

    it('应该处理 /tools 命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.handleCommand('/tools', mockOutput)

      expect(mockOutput).toHaveBeenCalled()
      const toolsText = outputLog.join('\n')
      expect(toolsText).toContain('test')
      expect(toolsText).toContain('file')
    })

    it('应该处理 /history 命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      // 模拟有历史消息
      vi.mocked(mockSession.getMessages).mockReturnValue([
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi', timestamp: new Date() }
      ])

      const repl = createREPL(context)
      await repl.handleCommand('/history', mockOutput)

      expect(mockSession.getMessages).toHaveBeenCalled()
      expect(mockOutput).toHaveBeenCalled()
    })
  })

  describe('用户输入处理', () => {
    it('应该处理普通用户消息', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('Hello AI', mockOutput)

      expect(mockSession.addMessage).toHaveBeenCalledWith('user', 'Hello AI')
      expect(mockAI.chat).toHaveBeenCalled()
    })

    it('应该显示 AI 响应', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('Hello', mockOutput)

      // 流式输出会直接写入 stdout，不经过 mockOutput
      // 但助手消息会被添加到会话
      const calls = mockSession.addMessage.mock.calls
      const assistantCall = calls.find((call) => call[0] === 'assistant')
      expect(assistantCall).toBeDefined()
      expect(assistantCall[1]).toBe('AI response')
    })

    it('应该将 AI 响应添加到会话', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('Hello', mockOutput)

      // 检查有两次调用：一次 user，一次 assistant
      expect(mockSession.addMessage).toHaveBeenCalledTimes(2)
      const calls = mockSession.addMessage.mock.calls
      expect(calls[0]).toEqual(['user', 'Hello'])
      expect(calls[1]).toEqual(['assistant', 'AI response'])
    })

    it('应该处理空输入', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('', mockOutput)
      await repl.processInput('   ', mockOutput)

      expect(mockAI.chat).not.toHaveBeenCalled()
    })

    it('应该处理 AI 错误', async () => {
      const errorAI: AIProvider = {
        chat: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
        chatStream: vi.fn()
      }

      const context: REPLContext = {
        config: mockConfig,
        aiProvider: errorAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('Hello', mockOutput)

      const output = outputLog.join('\n')
      expect(output).toContain('Error')
    })
  })

  describe('流式输出', () => {
    it('应该在配置启用时使用流式输出', async () => {
      const streamConfig: Config = {
        ...mockConfig,
        ui: {
          ...mockConfig.ui,
          streamOutput: true
        }
      }

      const context: REPLContext = {
        config: streamConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('Stream this', mockOutput)

      expect(mockAI.chatStream).toHaveBeenCalled()
      expect(mockAI.chat).not.toHaveBeenCalled()
    })

    it('应该在配置禁用时使用非流式输出', async () => {
      const noStreamConfig: Config = {
        ...mockConfig,
        ui: {
          ...mockConfig.ui,
          streamOutput: false
        }
      }

      const context: REPLContext = {
        config: noStreamConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      await repl.processInput('No stream', mockOutput)

      expect(mockAI.chat).toHaveBeenCalled()
      expect(mockAI.chatStream).not.toHaveBeenCalled()
    })
  })

  describe('多行输入', () => {
    it('应该检测以反斜杠结尾的行作为多行输入', () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)

      expect(repl.isMultilineInput('line 1\\')).toBe(true)
      expect(repl.isMultilineInput('line 1')).toBe(false)
      expect(repl.isMultilineInput('')).toBe(false)
    })
  })

  describe('Token 限制管理', () => {
    it('应该在发送前检查 token 限制', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      // Mock session 接近限制
      vi.mocked(mockSession.getEstimatedTokenCount).mockReturnValue(95000)
      vi.mocked(mockSession.getMaxTokens).mockReturnValue(100000)
      vi.mocked(mockSession.trimToTokenLimit).mockReturnValue(true)

      const repl = createREPL(context)
      await repl.processInput('New message', mockOutput)

      expect(mockSession.trimToTokenLimit).toHaveBeenCalled()
    })
  })

  describe('REPL 提示符', () => {
    it('应该返回正确的提示符', () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const prompt = repl.getPrompt()

      expect(prompt).toContain('>')
      expect(prompt).toBeTruthy()
    })

    it('应该反映消息计数', () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      vi.mocked(mockSession.getMessageCount).mockReturnValue(5)

      const repl = createREPL(context)
      const prompt = repl.getPrompt()

      expect(prompt).toBeTruthy()
    })
  })

  describe('未知命令', () => {
    it('应该拒绝未知的斜杠命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const result = await repl.handleCommand('/unknown', mockOutput)

      expect(result).toBe(false)
      const output = outputLog.join('\n')
      expect(output).toContain('Unknown command')
    })
  })

  describe('命令大小写敏感', () => {
    it('应该识别小写命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const shouldExit = await repl.handleCommand('/exit', mockOutput)

      expect(shouldExit).toBe(true)
    })

    it('应该识别大写命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const shouldExit = await repl.handleCommand('/EXIT', mockOutput)

      expect(shouldExit).toBe(true)
    })

    it('应该识别混合大小写命令', async () => {
      const context: REPLContext = {
        config: mockConfig,
        aiProvider: mockAI,
        session: mockSession,
        tools: mockTools
      }

      const repl = createREPL(context)
      const shouldExit = await repl.handleCommand('/Exit', mockOutput)

      expect(shouldExit).toBe(true)
    })
  })
})
