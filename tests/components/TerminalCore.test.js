import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TerminalCore from '../../src/components/terminal/TerminalCore.vue'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}))

// Mock xterm.js
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => ({
    open: vi.fn(),
    write: vi.fn(),
    onData: vi.fn(),
    dispose: vi.fn(),
    loadAddon: vi.fn(),
    cols: 80,
    rows: 24
  }))
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => ({
    fit: vi.fn()
  }))
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn()
}))

describe('TerminalCore', () => {
  let wrapper
  let pinia

  const mockSession = {
    id: 'test-session-1',
    title: 'Test Terminal',
    shell: 'zsh'
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    
    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('组件初始化', () => {
    it('应该正确渲染终端容器', () => {
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.terminal-core').exists()).toBe(true)
      expect(wrapper.find('.terminal-container').exists()).toBe(true)
    })

    it('应该在挂载时初始化终端', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      await wrapper.vm.$nextTick()
      
      // 验证终端进程启动
      expect(invoke).toHaveBeenCalledWith('start_terminal', {
        sessionId: mockSession.id,
        shellType: 'zsh'
      })
    })

    it('应该处理初始化错误', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      invoke.mockRejectedValue(new Error('Failed to start terminal'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('终端交互', () => {
    beforeEach(async () => {
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })
      await wrapper.vm.$nextTick()
    })

    it('应该处理终端输入', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const { Terminal } = await import('@xterm/xterm')
      
      // 模拟终端输入
      const mockTerminal = Terminal.mock.results[0].value
      const onDataCallback = mockTerminal.onData.mock.calls[0][0]
      
      await onDataCallback('ls\r')
      
      expect(invoke).toHaveBeenCalledWith('write_terminal', {
        sessionId: mockSession.id,
        data: 'ls\r'
      })
    })

    it('应该处理终端输出', async () => {
      const { listen } = await import('@tauri-apps/api/event')
      const { Terminal } = await import('@xterm/xterm')
      
      // 模拟事件监听器
      const mockUnlisten = vi.fn()
      listen.mockResolvedValue(mockUnlisten)
      
      // 获取事件回调
      const eventCallback = listen.mock.calls[0][1]
      const mockTerminal = Terminal.mock.results[0].value
      
      // 模拟终端输出事件
      await eventCallback({ payload: 'Hello World\n' })
      
      expect(mockTerminal.write).toHaveBeenCalledWith('Hello World\n')
    })
  })

  describe('可见性控制', () => {
    it('应该根据 visible 属性显示/隐藏终端', async () => {
      wrapper = mount(TerminalCore, {
        props: { session: mockSession, visible: false },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.terminal-container').classes()).toContain('terminal-hidden')

      await wrapper.setProps({ visible: true })
      expect(wrapper.find('.terminal-container').classes()).not.toContain('terminal-hidden')
    })

    it('应该在可见时调整终端大小', async () => {
      const { FitAddon } = await import('@xterm/addon-fit')
      
      wrapper = mount(TerminalCore, {
        props: { session: mockSession, visible: false },
        global: { plugins: [pinia] }
      })

      const mockFitAddon = FitAddon.mock.results[0].value
      
      await wrapper.setProps({ visible: true })
      await wrapper.vm.$nextTick()
      
      expect(mockFitAddon.fit).toHaveBeenCalled()
    })
  })

  describe('资源清理', () => {
    it('应该在卸载时清理资源', async () => {
      const { listen } = await import('@tauri-apps/api/event')
      const { Terminal } = await import('@xterm/xterm')
      
      const mockUnlisten = vi.fn()
      listen.mockResolvedValue(mockUnlisten)
      
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      await wrapper.vm.$nextTick()
      
      const mockTerminal = Terminal.mock.results[0].value
      
      wrapper.unmount()
      
      expect(mockUnlisten).toHaveBeenCalled()
      expect(mockTerminal.dispose).toHaveBeenCalled()
    })
  })

  describe('暴露的方法', () => {
    beforeEach(async () => {
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })
      await wrapper.vm.$nextTick()
    })

    it('应该暴露 resize 方法', () => {
      expect(typeof wrapper.vm.resize).toBe('function')
    })

    it('应该暴露 cleanup 方法', () => {
      expect(typeof wrapper.vm.cleanup).toBe('function')
    })

    it('应该暴露 isInitialized 方法', () => {
      expect(typeof wrapper.vm.isInitialized).toBe('function')
      expect(wrapper.vm.isInitialized()).toBe(true)
    })

    it('resize 方法应该调用 fit 和 resize_terminal', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const { FitAddon } = await import('@xterm/addon-fit')
      
      const mockFitAddon = FitAddon.mock.results[0].value
      
      wrapper.vm.resize()
      
      expect(mockFitAddon.fit).toHaveBeenCalled()
      expect(invoke).toHaveBeenCalledWith('resize_terminal', {
        sessionId: mockSession.id,
        cols: 80,
        rows: 24
      })
    })
  })

  describe('错误处理', () => {
    it('应该处理写入终端失败', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      const { Terminal } = await import('@xterm/xterm')
      
      invoke.mockRejectedValue(new Error('Write failed'))
      
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      await wrapper.vm.$nextTick()
      
      const mockTerminal = Terminal.mock.results[0].value
      const onDataCallback = mockTerminal.onData.mock.calls[0][0]
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await onDataCallback('test')
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('应该处理调整大小失败', async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      
      wrapper = mount(TerminalCore, {
        props: { session: mockSession },
        global: { plugins: [pinia] }
      })

      await wrapper.vm.$nextTick()
      
      invoke.mockRejectedValue(new Error('Resize failed'))
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      wrapper.vm.resize()
      
      await wrapper.vm.$nextTick()
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})