import { ref, watch, nextTick } from 'vue'

// 自动完成建议类型
export const SUGGESTION_TYPES = {
  COMMAND: 'command',
  FILE_PATH: 'file_path',
  DIRECTORY: 'directory',
  AI_PROMPT: 'ai_prompt',
  GIT_COMMAND: 'git_command',
  DOCKER_COMMAND: 'docker_command',
  NPM_COMMAND: 'npm_command'
}

// 自动完成数据源
export const AUTOCOMPLETE_DATA = {
  // 常用命令
  [SUGGESTION_TYPES.COMMAND]: [
    'ls', 'la', 'll', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv',
    'cat', 'less', 'more', 'head', 'tail', 'grep', 'find',
    'chmod', 'chown', 'ps', 'kill', 'top', 'df', 'du',
    'tar', 'zip', 'unzip', 'ssh', 'scp', 'curl', 'wget'
  ],
  
  // Git 命令
  [SUGGESTION_TYPES.GIT_COMMAND]: [
    'git status', 'git add', 'git commit', 'git push', 'git pull',
    'git branch', 'git checkout', 'git merge', 'git rebase',
    'git log', 'git diff', 'git stash', 'git clone', 'git init'
  ],
  
  // Docker 命令
  [SUGGESTION_TYPES.DOCKER_COMMAND]: [
    'docker ps', 'docker images', 'docker run', 'docker build',
    'docker-compose up', 'docker-compose down', 'docker exec',
    'docker logs', 'docker stop', 'docker start', 'docker rm'
  ],
  
  // NPM 命令
  [SUGGESTION_TYPES.NPM_COMMAND]: [
    'npm install', 'npm run', 'npm start', 'npm test', 'npm build',
    'npm publish', 'npm update', 'npm audit', 'npm ls'
  ],
  
  // AI 提示词
  [SUGGESTION_TYPES.AI_PROMPT]: [
    '帮我分析这个项目',
    '生成一个 API 接口',
    '优化这段代码',
    '解释这个错误',
    '推荐最佳实践',
    '创建测试用例',
    '重构这个函数',
    '添加错误处理'
  ]
}

// 自动完成 Composable
export function useAutoComplete(options = {}) {
  const {
    maxSuggestions = 8,
    minInputLength = 1,
    debounceDelay = 200,
    enableFileCompletion = true,
    enableAICompletion = true
  } = options
  
  // 状态
  const suggestions = ref([])
  const selectedIndex = ref(-1)
  const isVisible = ref(false)
  const isLoading = ref(false)
  
  // 防抖函数
  let debounceTimeout = null
  
  // 获取建议
  const getSuggestions = async (input, cursorPosition, context = {}) => {
    if (!input || input.length < minInputLength) {
      suggestions.value = []
      isVisible.value = false
      return
    }
    
    isLoading.value = true
    
    try {
      const allSuggestions = []
      
      // 基础命令建议
      const commandSuggestions = getCommandSuggestions(input)
      allSuggestions.push(...commandSuggestions)
      
      // 文件路径建议
      if (enableFileCompletion && shouldSuggestFiles(input)) {
        const fileSuggestions = await getFileSuggestions(input, context)
        allSuggestions.push(...fileSuggestions)
      }
      
      // AI 提示词建议
      if (enableAICompletion && shouldSuggestAI(input)) {
        const aiSuggestions = getAISuggestions(input)
        allSuggestions.push(...aiSuggestions)
      }
      
      // 去重并排序
      const uniqueSuggestions = [...new Set(allSuggestions)]
        .slice(0, maxSuggestions)
        .sort((a, b) => {
          // 优先匹配开头的
          const aStarts = a.text.toLowerCase().startsWith(input.toLowerCase())
          const bStarts = b.text.toLowerCase().startsWith(input.toLowerCase())
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return a.text.localeCompare(b.text)
        })
      
      suggestions.value = uniqueSuggestions
      selectedIndex.value = -1
      isVisible.value = uniqueSuggestions.length > 0
      
    } catch (error) {
      console.error('获取自动完成建议失败:', error)
      suggestions.value = []
      isVisible.value = false
    } finally {
      isLoading.value = false
    }
  }
  
  // 防抖获取建议
  const debouncedGetSuggestions = (input, cursorPosition, context) => {
    clearTimeout(debounceTimeout)
    debounceTimeout = setTimeout(() => {
      getSuggestions(input, cursorPosition, context)
    }, debounceDelay)
  }
  
  // 获取命令建议
  const getCommandSuggestions = (input) => {
    const inputLower = input.toLowerCase()
    const suggestions = []
    
    // 搜索所有命令类型
    Object.values(AUTOCOMPLETE_DATA).forEach(commandList => {
      commandList.forEach(command => {
        if (command.toLowerCase().includes(inputLower)) {
          suggestions.push({
            text: command,
            type: SUGGESTION_TYPES.COMMAND,
            description: getCommandDescription(command),
            icon: getCommandIcon(command)
          })
        }
      })
    })
    
    return suggestions
  }
  
  // 获取文件建议（模拟）
  const getFileSuggestions = async (input, context) => {
    // 这里应该调用实际的文件系统 API
    // 现在返回模拟数据
    const suggestions = []
    
    if (input.includes(' ')) {
      const lastPart = input.split(' ').pop()
      if (lastPart.startsWith('/') || lastPart.startsWith('./') || lastPart.startsWith('../')) {
        // 模拟文件路径建议
        const mockFiles = [
          { text: `${lastPart}src/`, type: SUGGESTION_TYPES.DIRECTORY, icon: '📁' },
          { text: `${lastPart}package.json`, type: SUGGESTION_TYPES.FILE_PATH, icon: '📄' },
          { text: `${lastPart}README.md`, type: SUGGESTION_TYPES.FILE_PATH, icon: '📄' },
          { text: `${lastPart}node_modules/`, type: SUGGESTION_TYPES.DIRECTORY, icon: '📁' }
        ]
        suggestions.push(...mockFiles)
      }
    }
    
    return suggestions
  }
  
  // 获取 AI 建议词
  const getAISuggestions = (input) => {
    const inputLower = input.toLowerCase()
    const suggestions = []
    
    AUTOCOMPLETE_DATA[SUGGESTION_TYPES.AI_PROMPT].forEach(prompt => {
      if (prompt.toLowerCase().includes(inputLower)) {
        suggestions.push({
          text: prompt,
          type: SUGGESTION_TYPES.AI_PROMPT,
          description: 'AI 助手提示词',
          icon: '🤖'
        })
      }
    })
    
    return suggestions
  }
  
  // 判断是否应该建议文件
  const shouldSuggestFiles = (input) => {
    const fileCommands = ['cd', 'ls', 'cat', 'less', 'more', 'head', 'tail', 'cp', 'mv', 'rm']
    const parts = input.split(' ')
    const command = parts[0]
    return fileCommands.includes(command) && parts.length > 1
  }
  
  // 判断是否应该建议 AI
  const shouldSuggestAI = (input) => {
    return input.startsWith('/') || input.toLowerCase().includes('ai') || input.toLowerCase().includes('帮助')
  }
  
  // 获取命令描述
  const getCommandDescription = (command) => {
    const descriptions = {
      'ls': '列出目录内容',
      'cd': '切换目录',
      'cat': '显示文件内容',
      'git status': '查看 Git 状态',
      'docker ps': '查看运行中的容器',
      'npm install': '安装依赖包'
    }
    return descriptions[command] || ''
  }
  
  // 获取命令图标
  const getCommandIcon = (command) => {
    if (command.startsWith('git')) return '🔀'
    if (command.startsWith('docker')) return '🐳'
    if (command.startsWith('npm')) return '📦'
    return '⚡'
  }
  
  // 选择建议
  const selectSuggestion = (index) => {
    if (index >= 0 && index < suggestions.value.length) {
      selectedIndex.value = index
      return suggestions.value[index]
    }
    return null
  }
  
  // 选择下一个建议
  const selectNext = () => {
    if (selectedIndex.value < suggestions.value.length - 1) {
      selectedIndex.value++
    } else {
      selectedIndex.value = 0 // 循环到第一个
    }
    return suggestions.value[selectedIndex.value]
  }
  
  // 选择上一个建议
  const selectPrevious = () => {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    } else {
      selectedIndex.value = suggestions.value.length - 1 // 循环到最后一个
    }
    return suggestions.value[selectedIndex.value]
  }
  
  // 隐藏建议
  const hideSuggestions = () => {
    isVisible.value = false
    selectedIndex.value = -1
  }
  
  // 清除建议
  const clearSuggestions = () => {
    suggestions.value = []
    isVisible.value = false
    selectedIndex.value = -1
    isLoading.value = false
  }
  
  // 应用建议
  const applySuggestion = (suggestion, input, cursorPosition) => {
    if (!suggestion) return input
    
    // 根据建议类型应用不同的逻辑
    switch (suggestion.type) {
      case SUGGESTION_TYPES.FILE_PATH:
      case SUGGESTION_TYPES.DIRECTORY:
        return applyFileSuggestion(suggestion.text, input, cursorPosition)
      default:
        return suggestion.text
    }
  }
  
  // 应用文件建议
  const applyFileSuggestion = (suggestion, input, cursorPosition) => {
    const parts = input.split(' ')
    parts[parts.length - 1] = suggestion
    return parts.join(' ')
  }
  
  return {
    suggestions,
    selectedIndex,
    isVisible,
    isLoading,
    getSuggestions,
    debouncedGetSuggestions,
    selectSuggestion,
    selectNext,
    selectPrevious,
    hideSuggestions,
    clearSuggestions,
    applySuggestion,
    SUGGESTION_TYPES
  }
}