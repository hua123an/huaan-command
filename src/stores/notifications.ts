import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification, NotificationAction } from '../types'

export const useNotificationStore = defineStore('notifications', () => {
  // 状态
  const notifications = ref<Notification[]>([])
  const maxNotifications = ref(5)
  const defaultDuration = ref(5000)

  // 计算属性
  const activeNotifications = computed(() => 
    notifications.value.filter(n => !n.persistent || Date.now() - n.timestamp < (n.duration || defaultDuration.value))
  )

  const hasNotifications = computed(() => notifications.value.length > 0)

  const notificationsByType = computed(() => {
    const grouped: Record<string, Notification[]> = {}
    notifications.value.forEach(notification => {
      if (!grouped[notification.type]) {
        grouped[notification.type] = []
      }
      grouped[notification.type].push(notification)
    })
    return grouped
  })

  // 方法
  const showNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> => {
    const id = generateId()
    const newNotification: Notification = {
      id,
      timestamp: Date.now(),
      duration: notification.duration || defaultDuration.value,
      ...notification
    }

    notifications.value.push(newNotification)

    // 限制通知数量
    if (notifications.value.length > maxNotifications.value) {
      notifications.value.shift()
    }

    // 自动移除非持久化通知
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  const removeNotification = (id: string): boolean => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
      return true
    }
    return false
  }

  const clearAll = (): void => {
    notifications.value = []
  }

  const clearByType = (type: Notification['type']): void => {
    notifications.value = notifications.value.filter(n => n.type !== type)
  }

  // 便捷方法
  const showSuccess = (message: string, title = '成功', options: Partial<Notification> = {}) => {
    return showNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }

  const showError = (message: string, title = '错误', options: Partial<Notification> = {}) => {
    return showNotification({
      type: 'error',
      title,
      message,
      persistent: true, // 错误通知默认持久化
      ...options
    })
  }

  const showWarning = (message: string, title = '警告', options: Partial<Notification> = {}) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  const showInfo = (message: string, title = '信息', options: Partial<Notification> = {}) => {
    return showNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  return {
    // 状态
    notifications: readonly(notifications),
    maxNotifications,
    defaultDuration,
    
    // 计算属性
    activeNotifications,
    hasNotifications,
    notificationsByType,
    
    // 方法
    showNotification,
    removeNotification,
    clearAll,
    clearByType,
    
    // 便捷方法
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
})

// 工具函数
function generateId(): string {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function readonly<T>(ref: any) {
  return computed(() => ref.value)
}