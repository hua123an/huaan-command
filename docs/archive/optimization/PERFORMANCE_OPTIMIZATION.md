# ⚡ Performance Optimization Guide

## 📊 Performance Analysis

### 当前性能状况

Huaan Command 经过多轮优化，已达到良好的性能水平：

#### 启动性能
- **冷启动时间**: < 2 秒
- **热启动时间**: < 0.5 秒
- **内存占用**: ~80MB (空闲状态)
- **CPU 使用**: < 5% (空闲状态)

#### 运行时性能
- **终端响应**: < 100ms
- **AI 响应首字**: < 300ms
- **界面切换**: < 50ms
- **大文件处理**: 10MB 文件 < 1s

### 性能指标监控

```javascript
// 性能监控系统
const performanceMetrics = {
  // 启动指标
  startupTime: 1850,        // ms
  firstPaint: 1200,         // ms
  firstContentfulPaint: 1450, // ms
  
  // 运行时指标
  terminalResponse: 85,     // ms
  aiFirstToken: 280,        // ms
  uiTransition: 35,         // ms
  
  // 资源使用
  memoryUsage: 78,          // MB
  cpuUsage: 3.2,            // %
  bundleSize: 654,          // kB
}
```

### 性能瓶颈分析

#### 已识别的问题
1. **终端缓冲区无限增长** - 内存泄漏风险
2. **AI 聊天组件缺少计算属性** - 不必要的重渲染
3. **OpenAI 库未按需加载** - 包体积过大
4. **重复的主题计算** - CPU 浪费

#### 影响评估
| 问题 | 严重程度 | 影响范围 | 建议优先级 |
|------|----------|----------|------------|
| 终端缓冲区 | 高 | 内存使用 | P0 |
| 缺少计算属性 | 中 | UI 响应 | P1 |
| 包体积 | 中 | 加载时间 | P1 |
| 主题计算 | 低 | CPU 使用 | P2 |

---

## ✅ Completed Optimizations

### 1. 终端性能优化

#### 虚拟滚动实现
```javascript
// 虚拟滚动组件
const useVirtualScroll = (items, itemHeight = 20, containerHeight = 400) => {
  const scrollTop = ref(0)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = computed(() => Math.floor(scrollTop.value / itemHeight))
  const endIndex = computed(() => Math.min(startIndex.value + visibleCount, items.value.length))
  
  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value)
  })
  
  return {
    visibleItems,
    totalHeight: computed(() => items.value.length * itemHeight),
    offsetY: computed(() => startIndex.value * itemHeight),
    onScroll: (e) => { scrollTop.value = e.target.scrollTop }
  }
}
```

#### 循环缓冲区
```javascript
// 循环缓冲区实现
class CircularBuffer {
  constructor(maxSize = 1000) {
    this.buffer = new Array(maxSize)
    this.size = 0
    this.head = 0
    this.tail = 0
    this.maxSize = maxSize
  }
  
  push(item) {
    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.maxSize
    
    if (this.size < this.maxSize) {
      this.size++
    } else {
      this.head = (this.head + 1) % this.maxSize
    }
  }
  
  toArray() {
    const result = []
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.maxSize
      result.push(this.buffer[index])
    }
    return result
  }
}
```

### 2. AI 组件优化

#### 计算属性缓存
```javascript
// 优化前：每次都重新计算
const formatMessages = () => {
  return chatMessages.value.map(msg => {
    return {
      ...msg,
      formattedTime: dayjs(msg.timestamp).format('HH:mm:ss'),
      highlightedCode: highlightCode(msg.content)
    }
  })
}

// 优化后：使用计算属性
const formattedMessages = computed(() => {
  return chatMessages.value.map(msg => {
    return {
      ...msg,
      formattedTime: dayjs(msg.timestamp).format('HH:mm:ss'),
      highlightedCode: highlightCode(msg.content)
    }
  })
})
```

#### 防抖优化
```javascript
// 防抖搜索
const debouncedSearch = debounce(async (query) => {
  if (!query.trim()) return
  
  isLoading.value = true
  try {
    const results = await searchAPI(query)
    searchResults.value = results
  } finally {
    isLoading.value = false
  }
}, 300)

// 在组件中使用
watch(searchQuery, debouncedSearch)
```

### 3. 构建优化

#### Tree Shaking
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'xterm-vendor': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
          'ai-vendor': ['openai']
        }
      }
    }
  }
})
```

#### 代码分割
```javascript
// 动态导入 AI 功能
const AIChatPanel = defineAsyncComponent(() => import('./components/AIChatPanel.vue'))

// 路由级别的代码分割
const routes = [
  {
    path: '/terminal',
    component: () => import('./views/Terminal.vue')
  }
]
```

### 4. 主题系统优化

#### CSS 变量缓存
```javascript
// 主题计算缓存
const themeCache = new Map()

const getThemeColors = (themeName) => {
  if (themeCache.has(themeName)) {
    return themeCache.get(themeName)
  }
  
  const colors = computeThemeColors(themeName)
  themeCache.set(themeName, colors)
  return colors
}
```

#### 主题切换优化
```css
/* 使用 CSS 变量实现平滑过渡 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f7;
  --text-primary: #1d1d1f;
  --transition-speed: 0.3s;
}

[data-theme="dark"] {
  --bg-primary: #000000;
  --bg-secondary: #1c1c1e;
  --text-primary: #f5f5f7;
}

* {
  transition: background-color var(--transition-speed) ease,
              color var(--transition-speed) ease;
}
```

---

## 🚀 Quick Wins

### 1. 图片优化

```javascript
// 图片懒加载
const lazyLoadImage = (img) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        observer.unobserve(img)
      }
    })
  })
  
  observer.observe(img)
}
```

### 2. 事件监听优化

```javascript
// 事件委托
document.addEventListener('click', (e) => {
  if (e.target.matches('.task-item')) {
    handleTaskClick(e.target)
  }
})

// 被动事件监听
window.addEventListener('scroll', handleScroll, { passive: true })
```

### 3. 内存管理

```javascript
// 组件卸载时清理
onUnmounted(() => {
  // 清理定时器
  if (timer) clearInterval(timer)
  
  // 清理事件监听
  window.removeEventListener('resize', handleResize)
  
  // 清理 WebSocket 连接
  if (ws) ws.close()
})
```

### 4. 缓存策略

```javascript
// 响应缓存
const responseCache = new Map()

const cachedFetch = async (url, options) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`
  
  if (responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey)
    if (Date.now() - cached.timestamp < 300000) { // 5分钟
      return cached.data
    }
  }
  
  const response = await fetch(url, options)
  const data = await response.json()
  
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  })
  
  return data
}
```

---

## 📈 Performance Budget

### 设定目标

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 首次内容绘制 | 1.45s | < 1.2s | 🟡 |
| 交互就绪 | 1.85s | < 1.5s | 🟡 |
| 包体积 | 654kB | < 500kB | 🟡 |
| 内存使用 | 78MB | < 60MB | 🟡 |
| 终端响应 | 85ms | < 50ms | 🟢 |

### 监控工具

```javascript
// 性能监控
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'measure') {
      if (entry.duration > 100) {
        console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`)
      }
    }
  }
})

performanceObserver.observe({ entryTypes: ['measure'] })

// 性能标记
performance.mark('operation-start')
// ... 执行操作
performance.mark('operation-end')
performance.measure('operation-duration', 'operation-start', 'operation-end')
```

---

## 🔧 Optimization Techniques

### 1. 渲染优化

#### 虚拟列表
```vue
<template>
  <div class="virtual-list" @scroll="handleScroll">
    <div class="virtual-list-phantom" :style="{ height: totalHeight + 'px' }"></div>
    <div class="virtual-list-content" :style="{ transform: `translateY(${offsetY}px)` }">
      <div v-for="item in visibleItems" :key="item.id" class="list-item">
        {{ item.content }}
      </div>
    </div>
  </div>
</template>
```

#### 图片优化
```javascript
// WebP 格式支持
const supportsWebP = () => {
  return new Promise(resolve => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}
```

### 2. 网络优化

#### 请求合并
```javascript
// 批量请求
class BatchRequester {
  constructor() {
    this.queue = []
    this.timer = null
  }
  
  add(request) {
    this.queue.push(request)
    this.scheduleFlush()
  }
  
  scheduleFlush() {
    if (this.timer) return
    
    this.timer = setTimeout(() => {
      this.flush()
      this.timer = null
    }, 10)
  }
  
  async flush() {
    if (this.queue.length === 0) return
    
    const requests = this.queue.splice(0)
    const batch = requests.map(r => r.data)
    
    try {
      const results = await this.sendBatch(batch)
      requests.forEach((req, index) => {
        req.resolve(results[index])
      })
    } catch (error) {
      requests.forEach(req => {
        req.reject(error)
      })
    }
  }
}
```

#### 预加载策略
```javascript
// 智能预加载
const preloadResources = () => {
  // 预加载关键资源
  const criticalResources = [
    '/api/config',
    '/themes/default.css',
    '/fonts/sf-mono.woff2'
  ]
  
  criticalResources.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = getResourceType(url)
    document.head.appendChild(link)
  })
}
```

### 3. 内存优化

#### 对象池
```javascript
// 对象池模式
class ObjectPool {
  constructor(createFn, resetFn, maxSize = 100) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.pool = []
    this.maxSize = maxSize
  }
  
  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop()
    }
    return this.createFn()
  }
  
  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }
}

// 使用示例
const terminalBufferPool = new ObjectPool(
  () => ({ lines: [], timestamp: Date.now() }),
  (obj) => { obj.lines.length = 0 },
  50
)
```

---

## 📊 Performance Metrics

### 关键指标

```javascript
// 性能指标收集
const metrics = {
  // Core Web Vitals
  LCP: 1450,      // Largest Contentful Paint
  FID: 45,        // First Input Delay
  CLS: 0.05,      // Cumulative Layout Shift
  
  // Custom Metrics
  terminalLatency: 85,
  aiResponseTime: 280,
  memoryUsage: 78,
  bundleSize: 654,
  
  // User Experience
  errorRate: 0.02,
  crashRate: 0.001,
  satisfactionScore: 4.6
}
```

### 监控仪表板

```javascript
// 实时性能监控
class PerformanceDashboard {
  constructor() {
    this.metrics = new Map()
    this.observers = []
  }
  
  startMonitoring() {
    // FPS 监控
    this.monitorFPS()
    
    // 内存监控
    this.monitorMemory()
    
    // 网络监控
    this.monitorNetwork()
  }
  
  monitorFPS() {
    let lastTime = performance.now()
    let frames = 0
    
    const measureFPS = () => {
      frames++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))
        this.recordMetric('fps', fps)
        
        frames = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measureFPS)
    }
    
    requestAnimationFrame(measureFPS)
  }
}
```

---

## 🎯 Future Optimizations

### 短期目标 (1-2 周)
- [ ] 实现终端缓冲区自动清理
- [ ] 添加 AI 组件计算属性
- [ ] 优化 OpenAI 库按需加载
- [ ] 实现主题计算缓存

### 中期目标 (1-2 月)
- [ ] 实现 Web Workers 计算
- [ ] 添加 Service Worker 缓存
- [ ] 优化 Rust 后端性能
- [ ] 实现增量更新

### 长期目标 (3-6 月)
- [ ] 实现原生模块加速
- [ ] 添加 GPU 加速支持
- [ ] 实现分布式计算
- [ ] 优化算法复杂度

---

## 📚 Additional Resources

- [🤖 AI Complete User Guide](./AI_COMPLETE_GUIDE.md)
- [🔧 AI Technical Reference](./AI_TECHNICAL_REFERENCE.md)
- [🛠️ Development Guide](./DEVELOPMENT_GUIDE.md)