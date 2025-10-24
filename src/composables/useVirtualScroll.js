import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 虚拟滚动 Composable
export function useVirtualScroll(options = {}) {
  const {
    itemHeight = 20, // 每行高度
    containerHeight = 400, // 容器高度
    overscan = 5, // 预渲染的额外行数
    bufferSize = 1000 // 缓冲区大小
  } = options
  
  // 状态
  const containerRef = ref(null)
  const scrollTop = ref(0)
  const items = ref([])
  const isScrolling = ref(false)
  let scrollTimeout = null
  
  // 计算可见区域
  const visibleCount = computed(() => Math.ceil(containerHeight / itemHeight))
  const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan))
  const endIndex = computed(() => Math.min(items.value.length, startIndex.value + visibleCount.value + overscan * 2))
  
  // 可见项目
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value).map((item, index) => ({
      ...item,
      index: startIndex.value + index,
      top: (startIndex.value + index) * itemHeight
    }))
  })
  
  // 容器总高度
  const totalHeight = computed(() => items.value.length * itemHeight)
  
  // 处理滚动
  const handleScroll = (event) => {
    const newScrollTop = event.target.scrollTop
    scrollTop.value = newScrollTop
    
    // 标记正在滚动
    isScrolling.value = true
    
    // 清除之前的超时
    clearTimeout(scrollTimeout)
    
    // 滚动结束后重置状态
    scrollTimeout = setTimeout(() => {
      isScrolling.value = false
    }, 150)
  }
  
  // 滚动到指定项目
  const scrollToItem = (index) => {
    if (containerRef.value) {
      const targetScrollTop = index * itemHeight
      containerRef.value.scrollTop = targetScrollTop
      scrollTop.value = targetScrollTop
    }
  }
  
  // 滚动到底部
  const scrollToBottom = () => {
    if (containerRef.value) {
      const targetScrollTop = totalHeight.value - containerHeight
      containerRef.value.scrollTop = targetScrollTop
      scrollTop.value = targetScrollTop
    }
  }
  
  // 添加项目
  const addItems = (newItems) => {
    // 限制缓冲区大小
    if (items.value.length > bufferSize) {
      const removeCount = items.value.length - bufferSize
      items.value.splice(0, removeCount)
    }
    
    items.value.push(...newItems)
    
    // 如果在底部，自动滚动
    if (isNearBottom()) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  }
  
  // 清空项目
  const clearItems = () => {
    items.value = []
    scrollTop.value = 0
  }
  
  // 检查是否接近底部
  const isNearBottom = (threshold = 50) => {
    if (!containerRef.value) return false
    const distanceFromBottom = totalHeight.value - containerHeight - scrollTop.value
    return distanceFromBottom <= threshold
  }
  
  // 获取指定索引的项目
  const getItemAtIndex = (index) => {
    return items.value[index]
  }
  
  // 更新项目
  const updateItem = (index, updates) => {
    if (index >= 0 && index < items.value.length) {
      Object.assign(items.value[index], updates)
    }
  }
  
  // 清理
  onUnmounted(() => {
    clearTimeout(scrollTimeout)
  })
  
  return {
    containerRef,
    items,
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    isScrolling,
    handleScroll,
    scrollToItem,
    scrollToBottom,
    addItems,
    clearItems,
    isNearBottom,
    getItemAtIndex,
    updateItem
  }
}

// 终端虚拟滚动专用
export function useTerminalVirtualScroll(options = {}) {
  const {
    maxLines = 10000,
    lineHeight = 20,
    containerHeight = 400
  } = options
  
  const virtualScroll = useVirtualScroll({
    itemHeight: lineHeight,
    containerHeight,
    overscan: 10,
    bufferSize: maxLines
  })
  
  // 终端行处理
  const processTerminalLine = (line) => {
    return {
      id: Date.now() + Math.random(),
      content: line,
      timestamp: new Date(),
      type: detectLineType(line)
    }
  }
  
  // 检测行类型
  const detectLineType = (line) => {
    if (line.includes('ERROR') || line.includes('错误')) return 'error'
    if (line.includes('WARNING') || line.includes('警告')) return 'warning'
    if (line.includes('SUCCESS') || line.includes('成功')) return 'success'
    if (line.includes('$') || line.includes('%')) return 'prompt'
    return 'normal'
  }
  
  // 添加终端输出
  const addTerminalOutput = (output) => {
    const lines = output.split('\n').filter(line => line.length > 0)
    const processedLines = lines.map(processTerminalLine)
    virtualScroll.addItems(processedLines)
  }
  
  // 获取行样式类
  const getLineClass = (line) => {
    const baseClass = 'terminal-line'
    const typeClass = `terminal-line--${line.type}`
    return `${baseClass} ${typeClass}`
  }
  
  return {
    ...virtualScroll,
    addTerminalOutput,
    getLineClass,
    processTerminalLine
  }
}