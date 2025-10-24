import { ref, nextTick } from 'vue'

// 打字机效果 Composable
export function useTypewriter(options = {}) {
  const {
    speed = 30, // 打字速度（毫秒/字符）
    startDelay = 0, // 开始延迟
    endDelay = 0, // 结束延迟
    showCursor = true, // 显示光标
    cursorChar = '|', // 光标字符
    variance = 10 // 速度变化范围
  } = options
  
  // 状态
  const isTyping = ref(false)
  const currentText = ref('')
  const currentIndex = ref(0)
  const showCursorChar = ref(showCursor)
  let typeTimeout = null
  let cursorTimeout = null
  
  // 开始打字
  const type = async (text, options = {}) => {
    const {
      onComplete = () => {},
      onProgress = () => {},
      customSpeed = speed
    } = options
    
    // 重置状态
    currentText.value = ''
    currentIndex.value = 0
    isTyping.value = true
    showCursorChar.value = true
    
    // 开始延迟
    if (startDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, startDelay))
    }
    
    // 逐字符显示
    for (let i = 0; i < text.length; i++) {
      if (!isTyping.value) break // 可以被中断
      
      currentText.value = text.substring(0, i + 1)
      currentIndex.value = i + 1
      
      // 进度回调
      onProgress(currentText.value, i + 1, text.length)
      
      // 随机速度变化
      const varianceDelay = Math.random() * variance - variance / 2
      const delay = customSpeed + varianceDelay
      
      await new Promise(resolve => {
        typeTimeout = setTimeout(resolve, Math.max(10, delay))
      })
    }
    
    // 结束延迟
    if (endDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, endDelay))
    }
    
    isTyping.value = false
    onComplete(currentText.value)
  }
  
  // 停止打字
  const stop = () => {
    isTyping.value = false
    if (typeTimeout) {
      clearTimeout(typeTimeout)
      typeTimeout = null
    }
  }
  
  // 立即完成
  const complete = (text) => {
    stop()
    currentText.value = text
    currentIndex.value = text.length
    isTyping.value = false
  }
  
  // 光标闪烁
  const startCursorBlink = () => {
    if (cursorTimeout) {
      clearInterval(cursorTimeout)
    }
    
    cursorTimeout = setInterval(() => {
      showCursorChar.value = !showCursorChar.value
    }, 500)
  }
  
  const stopCursorBlink = () => {
    if (cursorTimeout) {
      clearInterval(cursorTimeout)
      cursorTimeout = null
    }
    showCursorChar.value = false
  }
  
  // 清理
  const cleanup = () => {
    stop()
    stopCursorBlink()
  }
  
  return {
    isTyping,
    currentText,
    currentIndex,
    showCursorChar,
    cursorChar,
    type,
    stop,
    complete,
    startCursorBlink,
    stopCursorBlink,
    cleanup
  }
}

// 流式响应处理
export function useStreamingResponse(options = {}) {
  const {
    onChunk = () => {},
    onComplete = () => {},
    onError = () => {}
  } = options
  
  const typewriter = useTypewriter()
  const isStreaming = ref(false)
  const buffer = ref('')
  
  // 处理流式数据
  const processStream = async (stream) => {
    isStreaming.value = true
    buffer.value = ''
    
    try {
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        buffer.value += chunk
        
        // 更新打字机效果
        typewriter.complete(buffer.value)
        
        // 调用块处理回调
        onChunk(chunk, buffer.value)
      }
      
      isStreaming.value = false
      onComplete(buffer.value)
      
    } catch (error) {
      isStreaming.value = false
      onError(error)
    }
  }
  
  // 处理文本流（模拟）
  const processTextStream = async (text, chunkSize = 2) => {
    isStreaming.value = true
    buffer.value = ''
    
    try {
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.substring(i, i + chunkSize)
        buffer.value += chunk
        
        // 使用打字机效果显示
        typewriter.complete(buffer.value)
        
        onChunk(chunk, buffer.value)
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      isStreaming.value = false
      onComplete(buffer.value)
      
    } catch (error) {
      isStreaming.value = false
      onError(error)
    }
  }
  
  return {
    ...typewriter,
    isStreaming,
    buffer,
    processStream,
    processTextStream
  }
}

// AI 聊天增强
export function useAIChatEnhancer(options = {}) {
  const {
    apiUrl = '/api/chat',
    model = 'gpt-4',
    maxTokens = 2000
  } = options
  
  const streamingResponse = useStreamingResponse()
  const messages = ref([])
  const isLoading = ref(false)
  
  // 发送消息
  const sendMessage = async (content, options = {}) => {
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    
    messages.value.push(userMessage)
    isLoading.value = true
    
    try {
      // 添加临时助手消息
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }
      
      messages.value.push(assistantMessage)
      
      // 调用 AI API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.value.slice(-10), // 最近10条消息
          model,
          maxTokens,
          stream: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 处理流式响应
      await streamingResponse.processStream(response.body)
      
      // 更新助手消息
      assistantMessage.content = streamingResponse.buffer.value
      assistantMessage.isStreaming = false
      
    } catch (error) {
      console.error('AI 聊天错误:', error)
      
      // 添加错误消息
      const errorMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: `抱歉，发生了错误：${error.message}`,
        timestamp: new Date(),
        isError: true
      }
      
      // 移除流式消息并添加错误消息
      if (messages.value[messages.value.length - 1]?.isStreaming) {
        messages.value.pop()
      }
      
      messages.value.push(errorMessage)
    } finally {
      isLoading.value = false
    }
  }
  
  // 清空聊天
  const clearChat = () => {
    messages.value = []
    streamingResponse.cleanup()
  }
  
  // 重试消息
  const retryMessage = async (messageIndex) => {
    const message = messages.value[messageIndex]
    if (message && message.role === 'user') {
      // 移除后续消息
      messages.value = messages.value.slice(0, messageIndex)
      // 重新发送
      await sendMessage(message.content)
    }
  }
  
  return {
    messages,
    isLoading,
    isStreaming: streamingResponse.isStreaming,
    currentText: streamingResponse.currentText,
    sendMessage,
    clearChat,
    retryMessage,
    cleanup: streamingResponse.cleanup
  }
}