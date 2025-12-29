import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSettingsStore } from './settings'

export const useHistoryStore = defineStore('history', () => {
  const history = ref([])
  const settingsStore = useSettingsStore()

  // 从 localStorage 加载历史
  function loadHistory() {
    const saved = localStorage.getItem('huaan-history')
    if (saved) {
      try {
        history.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load history:', e)
      }
    }
  }

  // 保存历史到 localStorage
  function saveHistory() {
    localStorage.setItem('huaan-history', JSON.stringify(history.value))
  }

  // 添加历史记录
  function addHistory(task) {
    if (!settingsStore.settings.enableHistory) return

    const record = {
      id: `history-${Date.now()}`,
      taskId: task.id,
      name: task.name,
      command: task.command,
      status: task.status,
      startTime: task.start_time,
      endTime: task.end_time,
      duration: task.end_time ? task.end_time - task.start_time : 0,
      output: task.output?.substring(0, 1000) || '', // 只保存前1000字符
      error: task.error?.substring(0, 1000) || '',
      timestamp: Date.now(),
    }

    history.value.unshift(record)

    // 限制历史记录数量
    const maxItems = settingsStore.settings.maxHistoryItems
    if (history.value.length > maxItems) {
      history.value = history.value.slice(0, maxItems)
    }

    saveHistory()
  }

  // 清空历史
  function clearHistory() {
    history.value = []
    localStorage.removeItem('huaan-history')
  }

  // 获取统计信息
  function getStats() {
    const total = history.value.length
    const success = history.value.filter(h => h.status === 'success').length
    const failed = history.value.filter(h => h.status === 'failed').length
    const avgDuration = history.value.length > 0
      ? history.value.reduce((sum, h) => sum + h.duration, 0) / history.value.length
      : 0

    return {
      total,
      success,
      failed,
      successRate: total > 0 ? ((success / total) * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration),
    }
  }

  // 初始化时加载
  loadHistory()

  return {
    history,
    addHistory,
    clearHistory,
    getStats,
  }
})
