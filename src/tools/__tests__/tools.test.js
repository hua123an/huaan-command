import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useToolExecutor } from '../executor'
import { getTool, getToolsByCategory } from '../index'
import { validateToolParams, detectDangerousOperation } from '../validator'

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

describe('工具系统测试', () => {
  describe('工具注册', () => {
    it('应该能够获取工具', () => {
      const tool = getTool('read_file')
      expect(tool).toBeDefined()
      expect(tool.name).toBe('read_file')
      expect(tool.category).toBe('filesystem')
    })

    it('应该能够按类别获取工具', () => {
      const fsTools = getToolsByCategory('filesystem')
      expect(fsTools.length).toBeGreaterThan(0)
      expect(fsTools.every(t => t.category === 'filesystem')).toBe(true)
    })

    it('应该正确设置工具图标', () => {
      const tool = getTool('read_file')
      expect(tool.icon).toBe('📄')
    })
  })

  describe('参数验证', () => {
    it('应该验证 read_file 参数', () => {
      const tool = getTool('read_file')

      // 缺少参数
      const result1 = validateToolParams(tool, {})
      expect(result1.valid).toBe(false)
      expect(result1.errors).toContain('缺少 path 参数')

      // 参数完整
      const result2 = validateToolParams(tool, { path: '/test.txt' })
      expect(result2.valid).toBe(true)
      expect(result2.errors).toHaveLength(0)
    })

    it('应该验证 write_file 参数', () => {
      const tool = getTool('write_file')

      // 缺少 content
      const result1 = validateToolParams(tool, { path: '/test.txt' })
      expect(result1.valid).toBe(false)
      expect(result1.errors).toContain('缺少 content 参数')

      // 参数完整
      const result2 = validateToolParams(tool, {
        path: '/test.txt',
        content: 'hello'
      })
      expect(result2.valid).toBe(true)
    })

    it('应该验证 execute_command 参数', () => {
      const tool = getTool('execute_command')

      // 缺少 cmd
      const result1 = validateToolParams(tool, {})
      expect(result1.valid).toBe(false)

      // 参数完整
      const result2 = validateToolParams(tool, { cmd: 'ls -la' })
      expect(result2.valid).toBe(true)
    })
  })

  describe('危险操作检测', () => {
    it('应该检测 rm -rf 命令', () => {
      const tool = getTool('execute_command')
      const warnings = detectDangerousOperation(tool, {
        cmd: 'rm -rf /tmp/test'
      })

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.includes('递归删除'))).toBe(true)
    })

    it('应该检测 sudo 命令', () => {
      const tool = getTool('execute_command')
      const warnings = detectDangerousOperation(tool, {
        cmd: 'sudo apt-get install package'
      })

      expect(warnings.some(w => w.includes('超级用户'))).toBe(true)
    })

    it('应该检测根目录删除', () => {
      const tool = getTool('execute_command')
      const warnings = detectDangerousOperation(tool, {
        cmd: 'rm -rf /'
      })

      expect(warnings.some(w => w.includes('根目录'))).toBe(true)
    })

    it('安全命令不应该有警告', () => {
      const tool = getTool('execute_command')
      const warnings = detectDangerousOperation(tool, {
        cmd: 'ls -la'
      })

      expect(warnings.length).toBe(0)
    })
  })

  describe('工具执行器', () => {
    let executor
    let mockInvoke

    beforeEach(() => {
      const { invoke } = require('@tauri-apps/api/core')
      mockInvoke = invoke
      mockInvoke.mockClear()

      executor = useToolExecutor({
        currentDir: '/test/project',
        sessionId: 'test-session'
      })
    })

    it('应该能够执行工具', async () => {
      mockInvoke.mockResolvedValue('file content')

      const result = await executor.executeTool('read_file', {
        path: '/test.txt'
      })

      expect(result.success).toBe(true)
      expect(result.output).toBe('file content')
      expect(mockInvoke).toHaveBeenCalledWith('read_file', {
        path: '/test.txt'
      })
    })

    it('应该记录执行历史', async () => {
      mockInvoke.mockResolvedValue('result')

      await executor.executeTool('read_file', { path: '/test.txt' })

      expect(executor.executionHistory.value.length).toBe(1)
      expect(executor.executionHistory.value[0].tool).toBe('read_file')
      expect(executor.executionHistory.value[0].result.success).toBe(true)
    })

    it('应该处理执行错误', async () => {
      mockInvoke.mockRejectedValue(new Error('File not found'))

      await expect(
        executor.executeTool('read_file', { path: '/nonexistent.txt' })
      ).rejects.toThrow('File not found')

      expect(executor.lastResult.value.result.success).toBe(false)
    })

    it('应该支持批量执行', async () => {
      mockInvoke.mockImplementation((cmd) => {
        if (cmd === 'read_file') return Promise.resolve('content')
        if (cmd === 'list_files') return Promise.resolve(['file1', 'file2'])
        return Promise.resolve({})
      })

      const results = await executor.executeBatch([
        { tool: 'read_file', params: { path: '/test.txt' } },
        { tool: 'list_files', params: { dir: '/test' } }
      ])

      expect(results.length).toBe(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('应该在批量执行时支持 stopOnError', async () => {
      mockInvoke
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('not executed')

      const results = await executor.executeBatch([
        { tool: 'read_file', params: { path: '/test1.txt' } },
        { tool: 'read_file', params: { path: '/test2.txt' } },
        { tool: 'read_file', params: { path: '/test3.txt' } }
      ], { stopOnError: true })

      expect(results.length).toBe(2) // 第三个没有执行
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })

    it('应该统计工具使用情况', async () => {
      mockInvoke.mockResolvedValue('result')

      // 执行多次
      await executor.executeTool('read_file', { path: '/test1.txt' })
      await executor.executeTool('read_file', { path: '/test2.txt' })

      mockInvoke.mockRejectedValue(new Error('error'))
      await executor.executeTool('read_file', { path: '/test3.txt' })
        .catch(() => {})

      const stats = executor.toolStats.value
      expect(stats.read_file).toBeDefined()
      expect(stats.read_file.count).toBe(3)
      expect(stats.read_file.successCount).toBe(2)
      expect(stats.read_file.failureCount).toBe(1)
    })
  })

  describe('权限控制', () => {
    it('write_file 应该需要批准', () => {
      const tool = getTool('write_file')
      expect(tool.needsApproval).toBe(true)
    })

    it('read_file 不应该需要批准', () => {
      const tool = getTool('read_file')
      expect(tool.needsApproval).toBe(false)
    })

    it('危险命令应该需要批准', () => {
      const tool = getTool('execute_command')
      expect(tool.needsApproval({ cmd: 'rm -rf dir' })).toBe(true)
      expect(tool.needsApproval({ cmd: 'sudo command' })).toBe(true)
    })

    it('安全命令不应该需要批准', () => {
      const tool = getTool('execute_command')
      expect(tool.needsApproval({ cmd: 'ls -la' })).toBe(false)
      expect(tool.needsApproval({ cmd: 'cat file.txt' })).toBe(false)
    })
  })

  describe('工具分类', () => {
    it('应该包含所有预期的分类', () => {
      const categories = [
        'filesystem',
        'execution',
        'navigation',
        'analysis',
        'git',
        'system',
        'network'
      ]

      categories.forEach(category => {
        const tools = getToolsByCategory(category)
        expect(tools.length).toBeGreaterThan(0)
      })
    })

    it('文件系统工具应该在正确的分类中', () => {
      const fsTools = getToolsByCategory('filesystem')
      const toolNames = fsTools.map(t => t.name)

      expect(toolNames).toContain('read_file')
      expect(toolNames).toContain('write_file')
      expect(toolNames).toContain('list_files')
      expect(toolNames).toContain('search_files')
    })

    it('Git 工具应该在正确的分类中', () => {
      const gitTools = getToolsByCategory('git')
      const toolNames = gitTools.map(t => t.name)

      expect(toolNames).toContain('git_status')
      expect(toolNames).toContain('git_diff')
      expect(toolNames).toContain('git_log')
      expect(toolNames).toContain('git_branch')
    })
  })
})
