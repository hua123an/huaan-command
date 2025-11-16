import { ref, computed } from 'vue'

// 同步状态
export const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
  OFFLINE: 'offline'
}

// 数据同步 Composable
export function useDataSync() {
  // 状态
  const syncStatus = ref(SyncStatus.IDLE)
  const lastSyncTime = ref(null)
  const syncProgress = ref(0)
  const errorMessage = ref('')
  const isOnline = ref(navigator.onLine)
  
  // 同步配置
  const syncConfig = ref({
    provider: 'local', // local, github, dropbox, custom
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5分钟
    maxRetries: 3,
    retryDelay: 1000,
    
    // 云端配置
    cloud: {
      endpoint: '',
      apiKey: '',
      username: '',
      repository: ''
    }
  })
  
  // 同步数据类型
  const syncDataTypes = ref({
    settings: true,
    tasks: true,
    terminalSessions: true,
    aiHistory: true,
    snippets: true,
    workflows: true
  })
  
  // 同步统计
  const syncStats = ref({
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    lastSyncDuration: 0,
    dataVolume: 0
  })
  
  // 检查网络状态
  const checkNetworkStatus = () => {
    isOnline.value = navigator.onLine
    
    if (!isOnline.value) {
      syncStatus.value = SyncStatus.OFFLINE
    } else if (syncStatus.value === SyncStatus.OFFLINE) {
      syncStatus.value = SyncStatus.IDLE
      // 网络恢复时尝试同步
      if (syncConfig.value.autoSync) {
        performSync()
      }
    }
  }
  
  // 执行同步
  const performSync = async (dataType = 'all') => {
    if (!isOnline.value) {
      syncStatus.value = SyncStatus.OFFLINE
      return false
    }
    
    syncStatus.value = SyncStatus.SYNCING
    syncProgress.value = 0
    errorMessage.value = ''
    
    const startTime = Date.now()
    
    try {
      let dataToSync = {}
      
      // 收集需要同步的数据
      if (dataType === 'all') {
        dataToSync = await collectAllData()
      } else {
        dataToSync = await collectDataByType(dataType)
      }
      
      // 根据提供商执行同步
      switch (syncConfig.value.provider) {
        case 'local':
          await syncToLocal(dataToSync)
          break
        case 'github':
          await syncToGitHub(dataToSync)
          break
        case 'dropbox':
          await syncToDropbox(dataToSync)
          break
        case 'custom':
          await syncToCustom(dataToSync)
          break
        default:
          throw new Error(`不支持的同步提供商: ${syncConfig.value.provider}`)
      }
      
      // 更新统计
      const duration = Date.now() - startTime
      syncStats.value.totalSyncs++
      syncStats.value.successfulSyncs++
      syncStats.value.lastSyncDuration = duration
      syncStats.value.dataVolume = JSON.stringify(dataToSync).length
      
      syncStatus.value = SyncStatus.SUCCESS
      lastSyncTime.value = new Date()
      
      return true
    } catch (error) {
      syncStatus.value = SyncStatus.ERROR
      errorMessage.value = error.message
      syncStats.value.failedSyncs++
      
      console.error('同步失败:', error)
      return false
    }
  }
  
  // 收集所有数据
  const collectAllData = async () => {
    const data = {}
    
    if (syncDataTypes.value.settings) {
      data.settings = await collectSettings()
    }
    
    if (syncDataTypes.value.tasks) {
      data.tasks = await collectTasks()
    }
    
    if (syncDataTypes.value.terminalSessions) {
      data.terminalSessions = await collectTerminalSessions()
    }
    
    if (syncDataTypes.value.aiHistory) {
      data.aiHistory = await collectAIHistory()
    }
    
    if (syncDataTypes.value.snippets) {
      data.snippets = await collectSnippets()
    }
    
    if (syncDataTypes.value.workflows) {
      data.workflows = await collectWorkflows()
    }
    
    return data
  }
  
  // 收集指定类型的数据
  const collectDataByType = async (type) => {
    switch (type) {
      case 'settings':
        return await collectSettings()
      case 'tasks':
        return await collectTasks()
      case 'terminalSessions':
        return await collectTerminalSessions()
      case 'aiHistory':
        return await collectAIHistory()
      case 'snippets':
        return await collectSnippets()
      case 'workflows':
        return await collectWorkflows()
      default:
        throw new Error(`不支持的数据类型: ${type}`)
    }
  }
  
  // 收集设置数据
  const collectSettings = async () => {
    const settings = {}
    
    // 从 localStorage 收集设置
    const keys = [
      'huaan-settings',
      'huaan-theme',
      'huaan-locale',
      'huaan-shortcuts'
    ]
    
    for (const key of keys) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          settings[key] = JSON.parse(value)
        } catch {
          settings[key] = value
        }
      }
    }
    
    return settings
  }
  
  // 收集任务数据
  const collectTasks = async () => {
    const tasks = localStorage.getItem('huaan-tasks')
    return tasks ? JSON.parse(tasks) : []
  }
  
  // 收集终端会话数据
  const collectTerminalSessions = async () => {
    const sessions = localStorage.getItem('terminal-sessions')
    return sessions ? JSON.parse(sessions) : []
  }
  
  // 收集 AI 历史数据
  const collectAIHistory = async () => {
    const history = localStorage.getItem('ai-chat-history')
    return history ? JSON.parse(history) : []
  }
  
  // 收集代码片段数据
  const collectSnippets = async () => {
    const snippets = localStorage.getItem('huaan-snippets')
    return snippets ? JSON.parse(snippets) : []
  }
  
  // 收集工作流数据
  const collectWorkflows = async () => {
    const workflows = localStorage.getItem('huaan-workflows')
    return workflows ? JSON.parse(workflows) : []
  }
  
  // 同步到本地存储
  const syncToLocal = async (data) => {
    for (const [key, value] of Object.entries(data)) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`同步本地数据失败 ${key}:`, error)
      }
    }
  }
  
  // 同步到 GitHub
  const syncToGitHub = async (data) => {
    const { username, repository, apiKey } = syncConfig.value.cloud
    
    if (!username || !repository || !apiKey) {
      throw new Error('GitHub 配置不完整')
    }
    
    const response = await fetch(`https://api.github.com/repos/${username}/${repository}/contents/huaan-sync.json`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`)
    }
    
    const existingData = await response.json()
    
    // 合并数据
    const mergedData = { ...existingData, ...data }
    
    // 上传合并后的数据
    const uploadResponse = await fetch(`https://api.github.com/repos/${username}/${repository}/contents/huaan-sync.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Sync data at ${new Date().toISOString()}`,
        content: btoa(JSON.stringify(mergedData))
      })
    })
    
    if (!uploadResponse.ok) {
      throw new Error(`GitHub 上传失败: ${uploadResponse.status}`)
    }
    
    return mergedData
  }
  
  // 同步到 Dropbox
  const syncToDropbox = async (data) => {
    const { apiKey } = syncConfig.value.cloud
    
    if (!apiKey) {
      throw new Error('Dropbox API Key 未配置')
    }
    
    // 这里应该实现 Dropbox API 调用
    // 由于安全考虑，这里只是一个示例
    console.log('Dropbox 同步功能需要实现')
    return data
  }
  
  // 同步到自定义服务
  const syncToCustom = async (data) => {
    const { endpoint, apiKey } = syncConfig.value.cloud
    
    if (!endpoint || !apiKey) {
      throw new Error('自定义同步服务配置不完整')
    }
    
    const response = await fetch(`${endpoint}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      })
    })
    
    if (!response.ok) {
      throw new Error(`自定义同步服务错误: ${response.status}`)
    }
    
    return response.json()
  }
  
  // 从云端恢复数据
  const restoreFromCloud = async () => {
    try {
      switch (syncConfig.value.provider) {
        case 'github':
          return await restoreFromGitHub()
        case 'dropbox':
          return await restoreFromDropbox()
        case 'custom':
          return await restoreFromCustom()
        default:
          throw new Error(`不支持的恢复提供商: ${syncConfig.value.provider}`)
      }
    } catch (error) {
      console.error('从云端恢复数据失败:', error)
      return null
    }
  }
  
  // 从 GitHub 恢复数据
  const restoreFromGitHub = async () => {
    const { username, repository, apiKey } = syncConfig.value.cloud
    
    const response = await fetch(`https://api.github.com/repos/${username}/${repository}/contents/huaan-sync.json`, {
      headers: {
        'Authorization': `token ${apiKey}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`)
    }
    
    const fileData = await response.json()
    
    if (fileData.content) {
      const data = JSON.parse(atob(fileData.content))
      
      // 恢复数据到本地
      await syncToLocal(data)
      
      return data
    }
    
    return null
  }
  
  // 从 Dropbox 恢复数据
  const restoreFromDropbox = async () => {
    // 这里应该实现 Dropbox API 调用
    console.log('Dropbox 恢复功能需要实现')
    return null
  }
  
  // 从自定义服务恢复数据
  const restoreFromCustom = async () => {
    const { endpoint, apiKey } = syncConfig.value.cloud
    
    const response = await fetch(`${endpoint}/restore`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`自定义恢复服务错误: ${response.status}`)
    }
    
    const data = await response.json()
    
    // 恢复数据到本地
    await syncToLocal(data)
    
    return data
  }
  
  // 自动同步
  let autoSyncTimer = null
  
  const startAutoSync = () => {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
    }
    
    if (syncConfig.value.autoSync && isOnline.value) {
      autoSyncTimer = setInterval(() => {
        performSync()
      }, syncConfig.value.syncInterval)
    }
  }
  
  const stopAutoSync = () => {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
  }
  
  // 监听网络状态
  const setupNetworkListener = () => {
    window.addEventListener('online', checkNetworkStatus)
    window.addEventListener('offline', checkNetworkStatus)
  }
  
  // 获取同步状态描述
  const getSyncStatusText = computed(() => {
    switch (syncStatus.value) {
      case SyncStatus.IDLE:
        return '同步就绪'
      case SyncStatus.SYNCING:
        return '正在同步...'
      case SyncStatus.SUCCESS:
        return '同步成功'
      case SyncStatus.ERROR:
        return `同步失败: ${errorMessage.value}`
      case SyncStatus.OFFLINE:
        return '离线状态'
      default:
        return '未知状态'
    }
  })
  
  // 获取同步进度
  const getSyncProgress = computed(() => {
    return syncProgress.value
  })
  
  // 配置同步
  const updateSyncConfig = (config) => {
    syncConfig.value = { ...syncConfig.value, ...config }
    localStorage.setItem('huaan-sync-config', JSON.stringify(syncConfig.value))
    
    // 重新启动自动同步
    stopAutoSync()
    startAutoSync()
  }
  
  // 加载同步配置
  const loadSyncConfig = () => {
    const saved = localStorage.getItem('huaan-sync-config')
    if (saved) {
      try {
        syncConfig.value = JSON.parse(saved)
      } catch (error) {
        console.error('加载同步配置失败:', error)
      }
    }
  }
  
  // 初始化
  const init = () => {
    loadSyncConfig()
    setupNetworkListener()
    startAutoSync()
  }
  
  return {
    syncStatus,
    lastSyncTime,
    syncProgress,
    errorMessage,
    isOnline,
    syncConfig,
    syncDataTypes,
    syncStats,
    getSyncStatusText,
    getSyncProgress,
    performSync,
    restoreFromCloud,
    updateSyncConfig,
    startAutoSync,
    stopAutoSync,
    init
  }
}