<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  mode: String, // 'terminal'
  currentModel: String,
  placeholder: String,
  disabled: Boolean,
  currentDir: String // 当前目录路径
})

const emit = defineEmits(['submit', 'update:mode', 'mention-file', 'refresh-dir', 'cli-tool-selected', 'reverse-search-start'])

// CLI 工具配置
const cliTools = [
  { name: 'claudecode', command: 'claude --dangerously-skip-permissions', icon: '🤖', description: 'Claude Code Assistant' },
  { name: 'gemini', command: 'gemini', icon: '💎', description: 'Google Gemini' },
  { name: 'iflow', command: 'iflow', icon: '🌊', description: 'iFlow CLI' },
  { name: 'copilot', command: 'copilot', icon: '🚁', description: 'GitHub Copilot' },
  { name: 'codex', command: 'codex', icon: '📝', description: 'OpenAI Codex' },
  { name: 'qwen', command: 'qwen', icon: '🧠', description: 'Qwen AI' },
  { name: 'amp', command: 'amp', icon: '⚡', description: 'AMP CLI' }
]

const selectedTool = ref('')
const showToolSelector = ref(false)

const inputRef = ref(null)
const inputValue = ref('')
const commandHistory = ref([])
const historyIndex = ref(-1)
const isReverseSearching = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searchIndex = ref(0)

// 选择 CLI 工具
const selectCliTool = (tool) => {
  console.log('选择工具:', tool)
  selectedTool.value = tool.name
  showToolSelector.value = false

  // 直接执行工具启动命令
  emit('submit', tool.command)

  // 清空输入框
  inputValue.value = ''
  historyIndex.value = -1
}

// 切换工具选择器显示
const toggleToolSelector = (e) => {
  console.log('toggleToolSelector 被调用', e)
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  console.log('当前状态:', showToolSelector.value, '即将切换为:', !showToolSelector.value)
  showToolSelector.value = !showToolSelector.value
  console.log('切换后状态:', showToolSelector.value)
}

// 自动聚焦
const focus = () => {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 提交命令
const submit = () => {
  const value = inputValue.value.trim()
  if (!value || props.disabled) return

  emit('submit', value)

  // 添加到历史
  if (value && !value.startsWith('/')) {
    commandHistory.value.push(value)
    if (commandHistory.value.length > 100) {
      commandHistory.value.shift()
    }
  }

  // 清空输入
  inputValue.value = ''
  historyIndex.value = -1
}

// 处理上下键翻历史
const handleKeyDown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (commandHistory.value.length === 0) return

    if (historyIndex.value === -1) {
      historyIndex.value = commandHistory.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    }
    inputValue.value = commandHistory.value[historyIndex.value]
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value === -1) return

    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
      inputValue.value = commandHistory.value[historyIndex.value]
    } else {
      historyIndex.value = -1
      inputValue.value = ''
    }
  } else if (e.key === 'Escape') {
    inputValue.value = ''
    historyIndex.value = -1
    isReverseSearching.value = false
    searchQuery.value = ''
    searchResults.value = []
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault()
    startReverseSearch()
  } else if (isReverseSearching.value) {
    handleReverseSearchInput(e)
  }
}

// 反向历史搜索
const startReverseSearch = () => {
  isReverseSearching.value = true
  searchQuery.value = ''
  searchResults.value = []
  searchIndex.value = 0
  emit('reverse-search-start')
}

// 处理反向搜索输入
const handleReverseSearchInput = (e) => {
  if (e.key === 'Enter') {
    if (searchResults.value.length > 0 && searchIndex.value < searchResults.value.length) {
      inputValue.value = searchResults.value[searchIndex.value]
      isReverseSearching.value = false
      searchQuery.value = ''
      searchResults.value = []
      submit()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (searchIndex.value > 0) {
      searchIndex.value--
      if (searchResults.value[searchIndex.value]) {
        inputValue.value = searchResults.value[searchIndex.value]
      }
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (searchIndex.value < searchResults.value.length - 1) {
      searchIndex.value++
      if (searchResults.value[searchIndex.value]) {
        inputValue.value = searchResults.value[searchIndex.value]
      }
    }
  } else if (e.key === 'Backspace') {
    // 退格键要更新搜索查询和输入框
    searchQuery.value = searchQuery.value.slice(0, -1)
    inputValue.value = searchQuery.value
    performReverseSearch()
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // 普通字符输入
    searchQuery.value += e.key
    inputValue.value = searchQuery.value
    performReverseSearch()
  }
}

// 执行反向搜索
const performReverseSearch = () => {
  const query = searchQuery.value.toLowerCase()
  if (!query) {
    searchResults.value = []
    return
  }

  searchResults.value = commandHistory.value.filter(cmd =>
    cmd.toLowerCase().includes(query)
  )
  searchIndex.value = 0

  if (searchResults.value.length > 0) {
    inputValue.value = searchResults.value[0]
  }
}

// @ 文件选择
const handleAtKey = () => {
  if (inputValue.value.endsWith('@')) {
    emit('mention-file')
  }
}

// 监听输入变化
watch(inputValue, (val) => {
  if (val.includes('@')) {
    handleAtKey()
  }

  // 只在非反向搜索模式下处理正常逻辑
  if (!isReverseSearching.value) {
    // 正常输入逻辑
  }
})

// 获取占位符文本
const getPlaceholder = () => {
  if (isReverseSearching.value) {
    return '搜索历史命令...'
  }
  return props.placeholder || (props.mode === 'ai' ? '和 AI 对话，描述你想做什么...' : '输入命令，按 Enter 执行...')
}

// 暴露方法
defineExpose({
  focus,
  clear: () => {
    inputValue.value = ''
    historyIndex.value = -1
    isReverseSearching.value = false
    searchQuery.value = ''
    searchResults.value = []
  },
  startReverseSearch
})
</script>

<template>
  <div class="fixed-input" :class="{ disabled }">
    <div class="input-container">
      <!-- CLI 工具选择器按钮 -->
      <button
class="cli-tool-btn" :title="selectedTool ? `当前工具: ${selectedTool}` : '选择 CLI 工具'" type="button"
        @click="toggleToolSelector" @mousedown="(e) => console.log('mousedown', e)"
        @mouseup="(e) => console.log('mouseup', e)">
        <span class="tool-icon">🛠️</span>
        <span v-if="selectedTool" class="tool-name">{{ selectedTool }}</span>
        <span style="font-size: 10px; margin-left: 4px;">CLICK</span>
      </button>

      <!-- 输入框 -->
      <input
ref="inputRef" v-model="inputValue" type="text" :placeholder="getPlaceholder()" :disabled="disabled"
        class="command-input" :class="{ 'ai-mode': mode === 'ai' }" autocomplete="off" spellcheck="false"
        @keydown.enter="submit" @keydown="handleKeyDown" />

      <!-- 提交按钮 -->
      <button
class="submit-btn" :disabled="!inputValue.trim() || disabled" :title="mode === 'ai' ? '发送给 AI' : '执行命令'"
        @click="submit">
        <span class="submit-icon">{{ mode === 'ai' ? '✨' : '▶' }}</span>
      </button>

      <!-- 反向搜索提示 -->
      <div v-if="isReverseSearching" class="reverse-search-hint">
        <span class="search-prefix">(reverse-i-search)`</span>
        <span class="search-query">{{ searchQuery }}</span>
        <span class="search-suffix">'</span>
        <span v-if="searchResults.length > 0" class="search-results">
          {{ searchIndex + 1 }}/{{ searchResults.length }}
        </span>
      </div>
    </div>

    <!-- CLI 工具选择器下拉菜单 -->
    <div v-show="showToolSelector" class="cli-tool-selector" style="display: block !important;">
      <div class="tool-selector-header">
        <span class="selector-title">选择 CLI 工具</span>
        <button class="close-selector" type="button" @click.stop="showToolSelector = false">✕</button>
      </div>
      <div class="tool-list">
        <button
v-for="tool in cliTools" :key="tool.name" class="tool-item"
          :class="{ active: selectedTool === tool.name }" type="button" @click.stop="selectCliTool(tool)">
          <span class="tool-item-icon">{{ tool.icon }}</span>
          <div class="tool-item-info">
            <span class="tool-item-name">{{ tool.name }}</span>
            <span class="tool-item-desc">{{ tool.description }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixed-input {
  position: relative;
  padding: 16px;
  background: var(--bg-primary);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.fixed-input.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 8px 12px;
  border: 2px solid var(--border-color);
  transition: all 0.2s;
  position: relative;
}

/* 文件夹图标按钮（带目录名） */
.folder-icon-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  white-space: nowrap;
  font-family: 'SF Mono', Monaco, monospace;
}

.folder-icon-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.dir-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.input-container:focus-within {
  border-color: var(--accent-color);
  background: var(--bg-hover);
  box-shadow:
    0 0 0 3px rgba(10, 132, 255, 0.1),
    0 0 20px rgba(10, 132, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.command-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 12px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 15px;
  transition: all 0.2s ease;
}

.command-input:focus {
  color: var(--text-primary);
  text-shadow: 0 0 0.5px currentColor;
}

.command-input::placeholder {
  color: var(--text-secondary);
}

.command-input.ai-mode {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--accent-color);
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.submit-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.submit-btn:active::before {
  width: 100px;
  height: 100px;
}

.submit-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05) translateY(-1px);
  box-shadow: 0 8px 25px rgba(10, 132, 255, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.95);
  transition: transform 0.1s;
}

.submit-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.submit-icon {
  font-size: 18px;
  line-height: 1;
}

/* 反向搜索提示 */
.reverse-search-hint {
  position: absolute;
  top: -24px;
  left: 12px;
  font-size: 12px;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  color: var(--accent-color);
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  white-space: nowrap;
  z-index: 10;
}

.search-prefix {
  color: var(--text-secondary);
}

.search-query {
  color: var(--accent-color);
  font-weight: 600;
}

.search-suffix {
  color: var(--text-secondary);
}

.search-results {
  color: var(--text-tertiary);
  margin-left: 8px;
}

/* CLI 工具选择器按钮 */
.cli-tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #007AFF;
  border: 2px solid #007AFF;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  white-space: nowrap;
  z-index: 100;
  position: relative;
  flex-shrink: 0;
  min-height: 36px;
  pointer-events: auto;
}

.cli-tool-btn:hover {
  background: #0056CC;
  border-color: #0056CC;
  transform: scale(1.02);
}

.cli-tool-btn:active {
  background: #004499;
  transform: scale(0.98);
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* CLI 工具选择器下拉菜单 */
.cli-tool-selector {
  position: fixed;
  top: auto;
  bottom: 140px;
  /* 增加底部间距，避免被输入框遮挡 */
  left: 20px;
  right: 20px;
  background: var(--bg-secondary);
  /* 使用主题变量 */
  border: 2px solid var(--accent-color);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  /* 确保在最上层 */
  overflow: hidden;
  max-height: 400px;
}

.tool-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.selector-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.close-selector {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-selector:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tool-list {
  max-height: 300px;
  overflow-y: auto;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.tool-item:hover {
  background: var(--bg-hover);
}

.tool-item.active {
  background: var(--accent-color);
  color: white;
}

.tool-item-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.tool-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-item-name {
  font-weight: 600;
  font-size: 14px;
}

.tool-item-desc {
  font-size: 12px;
  opacity: 0.7;
}

.tool-item.active .tool-item-desc {
  opacity: 0.9;
}
</style>
