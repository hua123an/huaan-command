<script setup>
import { ref, watch, computed, onMounted } from 'vue'

const props = defineProps({
  show: Boolean,
  currentDir: String,
  sessionId: Number
})

const emit = defineEmits(['close', 'select'])

const loading = ref(false)
const files = ref([])
const searchQuery = ref('')
const currentPath = ref(props.currentDir || '~')

// 加载目录内容
const loadDirectory = async path => {
  loading.value = true
  try {
    const { invoke } = await import('@tauri-apps/api/core')

    // 扩展 ~ 为实际路径
    let actualPath = path
    if (path === '~' || path.startsWith('~/')) {
      const homeDir = await invoke('get_home_dir')
      actualPath = path.replace('~', homeDir)
    }

    const result = await invoke('list_directory', { path: actualPath })

    // 排序：目录优先，然后按名称
    files.value = result.sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1
      if (!a.is_dir && b.is_dir) return 1
      return a.name.localeCompare(b.name)
    })

    currentPath.value = actualPath
  } catch (error) {
    console.error('Failed to load directory:', error)
    files.value = []
  } finally {
    loading.value = false
  }
}

// 监听显示状态
watch(
  () => props.show,
  newVal => {
    if (newVal) {
      loadDirectory(props.currentDir || '~')
    }
  }
)

// 过滤文件列表
const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value

  const query = searchQuery.value.toLowerCase()
  return files.value.filter(file => file.name.toLowerCase().includes(query))
})

// 进入目录（双击）
const enterDirectory = file => {
  if (file.is_dir) {
    loadDirectory(file.path)
  }
}

// 返回上级目录
const goUp = () => {
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/'
  loadDirectory(parentPath)
}

// 选择文件/目录（单击直接选择，不区分文件还是目录）
const selectItem = file => {
  emit('select', {
    path: file.path,
    name: file.name,
    isDir: file.is_dir
  })
  emit('close')
}

// 快速选择当前目录
const selectCurrentDir = () => {
  emit('select', {
    path: currentPath.value,
    name: currentPath.value.split('/').pop() || currentPath.value,
    isDir: true
  })
  emit('close')
}

// 格式化文件大小
const formatSize = bytes => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

// 获取文件图标
const getFileIcon = file => {
  if (file.is_dir) return '📁'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const iconMap = {
    js: '📜',
    ts: '📘',
    vue: '💚',
    jsx: '⚛️',
    tsx: '⚛️',
    json: '📋',
    md: '📝',
    txt: '📄',
    rs: '🦀',
    py: '🐍',
    go: '🔷',
    java: '☕',
    html: '🌐',
    css: '🎨',
    scss: '🎨',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    pdf: '📕',
    zip: '📦',
    tar: '📦',
    gz: '📦'
  }

  return iconMap[ext] || '📄'
}

// 快捷键
const handleKeydown = event => {
  if (event.key === 'Escape') {
    emit('close')
  } else if (event.key === 'Enter' && filteredFiles.value.length > 0) {
    const firstFile = filteredFiles.value[0]
    if (firstFile.is_dir) {
      enterDirectory(firstFile)
    } else {
      selectItem(firstFile)
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="show" class="file-picker-overlay" @click.self="emit('close')">
    <div class="file-picker-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-left">
          <h3>选择文件或目录</h3>
          <div class="breadcrumb">
            <span class="path">{{ currentPath }}</span>
          </div>
        </div>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
          <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文件..."
          class="search-input"
          autofocus
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar">
        <button class="tool-btn" :disabled="currentPath === '/'" @click="goUp">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13 10L8 5L3 10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>上级目录</span>
        </button>
        <button class="tool-btn" @click="loadDirectory(currentPath)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M14 4V8H10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>刷新</span>
        </button>
        <button class="tool-btn select-current" @click="selectCurrentDir">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6.5 11.5L13 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>选择当前目录</span>
        </button>
      </div>

      <!-- 文件列表 -->
      <div class="file-list">
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else-if="filteredFiles.length === 0" class="empty">
          <span>{{ searchQuery ? '未找到匹配的文件' : '空目录' }}</span>
        </div>

        <div
          v-for="file in filteredFiles"
          v-else
          :key="file.path"
          :class="['file-item', { directory: file.is_dir }]"
          @dblclick="file.is_dir ? enterDirectory(file) : null"
        >
          <span class="file-icon">{{ getFileIcon(file) }}</span>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-meta">
              <span v-if="!file.is_dir && file.size" class="file-size">
                {{ formatSize(file.size) }}
              </span>
              <span v-if="file.is_dir" class="file-type">目录</span>
            </div>
          </div>
          <div class="file-actions">
            <!-- 选择按钮：文件和目录都可以选择 -->
            <button
              class="action-btn select-btn"
              :title="file.is_dir ? '选择此目录' : '选择此文件'"
              @click.stop="selectItem(file)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8L6.5 11.5L13 5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <!-- 进入按钮：只有目录才有 -->
            <button
              v-if="file.is_dir"
              class="action-btn enter-btn"
              title="进入目录"
              @click.stop="enterDirectory(file)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="modal-footer">
        <div class="hint">
          <span class="hint-section">
            <strong>✓</strong> 选择 · <strong>→</strong> 进入目录 · <strong>双击</strong> 快速进入
          </span>
          <span class="hint-divider">|</span>
          <span class="hint-section"> <kbd>Esc</kbd> 取消 </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.file-picker-modal {
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-left h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.breadcrumb {
  font-size: 13px;
  color: var(--text-secondary);
}

.path {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.8);
  color: white;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.search-bar svg {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 8px;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(10, 132, 255, 0.5);
  color: #0a84ff;
}

.tool-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.tool-btn.select-current {
  background: rgba(10, 132, 255, 0.1);
  border-color: rgba(10, 132, 255, 0.3);
  color: #0a84ff;
  margin-left: auto;
}

.tool-btn.select-current:hover {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.5);
}

/* 文件列表 */
.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px;
}

.loading,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  font-size: 14px;
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #0a84ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.file-item:hover {
  background: var(--bg-tertiary);
  border-color: rgba(10, 132, 255, 0.3);
}

.file-item.directory {
  cursor: pointer;
}

.file-item.directory:hover {
  background: rgba(10, 132, 255, 0.1);
}

.file-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn.select-btn {
  background: rgba(52, 199, 89, 0.2);
  color: #34c759;
}

.action-btn.select-btn:hover {
  background: rgba(52, 199, 89, 0.3);
  transform: scale(1.05);
}

.action-btn.enter-btn {
  background: rgba(10, 132, 255, 0.2);
  color: #0a84ff;
}

.action-btn.enter-btn:hover {
  background: rgba(10, 132, 255, 0.3);
  transform: scale(1.05);
}

/* 底部 */
.modal-footer {
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: var(--bg-secondary);
}

.hint {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.hint-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-section strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.hint-divider {
  color: rgba(255, 255, 255, 0.2);
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  color: var(--text-secondary);
  margin: 0 2px;
}
</style>
