<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  mode: String, // 'terminal' | 'ai'
  currentModel: String,
  placeholder: String,
  disabled: Boolean,
  currentDir: String // 当前目录路径
})

const emit = defineEmits(['submit', 'update:mode', 'mention-file'])

const inputRef = ref(null)
const inputValue = ref('')
const commandHistory = ref([])
const historyIndex = ref(-1)
const isReverseSearching = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searchIndex = ref(0)

// 获取当前目录的最后一级名称
const getCurrentDirName = () => {
  if (!props.currentDir) return ''

  // 处理 ~ 符号
  if (props.currentDir === '~') return '~'

  // 去掉末尾的斜杠
  const cleanPath = props.currentDir.replace(/\/$/, '')

  // 获取最后一级目录
  const parts = cleanPath.split('/')
  const lastPart = parts[parts.length - 1]

  // 如果是根目录或空，返回完整路径
  return lastPart || props.currentDir
}

// 点击目录标签，打开文件选择器
const handleDirClick = () => {
  emit('mention-file')
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

// 切换模式
const toggleMode = () => {
  const newMode = props.mode === 'terminal' ? 'ai' : 'terminal'
  emit('update:mode', newMode)
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
      <!-- 当前目录显示（可点击） - 终端和AI模式都显示 -->
      <button
        v-if="currentDir"
        class="current-dir"
        @click="handleDirClick"
        :title="`当前目录: ${currentDir}\n点击选择文件夹`"
      >
        📁 {{ getCurrentDirName() }}
      </button>

      <!-- 输入框 -->
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="getPlaceholder()"
        :disabled="disabled"
        @keydown.enter="submit"
        @keydown="handleKeyDown"
        class="command-input"
        :class="{ 'ai-mode': mode === 'ai' }"
        autocomplete="off"
        spellcheck="false"
      />
      
      <!-- 提交按钮 -->
      <button 
        class="submit-btn"
        @click="submit"
        :disabled="!inputValue.trim() || disabled"
        :title="mode === 'ai' ? '发送给 AI' : '执行命令'"
      >
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
}

.current-dir {
  background: transparent;
  color: var(--text-secondary);
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.current-dir:hover {
  background: var(--bg-hover);
  border-color: var(--accent-color);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
</style>

