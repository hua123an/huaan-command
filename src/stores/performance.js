import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePerformanceStore = defineStore('performance', () => {
  const cpuUsage = ref(0)
  const memoryUsage = ref({ used: 0, total: 0, percentage: 0 })
  const processes = ref([])
  const ports = ref([])
  const monitoring = ref(false)
  let monitoringInterval = null

  // 模拟获取 CPU 使用率（真实应用中需要通过 Tauri 调用系统 API）
  async function updateCPU() {
    // 这里需要通过 Tauri 的 API 获取真实数据
    // 暂时使用模拟数据
    cpuUsage.value = Math.random() * 100
  }

  // 模拟获取内存使用率
  async function updateMemory() {
    // 真实应用中需要调用系统 API
    const total = 16 * 1024 * 1024 * 1024 // 16GB
    const used = Math.random() * total
    memoryUsage.value = {
      used,
      total,
      percentage: (used / total) * 100
    }
  }

  // 解析 ps 命令输出获取进程列表
  function parseProcessList(output) {
    try {
      const lines = output.split('\n')
      const procs = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.split(/\s+/)
        if (parts.length >= 4) {
          procs.push({
            pid: parts[0],
            cpu: parseFloat(parts[1]) || 0,
            mem: parseFloat(parts[2]) || 0,
            command: parts.slice(3).join(' ')
          })
        }
      }
      
      return procs
    } catch (error) {
      console.error('解析进程列表失败:', error)
      return []
    }
  }

  // 更新进程列表
  function updateProcesses(output) {
    processes.value = parseProcessList(output)
  }

  // 解析 lsof 命令输出获取端口占用
  function parsePortList(output) {
    try {
      const lines = output.split('\n')
      const portList = []
      
      for (const line of lines) {
        const match = line.match(/:(\d+)\s+\(LISTEN\)/)
        if (match) {
          const port = parseInt(match[1])
          const parts = line.split(/\s+/)
          if (parts.length >= 2) {
            portList.push({
              port,
              pid: parts[1],
              process: parts[0]
            })
          }
        }
      }
      
      return portList
    } catch (error) {
      console.error('解析端口列表失败:', error)
      return []
    }
  }

  // 更新端口占用
  function updatePorts(output) {
    ports.value = parsePortList(output)
  }

  // 开始监控
  function startMonitoring() {
    if (monitoring.value) return
    
    monitoring.value = true
    
    // 立即更新一次
    updateCPU()
    updateMemory()
    
    // 每3秒更新一次
    monitoringInterval = setInterval(() => {
      updateCPU()
      updateMemory()
    }, 3000)
  }

  // 停止监控
  function stopMonitoring() {
    monitoring.value = false
    if (monitoringInterval) {
      clearInterval(monitoringInterval)
      monitoringInterval = null
    }
  }

  // 格式化字节
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }

  // 杀死进程
  function killProcess(pid, force = false) {
    const signal = force ? '-9' : '-15'
    return `kill ${signal} ${pid}`
  }

  // 杀死端口占用的进程
  function killPort(port) {
    return `lsof -ti:${port} | xargs kill -9`
  }

  return {
    cpuUsage,
    memoryUsage,
    processes,
    ports,
    monitoring,
    updateCPU,
    updateMemory,
    updateProcesses,
    updatePorts,
    startMonitoring,
    stopMonitoring,
    formatBytes,
    killProcess,
    killPort
  }
})

