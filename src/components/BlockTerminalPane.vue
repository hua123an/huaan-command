<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import FixedInput from './FixedInput.vue'
import WarpModeBar from './WarpModeBar.vue'
import FilePickerModal from './FilePickerModal.vue'
import { useAIStore } from '../stores/ai'
import { useTerminalStore } from '../stores/terminal'
import { useSettingsStore } from '../stores/settings'
import { useLogsStore } from '../stores/logs'
import { useTheme } from '../composables/useTheme'
import { useBuiltinCommands } from '../composables/useBuiltinCommands'
import { useDirectoryTracking } from '../composables/useDirectoryTracking'

const props = defineProps({
  session: Object,
  visible: Boolean
})

const aiStore = useAIStore()
const terminalStore = useTerminalStore()
const settingsStore = useSettingsStore()
const logsStore = useLogsStore()
const { getTerminalTheme } = useTheme()
const { isBuiltinCommand, getCommandPrompt, getHelpMessage } = useBuiltinCommands()
const { currentDir, updateFromOutput } = useDirectoryTracking()

// 状态
const warpMode = ref('terminal')
const currentModel = ref(aiStore.model || 'gpt-4o-mini')
const showFilePicker = ref(false)
const terminalRef = ref(null)
const inputComponent = ref(null)
const currentInput = ref('') // 跟踪当前输入的命令
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
      cursorBlink: true,  // 启用光标闪烁
      fontSize: 14,
      fontFamily: 'SF Mono, Menlo, Monaco, Courier New, monospace',
      theme: getTerminalTheme(),
      allowTransparency: true,
      scrollback: 10000,
      disableStdin: false  // 启用标准输入，支持直接在终端输入
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

    // 监听终端输出
    unlisten = await listen(`terminal-output-${props.session.id}`, (event) => {
      if (terminal) {
        const output = event.payload

        // 初始阶段：收集并过滤系统欢迎信息
        if (isInitialOutput) {
          initialOutputBuffer += output

          // 检测是否已经收到了第一个提示符（表示初始化完成）
          // 匹配 "> " 提示符或用户名@主机名格式的提示符
          const hasPrompt = initialOutputBuffer.match(/>\s*$/) ||
                           initialOutputBuffer.match(/[\$%#]\s*$/) ||
                           initialOutputBuffer.match(/[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+/)

          if (hasPrompt) {
            // 初始化完成，过滤掉系统欢迎信息，只保留提示符
            isInitialOutput = false

            // 移除所有已知的系统欢迎信息
            const cleanOutput = initialOutputBuffer
              .replace(/The default interactive shell is now.*?\n/g, '')
              .replace(/To update your account to use.*?\n/g, '')
              .replace(/For more details.*?\n/g, '')
              .replace(/chsh -s.*?\n/g, '')
              .replace(/https?:\/\/[^\s]+/g, '')  // 移除 URL
              .trim()

            // 只显示提示符
            if (cleanOutput) {
              terminal.write(cleanOutput)
            }
            initialOutputBuffer = ''
          }
          // 如果还没收到提示符，继续收集（不显示）
          return
        }

        // 初始化完成后，正常显示所有输出
        terminal.write(output)

        // 尝试从输出中提取当前目录
        updateFromOutput(output)

        // 保存更新后的目录到 store
        if (currentDir.value) {
          terminalStore.updateSessionCurrentDir(props.session.id, currentDir.value)
        }
      }
    })

    // 监听终端输入并发送到 PTY
    terminal.onData((data) => {
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
      currentModel.value = sessionData.currentModel || aiStore.model
      // 如果保存的是 ~，展开为实际路径
      currentDir.value = sessionData.currentDir === '~' ? actualHome : (sessionData.currentDir || actualHome)
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

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 监听主题变化
watch(() => settingsStore.settings.theme, () => {
  if (terminal) {
    terminal.options.theme = getTerminalTheme()
  }
})

// 监听 shell 类型变化，重新初始化终端
watch(() => settingsStore.settings.shell, async () => {
  console.log('🔄 Shell 类型变化，重新初始化终端')
  // 先关闭旧终端
  await invoke('close_terminal', {
    sessionId: props.session.id
  }).catch(err => console.error('关闭终端失败:', err))

  // 重新初始化
  await initTerminal()
})

// 监听系统主题变化（当主题为auto时）
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleSystemThemeChange = () => {
  if (settingsStore.settings.theme === 'auto' && terminal) {
    terminal.options.theme = getTerminalTheme()
  }
}
darkModeQuery.addEventListener('change', handleSystemThemeChange)

// 监听 visible 属性变化
watch(() => props.visible, (newVisible) => {
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
})

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
const handleSubmit = async (command) => {
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

// 格式化 Markdown 单行（用于流式输出）
const formatMarkdownLine = (line) => {
  let formatted = line

  if (formatted.match(/^```/)) {
    return `\x1b[90m${formatted}\x1b[0m`
  }

  if (formatted.match(/^### /)) {
    formatted = formatted.replace(/^### (.+)$/, '\x1b[1m\x1b[35m▸ $1\x1b[0m')
  } else if (formatted.match(/^## /)) {
    formatted = formatted.replace(/^## (.+)$/, '\x1b[1m\x1b[36m▶ $1\x1b[0m')
  } else if (formatted.match(/^# /)) {
    formatted = formatted.replace(/^# (.+)$/, '\x1b[1m\x1b[32m● $1\x1b[0m')
  } else if (formatted.match(/^(\s*)[-*+] /)) {
    formatted = formatted.replace(/^(\s*)[-*+] (.+)$/, '$1\x1b[36m●\x1b[0m $2')
  } else if (formatted.match(/^(\s*)(\d+)\. /)) {
    formatted = formatted.replace(/^(\s*)(\d+)\. (.+)$/, '$1\x1b[36m$2.\x1b[0m $3')
  }

  formatted = formatted.replace(/`([^`]+)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')

  return formatted
}

// 格式化终端输出（处理换行和特殊字符）
const formatTerminalOutput = (text) => {
  // 先处理代码块
  let formatted = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? `[${lang}]` : '[code]'
    return `\n\x1b[90m╭─ ${langLabel} ────────────────\x1b[0m\n\x1b[33m${code.trim()}\x1b[0m\n\x1b[90m╰────────────────────────────\x1b[0m\n`
  })

  // 处理行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '\x1b[43m\x1b[30m $1 \x1b[0m')

  // 处理标题
  formatted = formatted.replace(/^### (.+)$/gm, '\x1b[1m\x1b[35m▸ $1\x1b[0m')
  formatted = formatted.replace(/^## (.+)$/gm, '\x1b[1m\x1b[36m▶ $1\x1b[0m')
  formatted = formatted.replace(/^# (.+)$/gm, '\x1b[1m\x1b[32m● $1\x1b[0m')

  // 处理粗体
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')

  // 处理无序列表
  formatted = formatted.replace(/^(\s*)[-*+] (.+)$/gm, (match, indent, text) => {
    return `${indent}\x1b[36m●\x1b[0m ${text}`
  })

  // 处理有序列表
  formatted = formatted.replace(/^(\s*)(\d+)\. (.+)$/gm, (match, indent, num, text) => {
    return `${indent}\x1b[36m${num}.\x1b[0m ${text}`
  })

  // 将所有 \n 替换为 \r\n（终端换行）
  formatted = formatted.replace(/\n/g, '\r\n')

  return formatted
}

// 智能任务处理（项目分析、代码修改等）
const handleIntelligentTask = async (prompt) => {
  // 添加到对话历史
  conversationHistory.value.push({
    role: 'user',
    content: prompt
  })

  try {
    // 获取终端当前工作目录
    let workingDir

    if (currentDir.value && currentDir.value !== '~') {
      workingDir = currentDir.value
      terminal.write(`\x1b[90m💡 终端已准备就绪\x1b[0m\r\n`)
    } else {
      try {
        workingDir = await invoke('get_home_dir')
        currentDir.value = workingDir
        terminal.write(`\x1b[90m💡 终端已准备就绪\x1b[0m\r\n`)
      } catch {
        terminal.write(`\x1b[31m❌ 无法获取工作目录，请用 @ 选择项目目录\x1b[0m\r\n`)
        return
      }
    }

    // 显示简洁提示
    terminal.write(`\x1b[36m📂 分析目录: ${workingDir}\x1b[0m\r\n`)
    terminal.write(`\x1b[90m🔍 正在分析项目...\x1b[0m\r\n\r\n`)

    // 执行智能任务，静默执行命令不显示过程
    const result = await aiStore.executeIntelligentTask(prompt, workingDir, async (cmd, purpose) => {
      const output = await invoke('execute_command', { command: cmd, working_dir: workingDir })
      return output
    })

    terminal.write(`\x1b[36m🤖 AI 分析:\x1b[0m\r\n\r\n`)

    if (result.type === 'project_analysis') {
      // 流式显示项目分析结果
      const lines = result.analysis.split('\n')
      let isInCodeBlock = false

      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          isInCodeBlock = !isInCodeBlock
        }

        const formatted = formatMarkdownLine(line)
        terminal.write(formatted + '\r\n')
        terminal.scrollToBottom()

        // 添加延迟产生流式效果
        if (line.trim() === '') {
          await new Promise(resolve => setTimeout(resolve, 10))
        } else if (isInCodeBlock) {
          await new Promise(resolve => setTimeout(resolve, 20))
        } else {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      conversationHistory.value.push({
        role: 'assistant',
        content: result.analysis
      })
    } else if (result.type === 'code_modification') {
      // 显示代码修改结果
      terminal.write(`\x1b[32m✓ 代码修改完成\x1b[0m\r\n\r\n`)

      if (result.modifications && result.modifications.length > 0) {
        terminal.write(`\x1b[1m修改的文件:\x1b[0m\r\n`)
        result.modifications.forEach(mod => {
          terminal.write(`  \x1b[36m●\x1b[0m ${mod.file}\r\n`)
        })
        terminal.write('\r\n')
      }

      if (result.summary) {
        const formatted = formatTerminalOutput(result.summary)
        terminal.write(formatted)
      }

      conversationHistory.value.push({
        role: 'assistant',
        content: result.summary || '代码修改完成'
      })
    } else if (result.type === 'simple_command') {
      // 显示命令执行结果
      if (result.output) {
        terminal.write(result.output.replace(/\n/g, '\r\n'))
      }

      conversationHistory.value.push({
        role: 'assistant',
        content: result.output || '命令执行完成'
      })
    }

    terminal.write('\r\n')
    terminal.scrollToBottom()

    // 保存会话数据
    terminalStore.updateSessionConversation(props.session.id, conversationHistory.value)

  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ 智能任务失败: ${error.message}\x1b[0m\r\n`)
    terminal.scrollToBottom()
  }
}

// 处理内置命令
const handleBuiltinCommand = async (command) => {
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

    // 直接调用 callAI，使用通用的助手角色
    let response = ''
    let lastLength = 0

    // 为了增加随机性，在提示词中添加随机元素
    const randomSeed = Date.now()
    const enhancedPrompt = `${prompt} (请给出新的、不同的回答，随机种子: ${randomSeed})`

    const messages = [
      {
        role: 'system',
        content: '你是一个友好、幽默的 AI 助手。请用简洁、自然的语言回答用户的问题。每次回答都要有创意，避免重复相同的内容。'
      },
      {
        role: 'user',
        content: enhancedPrompt
      }
    ]

    response = await aiStore.callAI(messages, {
      stream: true,
      temperature: 0.9, // 提高创造性
      maxTokens: 500,   // 限制长度
      onStream: (chunk, fullContent) => {
        // 只处理新增的内容
        const newContent = fullContent.substring(lastLength)
        if (newContent) {
          // 简单处理：直接输出，将 \n 替换为 \r\n
          const formatted = newContent.replace(/\n/g, '\r\n')
          terminal.write(formatted)
          lastLength = fullContent.length
          terminal.scrollToBottom()
        }
      }
    })

    // 完成后换行
    terminal.write('\r\n\r\n')
    terminal.scrollToBottom()

  } catch (error) {
    terminal.write(`\r\n\x1b[31m❌ 执行失败: ${error.message}\x1b[0m\r\n`)
    terminal.scrollToBottom()
  }
}

// Markdown 转终端格式渲染
const renderMarkdownToTerminal = (text) => {
  let rendered = text
  
  // 代码块 ```language\ncode\n```
  rendered = rendered.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const lines = code.split('\n')
    const formatted = lines.map(line => `  ${line}`).join('\r\n')
    return `\x1b[90m╭─ ${lang || 'code'}\x1b[0m\r\n\x1b[33m${formatted}\x1b[0m\r\n\x1b[90m╰─\x1b[0m`
  })
  
  // 行内代码 `code`
  rendered = rendered.replace(/`([^`]+)`/g, '\x1b[33m$1\x1b[0m')
  
  // 标题
  rendered = rendered.replace(/^### (.+)$/gm, '\x1b[35m▸ $1\x1b[0m')
  rendered = rendered.replace(/^## (.+)$/gm, '\x1b[35m\x1b[1m▸▸ $1\x1b[0m')
  rendered = rendered.replace(/^# (.+)$/gm, '\x1b[36m\x1b[1m▸▸▸ $1\x1b[0m')
  
  // 列表
  rendered = rendered.replace(/^\s*[-*+] (.+)$/gm, '  \x1b[32m•\x1b[0m $1')
  rendered = rendered.replace(/^\s*(\d+)\. (.+)$/gm, '  \x1b[32m$1.\x1b[0m $2')
  
  // 粗体 **text**
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '\x1b[1m$1\x1b[0m')
  
  // 斜体 *text*
  rendered = rendered.replace(/\*([^*]+)\*/g, '\x1b[3m$1\x1b[0m')
  
  // 链接 [text](url)
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '\x1b[34m\x1b[4m$1\x1b[0m')
  
  // 引用 > text
  rendered = rendered.replace(/^> (.+)$/gm, '\x1b[90m│ $1\x1b[0m')
  
  // 分隔线
  rendered = rendered.replace(/^---+$/gm, '\x1b[90m─────────────────────────────────────────\x1b[0m')
  
  // 转换换行符
  rendered = rendered.replace(/\n/g, '\r\n')
  
  return rendered
}

// 处理 AI 命令
const handleAICommand = async (prompt) => {
  // 检测是否是复杂任务（项目分析、代码修改等）
  // 改进的正则：更宽松地匹配项目相关问题
  const isComplexTask = (
    /(熟悉|了解|分析|查看|理解|介绍|讲解|说明).*(项目|代码|这个)/.test(prompt) ||
    /(项目|代码).*(是什么|干什么|做什么|功能|作用|用途)/.test(prompt) ||
    /(这个|当前).*(项目|代码)/.test(prompt) ||
    /修改|添加.*文件|重构/.test(prompt)
  )

  if (isComplexTask) {
    // 使用智能任务处理
    terminal.write(`\r\n\x1b[36m🤖 ${prompt}\x1b[0m\r\n\r\n`)
    await handleIntelligentTask(prompt)
  } else {
    // 简单对话模式
    terminal.write(`\r\n\x1b[36m🤖 ${prompt}\x1b[0m\r\n\r\n`)

    let accumulatedText = ''

    try {
      // 调用 AI 生成响应
      const response = await aiStore.generateCommand(prompt, {
        stream: true,
        onStream: (delta) => {
          accumulatedText += delta

          // 实时渲染 markdown
          const rendered = renderMarkdownToTerminal(delta)
          terminal.write(rendered)
        }
      })

      terminal.write('\r\n\r\n')

      // 保存到对话历史
      conversationHistory.value.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: accumulatedText }
      )
      terminalStore.updateSessionConversation(props.session.id, conversationHistory.value)

    } catch (error) {
      terminal.write(`\r\n\x1b[31mAI 错误: ${error.message}\x1b[0m\r\n`)
    }
  }
}

// 模式切换
const handleModeUpdate = (mode) => {
  warpMode.value = mode
  terminalStore.updateSessionMode(props.session.id, mode)
  inputComponent.value?.focus()
}

// 模型切换
const handleModelUpdate = (model) => {
  currentModel.value = model
  aiStore.model = model
  terminalStore.updateSessionModel(props.session.id, model)
}

// 文件选择
const handleMentionFile = () => {
  showFilePicker.value = true
}

const handleFileSelect = async (file) => {
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
  transition: opacity 0.2s, background-color 0.3s ease;
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
  overflow: hidden;
}

.terminal-area :deep(.xterm) {
  height: 100%;
}

.terminal-area :deep(.xterm-viewport) {
  overflow-y: auto !important;
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
}
</style>

