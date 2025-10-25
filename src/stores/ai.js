import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import OpenAI from 'openai'

// ===========================
// AI 服务商配置
// ===========================

export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI 官方',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',  // 默认模型
    requiresKey: true,
    keyPlaceholder: 'sk-proj-...',
    docs: 'https://platform.openai.com'
  },
  azure: {
    name: 'Azure OpenAI',
    endpoint: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
    defaultModel: 'gpt-4',
    requiresKey: true,
    keyPlaceholder: 'your-azure-api-key',
    docs: 'https://portal.azure.com'
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    docs: 'https://platform.deepseek.com'
  },
  zhipu: {
    name: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4',
    requiresKey: true,
    keyPlaceholder: 'your-api-key',
    docs: 'https://open.bigmodel.cn'
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    endpoint: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    docs: 'https://platform.moonshot.cn'
  },
  qwen: {
    name: '通义千问',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    docs: 'https://dashscope.console.aliyun.com'
  },
  yi: {
    name: '零一万物',
    endpoint: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-lightning',
    requiresKey: true,
    keyPlaceholder: 'your-api-key',
    docs: 'https://platform.lingyiwanwu.com'
  },
  ollama: {
    name: 'Ollama (本地)',
    endpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    requiresKey: false,
    keyPlaceholder: '本地服务无需 API Key',
    docs: 'https://ollama.ai'
  },
  custom: {
    name: '自定义服务',
    endpoint: '',
    defaultModel: '',
    requiresKey: true,
    keyPlaceholder: '根据服务商要求填写',
    docs: ''
  }
}

// ===========================
// Pinia Store
// ===========================

export const useAIStore = defineStore('ai', () => {
  // ----- 配置状态 -----
  const provider = ref(localStorage.getItem('ai-provider') || 'openai')
  const apiKey = ref(localStorage.getItem('ai-api-key') || '')
  const apiEndpoint = ref(localStorage.getItem('ai-endpoint') || AI_PROVIDERS.openai.endpoint)
  const model = ref(localStorage.getItem('ai-model') || 'gpt-4o-mini')
  const enabled = ref(localStorage.getItem('ai-enabled') !== 'false')
  
  // ----- 运行时状态 -----
  const chatMessages = ref([])
  const isGenerating = ref(false)
  
  // ----- 统计信息 -----
  const stats = ref({
    totalCalls: 0,
    successCalls: 0,
    failedCalls: 0,
    totalTokens: 0
  })

  // ----- OpenAI 客户端实例 -----
  let client = null

  // ----- Computed -----
  
  // 当前服务商配置
  const currentProvider = computed(() => AI_PROVIDERS[provider.value] || AI_PROVIDERS.openai)
  
  // 是否配置完成
  const isConfigured = computed(() => {
    if (!enabled.value) return false
    if (currentProvider.value.requiresKey && !apiKey.value) return false
    return !!apiEndpoint.value && !!model.value
  })

  // ----- 核心方法 -----

  /**
   * 获取或创建 OpenAI 客户端
   */
  function getClient() {
    // 如果配置未改变，复用客户端
    if (client) return client
    
    // 创建新客户端
    const config = {
      baseURL: apiEndpoint.value,
      dangerouslyAllowBrowser: true  // 允许在浏览器中使用
    }
    
    // 如果需要 API Key
    if (currentProvider.value.requiresKey && apiKey.value) {
      config.apiKey = apiKey.value
    }
    
    client = new OpenAI(config)
    return client
  }

  /**
   * 重置客户端（配置变更时调用）
   */
  function resetClient() {
    client = null
  }

  /**
   * 保存配置
   */
  function saveConfig() {
    localStorage.setItem('ai-provider', provider.value)
    localStorage.setItem('ai-api-key', apiKey.value)
    localStorage.setItem('ai-endpoint', apiEndpoint.value)
    localStorage.setItem('ai-model', model.value)
    localStorage.setItem('ai-enabled', String(enabled.value))
    resetClient()  // 配置变更后重置客户端
  }

  /**
   * 切换服务商
   */
  function switchProvider(newProvider) {
    provider.value = newProvider
    const config = AI_PROVIDERS[newProvider]
    
    // 自动更新 endpoint 和 model
    apiEndpoint.value = config.endpoint
    model.value = config.defaultModel || 'gpt-4o-mini'
    
    saveConfig()
  }

  // ----- AI 核心功能 -----

  /**
   * 调用 AI（统一接口）
   * @param {Array} messages - 消息数组
   * @param {Object} options - 可选参数
   * @returns {Promise<Object>} AI 响应
   */
  async function callAI(messages, options = {}) {
    if (!isConfigured.value) {
      throw new Error('AI 未配置，请先在设置中配置 API Key 和模型')
    }

    const {
      stream = false,
      onStream = null,
      temperature = 0.7,
      maxTokens = 2000,
      model: customModel = model.value
    } = options

    try {
      isGenerating.value = true
      stats.value.totalCalls++

      const openai = getClient()
      
      const requestParams = {
        model: customModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream
      }

      // 流式输出
      if (stream && onStream) {
        const streamResponse = await openai.chat.completions.create(requestParams)
        let fullContent = ''
        
        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta?.content || ''
          if (delta) {
            fullContent += delta
            onStream(delta, fullContent)
          }
        }
        
        stats.value.successCalls++
        return fullContent
      }
      
      // 非流式输出
      const response = await openai.chat.completions.create(requestParams)
      
      stats.value.successCalls++
      if (response.usage) {
        stats.value.totalTokens += response.usage.total_tokens
      }
      
      return response.choices[0].message.content
      
    } catch (error) {
      stats.value.failedCalls++
      console.error('AI 调用失败:', error)
      throw new Error(error.message || 'AI 调用失败')
    } finally {
      isGenerating.value = false
    }
  }

  // ----- 应用级 AI 功能 -----

  /**
   * 1. 命令生成 / AI 对话
   */
  async function generateCommand(description, options = {}) {
    const messages = [
      {
        role: 'system',
        content: `你是一个专业、友好的命令行助手。

**你的能力：**
1. 回答命令相关问题，提供清晰的解释
2. 生成准确的 Shell 命令
3. 诊断错误并提供解决方案
4. 分析项目结构和代码

**回答要求：**
- 如果是简单命令请求，直接返回命令（一行或多行用 && 连接）
- 如果是复杂问题，提供清晰的结构化回答：
  * 使用 Markdown 格式（标题、列表、代码块）
  * 代码用 \`\`\` 包裹
  * 关键概念用 \`code\` 高亮
- 保持简洁，重点突出
- 对危险操作要提醒用户`
      },
      {
        role: 'user',
        content: description
      }
    ]

    return await callAI(messages, {
      stream: true,  // 默认开启流式输出
      temperature: 0.7,
      maxTokens: 2000,
      ...options
    })
  }

  /**
   * 2. 错误诊断
   */
  async function diagnoseError(errorMessage, context = '') {
    const messages = [
      {
        role: 'system',
        content: `你是一个专业的错误诊断专家。分析错误信息并提供解决方案。
返回格式：
1. 错误原因（简短）
2. 解决方案（具体步骤）
3. 预防建议（可选）`
      },
      {
        role: 'user',
        content: `错误信息：\n${errorMessage}\n\n上下文：\n${context}`
      }
    ]

    return await callAI(messages, {
      temperature: 0.5,
      maxTokens: 1000
    })
  }

  /**
   * 3. 日志分析
   */
  async function analyzeLogs(logs) {
    const messages = [
      {
        role: 'system',
        content: `你是一个日志分析专家。分析日志并提取关键信息。
重点关注：
1. 错误和警告
2. 性能问题
3. 异常模式
4. 优化建议`
      },
      {
        role: 'user',
        content: `请分析以下日志：\n\n${logs.substring(0, 4000)}`
      }
    ]

    return await callAI(messages, {
      temperature: 0.4,
      maxTokens: 1500
    })
  }

  /**
   * 4. 工作流推荐
   */
  async function recommendWorkflow(projectInfo) {
    const messages = [
      {
        role: 'system',
        content: `你是一个项目工作流专家。根据项目信息推荐合适的工作流。
返回格式：
1. 推荐的工作流名称
2. 包含的任务列表
3. 适用场景说明`
      },
      {
        role: 'user',
        content: `项目信息：\n${JSON.stringify(projectInfo, null, 2)}`
      }
    ]

    return await callAI(messages, {
      temperature: 0.6,
      maxTokens: 1000
    })
  }

  /**
   * 5. 聊天对话
   */
  async function chat(userMessage, options = {}) {
    // 添加用户消息
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    chatMessages.value.push(userMsg)

    // 构建消息历史（最近 10 条）
    const messages = chatMessages.value
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }))

    try {
      // AI 临时消息（用于流式更新）
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      chatMessages.value.push(assistantMsg)

      // 获取消息在数组中的索引
      const msgIndex = chatMessages.value.length - 1

      // 调用 AI（支持流式）
      const content = await callAI(messages, {
        stream: true,
        onStream: (delta, fullContent) => {
          // 直接更新数组中的对象属性以触发响应式
          chatMessages.value[msgIndex].content = fullContent
          if (options.onStream) {
            options.onStream(delta, fullContent)
          }
        },
        temperature: 0.7,
        maxTokens: 2000
      })

      chatMessages.value[msgIndex].content = content
      return chatMessages.value[msgIndex]

    } catch (error) {
      // 移除临时消息
      chatMessages.value.pop()
      
      // 添加错误消息
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ 抱歉，AI 调用失败：${error.message}`,
        timestamp: new Date(),
        isError: true
      }
      chatMessages.value.push(errorMsg)
      throw error
    }
  }

  /**
   * 6. 智能任务执行（AI Agent 模式）
   */
  async function executeIntelligentTask(description, workingDir, executeCommand) {
    // 检测任务类型
    const isProjectAnalysis = /熟悉|了解|分析|查看|理解/.test(description) && /项目|代码|这个/.test(description)
    const isCodeModification = /修改|添加|删除|重构/.test(description)
    
    console.log('🔍 任务分析:', { description, isProjectAnalysis, isCodeModification, hasExecuteCommand: !!executeCommand })
    
    if (isProjectAnalysis && executeCommand) {
      return await analyzeProjectWithCommands(workingDir, executeCommand)
    } else if (isCodeModification) {
      return await modifyCode(description, workingDir, executeCommand)
    } else {
      return await generateCommand(description)
    }
  }

  /**
   * 通过终端命令分析项目（新方法）
   */
  async function analyzeProjectWithCommands(workingDir, executeCommand) {
    try {
      // 精简命令列表（快速响应）
      const commands = [
        { cmd: 'ls -la', purpose: '查看目录结构' },
        { cmd: 'cat README.md 2>/dev/null || cat readme.md 2>/dev/null || echo "无README文件"', purpose: '读取项目说明' },
        { cmd: 'cat package.json 2>/dev/null || echo "无package.json"', purpose: '读取配置文件' }
      ]

      // 执行命令收集信息
      const commandResults = []
      for (const { cmd, purpose } of commands) {
        try {
          const output = await executeCommand(cmd, purpose)
          commandResults.push({
            command: cmd,
            purpose,
            output: output.substring(0, 3000) // 限制输出长度
          })
        } catch (error) {
          commandResults.push({
            command: cmd,
            purpose,
            output: `执行失败: ${error.message}`
          })
        }
      }

      // Step 3: AI 分析收集到的信息（精简提示词）
      const analysisPrompt = `基于以下信息，快速分析这个项目：

${commandResults.map(r => `**${r.purpose}:**
\`\`\`
${r.output}
\`\`\`
`).join('\n')}

请简洁地回答：
1. **项目类型**：是什么类型的项目？
2. **技术栈**：使用了哪些主要技术？
3. **主要功能**：核心功能是什么？
4. **快速上手**：如何开始使用/开发？

用 Markdown 格式，保持简洁。`

      const analysisMessages = [
        {
          role: 'system',
          content: '你是一个专业的代码分析专家，擅长快速理解项目结构和技术栈。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ]
      
      const analysis = await callAI(analysisMessages, {
        temperature: 0.3,
        maxTokens: 3000
      })
      
      return {
        type: 'project_analysis',
        analysis,
        commandResults
      }
      
    } catch (error) {
      throw new Error(`项目分析失败: ${error.message}`)
    }
  }

  /**
   * 代码修改
   */
  async function modifyCode(description, workingDir, onProgress) {
    // 简洁模式：不显示冗余的进度提示
    // onProgress?.('🤖 AI 正在生成代码修改方案...')
    
    const messages = [
      {
        role: 'system',
        content: `你是一个代码修改助手。用户会描述需要的修改，你需要：
1. 确定需要修改哪些文件
2. 生成具体的代码修改
3. 返回 JSON 格式：
{
  "files": [
    {
      "path": "文件路径",
      "action": "create|modify|delete",
      "content": "新内容（如果是 create 或 modify）"
    }
  ],
  "explanation": "修改说明"
}`
      },
      {
        role: 'user',
        content: `工作目录: ${workingDir}\n需求: ${description}`
      }
    ]
    
    const content = await callAI(messages, {
      temperature: 0.2,
      maxTokens: 2000
    })
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误')
    }
    
    const plan = JSON.parse(jsonMatch[0])
    
    return {
      type: 'code_modification',
      plan
    }
  }

  // ----- 辅助功能 -----

  /**
   * 获取可用模型列表（动态从 API 获取）
   */
  async function fetchAvailableModels() {
    if (!isConfigured.value) {
      console.warn('AI 未配置，返回默认模型')
      return [{ id: currentProvider.value.defaultModel, name: currentProvider.value.defaultModel }]
    }

    try {
      const openai = getClient()
      
      // 调用 /models 端点
      const response = await openai.models.list()
      
      // 提取模型列表
      const models = response.data
        .filter(m => {
          // 过滤出聊天模型（通常包含 gpt, chat, turbo 等关键词）
          const modelId = m.id.toLowerCase()
          return modelId.includes('gpt') || 
                 modelId.includes('chat') || 
                 modelId.includes('turbo') ||
                 modelId.includes('deepseek') ||
                 modelId.includes('glm') ||
                 modelId.includes('moonshot') ||
                 modelId.includes('qwen') ||
                 modelId.includes('yi') ||
                 modelId.includes('llama') ||
                 modelId.includes('mistral')
        })
        .map(m => ({
          id: m.id,
          name: m.id,
          created: m.created,
          owned_by: m.owned_by
        }))
        .sort((a, b) => {
          // 按创建时间倒序（最新的在前）
          return (b.created || 0) - (a.created || 0)
        })
      
      if (models.length === 0) {
        console.warn('未找到可用模型，返回默认模型')
        return [{ id: currentProvider.value.defaultModel, name: currentProvider.value.defaultModel }]
      }
      
      return models
      
    } catch (error) {
      console.warn('获取模型列表失败:', error.message)
      // 返回默认模型作为后备
      return [{ id: currentProvider.value.defaultModel, name: currentProvider.value.defaultModel }]
    }
  }

  /**
   * 清空聊天历史
   */
  function clearChat() {
    chatMessages.value = []
  }

  /**
   * 重置统计
   */
  function resetStats() {
    stats.value = {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      totalTokens: 0
    }
  }

  // ----- 导出 -----

  return {
    // 配置
    provider,
    apiKey,
    apiEndpoint,
    model,
    enabled,
    isConfigured,
    currentProvider,
    saveConfig,
    switchProvider,
    
    // 状态
    isGenerating,
    chatMessages,
    stats,
    
    // 核心 AI 功能
    callAI,
    generateCommand,
    diagnoseError,
    analyzeLogs,
    recommendWorkflow,
    chat,
    executeIntelligentTask,
    
    // 辅助功能
    fetchAvailableModels,
    clearChat,
    resetStats
  }
})
