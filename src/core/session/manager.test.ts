/**
 * 会话管理器测试
 * 测试驱动开发 - 红灯阶段
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionManager } from './manager'
import type { SessionMessage } from './manager'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager()
  })

  describe('addMessage', () => {
    it('应该添加用户消息', () => {
      manager.addMessage('user', 'Hello')
      const messages = manager.getMessages()

      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('user')
      expect(messages[0].content).toBe('Hello')
      expect(messages[0].timestamp).toBeInstanceOf(Date)
    })

    it('应该添加助手消息', () => {
      manager.addMessage('assistant', 'Hi there')
      const messages = manager.getMessages()

      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe('assistant')
      expect(messages[0].content).toBe('Hi there')
    })

    it('应该保持消息顺序', () => {
      manager.addMessage('user', 'First')
      manager.addMessage('assistant', 'Second')
      manager.addMessage('user', 'Third')

      const messages = manager.getMessages()
      expect(messages).toHaveLength(3)
      expect(messages[0].content).toBe('First')
      expect(messages[1].content).toBe('Second')
      expect(messages[2].content).toBe('Third')
    })

    it('应该为每条消息创建独立的 timestamp', () => {
      manager.addMessage('user', 'Message 1')
      // 等待至少 1ms 确保时间戳不同
      const startTime = Date.now()
      while (Date.now() === startTime) {
        // 忙等待
      }
      manager.addMessage('assistant', 'Message 2')

      const messages = manager.getMessages()
      expect(messages[0].timestamp).not.toEqual(messages[1].timestamp)
    })
  })

  describe('getMessages', () => {
    it('应该返回所有消息', () => {
      manager.addMessage('user', 'Question 1')
      manager.addMessage('assistant', 'Answer 1')
      manager.addMessage('user', 'Question 2')

      const messages = manager.getMessages()
      expect(messages).toHaveLength(3)
    })

    it('空会话应该返回空数组', () => {
      const messages = manager.getMessages()
      expect(messages).toEqual([])
    })

    it('应该返回消息副本而不是引用', () => {
      manager.addMessage('user', 'Original')
      const messages1 = manager.getMessages()
      const messages2 = manager.getMessages()

      expect(messages1).not.toBe(messages2)
      expect(messages1).toEqual(messages2)
    })
  })

  describe('clear', () => {
    it('应该清除所有消息', () => {
      manager.addMessage('user', 'Message 1')
      manager.addMessage('assistant', 'Message 2')
      expect(manager.getMessages()).toHaveLength(2)

      manager.clear()

      expect(manager.getMessages()).toEqual([])
    })

    it('清除后应该能够添加新消息', () => {
      manager.addMessage('user', 'Old')
      manager.clear()
      manager.addMessage('user', 'New')

      const messages = manager.getMessages()
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('New')
    })
  })

  describe('token limit management', () => {
    it('应该有默认的最大 token 限制', () => {
      const limit = manager.getMaxTokens()
      expect(limit).toBe(100000)
    })

    it('应该允许设置自定义最大 token 限制', () => {
      manager = new SessionManager({ maxTokens: 50000 })
      expect(manager.getMaxTokens()).toBe(50000)
    })

    it('应该计算当前 token 估算', () => {
      manager.addMessage('user', 'This is a test message')
      const count = manager.getEstimatedTokenCount()

      // 粗略估算：英文约 4 字符/token，中文约 2 字符/token
      expect(count).toBeGreaterThan(0)
    })

    it('应该正确估算多个消息的 token 数', () => {
      manager.addMessage('user', 'First message with some content')
      manager.addMessage('assistant', 'Response with more content here')
      manager.addMessage('user', 'Another user message')

      const count = manager.getEstimatedTokenCount()
      expect(count).toBeGreaterThan(10)
    })

    it('当超出限制时应该裁剪消息', () => {
      manager = new SessionManager({ maxTokens: 100 })

      // 添加超过限制的消息
      for (let i = 0; i < 10; i++) {
        manager.addMessage('user', `This is message number ${i} with some content`)
      }

      const wasTrimmed = manager.trimToTokenLimit()
      expect(wasTrimmed).toBe(true)

      const count = manager.getEstimatedTokenCount()
      expect(count).toBeLessThanOrEqual(100)
    })

    it('裁剪时应该保留最近的消息', () => {
      manager = new SessionManager({ maxTokens: 50 })

      manager.addMessage('user', 'Old message that should be removed')
      manager.addMessage('assistant', 'Also old')
      manager.addMessage('user', 'Recent message to keep')

      manager.trimToTokenLimit()

      const messages = manager.getMessages()
      // 应该保留最近的消息（因为它们在数组末尾）
      const hasRecentMessage = messages.some((m) =>
        m.content.includes('Recent message')
      )
      expect(hasRecentMessage).toBe(true)
    })

    it('未超出限制时 trimToTokenLimit 应该返回 false', () => {
      manager.addMessage('user', 'Short message')

      const wasTrimmed = manager.trimToTokenLimit()
      expect(wasTrimmed).toBe(false)
      expect(manager.getMessages()).toHaveLength(1)
    })
  })

  describe('getLastNMessages', () => {
    it('应该返回最后 N 条消息', () => {
      for (let i = 0; i < 5; i++) {
        manager.addMessage('user', `Message ${i}`)
      }

      const last3 = manager.getLastNMessages(3)
      expect(last3).toHaveLength(3)
      expect(last3[0].content).toBe('Message 2')
      expect(last3[1].content).toBe('Message 3')
      expect(last3[2].content).toBe('Message 4')
    })

    it('当 N 大于消息数时应该返回所有消息', () => {
      manager.addMessage('user', 'Only message')

      const last10 = manager.getLastNMessages(10)
      expect(last10).toHaveLength(1)
    })

    it('N 为 0 时应该返回空数组', () => {
      manager.addMessage('user', 'Message')

      const last0 = manager.getLastNMessages(0)
      expect(last0).toEqual([])
    })
  })

  describe('getMessagesForAI', () => {
    it('应该返回 AI 可以使用的消息格式', () => {
      manager.addMessage('user', 'Hello')

      const aiMessages = manager.getMessagesForAI()

      expect(aiMessages).toHaveLength(1)
      expect(aiMessages[0]).toHaveProperty('role')
      expect(aiMessages[0]).toHaveProperty('content')
    })

    it('不应该包含 timestamp（AI 不需要）', () => {
      manager.addMessage('user', 'Test')

      const aiMessages = manager.getMessagesForAI()

      expect(aiMessages[0]).not.toHaveProperty('timestamp')
    })
  })

  describe('getMessageCount', () => {
    it('应该返回消息总数', () => {
      expect(manager.getMessageCount()).toBe(0)

      manager.addMessage('user', '1')
      expect(manager.getMessageCount()).toBe(1)

      manager.addMessage('assistant', '2')
      expect(manager.getMessageCount()).toBe(2)

      manager.addMessage('user', '3')
      expect(manager.getMessageCount()).toBe(3)
    })
  })
})
