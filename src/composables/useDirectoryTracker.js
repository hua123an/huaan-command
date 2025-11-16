import { ref, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

/**
 * 目录追踪 Composable
 * 使用后端接口 get_current_dir 获取可靠的工作目录
 *
 * @param {number} sessionId - 终端会话 ID
 * @returns {Object} { currentDir, updateCurrentDir, startTracking, stopTracking, isTracking }
 */
export function useDirectoryTracker(sessionId) {
  const currentDir = ref('~')
  const isTracking = ref(false)
  let trackingInterval = null

  /**
   * 从后端获取当前工作目录
   */
  const updateCurrentDir = async () => {
    try {
      const dir = await invoke('get_current_dir', { sessionId })

      if (dir && dir !== currentDir.value) {
        console.log(`📂 工作目录变更: ${currentDir.value} → ${dir}`)
        currentDir.value = dir
      }

      return dir
    } catch (error) {
      console.error('Failed to get current directory:', error)
      return currentDir.value
    }
  }

  /**
   * 开始自动追踪目录变化
   * @param {number} interval - 轮询间隔（毫秒）
   */
  const startTracking = (interval = 1000) => {
    if (isTracking.value) return

    isTracking.value = true

    // 立即更新一次
    updateCurrentDir()

    // 定期更新
    trackingInterval = setInterval(() => {
      updateCurrentDir()
    }, interval)

    console.log(`🔄 开始追踪目录变化 (间隔: ${interval}ms)`)
  }

  /**
   * 停止追踪
   */
  const stopTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval)
      trackingInterval = null
    }

    isTracking.value = false
    console.log('⏸️ 停止追踪目录变化')
  }

  /**
   * 组件卸载时自动停止追踪
   */
  onUnmounted(() => {
    stopTracking()
  })

  return {
    currentDir,
    updateCurrentDir,
    startTracking,
    stopTracking,
    isTracking
  }
}
