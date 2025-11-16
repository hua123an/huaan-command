<script setup>
import { ref, computed } from 'vue'
import { useHistoryStore } from '../stores/history'

const emit = defineEmits(['use-command', 'close'])
const historyStore = useHistoryStore()

const searchQuery = ref('')
const sortBy = ref('recent') // 'recent' | 'frequency'

// 搜索结果
const searchResults = computed(() => {
  if (!searchQuery.value) {
    return sortBy.value === 'frequency' 
      ? historyStore.getFrequentCommands()
      : historyStore.getRecentCommands()
  }
  return historyStore.searchCommands(searchQuery.value, sortBy.value === 'frequency')
})

// 使用命令
const useCommand = (command) => {
  emit('use-command', command)
}

// 切换收藏
const toggleFavorite = (command) => {
  historyStore.toggleFavorite(command)
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="history-panel">
    <div class="panel-header">
      <h2>🕐 命令历史</h2>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="search-bar">
      <input 
        v-model="searchQuery"
        type="text"
        placeholder="搜索历史命令... (Cmd+R)"
        class="search-input"
        autofocus
      />
    </div>

    <div class="filter-bar">
      <button 
        :class="['filter-btn', { active: sortBy === 'recent' }]"
        @click="sortBy = 'recent'"
      >
        ⏱ 最近使用
      </button>
      <button 
        :class="['filter-btn', { active: sortBy === 'frequency' }]"
        @click="sortBy = 'frequency'"
      >
        🔥 使用频率
      </button>
      <button class="clear-btn" @click="historyStore.clearHistory()">
        🗑 清空历史
      </button>
    </div>

    <div class="results-list">
      <div 
        v-for="entry in searchResults"
        :key="entry.timestamp + entry.command"
        class="result-item"
      >
        <div class="command-info">
          <button 
            :class="['favorite-btn', { active: historyStore.isFavorite(entry.command) }]"
            title="收藏"
            @click="toggleFavorite(entry.command)"
          >
            {{ historyStore.isFavorite(entry.command) ? '⭐' : '☆' }}
          </button>
          <pre class="command-text">{{ entry.command }}</pre>
        </div>
        <div class="command-meta">
          <span class="time">{{ formatTime(entry.timestamp) }}</span>
          <span v-if="entry.count > 1" class="count">使用 {{ entry.count }} 次</span>
          <span v-if="entry.cwd" class="cwd">{{ entry.cwd }}</span>
        </div>
        <button class="use-btn" @click="useCommand(entry.command)">
          使用
        </button>
      </div>

      <div v-if="searchResults.length === 0" class="empty-state">
        <p>{{ searchQuery ? '没有找到匹配的命令' : '还没有历史记录' }}</p>
      </div>
    </div>

    <!-- 收藏的命令 -->
    <div v-if="historyStore.favorites.length > 0" class="favorites-section">
      <h3>⭐ 收藏的命令</h3>
      <div class="favorites-list">
        <button
          v-for="cmd in historyStore.favorites"
          :key="cmd"
          class="favorite-item"
          @click="useCommand(cmd)"
        >
          {{ cmd }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 800px;
  height: 80%;
  background: var(--bg-secondary) 100%);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(40px);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h2 {
  font-size: 18px;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 18px;
}

.search-bar {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent-hover);
}

.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-color);
}

.filter-btn {
  padding: 8px 16px;
  background: var(--bg-hover);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
}

.filter-btn.active {
  background: rgba(10, 132, 255, 0.2);
  border-color: rgba(10, 132, 255, 0.5);
  color: var(--accent-color);
}

.clear-btn {
  margin-left: auto;
  padding: 8px 16px;
  background: rgba(255, 59, 48, 0.2);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 8px;
  color: var(--error-color);
  cursor: pointer;
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.result-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.command-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  grid-column: 1 / -1;
}

.favorite-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  opacity: 0.5;
}

.favorite-btn.active {
  opacity: 1;
}

.command-text {
  flex: 1;
  margin: 0;
  font-size: 13px;
  color: #e4e4e7;
  overflow-x: auto;
}

.command-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.count {
  color: var(--success-color);
}

.cwd {
  color: var(--accent-color);
}

.use-btn {
  padding: 8px 16px;
  background: #0a84ff;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.favorites-section {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.favorites-section h3 {
  font-size: 14px;
  margin: 0 0 12px 0;
}

.favorites-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.favorite-item {
  padding: 6px 12px;
  background: rgba(10, 132, 255, 0.2);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: 6px;
  color: var(--accent-color);
  font-size: 12px;
  cursor: pointer;
}
</style>

