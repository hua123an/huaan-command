import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const sessions = ref([])
  const activeSessionId = ref(null)
  const autoRestore = ref(true) // 自动恢复会话
  const maxSessions = ref(10) // 最大并发会话数
  const terminalCounter = ref(1) // 终端计数器，用于生成唯一标题

  // 性能优化：使用 Map 存储会话数据以提升查询速度
  const sessionDataCache = new Map()

  // 从 localStorage 加载会话
  function loadSessions() {
    try {
      const saved = localStorage.getItem('terminal-sessions')

      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 恢复会话，但重新生成 ID（因为后端进程已不存在）
          sessions.value = parsed.slice(0, maxSessions.value).map((session, index) => ({
            ...session,
            id: Date.now() + index, // 新 ID
            restored: true, // 标记为恢复的会话
            commandHistory: session.commandHistory || []
          }))

          // 缓存会话数据
          sessions.value.forEach(session => {
            sessionDataCache.set(session.id, session)
          })

          // 更新计数器：从恢复的会话中找到最大编号
          const maxNumber = sessions.value.reduce((max, session) => {
            const match = session.title.match(/终端 (\d+)/)
            if (match) {
              const num = parseInt(match[1], 10)
              return num > max ? num : max
            }
            return max
          }, 0)
          terminalCounter.value = maxNumber + 1

          // 恢复活动会话（使用第一个）
          if (sessions.value.length > 0) {
            activeSessionId.value = sessions.value[0].id
          }

          console.log(`恢复了 ${sessions.value.length} 个终端会话`)
          return true
        }
      }
    } catch (error) {
      console.error(`加载终端会话失败: ${error.message || error}`)
    }

    // 如果没有恢复任何会话，确保计数器从 1 开始
    terminalCounter.value = 1
    return false
  }

  // 保存会话到 localStorage（使用防抖优化）
  let saveTimeout = null
  function saveSessions() {
    // 清除之前的定时器
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    // 300ms 后保存，避免频繁写入
    saveTimeout = setTimeout(() => {
      try {
        // 保存完整的会话信息
        const toSave = sessions.value.map(session => ({
          title: session.title,
          active: session.active,
          warpMode: session.warpMode || 'terminal',
          currentModel: session.currentModel || 'gpt-4',
          conversationHistory: session.conversationHistory || [],
          commandHistory: session.commandHistory || [],
          currentDir: session.currentDir || '~',
          initialized: session.initialized || false
        }))
        localStorage.setItem('terminal-sessions', JSON.stringify(toSave))
        localStorage.setItem('terminal-active-session', activeSessionId.value)
      } catch (error) {
        console.error(`保存终端会话失败: ${error.message || error}`)
      }
    }, 300)
  }

  function createSession(customTitle = null) {
    // 检查是否达到最大会话数
    if (sessions.value.length >= maxSessions.value) {
      console.warn(`已达到最大会话数限制 (${maxSessions.value})`)
      return null
    }

    const id = Date.now() + sessions.value.length
    const title = customTitle || `终端 ${terminalCounter.value}`

    // 递增计数器
    terminalCounter.value++

    const newSession = {
      id,
      title,
      active: true,
      warpMode: 'terminal',
      currentModel: 'gpt-4',
      conversationHistory: [],
      commandHistory: [],
      currentDir: '~',
      initialized: false
    }

    sessions.value.push(newSession)
    sessionDataCache.set(id, newSession)

    // 立即设置为活动会话
    activeSessionId.value = id

    console.log(`创建新终端: ${title}`)

    saveSessions()
    return id
  }

  function closeSession(id) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index !== -1) {
      const session = sessions.value[index]
      sessions.value.splice(index, 1)
      sessionDataCache.delete(id) // 清除缓存
      if (activeSessionId.value === id && sessions.value.length > 0) {
        activeSessionId.value = sessions.value[0].id
      }
      console.log(`关闭终端: ${session.title}`)
      saveSessions()
    }
  }

  function setActiveSession(id) {
    activeSessionId.value = id
    saveSessions()
  }

  // 优化：使用缓存快速查找会话
  function getSessionFromCache(id) {
    if (sessionDataCache.has(id)) {
      return sessionDataCache.get(id)
    }
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      sessionDataCache.set(id, session)
    }
    return session
  }

  function updateSessionTitle(id, title) {
    const session = getSessionFromCache(id)
    if (session) {
      session.title = title
      saveSessions()
    }
  }

  // 更新会话的 Warp 模式
  function updateSessionMode(id, mode) {
    const session = getSessionFromCache(id)
    if (session) {
      session.warpMode = mode
      saveSessions()
    }
  }

  // 更新会话的 AI 模型
  function updateSessionModel(id, model) {
    const session = getSessionFromCache(id)
    if (session) {
      session.currentModel = model
      saveSessions()
    }
  }

  // 更新会话的对话历史
  function updateSessionConversation(id, history) {
    const session = getSessionFromCache(id)
    if (session) {
      session.conversationHistory = history
      saveSessions()
    }
  }

  // 更新会话的终端缓冲区
  function updateSessionBuffer(id, buffer) {
    const session = getSessionFromCache(id)
    if (session) {
      session.terminalBuffer = buffer
      saveSessions()
    }
  }

  // 更新会话的当前目录
  function updateSessionCurrentDir(id, dir) {
    const session = getSessionFromCache(id)
    if (session) {
      session.currentDir = dir
      saveSessions()
    }
  }

  // 更新会话的初始化状态
  function updateSessionInitialized(id, initialized) {
    const session = getSessionFromCache(id)
    if (session) {
      session.initialized = initialized
      saveSessions()
    }
  }

  // 更新会话的命令历史
  function updateSessionCommandHistory(id, history) {
    const session = getSessionFromCache(id)
    if (session) {
      session.commandHistory = history
      saveSessions()
    }
  }

  // 获取会话数据（优化版）
  function getSessionData(id) {
    return getSessionFromCache(id)
  }

  function clearAllSessions() {
    sessions.value = []
    sessionDataCache.clear() // 清除缓存
    activeSessionId.value = null
    terminalCounter.value = 1 // 重置计数器
    localStorage.removeItem('terminal-sessions')
    localStorage.removeItem('terminal-active-session')
    console.log('已清除所有终端会话')
  }

  // 批量创建会话（用于快速启动多个终端）
  function createMultipleSessions(count) {
    const created = []
    for (let i = 0; i < Math.min(count, maxSessions.value - sessions.value.length); i++) {
      const id = createSession()
      if (id) created.push(id)
    }
    console.log(`批量创建了 ${created.length} 个终端会话`)
    return created
  }

  // 优化：减少 watch 的触发频率
  let watchDebounce = null
  watch(
    [sessions, activeSessionId],
    () => {
      if (watchDebounce) clearTimeout(watchDebounce)
      watchDebounce = setTimeout(() => {
        saveSessions()
      }, 500)
    },
    { deep: false } // 改为浅层监听以提升性能
  )

  // 调试辅助函数：重置终端状态
  function resetTerminalState() {
    localStorage.removeItem('terminal-sessions')
    localStorage.removeItem('terminal-active-session')
    sessions.value = []
    sessionDataCache.clear()
    terminalCounter.value = 1
    activeSessionId.value = null
    console.log('终端状态已重置')
  }

  return {
    sessions,
    activeSessionId,
    autoRestore,
    maxSessions,
    createSession,
    closeSession,
    setActiveSession,
    updateSessionTitle,
    updateSessionMode,
    updateSessionModel,
    updateSessionConversation,
    updateSessionBuffer,
    updateSessionCommandHistory,
    updateSessionCurrentDir,
    updateSessionInitialized,
    getSessionData,
    loadSessions,
    saveSessions,
    clearAllSessions,
    createMultipleSessions,
    resetTerminalState
  }
})
