import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

/**
 * Git 工作流集成
 * 提供 Git 状态查询、提交、分支管理等功能
 */
export function useGit(currentDir) {
  const gitStatus = ref(null)
  const branches = ref([])
  const currentBranch = ref('')
  const commits = ref([])
  const isGitRepo = ref(false)
  const loading = ref(false)
  const error = ref(null)

  // 检查是否是 Git 仓库
  const checkGitRepo = async () => {
    try {
      loading.value = true
      error.value = null

      const result = await invoke('execute_command', {
        command: 'git rev-parse --is-inside-work-tree',
        workingDir: currentDir.value
      })

      isGitRepo.value = result.stdout.trim() === 'true'
      return isGitRepo.value
    } catch (err) {
      isGitRepo.value = false
      return false
    } finally {
      loading.value = false
    }
  }

  // 获取 Git 状态
  const fetchStatus = async () => {
    if (!currentDir.value) return

    try {
      loading.value = true
      error.value = null

      // 检查是否是 Git 仓库
      await checkGitRepo()
      if (!isGitRepo.value) {
        gitStatus.value = null
        return
      }

      // 获取状态
      const statusResult = await invoke('execute_command', {
        command: 'git status --porcelain --branch',
        workingDir: currentDir.value
      })

      // 解析状态
      const stdout = typeof statusResult === 'string' ? statusResult : statusResult.stdout
      if (!stdout) {
        throw new Error('No output from git status command')
      }
      const lines = stdout.split('\n').filter(line => line.trim())
      const branchLine = lines[0]
      const files = lines.slice(1)

      // 解析分支信息
      const branchMatch = branchLine.match(/## (.+?)(?:\.\.\.(.+?))?(?:\s\[(.+)\])?$/)
      if (branchMatch) {
        currentBranch.value = branchMatch[1]
      }

      // 解析文件状态
      const staged = []
      const unstaged = []
      const untracked = []

      files.forEach(line => {
        const status = line.substring(0, 2)
        const file = line.substring(3)

        if (status === '??') {
          untracked.push(file)
        } else if (status[0] !== ' ') {
          staged.push({ file, status: status[0] })
        } else if (status[1] !== ' ') {
          unstaged.push({ file, status: status[1] })
        }
      })

      gitStatus.value = {
        branch: currentBranch.value,
        staged,
        unstaged,
        untracked,
        clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0
      }
    } catch (err) {
      error.value = err.message || '获取 Git 状态失败'
      console.error('Git status error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取分支列表
  const fetchBranches = async () => {
    if (!isGitRepo.value) return

    try {
      const result = await invoke('execute_command', {
        command: 'git branch -a',
        workingDir: currentDir.value
      })

      // 后端返回字符串，直接使用
      const stdout = typeof result === 'string' ? result : result.stdout
      if (!stdout) {
        throw new Error('No output from git branch command')
      }

      branches.value = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const isCurrent = line.startsWith('*')
          const name = line.replace(/^\*?\s+/, '').trim()
          return { name, isCurrent }
        })
    } catch (err) {
      console.error('Fetch branches error:', err)
    }
  }

  // 获取提交历史
  const fetchCommits = async (limit = 20) => {
    if (!isGitRepo.value) return

    try {
      const result = await invoke('execute_command', {
        command: `git log --pretty=format:"%H|%h|%an|%ae|%at|%s" -n ${limit}`,
        workingDir: currentDir.value
      })

      // 后端返回字符串，直接使用
      const stdout = typeof result === 'string' ? result : result.stdout
      if (!stdout) {
        throw new Error('No output from git log command')
      }

      commits.value = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, shortHash, author, email, timestamp, message] = line.split('|')
          return {
            hash,
            shortHash,
            author,
            email,
            date: new Date(parseInt(timestamp) * 1000),
            message
          }
        })
    } catch (err) {
      console.error('Fetch commits error:', err)
    }
  }

  // Git 添加文件
  const add = async (files = '.') => {
    try {
      await invoke('execute_command', {
        command: `git add ${files}`,
        workingDir: currentDir.value
      })
      await fetchStatus()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Git 提交
  const commit = async message => {
    if (!message) {
      return { success: false, error: '提交信息不能为空' }
    }

    try {
      const result = await invoke('execute_command', {
        command: `git commit -m "${message.replace(/"/g, '\\"')}"`,
        workingDir: currentDir.value
      })

      await fetchStatus()
      await fetchCommits()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Git 推送
  const push = async (remote = 'origin', branch = null) => {
    try {
      const targetBranch = branch || currentBranch.value
      const result = await invoke('execute_command', {
        command: `git push ${remote} ${targetBranch}`,
        workingDir: currentDir.value
      })

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Git 拉取
  const pull = async (remote = 'origin', branch = null) => {
    try {
      const targetBranch = branch || currentBranch.value
      const result = await invoke('execute_command', {
        command: `git pull ${remote} ${targetBranch}`,
        workingDir: currentDir.value
      })

      await fetchStatus()
      await fetchCommits()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 切换分支
  const checkout = async branch => {
    try {
      const result = await invoke('execute_command', {
        command: `git checkout ${branch}`,
        workingDir: currentDir.value
      })

      await fetchStatus()
      await fetchBranches()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 创建分支
  const createBranch = async (branchName, checkout = true) => {
    try {
      const cmd = checkout ? `git checkout -b ${branchName}` : `git branch ${branchName}`

      const result = await invoke('execute_command', {
        command: cmd,
        workingDir: currentDir.value
      })

      await fetchBranches()
      if (checkout) await fetchStatus()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 删除分支
  const deleteBranch = async (branchName, force = false) => {
    try {
      const flag = force ? '-D' : '-d'
      const result = await invoke('execute_command', {
        command: `git branch ${flag} ${branchName}`,
        workingDir: currentDir.value
      })

      await fetchBranches()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 暂存更改
  const stash = async (message = '') => {
    try {
      const cmd = message ? `git stash save "${message.replace(/"/g, '\\"')}"` : 'git stash'

      const result = await invoke('execute_command', {
        command: cmd,
        workingDir: currentDir.value
      })

      await fetchStatus()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 恢复暂存
  const stashPop = async () => {
    try {
      const result = await invoke('execute_command', {
        command: 'git stash pop',
        workingDir: currentDir.value
      })

      await fetchStatus()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 查看文件差异
  const diff = async (file = null) => {
    try {
      const cmd = file ? `git diff ${file}` : 'git diff'
      const result = await invoke('execute_command', {
        command: cmd,
        workingDir: currentDir.value
      })

      return { success: true, diff: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 初始化 Git 仓库
  const init = async () => {
    try {
      const result = await invoke('execute_command', {
        command: 'git init',
        workingDir: currentDir.value
      })

      await checkGitRepo()
      await fetchStatus()

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 克隆仓库
  const clone = async (url, targetDir = null) => {
    try {
      const cmd = targetDir ? `git clone ${url} ${targetDir}` : `git clone ${url}`

      const result = await invoke('execute_command', {
        command: cmd,
        workingDir: currentDir.value
      })

      return { success: true, output: result.stdout }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // 计算的状态信息
  const statusSummary = computed(() => {
    if (!gitStatus.value) return null

    return {
      total:
        gitStatus.value.staged.length +
        gitStatus.value.unstaged.length +
        gitStatus.value.untracked.length,
      staged: gitStatus.value.staged.length,
      unstaged: gitStatus.value.unstaged.length,
      untracked: gitStatus.value.untracked.length,
      clean: gitStatus.value.clean
    }
  })

  return {
    // 状态
    gitStatus,
    branches,
    currentBranch,
    commits,
    isGitRepo,
    loading,
    error,
    statusSummary,

    // 方法
    checkGitRepo,
    fetchStatus,
    fetchBranches,
    fetchCommits,
    add,
    commit,
    push,
    pull,
    checkout,
    createBranch,
    deleteBranch,
    stash,
    stashPop,
    diff,
    init,
    clone
  }
}
