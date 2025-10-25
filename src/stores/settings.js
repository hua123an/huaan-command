import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref({
    theme: 'light', // 'dark' | 'light' | 'auto' - 默认使用浅色主题
    maxConcurrent: 10,
    enableNotifications: true,
    enableSound: true,
    soundVolume: 0.5,
    enableHistory: true,
    maxHistoryItems: 100,
  })

  // 从 localStorage 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('huaan-settings')
    if (saved) {
      try {
        Object.assign(settings.value, JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }

  // 保存设置到 localStorage
  function saveSettings() {
    localStorage.setItem('huaan-settings', JSON.stringify(settings.value))
  }

  // 更新设置
  function updateSetting(key, value) {
    settings.value[key] = value
    saveSettings()
  }

  // 重置设置
  function resetSettings() {
    settings.value = {
      theme: 'auto', // 默认跟随系统
      maxConcurrent: 10,
      enableNotifications: true,
      enableSound: true,
      soundVolume: 0.5,
      enableHistory: true,
      maxHistoryItems: 100,
    }
    saveSettings()
  }

  // 初始化时加载
  loadSettings()

  return {
    settings,
    updateSetting,
    resetSettings,
  }
})
