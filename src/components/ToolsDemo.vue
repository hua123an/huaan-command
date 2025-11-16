<template>
  <div class="tools-demo">
    <div class="header">
      <h2>工具系统演示</h2>
      <div class="stats">
        <span>已执行: {{ executionHistory.length }}</span>
        <span>成功率: {{ successRate }}%</span>
        <button @click="clearHistory">清空历史</button>
      </div>
    </div>

    <!-- 工具分类 -->
    <div class="categories">
      <button
        v-for="cat in categories"
        :key="cat"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ getCategoryIcon(cat) }} {{ getCategoryName(cat) }}
        <span class="count">{{ getToolsByCategory(cat).length }}</span>
      </button>
    </div>

    <!-- 工具列表 -->
    <div class="tools-grid">
      <div
        v-for="tool in filteredTools"
        :key="tool.name"
        class="tool-card"
        :class="{ executing: executingTool === tool.name }"
      >
        <div class="tool-header">
          <span class="tool-icon">{{ tool.icon }}</span>
          <span class="tool-name">{{ tool.name }}</span>
          <span v-if="tool.needsApproval" class="badge">需批准</span>
        </div>
        <p class="tool-description">{{ tool.description }}</p>
        <button :disabled="executingTool === tool.name" @click="executeToolDemo(tool)">
          {{ executingTool === tool.name ? '执行中...' : '执行' }}
        </button>
      </div>
    </div>

    <!-- 执行结果 -->
    <div v-if="lastResult" class="result-panel">
      <div class="result-header">
        <h3>最新执行结果</h3>
        <span :class="resultClass">
          {{ lastResult.result.success ? '✓ 成功' : '✗ 失败' }}
        </span>
        <span class="duration">{{ lastResult.duration }}ms</span>
      </div>
      <div class="result-details">
        <div class="detail-row"><strong>工具:</strong> {{ lastResult.tool }}</div>
        <div class="detail-row">
          <strong>参数:</strong>
          <pre>{{ JSON.stringify(lastResult.params, null, 2) }}</pre>
        </div>
        <div class="detail-row">
          <strong>输出:</strong>
          <pre class="output">{{ lastResult.result.output || lastResult.result.error }}</pre>
        </div>
      </div>
    </div>

    <!-- 执行历史 -->
    <div class="history-panel">
      <h3>执行历史 (最近 20 条)</h3>
      <div class="history-list">
        <div
          v-for="(record, idx) in recentHistory"
          :key="idx"
          class="history-item"
          @click="showHistoryDetail(record)"
        >
          <span class="history-icon">
            {{ getTool(record.tool)?.icon || '🔧' }}
          </span>
          <span class="history-tool">{{ record.tool }}</span>
          <span :class="{ success: record.result.success, error: !record.result.success }">
            {{ record.result.success ? '✓' : '✗' }}
          </span>
          <span class="history-time">{{ formatTime(record.timestamp) }}</span>
          <span class="history-duration">{{ record.duration }}ms</span>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-panel">
      <h3>工具统计</h3>
      <table class="stats-table">
        <thead>
          <tr>
            <th>工具</th>
            <th>执行次数</th>
            <th>成功率</th>
            <th>平均耗时</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(stat, toolName) in sortedStats" :key="toolName">
            <td>{{ getTool(toolName)?.icon }} {{ toolName }}</td>
            <td>{{ stat.count }}</td>
            <td>
              <span :class="getSuccessRateClass(stat)">
                {{ ((stat.successCount / stat.count) * 100).toFixed(1) }}%
              </span>
            </td>
            <td>{{ stat.avgDuration.toFixed(0) }}ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToolExecutor } from '@/tools/executor'
import { TOOL_CATEGORIES, CATEGORY_ICONS, CATEGORY_NAMES } from '@/tools/categories'

// 工具执行器
const {
  executingTool,
  lastResult,
  executionHistory,
  toolStats,
  executeTool,
  getTool,
  getToolsByCategory,
  clearHistory: clearExecutionHistory
} = useToolExecutor({
  currentDir: '/Users/project',
  sessionId: 'demo-session'
})

// UI 状态
const selectedCategory = ref('all')
const categories = ['all', ...Object.values(TOOL_CATEGORIES)]

// 计算属性
const filteredTools = computed(() => {
  if (selectedCategory.value === 'all') {
    return getToolsByCategory('filesystem')
      .concat(getToolsByCategory('execution'))
      .concat(getToolsByCategory('git'))
  }
  return getToolsByCategory(selectedCategory.value)
})

const recentHistory = computed(() => {
  return executionHistory.value.slice(0, 20)
})

const successRate = computed(() => {
  if (executionHistory.value.length === 0) return 0
  const successful = executionHistory.value.filter(r => r.result.success).length
  return ((successful / executionHistory.value.length) * 100).toFixed(1)
})

const sortedStats = computed(() => {
  return Object.entries(toolStats.value)
    .sort((a, b) => b[1].count - a[1].count)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {})
})

const resultClass = computed(() => {
  return lastResult.value?.result.success ? 'success' : 'error'
})

// 方法
const getCategoryIcon = category => {
  return category === 'all' ? '📦' : CATEGORY_ICONS[category] || '🔧'
}

const getCategoryName = category => {
  return category === 'all' ? '全部' : CATEGORY_NAMES[category] || category
}

const getSuccessRateClass = stat => {
  const rate = (stat.successCount / stat.count) * 100
  if (rate >= 90) return 'rate-high'
  if (rate >= 70) return 'rate-medium'
  return 'rate-low'
}

const formatTime = timestamp => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN')
}

const clearHistory = () => {
  if (confirm('确认清空执行历史？')) {
    clearExecutionHistory()
  }
}

const showHistoryDetail = record => {
  lastResult.value = record
}

// 演示工具执行
const executeToolDemo = async tool => {
  // 根据工具生成演示参数
  const params = getDemoParams(tool.name)

  try {
    await executeTool(tool.name, params, {
      onApprovalRequired: async (tool, params) => {
        return confirm(
          `工具 "${tool.name}" 需要批准\n\n` +
            `参数:\n${JSON.stringify(params, null, 2)}\n\n` +
            `确认执行？`
        )
      },
      onWarning: async warnings => {
        return confirm(`警告:\n${warnings.join('\n')}\n\n确认继续？`)
      }
    })
  } catch (error) {
    console.error('执行失败:', error.message)
  }
}

// 获取演示参数
const getDemoParams = toolName => {
  const demoParams = {
    read_file: { path: '/Users/project/README.md' },
    write_file: { path: '/tmp/test.txt', content: 'Hello, World!' },
    list_files: { dir: '/Users/project' },
    search_files: { pattern: '*.js', dir: '/Users/project/src' },
    execute_command: { cmd: 'ls -la', workingDir: '/Users/project' },
    get_current_dir: { sessionId: 'demo-session' },
    git_status: { workingDir: '/Users/project' },
    git_diff: { workingDir: '/Users/project' },
    git_log: { workingDir: '/Users/project', limit: 10 },
    git_branch: { workingDir: '/Users/project' },
    find_in_files: { pattern: 'TODO', dir: '/Users/project/src' },
    get_env_info: {},
    list_processes: { filter: 'node' },
    test_connection: { host: 'google.com' },
    check_port: { port: 3000 }
  }

  return demoParams[toolName] || {}
}
</script>

<style scoped>
.tools-demo {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.header h2 {
  margin: 0;
  color: #333;
}

.stats {
  display: flex;
  gap: 20px;
  align-items: center;
}

.stats span {
  color: #666;
  font-size: 14px;
}

.categories {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.categories button {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.categories button:hover {
  border-color: #2196f3;
  background: #f5f5f5;
}

.categories button.active {
  border-color: #2196f3;
  background: #2196f3;
  color: white;
}

.count {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.tool-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: all 0.2s;
}

.tool-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.tool-card.executing {
  border-color: #2196f3;
  background: #f0f7ff;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.tool-icon {
  font-size: 24px;
}

.tool-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.badge {
  margin-left: auto;
  padding: 2px 8px;
  background: #ff9800;
  color: white;
  border-radius: 4px;
  font-size: 11px;
}

.tool-description {
  color: #666;
  font-size: 14px;
  margin: 0 0 15px 0;
  line-height: 1.5;
}

.tool-card button {
  width: 100%;
  padding: 10px;
  border: none;
  background: #2196f3;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.tool-card button:hover:not(:disabled) {
  background: #1976d2;
}

.tool-card button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result-panel {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.result-header h3 {
  margin: 0;
}

.result-header .success {
  color: #4caf50;
  font-weight: 600;
}

.result-header .error {
  color: #f44336;
  font-weight: 600;
}

.duration {
  margin-left: auto;
  color: #666;
  font-size: 14px;
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-row strong {
  color: #666;
  font-size: 14px;
}

.detail-row pre {
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin: 0;
  overflow-x: auto;
  font-size: 13px;
}

.output {
  max-height: 300px;
  overflow-y: auto;
}

.history-panel,
.stats-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f0f0f0;
}

.history-icon {
  font-size: 20px;
}

.history-tool {
  font-weight: 500;
  color: #333;
}

.history-item .success {
  color: #4caf50;
}

.history-item .error {
  color: #f44336;
}

.history-time {
  margin-left: auto;
  color: #999;
  font-size: 13px;
}

.history-duration {
  color: #666;
  font-size: 13px;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th {
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e0e0e0;
  color: #666;
  font-weight: 600;
}

.stats-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.rate-high {
  color: #4caf50;
  font-weight: 600;
}
.rate-medium {
  color: #ff9800;
  font-weight: 600;
}
.rate-low {
  color: #f44336;
  font-weight: 600;
}
</style>
