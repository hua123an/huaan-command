import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEnvironmentStore = defineStore('environment', () => {
  const envProfiles = ref([])
  const currentProfile = ref(null)
  const sshConnections = ref([])

  // 加载环境配置
  function loadProfiles() {
    try {
      const saved = localStorage.getItem('huaan-env-profiles')
      if (saved) {
        envProfiles.value = JSON.parse(saved)
      }
      
      const currentId = localStorage.getItem('huaan-current-env')
      if (currentId) {
        currentProfile.value = envProfiles.value.find(p => p.id === currentId)
      }
    } catch (error) {
      console.error('加载环境配置失败:', error)
    }
  }

  // 保存环境配置
  function saveProfiles() {
    try {
      localStorage.setItem('huaan-env-profiles', JSON.stringify(envProfiles.value))
      if (currentProfile.value) {
        localStorage.setItem('huaan-current-env', currentProfile.value.id)
      }
    } catch (error) {
      console.error('保存环境配置失败:', error)
    }
  }

  // 创建环境配置
  function createProfile(config) {
    const profile = {
      id: `env-${Date.now()}`,
      name: config.name,
      description: config.description || '',
      variables: config.variables || {},
      createdAt: Date.now()
    }
    
    envProfiles.value.push(profile)
    saveProfiles()
    return profile
  }

  // 更新环境配置
  function updateProfile(id, updates) {
    const index = envProfiles.value.findIndex(p => p.id === id)
    if (index !== -1) {
      envProfiles.value[index] = { ...envProfiles.value[index], ...updates }
      saveProfiles()
    }
  }

  // 删除环境配置
  function deleteProfile(id) {
    const index = envProfiles.value.findIndex(p => p.id === id)
    if (index !== -1) {
      envProfiles.value.splice(index, 1)
      if (currentProfile.value?.id === id) {
        currentProfile.value = null
      }
      saveProfiles()
    }
  }

  // 切换环境
  function switchProfile(id) {
    const profile = envProfiles.value.find(p => p.id === id)
    if (profile) {
      currentProfile.value = profile
      saveProfiles()
      return profile
    }
    return null
  }

  // 导出环境变量为 .env 格式
  function exportAsEnv(profileId) {
    const profile = envProfiles.value.find(p => p.id === profileId)
    if (!profile) return ''
    
    return Object.entries(profile.variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
  }

  // 从 .env 内容导入
  function importFromEnv(content, profileName) {
    const variables = {}
    content.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        if (key) {
          variables[key.trim()] = valueParts.join('=').trim()
        }
      }
    })
    
    return createProfile({
      name: profileName,
      variables
    })
  }

  // SSH 连接管理
  function loadSSHConnections() {
    try {
      const saved = localStorage.getItem('huaan-ssh-connections')
      if (saved) {
        sshConnections.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载 SSH 连接失败:', error)
    }
  }

  function saveSSHConnections() {
    try {
      localStorage.setItem('huaan-ssh-connections', JSON.stringify(sshConnections.value))
    } catch (error) {
      console.error('保存 SSH 连接失败:', error)
    }
  }

  function addSSHConnection(connection) {
    const conn = {
      id: `ssh-${Date.now()}`,
      name: connection.name,
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      password: connection.password || null,
      privateKey: connection.privateKey || null,
      createdAt: Date.now()
    }
    
    sshConnections.value.push(conn)
    saveSSHConnections()
    return conn
  }

  function updateSSHConnection(id, updates) {
    const index = sshConnections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      sshConnections.value[index] = { ...sshConnections.value[index], ...updates }
      saveSSHConnections()
    }
  }

  function deleteSSHConnection(id) {
    const index = sshConnections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      sshConnections.value.splice(index, 1)
      saveSSHConnections()
    }
  }

  // 初始化
  loadProfiles()
  loadSSHConnections()

  return {
    envProfiles,
    currentProfile,
    sshConnections,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile,
    exportAsEnv,
    importFromEnv,
    addSSHConnection,
    updateSSHConnection,
    deleteSSHConnection
  }
})

