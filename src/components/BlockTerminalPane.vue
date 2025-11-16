<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import FixedInput from './FixedInput.vue'
import WarpModeBar from './WarpModeBar.vue'
import FilePickerModal from './FilePickerModal.vue'

import { useTerminalStore } from '../stores/terminal'
import { useSettingsStore } from '../stores/settings'
import { useLogsStore } from '../stores/logs'
import { useTheme } from '../composables/useTheme'
import { useBuiltinCommands } from '../composables/useBuiltinCommands'
import { useDirectoryTracker } from '../composables/useDirectoryTracker'

const props = defineProps({
  session: Object,
  visible: Boolean
})

const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
const logsStore = useLogsStore()
const { getTerminalTheme } = useTheme()
const { isBuiltinCommand, getCommandPrompt, getHelpMessage } = useBuiltinCommands()

// 目录追踪功能（使用后端接口）
const { currentDir, startTracking } = useDirectoryTracker(props.session.id)

// 状态
const warpMode = ref('terminal')
const currentModel = ref('terminal')
const showFilePicker = ref(false)
const terminalRef = ref(null)
const inputComponent = ref(null)
const conversationHistory = ref([]) // 对话历史

// 终端实例
let terminal = null
let fitAddon = null
let unlisten = null

// 初始化终端
const initTerminal = async () => {
  try {
    // 检查 DOM 元素是否存在
    if (!terminalRef.value) {
      console.error('❌ 终端容器 DOM 元素不存在！')
      return
    }

    // 如果已经有终端实例，先清理
    if (terminal) {
      terminal.dispose()
      terminal = null
    }

    if (unlisten) {
      unlisten()
      unlisten = null
    }

    // 创建 xterm.js 实例（支持直接输入）
    terminal = new Terminal({
      cursorBlink: true, // 启用光标闪烁
      fontSize: 14,
      fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
      theme: getTerminalTheme(),
      allowTransparency: true,
      scrollback: 10000,
      disableStdin: false // 启用标准输入，支持直接在终端输入
    })

    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(terminalRef.value)
    fitAddon.fit()

    // 启动 PTY 终端（传递 shell 类型）
    await invoke('start_terminal', {
      sessionId: props.session.id,
      shellType: settingsStore.settings.shell
    })

    // 标记是否是初始输出（用于过滤系统欢迎信息）
    let isInitialOutput = true
    let initialOutputBuffer = ''

    let isHidingOutput = false

    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, event => {
      if (terminal) {
        const output = event.payload

        // Stateful filtering for hidden commands
        if (output.includes('START___PWD_MARKER_')) {
          isHidingOutput = true
          // If the end marker is in the same chunk, handle it immediately
          if (output.includes('END___PWD_MARKER_')) {
            isHidingOutput = false
          }
          return // Discard this chunk
        } else if (output.includes('END___PWD_MARKER_')) {
          isHidingOutput = false
          return // Discard this chunk
        } else if (isHidingOutput) {
          return // Discard chunks while in hiding mode
        }

        // 初始阶段：收集并过滤系统欢迎信息
        if (isInitialOutput) {
          initialOutputBuffer += output

          const hasPrompt =
            initialOutputBuffer.match(/>\s*$/) ||
            initialOutputBuffer.match(/[$%#]\s*$/) ||
            initialOutputBuffer.match(/[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+/)

          if (hasPrompt) {
            isInitialOutput = false
            const cleanOutput = initialOutputBuffer
              .replace(/The default interactive shell is now.*?\n/g, '')
              .replace(/To update your account to use.*?\n/g, '')
              .replace(/For more details.*?\n/g, '')
              .replace(/chsh -s.*?\n/g, '')
              .replace(/https?:\/\/[^\s]+/g, '')
              .trim()

            if (cleanOutput) {
              terminal.write(cleanOutput)
            }
            initialOutputBuffer = ''
          }
          return
        }

        // 初始化完成后，正常显示所有输出
        terminal.write(output)

        // 保存更新后的目录到 store（目录追踪现在由后端接口处理）
        if (currentDir.value) {
          terminalStore.updateSessionCurrentDir(props.session.id, currentDir.value)
        }
      }
    })

    // 监听终端输入并发送到 PTY
    terminal.onData(data => {
      // 直接发送所有输入到 PTY，不做任何拦截
      invoke('write_terminal', {
        sessionId: props.session.id,
        data: data
      })
    })

    // 恢复会话数据或初始化新会话
    const sessionData = terminalStore.getSessionData(props.session.id)

    // 先获取实际的 HOME 目录
    let actualHome = '~'
    try {
      actualHome = await invoke('get_home_dir')
    } catch (error) {
      console.warn('无法获取 HOME 目录:', error)
    }

    if (sessionData) {
      warpMode.value = sessionData.warpMode || 'terminal'
      currentModel.value = sessionData.currentModel || 'terminal'
      // 如果保存的是 ~，展开为实际路径
      currentDir.value =
        sessionData.currentDir === '~' ? actualHome : sessionData.currentDir || actualHome
      conversationHistory.value = sessionData.conversationHistory || []
    } else {
      // 新会话，使用实际的 HOME 目录
      currentDir.value = actualHome
      conversationHistory.value = []
      // 保存到 store
      terminalStore.updateSessionCurrentDir(props.session.id, actualHome)
    }

    // 聚焦终端
    nextTick(() => {
      terminal.focus()
    })
  } catch (error) {
    logsStore.error(`初始化终端失败: ${error.message || error}`)
  }
}

onMounted(async () => {
  // 初始化终端
  await initTerminal()

  // 启动目录追踪（每2秒更新一次）
  startTracking(2000)

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 监听主题变化
watch(
  () => settingsStore.settings.theme,
  () => {
    if (terminal) {
      terminal.options.theme = getTerminalTheme()
    }
  }
)

// 监听 shell 类型变化，重新初始化终端
watch(
  () => settingsStore.settings.shell,
  async () => {
    console.log('🔄 Shell 类型变化，重新初始化终端')
    // 先关闭旧终端
    await invoke('close_terminal', {
      sessionId: props.session.id
    }).catch(err => console.error('关闭终端失败:', err))

    // 重新初始化
    await initTerminal()
  }
)

// 监听系统主题变化（当主题为auto时）
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleSystemThemeChange = () => {
  if (settingsStore.settings.theme === 'auto' && terminal) {
    terminal.options.theme = getTerminalTheme()
  }
}
darkModeQuery.addEventListener('change', handleSystemThemeChange)

// 监听 visible 属性变化
watch(
  () => props.visible,
  newVisible => {
    if (newVisible && terminal && fitAddon) {
      // 当终端变为可见时，重新调整大小
      nextTick(() => {
        fitAddon.fit()
        const { cols, rows } = terminal
        invoke('resize_terminal', {
          sessionId: props.session.id,
          cols,
          rows
        }).catch(err => console.error('调整终端大小失败:', err))
      })
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  if (unlisten) {
    unlisten()
  }
  if (terminal) {
    terminal.dispose()
  }
  // 关闭 PTY 终端
  invoke('close_terminal', {
    sessionId: props.session.id
  }).catch(err => console.error('关闭终端失败:', err))
})

// 处理窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
    // 通知 PTY 调整大小
    const { cols, rows } = terminal
    invoke('resize_terminal', {
      sessionId: props.session.id,
      cols,
      rows
    }).catch(err => console.error('调整终端大小失败:', err))
  }
}

// 处理命令提交
const handleSubmit = async command => {
  // 检查是否是内置命令
  if (isBuiltinCommand(command)) {
    terminal.write(`\r\n`)
    await handleBuiltinCommand(command)
    return
  }

  if (warpMode.value === 'ai') {
    // AI 模式
    await handleAICommand(command)
  } else {
    // 终端模式：将命令发送到 PTY
    if (terminal) {
      // 发送命令到 PTY（模拟用户输入 + 回车）
      invoke('write_terminal', {
        sessionId: props.session.id,
        data: command + '\n'
      })
    }
  }
}

// 聚焦终端（直接聚焦终端区域）
const focusTerminal = () => {
  nextTick(() => {
    if (terminal) {
      terminal.focus()
    }
  })
}

// 智能任务处理（项目分析、代码修改等）
const handleIntelligentTask = async prompt => {
  conversationHistory.value.push({
    role: 'user',
    content: prompt
  })
  // AI 功能已移除
  terminal.write('\r\n\x1b[31mAI 功能已移除\x1b[0m\r\n')
  terminal.scrollToBottom()
  // 保存会话数据
  terminalStore.updateSessionConversation(props.session.id, conversationHistory.value)
}

// 处理内置命令
const handleBuiltinCommand = async command => {
  try {
    // 特殊处理 :help 和 :list
    if (command === ':help' || command === ':list') {
      const helpMessage = getHelpMessage()
      terminal.write(helpMessage.replace(/\n/g, '\r\n'))
      // 确保终端重新获得焦点
      setTimeout(() => terminal.focus(), 50)
      return
    }

    // 获取命令对应的 AI 提示词
    const prompt = getCommandPrompt(command)

    if (!prompt) {
      terminal.write(`\x1b[33m⚠️  未知的内置命令: ${command}\x1b[0m\r\n`)
      terminal.write(`\x1b[90m输入 :help 查看所有可用命令\x1b[0m\r\n`)
      // 确保终端重新获得焦点
      setTimeout(() => terminal.focus(), 50)
      return
    }

    // 显示命令执行提示
    terminal.write(`\x1b[36m🤖 ${command}\x1b[0m\r\n\r\n`)

    // AI 功能已移除
    terminal.write('\x1b[31mAI 功能已移除\x1b[0m\r\n')
    terminal.scrollToBottom()
  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ 执行失败: ${error.message}\x1b[0m\r\n`)
    terminal.scrollToBottom()
  }
}

// 处理 AI 命令
const handleAICommand = async prompt => {
  // 检测是否是复杂任务（项目分析、代码修改等）
  // 改进的正则：更宽松地匹配项目相关问题
  const isComplexTask =
    /(熟悉|了解|分析|查看|理解|介绍|讲解|说明).*(项目|代码|这个)/.test(prompt) ||
    /(项目|代码).*(是什么|干什么|做什么|功能|作用|用途)/.test(prompt) ||
    /(这个|当前).*(项目|代码)/.test(prompt) ||
    /修改|添加.*文件|重构/.test(prompt)

  if (isComplexTask) {
    // 使用智能任务处理
    terminal.write(`\r\n\x1b[36m🤖 ${prompt}\x1b[0m\r\n\r\n`)
    await handleIntelligentTask(prompt)
  } else {
    // 简单对话模式
    terminal.write(`\r\n\x1b[36m🤖 ${prompt}\x1b[0m\r\n\r\n`)
    // AI 功能已移除
    terminal.write('\x1b[31mAI 功能已移除\x1b[0m\r\n')
  }
}

// 模式切换
const handleModeUpdate = mode => {
  warpMode.value = mode
  terminalStore.updateSessionMode(props.session.id, mode)
  inputComponent.value?.focus()
}

// 模型切换
const handleModelUpdate = model => {
  currentModel.value = model
  // AI 功能已移除
  terminalStore.updateSessionModel(props.session.id, model)
}

// 文件选择
const handleMentionFile = () => {
  showFilePicker.value = true
}

const handleFileSelect = async file => {
  if (file.isDir) {
    // 只更新当前目录状态即可
    currentDir.value = file.path
    console.log('✅ 已切换到目录:', file.path)
  }
  // 如果是文件，可以在这里处理插入文件路径到输入框
}
</script>

<template>
  <div class="block-terminal-pane" :class="{ visible }">
    <!-- 终端输出区域（xterm.js） -->
    <div ref="terminalRef" class="terminal-area" @click="focusTerminal"></div>

    <!-- 底部区域：模式切换 + 输入框 -->
    <div class="bottom-area">
      <!-- Warp 模式栏 -->
      <WarpModeBar
        :mode="warpMode"
        :current-model="currentModel"
        :session-id="session.id"
        @update:mode="handleModeUpdate"
        @update:current-model="handleModelUpdate"
        @mention-file="handleMentionFile"
      />

      <!-- 固定底部输入框 -->
      <FixedInput
        ref="inputComponent"
        :mode="warpMode"
        :current-model="currentModel"
        :current-dir="currentDir"
        @submit="handleSubmit"
        @update:mode="handleModeUpdate"
        @mention-file="handleMentionFile"
      />
    </div>

    <!-- 文件选择器 -->
    <FilePickerModal
      :show="showFilePicker"
      :current-dir="currentDir"
      @select="handleFileSelect"
      @close="showFilePicker = false"
    />
  </div>
</template>

<style scoped>
.block-terminal-pane {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--terminal-bg);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s,
    background-color 0.3s ease;
}

.block-terminal-pane.visible {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

.terminal-area {
  flex: 1;
  min-height: 0;
  padding: 16px;
  padding-bottom: 0;
  /* 无底部 padding，让 xterm 自己管理空间 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.terminal-area :deep(.xterm) {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding-bottom: 16px;
  /* 给 xterm 内部添加底部 padding，确保内容不被遮挡 */
}

.terminal-area :deep(.xterm-viewport) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar {
  width: 8px;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.terminal-area :deep(.xterm-viewport)::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.bottom-area {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-color);
  background: var(--terminal-bg);
  flex-shrink: 0;
  /* 防止底部区域被压缩 */
}
</style>
