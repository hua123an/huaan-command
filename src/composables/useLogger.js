/**
 * 条件化日志系统
 * 根据环境和配置智能控制日志输出
 */

// 日志级别定义
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
}

// 日志级别名称映射
const LEVEL_NAMES = {
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.TRACE]: 'TRACE'
}

// 日志级别颜色
const LEVEL_COLORS = {
  [LOG_LEVELS.ERROR]: '#ff4444',
  [LOG_LEVELS.WARN]: '#ffaa00',
  [LOG_LEVELS.INFO]: '#00aaff',
  [LOG_LEVELS.DEBUG]: '#888888',
  [LOG_LEVELS.TRACE]: '#cccccc'
}

// 日志级别图标
const LEVEL_ICONS = {
  [LOG_LEVELS.ERROR]: '❌',
  [LOG_LEVELS.WARN]: '⚠️',
  [LOG_LEVELS.INFO]: 'ℹ️',
  [LOG_LEVELS.DEBUG]: '🔍',
  [LOG_LEVELS.TRACE]: '📝'
}

class Logger {
  constructor() {
    this.currentLevel = this.getLogLevel()
    this.enabledModules = this.getEnabledModules()
    this.logBuffer = []
    this.maxBufferSize = 1000
  }

  /**
   * 获取当前日志级别
   */
  getLogLevel() {
    // 1. 从环境变量获取
    if (import.meta.env.VITE_LOG_LEVEL) {
      const envLevel = import.meta.env.VITE_LOG_LEVEL.toUpperCase()
      if (LOG_LEVELS[envLevel] !== undefined) {
        return LOG_LEVELS[envLevel]
      }
    }

    // 2. 从 localStorage 获取
    try {
      const storedLevel = localStorage.getItem('app_log_level')
      if (storedLevel && LOG_LEVELS[storedLevel] !== undefined) {
        return LOG_LEVELS[storedLevel]
      }
    } catch (e) {
      // localStorage 不可用
    }

    // 3. 根据环境设置默认级别
    if (import.meta.env.DEV) {
      return LOG_LEVELS.DEBUG
    } else if (import.meta.env.PROD) {
      return LOG_LEVELS.WARN
    }

    return LOG_LEVELS.INFO
  }

  /**
   * 获取启用的模块列表
   */
  getEnabledModules() {
    try {
      const stored = localStorage.getItem('app_log_modules')
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch (e) {
      // localStorage 不可用或数据无效
    }

    // 默认启用所有模块
    return new Set(['*'])
  }

  /**
   * 检查是否应该输出日志
   */
  shouldLog(level, module = 'default') {
    // 检查日志级别
    if (level > this.currentLevel) {
      return false
    }

    // 检查模块过滤
    if (!this.enabledModules.has('*') && !this.enabledModules.has(module)) {
      return false
    }

    return true
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, module, message, data) {
    const timestamp = new Date().toISOString()
    const levelName = LEVEL_NAMES[level]
    const icon = LEVEL_ICONS[level]
    
    return {
      timestamp,
      level,
      levelName,
      icon,
      module,
      message,
      data
    }
  }

  /**
   * 输出日志到控制台
   */
  outputToConsole(logEntry) {
    const { level, levelName, icon, module, message, data, timestamp } = logEntry
    const color = LEVEL_COLORS[level]
    
    // 构建日志前缀
    const prefix = `${icon} [${timestamp.split('T')[1].split('.')[0]}] [${levelName}] [${module}]`
    
    // 根据级别选择控制台方法
    const consoleMethod = {
      [LOG_LEVELS.ERROR]: console.error,
      [LOG_LEVELS.WARN]: console.warn,
      [LOG_LEVELS.INFO]: console.info,
      [LOG_LEVELS.DEBUG]: console.log,
      [LOG_LEVELS.TRACE]: console.log
    }[level] || console.log

    // 输出日志
    if (data !== undefined) {
      consoleMethod(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold;`,
        'color: inherit;',
        data
      )
    } else {
      consoleMethod(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold;`,
        'color: inherit;'
      )
    }
  }

  /**
   * 添加到日志缓冲区
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry)
    
    // 限制缓冲区大小
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  /**
   * 核心日志方法
   */
  log(level, message, data, module = 'default') {
    if (!this.shouldLog(level, module)) {
      return
    }

    const logEntry = this.formatMessage(level, module, message, data)
    
    // 添加到缓冲区
    this.addToBuffer(logEntry)
    
    // 输出到控制台
    this.outputToConsole(logEntry)
    
    // 发送到日志收集服务 (生产环境)
    if (import.meta.env.PROD && level <= LOG_LEVELS.WARN) {
      this.sendToLogService(logEntry)
    }
  }

  /**
   * 发送到日志收集服务
   */
  sendToLogService(logEntry) {
    // 这里可以集成日志收集服务
    // 如 LogRocket, Datadog, Splunk 等
    
    // 示例实现
    try {
      // 异步发送，不阻塞主线程
      setTimeout(() => {
        // fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(logEntry)
        // }).catch(() => {
        //   // 静默失败，避免日志发送错误影响应用
        // })
      }, 0)
    } catch (e) {
      // 静默失败
    }
  }

  // 便捷方法
  error(message, data, module) {
    this.log(LOG_LEVELS.ERROR, message, data, module)
  }

  warn(message, data, module) {
    this.log(LOG_LEVELS.WARN, message, data, module)
  }

  info(message, data, module) {
    this.log(LOG_LEVELS.INFO, message, data, module)
  }

  debug(message, data, module) {
    this.log(LOG_LEVELS.DEBUG, message, data, module)
  }

  trace(message, data, module) {
    this.log(LOG_LEVELS.TRACE, message, data, module)
  }

  // 成功日志 (特殊的 info 级别)
  success(message, data, module) {
    const logEntry = this.formatMessage(LOG_LEVELS.INFO, module || 'default', message, data)
    logEntry.icon = '✅'
    
    if (this.shouldLog(LOG_LEVELS.INFO, module || 'default')) {
      this.addToBuffer(logEntry)
      this.outputToConsole(logEntry)
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    this.currentLevel = level
    try {
      localStorage.setItem('app_log_level', LEVEL_NAMES[level])
    } catch (e) {
      // localStorage 不可用
    }
  }

  /**
   * 设置启用的模块
   */
  setEnabledModules(modules) {
    this.enabledModules = new Set(modules)
    try {
      localStorage.setItem('app_log_modules', JSON.stringify(Array.from(modules)))
    } catch (e) {
      // localStorage 不可用
    }
  }

  /**
   * 获取日志缓冲区
   */
  getBuffer() {
    return [...this.logBuffer]
  }

  /**
   * 清空日志缓冲区
   */
  clearBuffer() {
    this.logBuffer = []
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const logs = this.getBuffer()
    const blob = new globalThis.Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = globalThis.URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    globalThis.URL.revokeObjectURL(url)
  }
}

// 创建全局日志实例
const logger = new Logger()

/**
 * Vue 组合式函数
 */
export function useLogger(module = 'default') {
  return {
    log: (level, message, data) => logger.log(level, message, data, module),
    error: (message, data) => logger.error(message, data, module),
    warn: (message, data) => logger.warn(message, data, module),
    info: (message, data) => logger.info(message, data, module),
    debug: (message, data) => logger.debug(message, data, module),
    trace: (message, data) => logger.trace(message, data, module),
    success: (message, data) => logger.success(message, data, module)
  }
}

// 导出日志实例和常量
export { logger }
export default logger