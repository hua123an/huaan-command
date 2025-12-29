import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSSHStore = defineStore('ssh', () => {
  const connections = ref([])
  const activeConnectionId = ref(null)

  // 从 localStorage 加载 SSH 连接
  function loadConnections() {
    try {
      const saved = localStorage.getItem('ssh-connections')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          connections.value = parsed
          console.log(`加载了 ${connections.value.length} 个 SSH 连接配置`)
          return true
        }
      }
    } catch (error) {
      console.error(`加载 SSH 连接失败: ${error.message || error}`)
    }
    return false
  }

  // 保存 SSH 连接到 localStorage
  function saveConnections() {
    try {
      localStorage.setItem('ssh-connections', JSON.stringify(connections.value))
    } catch (error) {
      console.error(`保存 SSH 连接失败: ${error.message || error}`)
    }
  }

  // 创建新的 SSH 连接配置
  function createConnection(config) {
    const connection = {
      id: Date.now(),
      name: config.name || `${config.username}@${config.host}`,
      host: config.host,
      port: config.port || 22,
      username: config.username,
      authType: config.authType || 'password', // 'password' 或 'key'
      keyPath: config.keyPath || '',
      lastConnected: null,
      createdAt: Date.now()
    }

    connections.value.push(connection)
    saveConnections()
    console.log(`创建 SSH 连接: ${connection.name}`)
    return connection.id
  }

  // 更新 SSH 连接配置
  function updateConnection(id, updates) {
    const connection = connections.value.find(c => c.id === id)
    if (connection) {
      Object.assign(connection, updates)
      saveConnections()
      console.log(`更新 SSH 连接: ${connection.name}`)
    }
  }

  // 删除 SSH 连接配置
  function deleteConnection(id) {
    const index = connections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      const connection = connections.value[index]
      connections.value.splice(index, 1)
      saveConnections()
      console.log(`删除 SSH 连接: ${connection.name}`)
    }
  }

  // 更新最后连接时间
  function updateLastConnected(id) {
    const connection = connections.value.find(c => c.id === id)
    if (connection) {
      connection.lastConnected = Date.now()
      activeConnectionId.value = id
      saveConnections()
    }
  }

  // 获取连接配置
  function getConnection(id) {
    return connections.value.find(c => c.id === id)
  }

  // 清空所有连接
  function clearAllConnections() {
    connections.value = []
    activeConnectionId.value = null
    localStorage.removeItem('ssh-connections')
    console.log('已清除所有 SSH 连接配置')
  }

  // 初始化时加载连接
  loadConnections()

  return {
    connections,
    activeConnectionId,
    createConnection,
    updateConnection,
    deleteConnection,
    updateLastConnected,
    getConnection,
    clearAllConnections,
    loadConnections,
    saveConnections
  }
})
