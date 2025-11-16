import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGitStore = defineStore('git', () => {
  const gitStatus = ref({
    branch: null,
    ahead: 0,
    behind: 0,
    modified: 0,
    staged: 0,
    untracked: 0,
    additions: 0, // 新增行数
    deletions: 0, // 删除行数
    hasChanges: false
  })

  const gitHistory = ref([])
  const isGitRepo = ref(false)

  // 解析 git status 输出
  function parseGitStatus(output) {
    try {
      const lines = output.split('\n')
      const status = {
        branch: null,
        ahead: 0,
        behind: 0,
        modified: 0,
        staged: 0,
        untracked: 0,
        additions: 0,
        deletions: 0,
        hasChanges: false
      }

      for (const line of lines) {
        // 解析分支信息
        if (line.startsWith('## ')) {
          const branchInfo = line.substring(3)
          const branchMatch = branchInfo.match(/^([^\s.]+)/)
          if (branchMatch) {
            status.branch = branchMatch[1]
          }

          // 解析 ahead/behind
          const aheadMatch = branchInfo.match(/ahead (\d+)/)
          const behindMatch = branchInfo.match(/behind (\d+)/)
          if (aheadMatch) status.ahead = parseInt(aheadMatch[1])
          if (behindMatch) status.behind = parseInt(behindMatch[1])
        }
        // 解析文件状态
        else if (line.length >= 2) {
          const statusCode = line.substring(0, 2)
          if (statusCode[0] !== ' ' && statusCode[0] !== '?') status.staged++
          if (statusCode[1] === 'M') status.modified++
          if (statusCode === '??') status.untracked++
        }
      }

      status.hasChanges = status.modified > 0 || status.staged > 0 || status.untracked > 0
      return status
    } catch (error) {
      console.error('解析 git status 失败:', error)
      return null
    }
  }

  // 更新 Git 状态
  function updateStatus(output) {
    const parsed = parseGitStatus(output)
    if (parsed) {
      gitStatus.value = parsed
      isGitRepo.value = true
    }
  }

  // 解析 git log 输出
  function parseGitLog(output) {
    try {
      const commits = []
      const lines = output.split('\n')
      let currentCommit = null

      for (const line of lines) {
        if (line.startsWith('commit ')) {
          if (currentCommit) {
            commits.push(currentCommit)
          }
          currentCommit = {
            hash: line.substring(7, 15),
            fullHash: line.substring(7),
            author: '',
            date: '',
            message: ''
          }
        } else if (line.startsWith('Author: ') && currentCommit) {
          currentCommit.author = line.substring(8)
        } else if (line.startsWith('Date: ') && currentCommit) {
          currentCommit.date = line.substring(8)
        } else if (
          line.trim() &&
          currentCommit &&
          !line.startsWith('commit') &&
          !line.startsWith('Author') &&
          !line.startsWith('Date')
        ) {
          currentCommit.message += line.trim() + ' '
        }
      }

      if (currentCommit) {
        commits.push(currentCommit)
      }

      return commits
    } catch (error) {
      console.error('解析 git log 失败:', error)
      return []
    }
  }

  // 更新 Git 历史
  function updateHistory(output) {
    gitHistory.value = parseGitLog(output)
  }

  // 重置状态
  function reset() {
    gitStatus.value = {
      branch: null,
      ahead: 0,
      behind: 0,
      modified: 0,
      staged: 0,
      untracked: 0,
      additions: 0,
      deletions: 0,
      hasChanges: false
    }
    gitHistory.value = []
    isGitRepo.value = false
  }

  // 刷新 Git 状态（执行 git 命令）
  async function refreshStatus(workingDir) {
    try {
      // 执行 git status --porcelain=v1 --branch
      const statusOutput = await window.__TAURI__.core.invoke('execute_command', {
        command: 'git status --porcelain=v1 --branch',
        workingDir
      })

      if (statusOutput) {
        updateStatus(statusOutput)
      }

      // 执行 git diff --numstat 获取添加/删除行数
      const diffOutput = await window.__TAURI__.core.invoke('execute_command', {
        command: 'git diff --numstat',
        workingDir
      })

      if (diffOutput) {
        const lines = diffOutput.trim().split('\n')
        let totalAdditions = 0
        let totalDeletions = 0

        for (const line of lines) {
          const parts = line.split('\t')
          if (parts.length >= 2) {
            totalAdditions += parseInt(parts[0]) || 0
            totalDeletions += parseInt(parts[1]) || 0
          }
        }

        gitStatus.value.additions = totalAdditions
        gitStatus.value.deletions = totalDeletions
      }
    } catch (error) {
      console.error('刷新 Git 状态失败:', error)
      reset()
    }
  }

  return {
    gitStatus,
    gitHistory,
    isGitRepo,
    updateStatus,
    updateHistory,
    refreshStatus,
    reset
  }
})
