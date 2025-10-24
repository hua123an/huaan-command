<script setup>
import { ref, computed } from 'vue'
import { useAIStore } from '../stores/ai'

const props = defineProps({
  task: Object
})

const emit = defineEmits(['close'])

const aiStore = useAIStore()
const activeTab = ref('output')
const searchQuery = ref('')
const showSearch = ref(false)
const aiDiagnosis = ref('')
const diagnosing = ref(false)
const showAnalysis = ref(false)
const logAnalysis = ref('')
const analyzing = ref(false)

const hasOutput = computed(() => props.task.output?.trim().length > 0)
const hasError = computed(() => props.task.error?.trim().length > 0)

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN')
}

const getDuration = () => {
  if (!props.task.start_time) return '-'
  const end = props.task.end_time || Math.floor(Date.now() / 1000)
  const duration = end - props.task.start_time
  if (duration < 60) return `${duration}秒`
  if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`
  return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分`
}

const getStatusText = () => {
  const statusMap = {
    pending: '待运行',
    running: '运行中',
    success: '成功',
    failed: '失败',
    cancelled: '已取消'
  }
  return statusMap[props.task.status] || '未知'
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text)
}

// 输出高亮处理
const highlightOutput = (text) => {
  if (!text) return ''
  
  return text
    // ERROR 高亮（红色）
    .replace(/(ERROR|Error|error|FATAL|Fatal|fatal|FAIL|Failed|failed)(:.*)?/g, 
      '<span class="highlight-error">$&</span>')
    // WARNING 高亮（黄色）
    .replace(/(WARNING|Warning|warning|WARN|Warn|warn)(:.*)?/g, 
      '<span class="highlight-warning">$&</span>')
    // SUCCESS 高亮（绿色）
    .replace(/(SUCCESS|Success|success|DONE|Done|done|PASS|Passed|passed|OK|✓|✔)(\s|:.*)?/g, 
      '<span class="highlight-success">$&</span>')
    // URL 链接
    .replace(/(https?:\/\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" class="output-link">$1</a>')
    // 文件路径（简单识别）
    .replace(/([\/\\][\w\-\.\/\\]+\.(js|ts|jsx|tsx|vue|css|json|md|txt|log))/g, 
      '<span class="highlight-path">$1</span>')
    // 数字高亮
    .replace(/\b(\d+(?:\.\d+)?(?:ms|s|MB|KB|GB|%)?)\b/g, 
      '<span class="highlight-number">$1</span>')
}

// 过滤输出
const filteredOutput = computed(() => {
  if (!searchQuery.value || !props.task.output) return props.task.output
  
  const lines = props.task.output.split('\n')
  const query = searchQuery.value.toLowerCase()
  return lines
    .filter(line => line.toLowerCase().includes(query))
    .join('\n')
})

const filteredError = computed(() => {
  if (!searchQuery.value || !props.task.error) return props.task.error
  
  const lines = props.task.error.split('\n')
  const query = searchQuery.value.toLowerCase()
  return lines
    .filter(line => line.toLowerCase().includes(query))
    .join('\n')
})

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (!showSearch.value) {
    searchQuery.value = ''
  }
}
</script>

<template>
  <div class="detail-panel">
    <div class="detail-header">
      <h2>任务详情</h2>
      <div class="header-actions">
        <button class="icon-btn" @click="toggleSearch" :class="{ active: showSearch }" title="搜索输出">
          🔍
        </button>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>
    </div>

    <div class="detail-body">
      <div class="info-section">
        <div class="info-item">
          <span class="info-label">名称:</span>
          <span class="info-value">{{ task.name }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">命令:</span>
          <code class="info-code">
            {{ task.command }}
            <button class="copy-btn" @click="copyToClipboard(task.command)" title="复制">
              📋
            </button>
          </code>
        </div>
        <div class="info-item">
          <span class="info-label">状态:</span>
          <span :class="['info-badge', task.status]">{{ getStatusText() }}</span>
        </div>
        <div class="info-item" v-if="task.start_time">
          <span class="info-label">开始时间:</span>
          <span class="info-value">{{ formatTime(task.start_time) }}</span>
        </div>
        <div class="info-item" v-if="task.end_time">
          <span class="info-label">结束时间:</span>
          <span class="info-value">{{ formatTime(task.end_time) }}</span>
        </div>
        <div class="info-item" v-if="task.start_time">
          <span class="info-label">耗时:</span>
          <span class="info-value">{{ getDuration() }}</span>
        </div>
      </div>

      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'output' }]"
          @click="activeTab = 'output'"
        >
          输出 {{ hasOutput ? `(${task.output.split('\n').length})` : '' }}
        </button>
        <button
          :class="['tab', { active: activeTab === 'error' }]"
          @click="activeTab = 'error'"
        >
          错误 {{ hasError ? `(${task.error.split('\n').length})` : '' }}
        </button>
      </div>

      <div v-if="showSearch" class="search-bar">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索输出内容..." 
          class="search-input"
          autofocus
        />
        <span class="search-hint">按 ESC 关闭</span>
      </div>

      <div class="output-section">
        <div v-if="activeTab === 'output'" class="output-content">
          <pre v-if="hasOutput" v-html="highlightOutput(filteredOutput)"></pre>
          <div v-else class="empty-output">暂无输出</div>
        </div>
        <div v-if="activeTab === 'error'" class="output-content error">
          <pre v-if="hasError" v-html="highlightOutput(filteredError)"></pre>
          <div v-else class="empty-output">暂无错误</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-panel {
  width: 480px;
  background: linear-gradient(135deg, rgba(32, 32, 34, 0.98) 0%, rgba(28, 28, 30, 0.98) 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.detail-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover,
.icon-btn.active {
  background: rgba(10, 132, 255, 0.2);
  color: var(--accent-color);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.detail-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.info-section {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.info-code {
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  word-break: break-all;
}

.copy-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  opacity: 1;
}

.info-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.info-badge.pending {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-badge.running {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(10, 132, 255, 0.15) 100%);
  color: #4da6ff;
  border: 1px solid rgba(10, 132, 255, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

.info-badge.success {
  background: linear-gradient(135deg, rgba(50, 215, 75, 0.25) 0%, rgba(50, 215, 75, 0.15) 100%);
  color: #5de86d;
  border: 1px solid rgba(50, 215, 75, 0.4);
}

.info-badge.failed {
  background: linear-gradient(135deg, rgba(255, 69, 58, 0.25) 0%, rgba(255, 69, 58, 0.15) 100%);
  color: #ff6961;
  border: 1px solid rgba(255, 69, 58, 0.4);
}

.info-badge.cancelled {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  font-family: inherit;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-color);
}

.output-section {
  flex: 1;
  overflow: hidden;
}

.output-content {
  height: 100%;
  overflow-y: auto;
  padding: 16px 24px;
}

.output-content pre {
  margin: 0;
  font-family: 'SF Mono', Menlo, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.output-content.error pre {
  color: #ff6961;
}

.empty-output {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  font-size: 13px;
}

.output-content::-webkit-scrollbar {
  width: 8px;
}

.output-content::-webkit-scrollbar-track {
  background: transparent;
}

.output-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.output-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 搜索框样式 */
.search-bar {
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-input {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent-color);
  background: var(--bg-secondary);
}

.search-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 输出高亮样式 */
:deep(.highlight-error) {
  color: #ff6961;
  font-weight: 600;
  background: rgba(255, 69, 58, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}

:deep(.highlight-warning) {
  color: var(--warning-color);
  font-weight: 600;
  background: rgba(255, 214, 10, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}

:deep(.highlight-success) {
  color: var(--success-color);
  font-weight: 600;
  background: rgba(50, 215, 75, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}

:deep(.output-link) {
  color: var(--accent-color);
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s ease;
}

:deep(.output-link:hover) {
  color: #4da6ff;
  text-decoration: none;
}

:deep(.highlight-path) {
  color: #bf5af2;
  font-style: italic;
}

:deep(.highlight-number) {
  color: #64d2ff;
  font-weight: 500;
}
</style>
