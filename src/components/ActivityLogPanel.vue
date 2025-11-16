<template>
  <div class="activity-log-panel" :class="{ collapsed: isCollapsed }">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="panel-icon">📋</span>
        <h3>活动日志</h3>
        <span class="log-count">{{ stats?.total || 0 }}</span>
        <span v-if="stats?.errors > 0" class="error-badge">
          {{ stats.errors }} 错误
        </span>
      </div>
      <div class="header-actions">
        <button
          class="icon-btn"
          title="导出日志"
          @click="exportLogs"
        >
          💾
        </button>
        <button
          class="icon-btn"
          title="刷新"
          :disabled="isLoading"
          @click="refresh"
        >
          <span :class="{ spinning: isLoading }">🔄</span>
        </button>
        <button
          class="icon-btn"
          title="折叠/展开"
          @click="toggleCollapse"
        >
          {{ isCollapsed ? '▼' : '▲' }}
        </button>
      </div>
    </div>

    <!-- 内容区 -->
    <div v-show="!isCollapsed" class="panel-content">
      <!-- 过滤器 -->
      <div class="filters-section">
        <div class="filter-row">
          <select v-model="filters.level" class="filter-select" @change="applyFilters">
            <option :value="null">所有级别</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="success">Success</option>
          </select>

          <select v-model="filters.type" class="filter-select" @change="applyFilters">
            <option :value="null">所有类型</option>
            <option value="ai_request">AI 请求</option>
            <option value="ai_response">AI 响应</option>
            <option value="tool_call">工具调用</option>
            <option value="tool_result">工具结果</option>
            <option value="command">命令</option>
            <option value="file_operation">文件操作</option>
            <option value="error">错误</option>
            <option value="user_action">用户操作</option>
            <option value="system">系统</option>
          </select>

          <input
            v-model="filters.search"
            type="text"
            placeholder="搜索..."
            class="search-input"
            @input="applyFilters"
          />

          <button
            v-if="hasActiveFilters"
            class="btn-clear"
            @click="clearFilters"
          >
            ✕ 清除
          </button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="stats" class="stats-bar">
        <div class="stat">
          <span class="stat-icon">📊</span>
          <span>总计: {{ stats.total }}</span>
        </div>
        <div v-if="stats.errors > 0" class="stat">
          <span class="stat-icon">❌</span>
          <span>错误: {{ stats.errors }}</span>
        </div>
        <div v-if="stats.warnings > 0" class="stat">
          <span class="stat-icon">⚠️</span>
          <span>警告: {{ stats.warnings }}</span>
        </div>
      </div>

      <!-- 日志列表 -->
      <div ref="logListRef" class="log-list">
        <div
          v-for="log in displayedLogs"
          :key="log.id"
          class="log-entry"
          :class="`level-${log.level} type-${log.type}`"
          @click="selectLog(log)"
        >
          <div class="log-header">
            <span class="log-level" :class="`level-${log.level}`">
              {{ getLevelIcon(log.level) }}
            </span>
            <span class="log-type">{{ getTypeLabel(log.type) }}</span>
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          </div>

          <div class="log-message">{{ log.message }}</div>

          <div v-if="log.data && Object.keys(log.data).length > 0" class="log-data">
            <details>
              <summary>查看详情</summary>
              <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
            </details>
          </div>
        </div>

        <div v-if="displayedLogs.length === 0" class="empty-state">
          <p>{{ hasActiveFilters ? '没有匹配的日志' : '暂无日志记录' }}</p>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="panel-footer">
        <button class="btn btn-sm btn-danger" @click="clearLogs">
          🗑️ 清空日志
        </button>
        <button class="btn btn-sm" @click="downloadLogs">
          📥 下载日志
        </button>
      </div>
    </div>

    <!-- 日志详情对话框 -->
    <div v-if="selectedLog" class="log-detail-overlay" @click.self="closeDetail">
      <div class="log-detail-dialog">
        <div class="detail-header">
          <h3>日志详情</h3>
          <button class="close-btn" @click="closeDetail">✕</button>
        </div>
        <div class="detail-content">
          <div class="detail-field">
            <label>ID:</label>
            <code>{{ selectedLog.id }}</code>
          </div>
          <div class="detail-field">
            <label>时间:</label>
            <span>{{ new Date(selectedLog.timestamp).toLocaleString('zh-CN') }}</span>
          </div>
          <div class="detail-field">
            <label>级别:</label>
            <span class="log-level" :class="`level-${selectedLog.level}`">
              {{ selectedLog.level }}
            </span>
          </div>
          <div class="detail-field">
            <label>类型:</label>
            <span>{{ selectedLog.type }}</span>
          </div>
          <div class="detail-field">
            <label>消息:</label>
            <span>{{ selectedLog.message }}</span>
          </div>
          <div class="detail-field">
            <label>数据:</label>
            <pre>{{ JSON.stringify(selectedLog.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { activityLogger } from '../security/ActivityLogger'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  autoScroll: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['log-selected', 'error'])

const isCollapsed = ref(props.collapsed)
const isLoading = ref(false)
const logs = ref([])
const stats = ref(null)
const selectedLog = ref(null)
const logListRef = ref(null)

const filters = ref({
  level: null,
  type: null,
  search: null
})

const displayedLogs = computed(() => {
  let filtered = logs.value

  if (filters.value.level) {
    filtered = filtered.filter(log => log.level === filters.value.level)
  }

  if (filters.value.type) {
    filtered = filtered.filter(log => log.type === filters.value.type)
  }

  if (filters.value.search) {
    const query = filters.value.search.toLowerCase()
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(query) ||
      JSON.stringify(log.data).toLowerCase().includes(query)
    )
  }

  return filtered
})

const hasActiveFilters = computed(() => {
  return filters.value.level !== null ||
         filters.value.type !== null ||
         (filters.value.search && filters.value.search.length > 0)
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const refresh = async () => {
  isLoading.value = true
  try {
    logs.value = activityLogger.getLogs()
    stats.value = activityLogger.getStats()

    if (props.autoScroll) {
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

const applyFilters = () => {
  // 过滤在 computed 中自动处理
}

const clearFilters = () => {
  filters.value = {
    level: null,
    type: null,
    search: null
  }
}

const selectLog = (log) => {
  selectedLog.value = log
  emit('log-selected', log)
}

const closeDetail = () => {
  selectedLog.value = null
}

const clearLogs = () => {
  if (confirm('确定要清空所有日志吗？此操作不可撤销。')) {
    activityLogger.clear()
    refresh()
  }
}

const exportLogs = () => {
  const format = prompt('选择导出格式: json, csv, txt', 'json')
  if (format && ['json', 'csv', 'txt'].includes(format)) {
    activityLogger.download(format)
  }
}

const downloadLogs = () => {
  activityLogger.download('json')
}

const scrollToBottom = () => {
  if (logListRef.value) {
    logListRef.value.scrollTop = logListRef.value.scrollHeight
  }
}

const getLevelIcon = (level) => {
  const icons = {
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅'
  }
  return icons[level] || 'ℹ️'
}

const getTypeLabel = (type) => {
  const labels = {
    ai_request: 'AI请求',
    ai_response: 'AI响应',
    tool_call: '工具调用',
    tool_result: '工具结果',
    command: '命令',
    file_operation: '文件操作',
    error: '错误',
    user_action: '用户操作',
    system: '系统'
  }
  return labels[type] || type
}

const formatTime = (timestamp) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 1000) return '刚刚'
  if (diff < 60000) return `${Math.floor(diff / 1000)} 秒前`
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`

  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN')
}

// 监听新日志
let logListener
onMounted(() => {
  refresh()

  // 添加日志监听器
  logListener = (newLog) => {
    logs.value.push(newLog)
    stats.value = activityLogger.getStats()

    if (props.autoScroll) {
      nextTick(() => scrollToBottom())
    }
  }
  activityLogger.addListener(logListener)

  // 定期刷新
  const interval = setInterval(refresh, 30000)

  onUnmounted(() => {
    clearInterval(interval)
    if (logListener) {
      activityLogger.removeListener(logListener)
    }
  })
})
</script>

<style scoped>
.activity-log-panel {
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
}

.activity-log-panel.collapsed {
  max-height: 48px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #404040);
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 18px;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e0e0e0);
}

.log-count {
  background: var(--primary-color, #007aff);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.error-badge {
  background: #ff3b30;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #999);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filters-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #404040);
  background: var(--bg-tertiary, #2a2a2a);
}

.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-select,
.search-input {
  padding: 6px 10px;
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 4px;
  color: var(--text-primary, #e0e0e0);
  font-size: 12px;
}

.filter-select {
  flex-shrink: 0;
}

.search-input {
  flex: 1;
}

.btn-clear {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border-color, #404040);
  color: var(--text-secondary, #999);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  border-color: #ff3b30;
}

.stats-bar {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-tertiary, #2a2a2a);
  font-size: 12px;
  border-bottom: 1px solid var(--border-color, #404040);
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary, #b0b0b0);
}

.stat-icon {
  font-size: 14px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-entry {
  background: var(--bg-tertiary, #2a2a2a);
  border: 1px solid var(--border-color, #404040);
  border-left-width: 3px;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.log-entry:hover {
  background: var(--bg-hover, #353535);
}

.log-entry.level-error {
  border-left-color: #ff3b30;
  background: rgba(255, 59, 48, 0.05);
}

.log-entry.level-warn {
  border-left-color: #ff9500;
  background: rgba(255, 149, 0, 0.05);
}

.log-entry.level-success {
  border-left-color: #28a745;
  background: rgba(40, 167, 69, 0.05);
}

.log-entry.level-debug {
  border-left-color: #999;
}

.log-entry.level-info {
  border-left-color: #007aff;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.log-level {
  font-size: 14px;
}

.log-type {
  font-size: 11px;
  color: var(--text-secondary, #999);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 3px;
}

.log-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary, #666);
}

.log-message {
  color: var(--text-primary, #e0e0e0);
  line-height: 1.4;
}

.log-data {
  margin-top: 8px;
}

.log-data details {
  cursor: pointer;
}

.log-data summary {
  color: var(--primary-color, #007aff);
  font-size: 11px;
  user-select: none;
}

.log-data pre {
  margin: 8px 0 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  color: #4ec9b0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #999);
  font-size: 13px;
}

.panel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #404040);
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
  border: 1px solid var(--border-color, #404040);
}

.btn-sm:hover {
  background: var(--bg-hover, #353535);
}

.btn-danger {
  background: transparent;
  color: #ff3b30;
  border-color: #ff3b30;
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.1);
}

.log-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.log-detail-dialog {
  background: var(--bg-secondary, #1e1e1e);
  border: 1px solid var(--border-color, #404040);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #404040);
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary, #e0e0e0);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #999);
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary, #2a2a2a);
  color: var(--text-primary, #e0e0e0);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.detail-field {
  margin-bottom: 16px;
}

.detail-field label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary, #999);
  margin-bottom: 4px;
  font-weight: 500;
}

.detail-field code {
  display: block;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #4ec9b0;
  overflow-x: auto;
}

.detail-field pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  color: #4ec9b0;
  margin: 0;
}
</style>
