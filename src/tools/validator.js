/**
 * 验证工具参数
 */
export const validateToolParams = (tool, params) => {
  const errors = []

  switch (tool.name) {
    case 'read_file':
    case 'write_file':
      if (!params.path) {
        errors.push('缺少 path 参数')
      }
      if (tool.name === 'write_file' && params.content === undefined) {
        errors.push('缺少 content 参数')
      }
      break

    case 'execute_command':
      if (!params.cmd) {
        errors.push('缺少 cmd 参数')
      }
      break

    case 'list_files':
      // dir 是可选的
      break

    case 'search_files':
      if (!params.pattern) {
        errors.push('缺少 pattern 参数')
      }
      break

    case 'get_current_dir':
      if (!params.sessionId) {
        errors.push('缺少 sessionId 参数')
      }
      break

    case 'change_directory':
      if (!params.path) {
        errors.push('缺少 path 参数')
      }
      if (!params.sessionId) {
        errors.push('缺少 sessionId 参数')
      }
      break

    case 'find_in_files':
      if (!params.pattern) {
        errors.push('缺少 pattern 参数')
      }
      break

    case 'kill_process':
      if (!params.pid) {
        errors.push('缺少 pid 参数')
      }
      break

    case 'check_port':
      if (!params.port) {
        errors.push('缺少 port 参数')
      }
      break

    case 'git_branch':
      // branch 是可选的（查看分支列表）
      break

    default:
      // 其他工具的参数都是可选的
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 检查工具是否需要批准
 */
export const checkNeedsApproval = (tool, params) => {
  if (typeof tool.needsApproval === 'function') {
    return tool.needsApproval(params)
  }
  return tool.needsApproval
}

/**
 * 格式化工具执行结果
 */
export const formatToolResult = (result, tool) => {
  // 如果结果包含 stdout/stderr（命令执行结果）
  if (result && typeof result === 'object' && 'stdout' in result) {
    return {
      success: result.code === 0,
      output: result.stdout || result.stderr,
      error: result.code !== 0 ? result.stderr : null,
      code: result.code
    }
  }

  // 文件读取结果
  if (typeof result === 'string') {
    return {
      success: true,
      output: result,
      error: null
    }
  }

  // 其他对象结果
  if (typeof result === 'object') {
    return {
      success: true,
      output: JSON.stringify(result, null, 2),
      data: result,
      error: null
    }
  }

  return {
    success: true,
    output: String(result),
    error: null
  }
}

/**
 * 检测危险操作
 */
export const detectDangerousOperation = (tool, params) => {
  const warnings = []

  // 检测文件删除操作
  if (tool.name === 'execute_command' && params.cmd) {
    if (params.cmd.includes('rm -rf /')) {
      warnings.push('警告：尝试删除根目录！')
    }
    if (params.cmd.includes('rm -rf') || params.cmd.includes('rm -fr')) {
      warnings.push('警告：强制递归删除操作')
    }
    if (params.cmd.includes('sudo')) {
      warnings.push('警告：使用超级用户权限')
    }
    if (params.cmd.includes('format') || params.cmd.includes('mkfs')) {
      warnings.push('警告：磁盘格式化操作')
    }
  }

  // 检测进程终止
  if (tool.name === 'kill_process' && params.signal === 'KILL') {
    warnings.push('警告：强制终止进程（无法捕获信号）')
  }

  // 检测 Git 操作
  if (tool.name === 'git_branch' && params.branch) {
    warnings.push('提示：即将切换分支，未提交的更改可能丢失')
  }

  return warnings
}

/**
 * 生成工具使用建议
 */
export const generateToolSuggestion = (context) => {
  const suggestions = []

  // 根据当前目录建议工具
  if (context.currentDir) {
    suggestions.push({
      tool: 'list_files',
      reason: '查看当前目录内容',
      params: { dir: context.currentDir }
    })
  }

  // 检查是否是 Git 仓库
  if (context.isGitRepo) {
    suggestions.push({
      tool: 'git_status',
      reason: '查看 Git 状态',
      params: { workingDir: context.currentDir }
    })
  }

  // 检查是否有 package.json
  if (context.hasPackageJson) {
    suggestions.push({
      tool: 'execute_command',
      reason: '运行 npm 脚本',
      params: { cmd: 'npm run', workingDir: context.currentDir }
    })
  }

  return suggestions
}
