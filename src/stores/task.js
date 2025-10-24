import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useHistoryStore } from './history'
import { useSettingsStore } from './settings'

// 防抖函数
function debounce(fn, delay) {
  let timeoutId = null
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 节流函数
function throttle(fn, delay) {
  let lastCall = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn.apply(this, args)
    }
  }
}

// 通知和声音
function showNotification(title, body, icon = 'success') {
  const settingsStore = useSettingsStore()
  
  // 桌面通知
  if (settingsStore.settings.enableNotifications && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon === 'success' ? '✅' : '❌',
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: icon === 'success' ? '✅' : '❌' })
        }
      })
    }
  }
  
  // 声音提示
  if (settingsStore.settings.enableSound) {
    const audio = new Audio()
    const volume = settingsStore.settings.soundVolume
    
    if (icon === 'success') {
      // 成功音（高音）
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = volume * 0.3
      osc.start()
      setTimeout(() => osc.stop(), 150)
    } else {
      // 失败音（低音）
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 300
      gain.gain.value = volume * 0.3
      osc.start()
      setTimeout(() => osc.stop(), 200)
    }
  }
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])
  const isRunningAll = ref(false)
  const groups = ref(['默认分组', '开发', '测试', '部署'])
  const activeGroup = ref('全部')
  
  const historyStore = useHistoryStore()
  const settingsStore = useSettingsStore()

  let unlistenUpdate = null
  let unlistenOutput = null
  let unlistenError = null

  // 节流保存到 localStorage (1 秒最多一次)
  const throttledSave = throttle(() => {
    const toSave = tasks.value.map(({ id, name, command, group, envVars }) => ({
      id, name, command, group, envVars
    }))
    localStorage.setItem('huaan-tasks', JSON.stringify(toSave))
  }, 1000)

  // 从 localStorage 恢复任务
  function loadTasks() {
    const saved = localStorage.getItem('huaan-tasks')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // 只恢复任务定义，不恢复运行状态
        tasks.value = parsed.map(task => ({
          ...task,
          status: 'pending',
          output: '',
          error: '',
          start_time: null,
          end_time: null
        }))
      } catch (e) {
        console.error('Failed to load tasks:', e)
      }
    }
  }

  // 从 localStorage 恢复分组
  function loadGroups() {
    const saved = localStorage.getItem('huaan-task-groups')
    if (saved) {
      try {
        groups.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load groups:', e)
      }
    }
  }

  // 保存分组到 localStorage
  function saveGroups() {
    localStorage.setItem('huaan-task-groups', JSON.stringify(groups.value))
  }

  // 从 localStorage 恢复活动分组
  function loadActiveGroup() {
    const saved = localStorage.getItem('huaan-active-group')
    if (saved) {
      activeGroup.value = saved
    }
  }

  // 保存活动分组到 localStorage
  function saveActiveGroup() {
    localStorage.setItem('huaan-active-group', activeGroup.value)
  }

  // 保存任务到 localStorage (节流)
  function saveTasks() {
    throttledSave()
  }

  // 监听 tasks 变化并自动保存
  watch(tasks, () => {
    saveTasks()
  }, { deep: true })

  // 监听 groups 变化并自动保存
  watch(groups, () => {
    saveGroups()
  }, { deep: true })

  // 监听 activeGroup 变化并自动保存
  watch(activeGroup, () => {
    saveActiveGroup()
  })

  async function initListeners() {
    if (!unlistenUpdate) {
      unlistenUpdate = await listen('task-updated', (event) => {
        const updatedTask = event.payload
        const index = tasks.value.findIndex(t => t.id === updatedTask.id)
        if (index !== -1) {
          const oldStatus = tasks.value[index].status
          tasks.value[index] = updatedTask
          
          // 任务完成时的处理
          if (oldStatus === 'running' && (updatedTask.status === 'success' || updatedTask.status === 'failed')) {
            // 添加到历史记录
            historyStore.addHistory(updatedTask)
            
            // 显示通知
            if (updatedTask.status === 'success') {
              showNotification(
                '任务完成 ✅',
                `${updatedTask.name} 执行成功`,
                'success'
              )
            } else {
              showNotification(
                '任务失败 ❌',
                `${updatedTask.name} 执行失败`,
                'error'
              )
            }
          }
        }
      })
    }

    // 输出事件节流处理（100ms）
    let outputBuffer = {}
    const flushOutputBuffer = throttle(() => {
      Object.entries(outputBuffer).forEach(([taskId, lines]) => {
        const task = tasks.value.find(t => t.id === taskId)
        if (task) {
          console.log(`[${task.name}]`, lines.join('\n'))
        }
      })
      outputBuffer = {}
    }, 100)

    if (!unlistenOutput) {
      unlistenOutput = await listen('task-output', (event) => {
        const [taskId, line] = event.payload
        if (!outputBuffer[taskId]) {
          outputBuffer[taskId] = []
        }
        outputBuffer[taskId].push(line)
        flushOutputBuffer()
      })
    }

    // 错误事件节流处理（100ms）
    let errorBuffer = {}
    const flushErrorBuffer = throttle(() => {
      Object.entries(errorBuffer).forEach(([taskId, lines]) => {
        const task = tasks.value.find(t => t.id === taskId)
        if (task) {
          console.error(`[${task.name}]`, lines.join('\n'))
        }
      })
      errorBuffer = {}
    }, 100)

    if (!unlistenError) {
      unlistenError = await listen('task-error', (event) => {
        const [taskId, line] = event.payload
        if (!errorBuffer[taskId]) {
          errorBuffer[taskId] = []
        }
        errorBuffer[taskId].push(line)
        flushErrorBuffer()
      })
    }
  }

  async function createTask(name, command, group = '默认分组', envVars = {}) {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    try {
      const task = await invoke('create_task', { 
        id, 
        name, 
        command,
        envVars: Object.keys(envVars).length > 0 ? envVars : null
      })
      task.group = group
      task.retryCount = 0
      task.env_vars = envVars
      tasks.value.push(task)
      return task
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error
    }
  }

  async function retryTask(taskId) {
    const task = tasks.value.find(t => t.id === taskId)
    if (task && (task.status === 'failed' || task.status === 'cancelled')) {
      task.retryCount = (task.retryCount || 0) + 1
      await runTask(taskId)
    }
  }

  async function updateTask(taskId, updates) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      const task = tasks.value[index]
      
      // 如果是更新名称或命令，需要重新创建任务
      if (updates.name || updates.command) {
        // 删除旧任务
        await invoke('cancel_task', { taskId })
        
        // 创建新任务（保留原ID）
        const newTask = await invoke('create_task', {
          id: taskId,
          name: updates.name || task.name,
          command: updates.command || task.command
        })
        
        tasks.value[index] = newTask
      } else {
        // 只更新本地状态
        Object.assign(task, updates)
      }
      
      saveTasks()
    }
  }

  async function cloneTask(taskId) {
    const original = tasks.value.find(t => t.id === taskId)
    if (original) {
      return await createTask(
        `${original.name} (副本)`,
        original.command
      )
    }
  }

  async function runTask(taskId) {
    try {
      await invoke('run_task', { taskId })
    } catch (error) {
      console.error('Failed to run task:', error)
      throw error
    }
  }

  async function runAllTasks() {
    isRunningAll.value = true
    try {
      await invoke('run_all_tasks')
    } catch (error) {
      console.error('Failed to run all tasks:', error)
      throw error
    } finally {
      isRunningAll.value = false
    }
  }

  async function cancelTask(taskId) {
    try {
      await invoke('cancel_task', { taskId })
    } catch (error) {
      console.error('Failed to cancel task:', error)
      throw error
    }
  }

  async function clearTasks() {
    try {
      await invoke('clear_tasks')
      tasks.value = []
      localStorage.removeItem('huaan-tasks')
    } catch (error) {
      console.error('Failed to clear tasks:', error)
      throw error
    }
  }

  async function deleteTask(taskId) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveTasks()
    }
  }

  async function refreshTasks() {
    try {
      tasks.value = await invoke('get_all_tasks')
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
      throw error
    }
  }

  function getTasksByStatus(status) {
    return tasks.value.filter(t => t.status === status)
  }

  function getTaskStats() {
    return {
      total: tasks.value.length,
      pending: tasks.value.filter(t => t.status === 'pending').length,
      running: tasks.value.filter(t => t.status === 'running').length,
      success: tasks.value.filter(t => t.status === 'success').length,
      failed: tasks.value.filter(t => t.status === 'failed').length,
      cancelled: tasks.value.filter(t => t.status === 'cancelled').length,
    }
  }

  function exportTasks() {
    const data = JSON.stringify(tasks.value.map(({ id, name, command }) => ({
      id, name, command
    })), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `huaan-tasks-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importTasks(file) {
    try {
      const text = await file.text()
      const imported = JSON.parse(text)
      
      // 验证数据格式
      if (!Array.isArray(imported)) {
        throw new Error('无效的文件格式：必须是任务数组')
      }
      
      for (const task of imported) {
        if (!task.name || !task.command) {
          throw new Error('无效的任务数据：缺少 name 或 command 字段')
        }
        await createTask(task.name, task.command)
      }
      
      return imported.length
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    }
  }

  function cleanup() {
    if (unlistenUpdate) unlistenUpdate()
    if (unlistenOutput) unlistenOutput()
    if (unlistenError) unlistenError()
  }

  // 分组管理
  function addGroup(groupName) {
    if (!groups.value.includes(groupName)) {
      groups.value.push(groupName)
      // watch 会自动触发 saveGroups()
    }
  }

  function removeGroup(groupName) {
    const index = groups.value.indexOf(groupName)
    if (index > -1 && groupName !== '默认分组') {
      groups.value.splice(index, 1)
      // 将该分组的任务移动到默认分组
      tasks.value.forEach(task => {
        if (task.group === groupName) {
          task.group = '默认分组'
        }
      })
      // watch 会自动触发 saveGroups() 和 saveTasks()
    }
  }

  function setActiveGroup(groupName) {
    activeGroup.value = groupName
    // watch 会自动触发 saveActiveGroup()
  }

  function getTasksByGroup(groupName) {
    if (groupName === '全部') return tasks.value
    return tasks.value.filter(t => t.group === groupName)
  }

  // 初始化时加载所有持久化数据
  loadTasks()
  loadGroups()
  loadActiveGroup()

  return {
    tasks,
    isRunningAll,
    groups,
    activeGroup,
    initListeners,
    createTask,
    updateTask,
    cloneTask,
    runTask,
    runAllTasks,
    cancelTask,
    clearTasks,
    deleteTask,
    refreshTasks,
    retryTask,
    getTasksByStatus,
    getTaskStats,
    exportTasks,
    importTasks,
    addGroup,
    removeGroup,
    setActiveGroup,
    getTasksByGroup,
    cleanup
  }
})
