import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLogsStore = defineStore('logs', () => {
  const logs = ref([])
  const maxLogs = 200

  // 日志级别
  const LogLevel = {
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    SUCCESS: 'success'
  }

  // 添加日志
  function addLog(level, message, context = null) {
    const timestamp = new Date().toLocaleTimeString()
    
    logs.value.push({
      level,
      timestamp,
      message,
      context
    })
    
    // 限制日志数量
    if (logs.value.length > maxLogs) {
      logs.value.shift()
    }
  }

  // 便捷方法
  function info(message, context) {
    addLog(LogLevel.INFO, message, context)
  }

  function warn(message, context) {
    addLog(LogLevel.WARN, message, context)
  }

  function error(message, context) {
    addLog(LogLevel.ERROR, message, context)
  }

  function success(message, context) {
    addLog(LogLevel.SUCCESS, message, context)
  }

  function clear() {
    logs.value = []
  }

  return {
    logs,
    LogLevel,
    addLog,
    info,
    warn,
    error,
    success,
    clear
  }
})

