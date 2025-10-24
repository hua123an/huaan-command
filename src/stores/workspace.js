import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref([])
  const currentWorkspace = ref(null)

  // 加载工作区
  function loadWorkspaces() {
    try {
      const saved = localStorage.getItem('huaan-workspaces')
      if (saved) {
        workspaces.value = JSON.parse(saved)
      }
      
      const currentId = localStorage.getItem('huaan-current-workspace')
      if (currentId) {
        currentWorkspace.value = workspaces.value.find(w => w.id === currentId)
      }
    } catch (error) {
      console.error('加载工作区失败:', error)
    }
  }

  // 保存工作区
  function saveWorkspaces() {
    try {
      localStorage.setItem('huaan-workspaces', JSON.stringify(workspaces.value))
      if (currentWorkspace.value) {
        localStorage.setItem('huaan-current-workspace', currentWorkspace.value.id)
      }
    } catch (error) {
      console.error('保存工作区失败:', error)
    }
  }

  // 创建工作区
  function createWorkspace(config) {
    const workspace = {
      id: `workspace-${Date.now()}`,
      name: config.name,
      path: config.path,
      description: config.description || '',
      color: config.color || '#0a84ff',
      icon: config.icon || '📁',
      env: config.env || {},
      startupCommands: config.startupCommands || [],
      gitRepo: config.gitRepo || null,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    }
    
    workspaces.value.push(workspace)
    saveWorkspaces()
    return workspace
  }

  // 更新工作区
  function updateWorkspace(id, updates) {
    const index = workspaces.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workspaces.value[index] = { ...workspaces.value[index], ...updates }
      saveWorkspaces()
    }
  }

  // 删除工作区
  function deleteWorkspace(id) {
    const index = workspaces.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workspaces.value.splice(index, 1)
      if (currentWorkspace.value?.id === id) {
        currentWorkspace.value = null
      }
      saveWorkspaces()
    }
  }

  // 切换工作区
  function switchWorkspace(id) {
    const workspace = workspaces.value.find(w => w.id === id)
    if (workspace) {
      workspace.lastAccessed = Date.now()
      currentWorkspace.value = workspace
      saveWorkspaces()
      return workspace
    }
    return null
  }

  // 获取最近访问的工作区
  function getRecentWorkspaces(limit = 5) {
    return [...workspaces.value]
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit)
  }

  // 初始化
  loadWorkspaces()

  return {
    workspaces,
    currentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    switchWorkspace,
    getRecentWorkspaces
  }
})

