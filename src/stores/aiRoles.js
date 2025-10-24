import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAIRolesStore = defineStore('aiRoles', () => {
  // 预设 AI 角色
  const roles = ref([
    {
      id: 'developer',
      name: '开发者助手',
      icon: '💻',
      description: '专注于代码开发、调试和最佳实践',
      systemPrompt: `你是一个专业的开发者助手。你擅长：
- 编写高质量、可维护的代码
- 调试和解决技术问题
- 提供编程最佳实践建议
- 解释复杂的技术概念
请用简洁、专业的语言回答，并在适当时提供代码示例。`,
      contextAware: true,
      autoDetect: ['package.json', 'tsconfig.json', 'pom.xml', 'requirements.txt']
    },
    {
      id: 'devops',
      name: 'DevOps 工程师',
      icon: '🚀',
      description: '专注于部署、CI/CD 和基础设施',
      systemPrompt: `你是一个 DevOps 专家。你擅长：
- Docker 和容器化
- CI/CD 流程设计
- 云服务配置（AWS、Azure、GCP）
- 自动化脚本编写
- 性能优化和监控
请提供实用的命令和配置建议。`,
      contextAware: true,
      autoDetect: ['Dockerfile', 'docker-compose.yml', '.gitlab-ci.yml', 'Jenkinsfile']
    },
    {
      id: 'data-analyst',
      name: '数据分析师',
      icon: '📊',
      description: '专注于数据处理、分析和可视化',
      systemPrompt: `你是一个数据分析专家。你擅长：
- SQL 查询优化
- Python 数据分析（pandas、numpy）
- 数据可视化
- 统计分析
- 机器学习基础
请提供数据驱动的见解和分析方法。`,
      contextAware: true,
      autoDetect: ['.sql', '.ipynb', '.csv']
    },
    {
      id: 'system-admin',
      name: '系统管理员',
      icon: '⚙️',
      description: '专注于系统管理和故障排查',
      systemPrompt: `你是一个系统管理专家。你擅长：
- Linux/Unix 系统管理
- Shell 脚本编写
- 性能监控和优化
- 安全配置
- 故障排查
请提供实用的系统命令和解决方案。`,
      contextAware: true,
      autoDetect: ['.sh', '.bash', 'nginx.conf']
    },
    {
      id: 'security',
      name: '安全专家',
      icon: '🔒',
      description: '专注于安全分析和漏洞修复',
      systemPrompt: `你是一个网络安全专家。你擅长：
- 安全漏洞分析
- 渗透测试
- 安全配置
- 加密和认证
- 安全最佳实践
请提供安全、可靠的建议和解决方案。`,
      contextAware: true,
      autoDetect: []
    }
  ])

  const currentRole = ref(null)
  const autoDetectEnabled = ref(true)

  // 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem('huaan-ai-roles')
      if (saved) {
        const settings = JSON.parse(saved)
        if (settings.currentRoleId) {
          currentRole.value = roles.value.find(r => r.id === settings.currentRoleId)
        }
        autoDetectEnabled.value = settings.autoDetectEnabled ?? true
      }
    } catch (error) {
      console.error('加载 AI 角色设置失败:', error)
    }
  }

  // 保存设置
  function saveSettings() {
    try {
      const settings = {
        currentRoleId: currentRole.value?.id,
        autoDetectEnabled: autoDetectEnabled.value
      }
      localStorage.setItem('huaan-ai-roles', JSON.stringify(settings))
    } catch (error) {
      console.error('保存 AI 角色设置失败:', error)
    }
  }

  // 设置当前角色
  function setRole(roleId) {
    currentRole.value = roles.value.find(r => r.id === roleId) || null
    saveSettings()
  }

  // 自动检测项目类型并设置角色
  function autoDetectRole(files) {
    if (!autoDetectEnabled.value) return
    
    for (const role of roles.value) {
      if (role.contextAware && role.autoDetect) {
        for (const pattern of role.autoDetect) {
          if (files.some(f => f.includes(pattern))) {
            setRole(role.id)
            return role
          }
        }
      }
    }
    return null
  }

  // 获取角色的系统提示词
  function getRolePrompt() {
    return currentRole.value?.systemPrompt || ''
  }

  // 错误诊断
  function diagnoseError(error, context) {
    const diagnosis = {
      type: detectErrorType(error),
      suggestions: [],
      commands: []
    }

    // 根据错误类型提供建议
    if (diagnosis.type === 'permission') {
      diagnosis.suggestions.push('权限不足，尝试使用 sudo')
      diagnosis.commands.push(`sudo ${context.lastCommand}`)
    } else if (diagnosis.type === 'not-found') {
      diagnosis.suggestions.push('命令或文件未找到')
      diagnosis.commands.push('检查命令拼写或安装相应包')
    } else if (diagnosis.type === 'port-in-use') {
      diagnosis.suggestions.push('端口已被占用')
      diagnosis.commands.push('lsof -ti:端口号 | xargs kill -9')
    }

    return diagnosis
  }

  // 检测错误类型
  function detectErrorType(error) {
    const errorText = error.toLowerCase()
    if (errorText.includes('permission denied')) return 'permission'
    if (errorText.includes('command not found') || errorText.includes('no such file')) return 'not-found'
    if (errorText.includes('address already in use')) return 'port-in-use'
    if (errorText.includes('connection refused')) return 'connection'
    return 'unknown'
  }

  // 解释命令
  function explainCommand(command) {
    // 这里可以集成 AI 或使用规则解释
    return {
      command,
      parts: parseCommand(command),
      description: '',
      options: []
    }
  }

  // 解析命令
  function parseCommand(command) {
    const parts = command.trim().split(/\s+/)
    return {
      main: parts[0],
      args: parts.slice(1)
    }
  }

  // 初始化
  loadSettings()

  return {
    roles,
    currentRole,
    autoDetectEnabled,
    setRole,
    autoDetectRole,
    getRolePrompt,
    diagnoseError,
    explainCommand
  }
})

