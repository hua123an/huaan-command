import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationsStore = defineStore('notifications', () => {
  const settings = ref({
    enabled: true,
    threshold: 5000, // 5秒
    sound: true,
    soundVolume: 0.5
  })

  const runningCommands = ref(new Map())

  // 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem('huaan-notifications')
      if (saved) {
        Object.assign(settings.value, JSON.parse(saved))
      }
    } catch (error) {
      console.error('加载通知设置失败:', error)
    }
  }

  // 保存设置
  function saveSettings() {
    try {
      localStorage.setItem('huaan-notifications', JSON.stringify(settings.value))
    } catch (error) {
      console.error('保存通知设置失败:', error)
    }
  }

  // 记录命令开始
  function startCommand(command, sessionId) {
    const id = `${sessionId}-${Date.now()}`
    runningCommands.value.set(id, {
      command,
      sessionId,
      startTime: Date.now()
    })
    return id
  }

  // 命令完成
  function completeCommand(id) {
    const cmd = runningCommands.value.get(id)
    if (cmd) {
      const duration = Date.now() - cmd.startTime
      runningCommands.value.delete(id)
      
      // 如果超过阈值，发送通知
      if (settings.value.enabled && duration >= settings.value.threshold) {
        sendNotification(cmd.command, duration)
      }
    }
  }

  // 发送 macOS 通知
  function sendNotification(command, duration) {
    if (!('Notification' in window)) return
    
    // 请求权限
    if (Notification.permission === 'granted') {
      showNotification(command, duration)
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          showNotification(command, duration)
        }
      })
    }
  }

  // 显示通知
  function showNotification(command, duration) {
    const notification = new Notification('命令执行完成', {
      body: `${command}\n耗时: ${(duration / 1000).toFixed(1)}秒`,
      icon: '/tauri.svg',
      tag: 'command-complete'
    })

    // 播放声音
    if (settings.value.sound) {
      playSound()
    }

    // 3秒后自动关闭
    setTimeout(() => notification.close(), 3000)
  }

  // 播放通知声音
  function playSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGnuLvx3JdAAA=')
      audio.volume = settings.value.soundVolume
      audio.play()
    } catch (error) {
      console.error('播放声音失败:', error)
    }
  }

  // 更新设置
  function updateSettings(newSettings) {
    Object.assign(settings.value, newSettings)
    saveSettings()
  }

  // 初始化
  loadSettings()

  return {
    settings,
    runningCommands,
    startCommand,
    completeCommand,
    sendNotification,
    updateSettings
  }
})

