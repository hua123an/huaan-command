import { invoke } from '@tauri-apps/api/core'
import { safetyChecker, checkCommand, checkFilePath } from '../security/SafetyChecker'

/**
 * 工具基类定义
 */
export const createTool = (name, description, execute, options = {}) => ({
  name,
  description,
  execute,
  needsApproval: options.needsApproval || false,
  category: options.category || 'general',
  icon: options.icon || '🔧',
  safetyCheck: options.safetyCheck || null  // 安全检查函数
})

/**
 * 所有可用工具
 */
export const tools = [
  // 文件系统工具
  createTool(
    'read_file',
    '读取文件内容',
    async ({ path }, context) => {
      return await invoke('read_file', { path })
    },
    {
      needsApproval: false,
      category: 'filesystem',
      icon: '📄'
    }
  ),

  createTool(
    'write_file',
    '写入文件（自动备份原文件）',
    async ({ path, content }, context) => {
      return await invoke('write_file', { path, content })
    },
    {
      needsApproval: true,  // 写入文件需要确认
      category: 'filesystem',
      icon: '✏️',
      safetyCheck: ({ path, content }) => {
        // 检查文件路径安全性
        const pathCheck = checkFilePath(path, 'write')
        return {
          ...pathCheck,
          operation: {
            type: 'write_file',
            params: { path, content }
          }
        }
      }
    }
  ),

  createTool(
    'list_files',
    '列出目录内容',
    async ({ dir }, context) => {
      return await invoke('list_files', { dir: dir || context.currentDir })
    },
    {
      needsApproval: false,
      category: 'filesystem',
      icon: '📁'
    }
  ),

  createTool(
    'search_files',
    '搜索文件（支持glob模式）',
    async ({ pattern, dir }, context) => {
      const searchDir = dir || context.currentDir
      return await invoke('search_files', { pattern, dir: searchDir })
    },
    {
      needsApproval: false,
      category: 'filesystem',
      icon: '🔍'
    }
  ),

  // 命令执行工具
  createTool(
    'execute_command',
    '执行 shell 命令',
    async ({ cmd, workingDir }, context) => {
      const dir = workingDir || context.currentDir
      return await invoke('execute_command', { cmd, workingDir: dir })
    },
    {
      needsApproval: (params) => {
        // 危险命令需要确认
        const dangerous = ['rm', 'sudo', 'mv', 'dd', 'mkfs', 'format', 'del']
        return dangerous.some(d => params.cmd.includes(d))
      },
      category: 'execution',
      icon: '⚡',
      safetyCheck: ({ cmd, workingDir }) => {
        // 使用 SafetyChecker 检查命令安全性
        const cmdCheck = checkCommand(cmd)
        return {
          ...cmdCheck,
          operation: {
            type: 'execute_command',
            params: { cmd, workingDir }
          }
        }
      }
    }
  ),

  // 目录工具
  createTool(
    'get_current_dir',
    '获取当前工作目录',
    async ({ sessionId }, context) => {
      return await invoke('get_current_dir', { sessionId })
    },
    {
      needsApproval: false,
      category: 'navigation',
      icon: '📂'
    }
  ),

  createTool(
    'change_directory',
    '切换工作目录',
    async ({ path, sessionId }, context) => {
      return await invoke('change_directory', { path, sessionId })
    },
    {
      needsApproval: false,
      category: 'navigation',
      icon: '🚀'
    }
  ),

  // 代码分析工具
  createTool(
    'analyze_code',
    '分析代码结构',
    async ({ path }, context) => {
      // TODO: 实现代码分析
      const content = await invoke('read_file', { path })
      return {
        message: '代码分析功能开发中...',
        preview: content.substring(0, 200)
      }
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '🔬'
    }
  ),

  createTool(
    'find_in_files',
    '在文件中搜索内容（grep）',
    async ({ pattern, dir, filePattern }, context) => {
      const searchDir = dir || context.currentDir
      const cmd = filePattern
        ? `grep -r "${pattern}" ${searchDir} --include="${filePattern}"`
        : `grep -r "${pattern}" ${searchDir}`
      return await invoke('execute_command', { cmd, workingDir: searchDir })
    },
    {
      needsApproval: false,
      category: 'analysis',
      icon: '🔎'
    }
  ),

  // Git 工具
  createTool(
    'git_status',
    '查看 Git 状态',
    async ({ workingDir }, context) => {
      const dir = workingDir || context.currentDir
      const result = await invoke('execute_command', {
        cmd: 'git status --porcelain',
        workingDir: dir
      })
      return result
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '🔀'
    }
  ),

  createTool(
    'git_diff',
    '查看代码改动',
    async ({ workingDir, file }, context) => {
      const dir = workingDir || context.currentDir
      const cmd = file ? `git diff ${file}` : 'git diff'
      const result = await invoke('execute_command', {
        cmd,
        workingDir: dir
      })
      return result
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '📊'
    }
  ),

  createTool(
    'git_log',
    '查看提交历史',
    async ({ workingDir, limit = 10 }, context) => {
      const dir = workingDir || context.currentDir
      const result = await invoke('execute_command', {
        cmd: `git log --oneline -${limit}`,
        workingDir: dir
      })
      return result
    },
    {
      needsApproval: false,
      category: 'git',
      icon: '📜'
    }
  ),

  createTool(
    'git_branch',
    '查看或切换分支',
    async ({ workingDir, branch }, context) => {
      const dir = workingDir || context.currentDir
      const cmd = branch ? `git checkout ${branch}` : 'git branch'
      const needsApproval = !!branch // 切换分支需要确认

      return await invoke('execute_command', {
        cmd,
        workingDir: dir
      })
    },
    {
      needsApproval: (params) => !!params.branch,
      category: 'git',
      icon: '🌿'
    }
  ),

  // 进程管理工具
  createTool(
    'list_processes',
    '列出运行中的进程',
    async ({ filter }, context) => {
      const cmd = filter ? `ps aux | grep ${filter}` : 'ps aux'
      return await invoke('execute_command', { cmd })
    },
    {
      needsApproval: false,
      category: 'system',
      icon: '⚙️'
    }
  ),

  createTool(
    'kill_process',
    '终止进程',
    async ({ pid, signal = 'TERM' }, context) => {
      return await invoke('execute_command', {
        cmd: `kill -${signal} ${pid}`
      })
    },
    {
      needsApproval: true, // 终止进程需要确认
      category: 'system',
      icon: '🛑'
    }
  ),

  // 环境信息工具
  createTool(
    'get_env_info',
    '获取系统环境信息',
    async ({}, context) => {
      const results = await Promise.all([
        invoke('execute_command', { cmd: 'uname -a' }),
        invoke('execute_command', { cmd: 'node --version' }).catch(() => ({ stdout: 'N/A' })),
        invoke('execute_command', { cmd: 'npm --version' }).catch(() => ({ stdout: 'N/A' })),
        invoke('execute_command', { cmd: 'git --version' }).catch(() => ({ stdout: 'N/A' }))
      ])

      return {
        system: results[0].stdout,
        node: results[1].stdout,
        npm: results[2].stdout,
        git: results[3].stdout
      }
    },
    {
      needsApproval: false,
      category: 'system',
      icon: '💻'
    }
  ),

  // 网络工具
  createTool(
    'test_connection',
    '测试网络连接',
    async ({ host = 'google.com' }, context) => {
      return await invoke('execute_command', {
        cmd: `ping -c 3 ${host}`
      })
    },
    {
      needsApproval: false,
      category: 'network',
      icon: '🌐'
    }
  ),

  createTool(
    'check_port',
    '检查端口占用',
    async ({ port }, context) => {
      return await invoke('execute_command', {
        cmd: `lsof -i :${port}`
      })
    },
    {
      needsApproval: false,
      category: 'network',
      icon: '🔌'
    }
  ),
]

/**
 * 根据类别获取工具
 */
export const getToolsByCategory = (category) => {
  return tools.filter(t => t.category === category)
}

/**
 * 根据名称获取工具
 */
export const getTool = (name) => {
  return tools.find(t => t.name === name)
}

/**
 * 获取所有工具名称和描述（用于 AI prompt）
 */
export const getToolsDescription = () => {
  return tools.map(t => `${t.icon} ${t.name}: ${t.description}`).join('\n')
}

/**
 * 获取工具的 JSON Schema（用于 AI function calling）
 */
export const getToolsSchema = () => {
  const schemas = {
    read_file: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' }
      },
      required: ['path']
    },
    write_file: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '文件内容' }
      },
      required: ['path', 'content']
    },
    list_files: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: '目录路径（可选）' }
      }
    },
    search_files: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'glob 匹配模式' },
        dir: { type: 'string', description: '搜索目录（可选）' }
      },
      required: ['pattern']
    },
    execute_command: {
      type: 'object',
      properties: {
        cmd: { type: 'string', description: '要执行的命令' },
        workingDir: { type: 'string', description: '工作目录（可选）' }
      },
      required: ['cmd']
    },
    get_current_dir: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: '会话 ID' }
      },
      required: ['sessionId']
    },
    change_directory: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目标目录' },
        sessionId: { type: 'string', description: '会话 ID' }
      },
      required: ['path', 'sessionId']
    },
    find_in_files: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '搜索模式' },
        dir: { type: 'string', description: '搜索目录（可选）' },
        filePattern: { type: 'string', description: '文件匹配模式（可选）' }
      },
      required: ['pattern']
    },
    git_status: {
      type: 'object',
      properties: {
        workingDir: { type: 'string', description: '工作目录（可选）' }
      }
    },
    git_diff: {
      type: 'object',
      properties: {
        workingDir: { type: 'string', description: '工作目录（可选）' },
        file: { type: 'string', description: '特定文件（可选）' }
      }
    },
    git_log: {
      type: 'object',
      properties: {
        workingDir: { type: 'string', description: '工作目录（可选）' },
        limit: { type: 'number', description: '显示条数（默认10）' }
      }
    },
    git_branch: {
      type: 'object',
      properties: {
        workingDir: { type: 'string', description: '工作目录（可选）' },
        branch: { type: 'string', description: '要切换的分支（可选）' }
      }
    },
    list_processes: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: '过滤条件（可选）' }
      }
    },
    kill_process: {
      type: 'object',
      properties: {
        pid: { type: 'number', description: '进程 ID' },
        signal: { type: 'string', description: '信号类型（默认 TERM）' }
      },
      required: ['pid']
    },
    check_port: {
      type: 'object',
      properties: {
        port: { type: 'number', description: '端口号' }
      },
      required: ['port']
    },
    test_connection: {
      type: 'object',
      properties: {
        host: { type: 'string', description: '主机地址（默认 google.com）' }
      }
    }
  }

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: schemas[tool.name] || { type: 'object', properties: {} }
  }))
}

/**
 * 执行工具前的安全检查
 * @param {Object} tool - 工具对象
 * @param {Object} params - 工具参数
 * @returns {Object|null} 安全检查结果，如果无需检查返回 null
 */
export const performSafetyCheck = (tool, params) => {
  if (!tool.safetyCheck) return null

  const result = tool.safetyCheck(params)

  // 如果需要批准，将操作添加到待确认队列
  if (result.needsApproval) {
    const operationId = safetyChecker.addPendingOperation({
      toolName: tool.name,
      ...result.operation,
      riskLevel: result.level,
      preview: safetyChecker.generatePreview(result.operation)
    })

    return {
      ...result,
      operationId
    }
  }

  return result
}

/**
 * 导出 SafetyChecker 实例供外部使用
 */
export { safetyChecker }
