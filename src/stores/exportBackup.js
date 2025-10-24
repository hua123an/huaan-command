import { defineStore } from 'pinia'
import { useTaskStore } from './task'
import { useHistoryStore } from './history'
import { useSettingsStore } from './settings'
import { useSnippetsStore } from './snippets'
import { useWorkspaceStore } from './workspace'
import { useEnvironmentStore } from './environment'

export const useExportBackupStore = defineStore('exportBackup', () => {
  
  // 导出所有数据
  function exportAll() {
    const taskStore = useTaskStore()
    const historyStore = useHistoryStore()
    const settingsStore = useSettingsStore()
    const snippetsStore = useSnippetsStore()
    const workspaceStore = useWorkspaceStore()
    const envStore = useEnvironmentStore()

    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tasks: taskStore.tasks,
      history: historyStore.history,
      favorites: historyStore.favorites,
      settings: settingsStore.settings,
      snippets: snippetsStore.snippets,
      workspaces: workspaceStore.workspaces,
      envProfiles: envStore.envProfiles,
      sshConnections: envStore.sshConnections
    }

    return data
  }

  // 导出为 JSON 文件
  function exportToJSON() {
    const data = exportAll()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `huaan-command-backup-${Date.now()}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // 导出任务为 Markdown
  function exportTasksToMarkdown() {
    const taskStore = useTaskStore()
    const tasks = taskStore.tasks

    let markdown = '# Huaan Command - 任务列表\n\n'
    markdown += `导出时间: ${new Date().toLocaleString()}\n\n`

    const statuses = ['pending', 'running', 'completed', 'failed']
    const statusNames = {
      pending: '待执行',
      running: '执行中',
      completed: '已完成',
      failed: '失败'
    }

    statuses.forEach(status => {
      const statusTasks = tasks.filter(t => t.status === status)
      if (statusTasks.length > 0) {
        markdown += `## ${statusNames[status]} (${statusTasks.length})\n\n`
        statusTasks.forEach(task => {
          markdown += `### ${task.name}\n\n`
          markdown += `- **命令**: \`${task.command}\`\n`
          markdown += `- **工作目录**: ${task.cwd || 'N/A'}\n`
          markdown += `- **创建时间**: ${new Date(task.createdAt).toLocaleString()}\n`
          if (task.output) {
            markdown += `- **输出**:\n\`\`\`\n${task.output}\n\`\`\`\n`
          }
          markdown += '\n---\n\n'
        })
      }
    })

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `tasks-${Date.now()}.md`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // 导出历史记录为 CSV
  function exportHistoryToCSV() {
    const historyStore = useHistoryStore()
    const history = historyStore.history

    let csv = 'Command,Timestamp,Count,CWD\n'
    history.forEach(entry => {
      const command = `"${entry.command.replace(/"/g, '""')}"`
      const timestamp = new Date(entry.timestamp).toISOString()
      const count = entry.count || 1
      const cwd = entry.cwd || ''
      csv += `${command},${timestamp},${count},"${cwd}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `history-${Date.now()}.csv`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // 导出代码片段
  function exportSnippets() {
    const snippetsStore = useSnippetsStore()
    const snippets = snippetsStore.snippets

    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      snippets
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `snippets-${Date.now()}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // 从 JSON 恢复所有数据
  function importFromJSON(json) {
    try {
      const data = JSON.parse(json)
      
      if (data.version !== '1.0.0') {
        throw new Error('不支持的备份版本')
      }

      const taskStore = useTaskStore()
      const historyStore = useHistoryStore()
      const settingsStore = useSettingsStore()
      const snippetsStore = useSnippetsStore()
      const workspaceStore = useWorkspaceStore()
      const envStore = useEnvironmentStore()

      // 恢复数据
      if (data.tasks) taskStore.tasks = data.tasks
      if (data.history) historyStore.history = data.history
      if (data.favorites) historyStore.favorites = data.favorites
      if (data.settings) settingsStore.settings = data.settings
      if (data.snippets) snippetsStore.snippets = data.snippets
      if (data.workspaces) workspaceStore.workspaces = data.workspaces
      if (data.envProfiles) envStore.envProfiles = data.envProfiles
      if (data.sshConnections) envStore.sshConnections = data.sshConnections

      // 触发保存
      taskStore.saveTasks()
      historyStore.saveHistory()
      historyStore.saveFavorites()
      settingsStore.saveSettings()
      snippetsStore.saveSnippets()
      workspaceStore.saveWorkspaces()
      envStore.saveProfiles()
      envStore.saveSSHConnections()

      return { success: true, message: '数据恢复成功' }
    } catch (error) {
      console.error('导入失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 创建自动备份
  function createAutoBackup() {
    try {
      const data = exportAll()
      localStorage.setItem('huaan-auto-backup', JSON.stringify(data))
      localStorage.setItem('huaan-auto-backup-time', Date.now().toString())
      return true
    } catch (error) {
      console.error('创建自动备份失败:', error)
      return false
    }
  }

  // 恢复自动备份
  function restoreAutoBackup() {
    try {
      const backup = localStorage.getItem('huaan-auto-backup')
      if (backup) {
        return importFromJSON(backup)
      }
      return { success: false, message: '没有找到自动备份' }
    } catch (error) {
      console.error('恢复自动备份失败:', error)
      return { success: false, message: error.message }
    }
  }

  return {
    exportAll,
    exportToJSON,
    exportTasksToMarkdown,
    exportHistoryToCSV,
    exportSnippets,
    importFromJSON,
    createAutoBackup,
    restoreAutoBackup
  }
})

