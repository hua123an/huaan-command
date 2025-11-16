import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AIMode from '../../src/components/terminal/AIMode.vue'
import { useAIStore } from '../../src/stores/ai'

// Mock 组合式函数
vi.mock('../../src/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn()
  })
}))

vi.mock('../../src/composables/useLogger', () => ({
  useLogger: () => ({
    log: vi.fn()
  })
}))

describe('AIMode', () => {
  let wrapper
  let pinia
  let aiStore

  const mockSession = {
    id: 'test-session-1',
    title: 'Test Terminal'
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    aiStore = useAIStore()
    
    // Mock AI store methods
    aiStore.isConfigured = true
    aiStore.generateCommand = vi.fn()
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('组件渲染', () => {
    it('应该在 visible=true 时渲染 AI 面板', () => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.ai-mode-panel').exists()).toBe(true)
      expect(wrapper.find('.ai-status-bar').exists()).toBe(true)
      expect(wrapper.find('.ai-input-area').exists()).toBe(true)
    })

    it('应该在 visible=false 时不渲染', () => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: false },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.ai-mode-panel').exists()).toBe(false)
    })

    it('应该显示 AI 配置警告', () => {
      aiStore.isConfigured = false
      
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })

      expect(wrapper.find('.config-warning').exists()).toBe(true)
      expect(wrapper.find('.config-warning').text()).toContain('请先在设置中配置 AI 服务')
    })
  })

  describe('命令生成', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该生成 AI 命令', async () => {
      const mockCommand = 'ls -la'
      aiStore.generateCommand.mockResolvedValue(mockCommand)

      const input = wrapper.find('.ai-input')
      const generateBtn = wrapper.find('.generate-btn')

      await input.setValue('列出当前目录文件')
      await generateBtn.trigger('click')

      expect(aiStore.generateCommand).toHaveBeenCalledWith(
        '列出当前目录文件',
        expect.objectContaining({
          onStream: expect.any(Function)
        })
      )
    })

    it('应该处理流式响应', async () => {
      const mockCommand = 'ls -la'
      aiStore.generateCommand.mockImplementation(async (description, options) => {
        // 模拟流式响应
        options.onStream('ls')
        options.onStream(' -la')
        return mockCommand
      })

      const input = wrapper.find('.ai-input')
      await input.setValue('列出文件')
      
      await wrapper.vm.generateCommand()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.generatedCommand).toBe('ls -la')
    })

    it('应该在按 Enter 时生成命令', async () => {
      const generateCommandSpy = vi.spyOn(wrapper.vm, 'generateCommand')
      const input = wrapper.find('.ai-input')

      await input.setValue('test command')
      await input.trigger('keydown', { key: 'Enter' })

      expect(generateCommandSpy).toHaveBeenCalled()
    })

    it('应该在按 Shift+Enter 时不生成命令', async () => {
      const generateCommandSpy = vi.spyOn(wrapper.vm, 'generateCommand')
      const input = wrapper.find('.ai-input')

      await input.setValue('test command')
      await input.trigger('keydown', { key: 'Enter', shiftKey: true })

      expect(generateCommandSpy).not.toHaveBeenCalled()
    })

    it('应该在按 Escape 时退出 AI 模式', async () => {
      const input = wrapper.find('.ai-input')
      
      await input.trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('mode-exit')).toBeTruthy()
    })
  })

  describe('命令执行', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该执行生成的命令', async () => {
      wrapper.vm.generatedCommand = 'ls -la'
      await wrapper.vm.$nextTick()

      const executeBtn = wrapper.find('.execute-btn')
      await executeBtn.trigger('click')

      expect(wrapper.emitted('command-generated')).toBeTruthy()
      expect(wrapper.emitted('command-generated')[0]).toEqual(['ls -la'])
      expect(wrapper.emitted('mode-exit')).toBeTruthy()
    })

    it('应该在没有生成命令时禁用执行按钮', () => {
      const executeBtn = wrapper.find('.execute-btn')
      expect(executeBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('对话历史', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该记录对话历史', async () => {
      const mockCommand = 'ls -la'
      aiStore.generateCommand.mockResolvedValue(mockCommand)

      const input = wrapper.find('.ai-input')
      await input.setValue('列出文件')
      await wrapper.vm.generateCommand()

      expect(wrapper.vm.conversationHistory).toHaveLength(2)
      expect(wrapper.vm.conversationHistory[0]).toMatchObject({
        type: 'user',
        content: '列出文件'
      })
      expect(wrapper.vm.conversationHistory[1]).toMatchObject({
        type: 'assistant',
        content: mockCommand
      })
    })

    it('应该显示对话历史', async () => {
      wrapper.vm.conversationHistory = [
        { type: 'user', content: '列出文件', timestamp: Date.now() },
        { type: 'assistant', content: 'ls -la', timestamp: Date.now() }
      ]
      await wrapper.vm.$nextTick()

      const messages = wrapper.findAll('.message')
      expect(messages).toHaveLength(2)
      expect(messages[0].classes()).toContain('user')
      expect(messages[1].classes()).toContain('assistant')
    })

    it('应该清空对话历史', async () => {
      wrapper.vm.conversationHistory = [
        { type: 'user', content: '测试', timestamp: Date.now() }
      ]
      await wrapper.vm.$nextTick()

      const clearBtn = wrapper.find('.clear-btn')
      await clearBtn.trigger('click')

      expect(wrapper.vm.conversationHistory).toHaveLength(0)
      expect(wrapper.vm.generatedCommand).toBe('')
    })
  })

  describe('加载状态', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该在生成命令时显示加载状态', async () => {
      let resolveGenerate
      aiStore.generateCommand.mockReturnValue(
        new Promise(resolve => { resolveGenerate = resolve })
      )

      const input = wrapper.find('.ai-input')
      await input.setValue('test')
      
      const generatePromise = wrapper.vm.generateCommand()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.generating-indicator').exists()).toBe(true)
      expect(wrapper.find('.generate-btn').classes()).toContain('generating')
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)

      resolveGenerate('test command')
      await generatePromise
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.generating-indicator').exists()).toBe(false)
    })

    it('应该在生成时禁用输入和按钮', async () => {
      wrapper.vm.isGenerating = true
      await wrapper.vm.$nextTick()

      const input = wrapper.find('.ai-input')
      const generateBtn = wrapper.find('.generate-btn')

      expect(input.attributes('disabled')).toBeDefined()
      expect(generateBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('错误处理', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该处理命令生成错误', async () => {
      const error = new Error('AI service unavailable')
      aiStore.generateCommand.mockRejectedValue(error)

      const input = wrapper.find('.ai-input')
      await input.setValue('test command')
      
      await wrapper.vm.generateCommand()

      expect(wrapper.vm.isGenerating).toBe(false)
      // 错误处理应该被调用，但我们 mock 了它
    })
  })

  describe('UI 交互', () => {
    beforeEach(() => {
      wrapper = mount(AIMode, {
        props: { session: mockSession, visible: true },
        global: { plugins: [pinia] }
      })
    })

    it('应该在可见时聚焦输入框', async () => {
      const focusSpy = vi.fn()
      const mockInput = { focus: focusSpy }
      vi.spyOn(document, 'querySelector').mockReturnValue(mockInput)

      await wrapper.setProps({ visible: true })
      
      // 等待 setTimeout
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(focusSpy).toHaveBeenCalled()
    })

    it('应该显示快捷键提示', () => {
      const hints = wrapper.findAll('.hint-item')
      expect(hints).toHaveLength(2)
      expect(hints[0].text()).toContain('Enter 生成命令')
      expect(hints[1].text()).toContain('Esc 退出 AI 模式')
    })
  })
})