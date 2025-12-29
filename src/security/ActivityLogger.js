/**
 * 📋 ActivityLogger - 活动日志记录器
 *
 * 负责：
 * 1. 记录所有 AI 操作
 * 2. 记录工具调用
 * 3. 记录错误和警告
 * 4. 支持日志导出
 * 5. 支持日志搜索和过滤
 */

/**
 * 日志级别
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success'
}

/**
 * 日志类型
 */
export const LogType = {
  AI_REQUEST: 'ai_request',
  AI_RESPONSE: 'ai_response',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  COMMAND: 'command',
  FILE_OPERATION: 'file_operation',
  ERROR: 'error',
  USER_ACTION: 'user_action',
  SYSTEM: 'system'
}

/**
 * 最大日志条目数
 */
const MAX_LOG_ENTRIES = 1000

/**
 * ActivityLogger 类
 */
export class ActivityLogger {
  constructor() {
    this.logs = []
    this.listeners = new Set()
    this.filters = {
      level: null,
      type: null,
      search: null,
      startDate: null,
      endDate: null
    }
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} type - 日志类型
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  log(level, type, message, data = {}) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      type,
      message,
      data,
      timestamp: Date.now(),
      session: this._getCurrentSession()
    }

    this.logs.push(entry)

    // 限制日志数量
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.shift()
    }

    // 通知监听器
    this._notifyListeners(entry)

    // 持久化到 localStorage
    this._persist()

    return entry
  }

  /**
   * 记录 AI 请求
   */
  logAIRequest(prompt, model, context = {}) {
    return this.log(LogLevel.INFO, LogType.AI_REQUEST, 'AI 请求', {
      prompt: this._truncateText(prompt, 500),
      model,
      context,
      tokens: prompt.length
    })
  }

  /**
   * 记录 AI 响应
   */
  logAIResponse(response, duration, tokens = 0) {
    return this.log(LogLevel.INFO, LogType.AI_RESPONSE, 'AI 响应', {
      response: this._truncateText(response, 500),
      duration,
      tokens
    })
  }

  /**
   * 记录工具调用
   */
  logToolCall(toolName, params, context = {}) {
    return this.log(LogLevel.INFO, LogType.TOOL_CALL, `调用工具: ${toolName}`, {
      toolName,
      params,
      context
    })
  }

  /**
   * 记录工具结果
   */
  logToolResult(toolName, result, success = true, duration = 0) {
    const level = success ? LogLevel.SUCCESS : LogLevel.ERROR
    return this.log(level, LogType.TOOL_RESULT, `工具结果: ${toolName}`, {
      toolName,
      result: this._truncateObject(result, 1000),
      success,
      duration
    })
  }

  /**
   * 记录命令执行
   */
  logCommand(command, workingDir, result = null) {
    return this.log(LogLevel.INFO, LogType.COMMAND, `执行命令: ${command}`, {
      command,
      workingDir,
      result: result ? this._truncateObject(result, 500) : null
    })
  }

  /**
   * 记录文件操作
   */
  logFileOperation(operation, path, details = {}) {
    return this.log(LogLevel.INFO, LogType.FILE_OPERATION, `${operation}: ${path}`, {
      operation,
      path,
      ...details
    })
  }

  /**
   * 记录错误
   */
  logError(error, context = {}) {
    return this.log(LogLevel.ERROR, LogType.ERROR, error.message || String(error), {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    })
  }

  /**
   * 记录用户操作
   */
  logUserAction(action, details = {}) {
    return this.log(LogLevel.INFO, LogType.USER_ACTION, action, details)
  }

  /**
   * 记录系统事件
   */
  logSystem(message, data = {}) {
    return this.log(LogLevel.INFO, LogType.SYSTEM, message, data)
  }

  /**
   * 获取所有日志
   * @param {number} limit - 限制数量
   * @returns {Array} 日志列表
   */
  getLogs(limit = null) {
    let filteredLogs = this._applyFilters(this.logs)

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit)
    }

    return filteredLogs
  }

  /**
   * 获取最近的日志
   * @param {number} count - 数量
   * @returns {Array} 日志列表
   */
  getRecentLogs(count = 50) {
    return this.logs.slice(-count)
  }

  /**
   * 根据类型获取日志
   * @param {string} type - 日志类型
   * @param {number} limit - 限制数量
   * @returns {Array} 日志列表
   */
  getLogsByType(type, limit = null) {
    const filtered = this.logs.filter(log => log.type === type)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * 根据级别获取日志
   * @param {string} level - 日志级别
   * @param {number} limit - 限制数量
   * @returns {Array} 日志列表
   */
  getLogsByLevel(level, limit = null) {
    const filtered = this.logs.filter(log => log.level === level)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * 搜索日志
   * @param {string} query - 搜索关键词
   * @returns {Array} 匹配的日志列表
   */
  search(query) {
    const lowerQuery = query.toLowerCase()
    return this.logs.filter(log => {
      return (
        log.message.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log.data).toLowerCase().includes(lowerQuery)
      )
    })
  }

  /**
   * 设置过滤器
   * @param {Object} filters - 过滤条件
   */
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters }
  }

  /**
   * 清空过滤器
   */
  clearFilters() {
    this.filters = {
      level: null,
      type: null,
      search: null,
      startDate: null,
      endDate: null
    }
  }

  /**
   * 导出日志
   * @param {string} format - 导出格式 (json/csv/txt)
   * @returns {string} 导出的内容
   */
  export(format = 'json') {
    const logs = this.getLogs()

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)

      case 'csv':
        return this._exportToCSV(logs)

      case 'txt':
        return this._exportToText(logs)

      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }
  }

  /**
   * 下载日志文件
   * @param {string} format - 文件格式
   */
  download(format = 'json') {
    const content = this.export(format)
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/plain'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = []
    this._persist()
  }

  /**
   * 添加监听器
   * @param {Function} listener - 监听函数
   */
  addListener(listener) {
    this.listeners.add(listener)
  }

  /**
   * 移除监听器
   * @param {Function} listener - 监听函数
   */
  removeListener(listener) {
    this.listeners.delete(listener)
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      byType: {},
      errors: 0,
      warnings: 0
    }

    for (const log of this.logs) {
      // 按级别统计
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1

      // 按类型统计
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1

      // 错误和警告计数
      if (log.level === LogLevel.ERROR) stats.errors++
      if (log.level === LogLevel.WARN) stats.warnings++
    }

    return stats
  }

  /**
   * 应用过滤器
   * @private
   */
  _applyFilters(logs) {
    let filtered = logs

    if (this.filters.level) {
      filtered = filtered.filter(log => log.level === this.filters.level)
    }

    if (this.filters.type) {
      filtered = filtered.filter(log => log.type === this.filters.type)
    }

    if (this.filters.search) {
      const query = this.filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        JSON.stringify(log.data).toLowerCase().includes(query)
      )
    }

    if (this.filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= this.filters.startDate)
    }

    if (this.filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= this.filters.endDate)
    }

    return filtered
  }

  /**
   * 通知监听器
   * @private
   */
  _notifyListeners(entry) {
    for (const listener of this.listeners) {
      try {
        listener(entry)
      } catch (error) {
        console.error('监听器执行错误:', error)
      }
    }
  }

  /**
   * 持久化到 localStorage
   * @private
   */
  _persist() {
    try {
      // 只保存最近的 200 条日志
      const logsToSave = this.logs.slice(-200)
      localStorage.setItem('activity_logs', JSON.stringify(logsToSave))
    } catch (error) {
      console.error('日志持久化失败:', error)
    }
  }

  /**
   * 从 localStorage 恢复
   */
  restore() {
    try {
      const saved = localStorage.getItem('activity_logs')
      if (saved) {
        this.logs = JSON.parse(saved)
      }
    } catch (error) {
      console.error('日志恢复失败:', error)
    }
  }

  /**
   * 获取当前会话 ID
   * @private
   */
  _getCurrentSession() {
    if (!this._sessionId) {
      this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return this._sessionId
  }

  /**
   * 截断文本
   * @private
   */
  _truncateText(text, maxLength) {
    if (typeof text !== 'string') {
      text = String(text)
    }
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength) + '...'
  }

  /**
   * 截断对象
   * @private
   */
  _truncateObject(obj, maxLength) {
    const str = JSON.stringify(obj)
    if (str.length <= maxLength) {
      return obj
    }
    return {
      __truncated: true,
      preview: str.substring(0, maxLength) + '...'
    }
  }

  /**
   * 导出为 CSV
   * @private
   */
  _exportToCSV(logs) {
    const headers = ['时间', '级别', '类型', '消息', '数据']
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.type,
      log.message,
      JSON.stringify(log.data)
    ])

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
  }

  /**
   * 导出为文本
   * @private
   */
  _exportToText(logs) {
    return logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN')
      return `[${time}] [${log.level.toUpperCase()}] [${log.type}] ${log.message}\n${JSON.stringify(log.data, null, 2)}\n`
    }).join('\n---\n\n')
  }
}

/**
 * 全局单例实例
 */
export const activityLogger = new ActivityLogger()

// 启动时恢复日志
activityLogger.restore()

/**
 * 便捷函数
 */
export const logAI = (prompt, model, context) =>
  activityLogger.logAIRequest(prompt, model, context)

export const logAIResponse = (response, duration, tokens) =>
  activityLogger.logAIResponse(response, duration, tokens)

export const logTool = (toolName, params, context) =>
  activityLogger.logToolCall(toolName, params, context)

export const logToolResult = (toolName, result, success, duration) =>
  activityLogger.logToolResult(toolName, result, success, duration)

export const logCommand = (command, workingDir, result) =>
  activityLogger.logCommand(command, workingDir, result)

export const logFile = (operation, path, details) =>
  activityLogger.logFileOperation(operation, path, details)

export const logError = (error, context) =>
  activityLogger.logError(error, context)

export const logUser = (action, details) =>
  activityLogger.logUserAction(action, details)

export const logSystem = (message, data) =>
  activityLogger.logSystem(message, data)
