<script setup>
import { computed } from 'vue'
import { useHistoryStore } from '../stores/history'

const historyStore = useHistoryStore()
const stats = computed(() => historyStore.getStats())

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusColor = (status) => {
  return {
    success: '#32d74b',
    failed: '#ff453a',
    cancelled: '#8e8e93',
  }[status] || '#8e8e93'
}
</script>

<template>
  <div class="stats-panel">
    <h2 class="panel-title">📊 任务统计</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总执行次数</div>
      </div>

      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ stats.success }}</div>
        <div class="stat-label">成功</div>
      </div>

      <div class="stat-card failed">
        <div class="stat-icon">❌</div>
        <div class="stat-value">{{ stats.failed }}</div>
        <div class="stat-label">失败</div>
      </div>

      <div class="stat-card rate">
        <div class="stat-icon">📈</div>
        <div class="stat-value">{{ stats.successRate }}%</div>
        <div class="stat-label">成功率</div>
      </div>

      <div class="stat-card duration">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">{{ formatDuration(stats.avgDuration) }}</div>
        <div class="stat-label">平均耗时</div>
      </div>
    </div>

    <div class="history-section">
      <div class="section-header">
        <h3>最近记录</h3>
        <button v-if="historyStore.history.length > 0" class="clear-btn" @click="historyStore.clearHistory()">
          清空历史
        </button>
      </div>

      <div v-if="historyStore.history.length > 0" class="history-list">
        <div
          v-for="record in historyStore.history.slice(0, 10)"
          :key="record.id"
          class="history-item"
        >
          <div class="history-info">
            <span class="history-status" :style="{ color: getStatusColor(record.status) }">
              {{ record.status === 'success' ? '✓' : '✗' }}
            </span>
            <div class="history-details">
              <div class="history-name">{{ record.name }}</div>
              <div class="history-meta">
                {{ formatTime(record.timestamp) }} · {{ formatDuration(record.duration) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-history">
        <div class="empty-icon">📋</div>
        <p>暂无历史记录</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.panel-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-hover);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stat-card.success {
  border-left: 3px solid #32d74b;
}

.stat-card.failed {
  border-left: 3px solid #ff453a;
}

.stat-card.rate {
  border-left: 3px solid #0a84ff;
}

.stat-card.duration {
  border-left: 3px solid #bf5af2;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.history-section {
  margin-top: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.clear-btn {
  padding: 6px 12px;
  background: rgba(255, 69, 58, 0.15);
  border: 1px solid rgba(255, 69, 58, 0.3);
  border-radius: 6px;
  color: #ff6961;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(255, 69, 58, 0.25);
  border-color: rgba(255, 69, 58, 0.5);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  background: rgba(50, 50, 52, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.history-item:hover {
  background: rgba(60, 60, 62, 0.5);
  border-color: rgba(255, 255, 255, 0.1);
}

.history-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.history-status {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.history-details {
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-history p {
  margin: 0;
  font-size: 14px;
}

.stats-panel::-webkit-scrollbar {
  width: 8px;
}

.stats-panel::-webkit-scrollbar-track {
  background: transparent;
}

.stats-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
</style>
