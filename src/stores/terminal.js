import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useLogsStore } from './logs'

export const useTerminalStore = defineStore('terminal', () => {
  const logsStore = useLogsStore()
  const sessions = ref([])
  const activeSessionId = ref(null)
  const autoRestore = ref(true)  // 自动恢复会话

  // 从 localStorage 加载会话
  function loadSessions() {
    try {
      const saved = localStorage.getItem('terminal-sessions')
      const savedActiveId = localStorage.getItem('terminal-active-session')

      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 恢复会话，但重新生成 ID（因为后端进程已不存在）
          sessions.value = parsed.map((session, index) => ({
            ...session,
            id: Date.now() + index,  // 新 ID
            restored: true,  // 标记为恢复的会话
            commandHistory: session.commandHistory || []
          }))

          // 恢复活动会话（使用第一个）
          if (sessions.value.length > 0) {
            activeSessionId.value = sessions.value[0].id
          }

          logsStore.success(`恢复了 ${sessions.value.length} 个终端会话`)
          return true
        }
      }
    } catch (error) {
      logsStore.error(`加载终端会话失败: ${error.message || error}`)
    }
    return false
  }

  // 保存会话到 localStorage
  function saveSessions() {
    try {
      // 保存完整的会话信息
      const toSave = sessions.value.map(session => ({
        title: session.title,
        active: session.active,
        warpMode: session.warpMode || 'terminal',
        currentModel: session.currentModel || 'gpt-4o-mini',
        conversationHistory: session.conversationHistory || [],
        commandHistory: session.commandHistory || [],
        currentDir: session.currentDir || '~',
        initialized: session.initialized || false  // 添加初始化状态
      }))
      localStorage.setItem('terminal-sessions', JSON.stringify(toSave))
      localStorage.setItem('terminal-active-session', activeSessionId.value)
    } catch (error) {
      logsStore.error(`保存终端会话失败: ${error.message || error}`)
    }
  }

  function createSession(customTitle = null) {
    const id = Date.now() + sessions.value.length
    const title = customTitle || `终端 ${sessions.value.length + 1}`
    
    sessions.value.push({
      id,
      title,
      active: true,
      warpMode: 'terminal',
      currentModel: 'gpt-4o-mini',
      conversationHistory: [],
      commandHistory: [],
      currentDir: '~',
      initialized: false  // 新会话默认未初始化
    })
    
    // 立即设置为活动会话
    activeSessionId.value = id
    
    logsStore.success(`创建新终端: ${title}`)
    
    saveSessions()
    return id
  }

  function closeSession(id) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index !== -1) {
      const session = sessions.value[index]
      sessions.value.splice(index, 1)
      if (activeSessionId.value === id && sessions.value.length > 0) {
        activeSessionId.value = sessions.value[0].id
      }
      logsStore.info(`关闭终端: ${session.title}`)
      saveSessions()
    }
  }

  function setActiveSession(id) {
    activeSessionId.value = id
    saveSessions()
  }

  function updateSessionTitle(id, title) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = title
      saveSessions()
    }
  }

  // 更新会话的 Warp 模式
  function updateSessionMode(id, mode) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.warpMode = mode
      saveSessions()
    }
  }

  // 更新会话的 AI 模型
  function updateSessionModel(id, model) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.currentModel = model
      saveSessions()
    }
  }

  // 更新会话的对话历史
  function updateSessionConversation(id, history) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.conversationHistory = history
      saveSessions()
    }
  }

  // 更新会话的终端缓冲区
  function updateSessionBuffer(id, buffer) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.terminalBuffer = buffer
      saveSessions()
    }
  }

  // 更新会话的当前目录
  function updateSessionCurrentDir(id, dir) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.currentDir = dir
      saveSessions()
    }
  }

  // 更新会话的初始化状态
  function updateSessionInitialized(id, initialized) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.initialized = initialized
      saveSessions()
    }
  }

  // 更新会话的命令历史
  function updateSessionCommandHistory(id, history) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.commandHistory = history
      saveSessions()
    }
  }

  // 获取会话数据
  function getSessionData(id) {
    return sessions.value.find(s => s.id === id)
  }

  function clearAllSessions() {
    sessions.value = []
    activeSessionId.value = null
    localStorage.removeItem('terminal-sessions')
    localStorage.removeItem('terminal-active-session')
  }

  // 监听会话变化，自动保存
  watch([sessions, activeSessionId], () => {
    saveSessions()
  }, { deep: true })

  return {
    sessions,
    activeSessionId,
    autoRestore,
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
    updateSessionInitialized,  // 添加初始化状态更新方法
    getSessionData,
    loadSessions,
    saveSessions,
    clearAllSessions
  }
})
