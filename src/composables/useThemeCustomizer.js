import { ref, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'

// 预设主题
export const PRESET_THEMES = {
  system: {
    name: '跟随系统',
    description: '自动跟随系统主题设置',
    isAuto: true
  },
  dark: {
    name: '深色模式',
    description: '适合夜间使用的深色主题',
    colors: {
      '--bg-primary': '#1c1c1e',
      '--bg-secondary': '#2c2c2e',
      '--bg-tertiary': '#3a3a3c',
      '--bg-hover': 'rgba(255, 255, 255, 0.08)',
      '--bg-active': 'rgba(255, 255, 255, 0.12)',
      '--text-primary': '#e4e4e7',
      '--text-secondary': '#8e8e93',
      '--text-tertiary': '#636366',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--border-hover': 'rgba(255, 255, 255, 0.15)',
      '--accent-color': '#0a84ff',
      '--accent-hover': '#409cff',
      '--success-color': '#32d74b',
      '--error-color': '#ff453a',
      '--warning-color': '#ffd60a'
    }
  },
  light: {
    name: '浅色模式',
    description: '适合白天使用的浅色主题',
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8f8fa',
      '--bg-tertiary': '#eeeff3',
      '--bg-hover': 'rgba(0, 0, 0, 0.05)',
      '--bg-active': 'rgba(0, 0, 0, 0.08)',
      '--text-primary': '#1d1d1f',
      '--text-secondary': '#86868b',
      '--text-tertiary': '#d1d1d6',
      '--border-color': 'rgba(0, 0, 0, 0.12)',
      '--border-hover': 'rgba(0, 0, 0, 0.2)',
      '--accent-color': '#007aff',
      '--accent-hover': '#0051d5',
      '--success-color': '#28cd41',
      '--error-color': '#ff3b30',
      '--warning-color': '#ff9500'
    }
  },
  ocean: {
    name: '海洋蓝',
    description: '清新的海洋蓝色主题',
    colors: {
      '--bg-primary': '#0a192f',
      '--bg-secondary': '#112240',
      '--bg-tertiary': '#1a365d',
      '--bg-hover': 'rgba(100, 255, 218, 0.1)',
      '--bg-active': 'rgba(100, 255, 218, 0.15)',
      '--text-primary': '#ccd6f6',
      '--text-secondary': '#8892b0',
      '--text-tertiary': '#64748b',
      '--border-color': 'rgba(100, 255, 218, 0.2)',
      '--border-hover': 'rgba(100, 255, 218, 0.3)',
      '--accent-color': '#64ffda',
      '--accent-hover': '#4ade80',
      '--success-color': '#4ade80',
      '--error-color': '#f87171',
      '--warning-color': '#fbbf24'
    }
  },
  forest: {
    name: '森林绿',
    description: '护眼的森林绿色主题',
    colors: {
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--bg-hover': 'rgba(34, 197, 94, 0.1)',
      '--bg-active': 'rgba(34, 197, 94, 0.15)',
      '--text-primary': '#f0f6fc',
      '--text-secondary': '#8b949e',
      '--text-tertiary': '#6e7681',
      '--border-color': 'rgba(34, 197, 94, 0.2)',
      '--border-hover': 'rgba(34, 197, 94, 0.3)',
      '--accent-color': '#22c55e',
      '--accent-hover': '#16a34a',
      '--success-color': '#22c55e',
      '--error-color': '#ef4444',
      '--warning-color': '#f59e0b'
    }
  },
  sunset: {
    name: '夕阳橙',
    description: '温暖的夕阳橙色主题',
    colors: {
      '--bg-primary': '#2d1b69',
      '--bg-secondary': '#3d2a7a',
      '--bg-tertiary': '#4d398b',
      '--bg-hover': 'rgba(251, 146, 60, 0.1)',
      '--bg-active': 'rgba(251, 146, 60, 0.15)',
      '--text-primary': '#f7f3ff',
      '--text-secondary': '#c4b5fd',
      '--text-tertiary': '#a78bfa',
      '--border-color': 'rgba(251, 146, 60, 0.2)',
      '--border-hover': 'rgba(251, 146, 60, 0.3)',
      '--accent-color': '#fb923c',
      '--accent-hover': '#f97316',
      '--success-color': '#22c55e',
      '--error-color': '#ef4444',
      '--warning-color': '#fbbf24'
    }
  }
}

// 主题自定义 Composable
export function useThemeCustomizer() {
  const settingsStore = useSettingsStore()
  
  // 状态
  const currentTheme = ref('system')
  const customColors = ref({})
  const isCustomizing = ref(false)
  const previewMode = ref(false)
  
  // 加载保存的主题设置
  const loadThemeSettings = () => {
    const saved = localStorage.getItem('huaan-custom-theme')
    if (saved) {
      try {
        const themeSettings = JSON.parse(saved)
        currentTheme.value = themeSettings.currentTheme || 'system'
        customColors.value = themeSettings.customColors || {}
      } catch (error) {
        console.error('加载主题设置失败:', error)
      }
    }
  }
  
  // 保存主题设置
  const saveThemeSettings = () => {
    const themeSettings = {
      currentTheme: currentTheme.value,
      customColors: customColors.value
    }
    localStorage.setItem('huaan-custom-theme', JSON.stringify(themeSettings))
  }
  
  // 应用主题
  const applyTheme = (themeName) => {
    const theme = PRESET_THEMES[themeName]
    if (!theme) return
    
    const root = document.documentElement
    
    if (theme.isAuto) {
      // 自动主题，使用系统设置
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const actualTheme = prefersDark ? 'dark' : 'light'
      applyPresetTheme(PRESET_THEMES[actualTheme])
    } else {
      // 预设主题
      applyPresetTheme(theme)
    }
    
    currentTheme.value = themeName
    settingsStore.updateSetting('theme', themeName)
    saveThemeSettings()
  }
  
  // 应用预设主题颜色
  const applyPresetTheme = (theme) => {
    if (!theme.colors) return
    
    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }
  
  // 应用自定义颜色
  const applyCustomColors = () => {
    const root = document.documentElement
    Object.entries(customColors.value).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }
  
  // 更新自定义颜色
  const updateCustomColor = (colorKey, colorValue) => {
    customColors.value[colorKey] = colorValue
    
    if (previewMode.value) {
      // 预览模式，立即应用
      const root = document.documentElement
      root.style.setProperty(colorKey, colorValue)
    }
    
    saveThemeSettings()
  }
  
  // 重置自定义颜色
  const resetCustomColors = () => {
    customColors.value = {}
    
    // 重新应用当前预设主题
    applyTheme(currentTheme.value)
    saveThemeSettings()
  }
  
  // 创建自定义主题
  const createCustomTheme = (themeName, themeColors) => {
    const customTheme = {
      name: themeName,
      description: '用户自定义主题',
      colors: { ...themeColors, ...customColors.value },
      isCustom: true
    }
    
    PRESET_THEMES[themeName] = customTheme
    return customTheme
  }
  
  // 删除自定义主题
  const deleteCustomTheme = (themeName) => {
    if (PRESET_THEMES[themeName]?.isCustom) {
      delete PRESET_THEMES[themeName]
      
      // 如果删除的是当前主题，切换到系统主题
      if (currentTheme.value === themeName) {
        applyTheme('system')
      }
    }
  }
  
  // 导出主题配置
  const exportTheme = () => {
    const themeConfig = {
      currentTheme: currentTheme.value,
      customColors: customColors.value,
      customThemes: Object.entries(PRESET_THEMES)
        .filter(([key, theme]) => theme.isCustom)
        .reduce((acc, [key, theme]) => {
          acc[key] = theme
          return acc
        }, {})
    }
    
    const blob = new Blob([JSON.stringify(themeConfig, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `huaan-theme-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // 导入主题配置
  const importTheme = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const themeConfig = JSON.parse(e.target.result)
          
          // 导入自定义颜色
          if (themeConfig.customColors) {
            customColors.value = themeConfig.customColors
          }
          
          // 导入自定义主题
          if (themeConfig.customThemes) {
            Object.entries(themeConfig.customThemes).forEach(([key, theme]) => {
              PRESET_THEMES[key] = { ...theme, isCustom: true }
            })
          }
          
          // 应用主题
          if (themeConfig.currentTheme) {
            applyTheme(themeConfig.currentTheme)
          }
          
          saveThemeSettings()
          resolve(themeConfig)
        } catch (error) {
          reject(new Error('主题配置文件格式错误'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('读取主题配置文件失败'))
      }
      
      reader.readAsText(file)
    })
  }
  
  // 获取可用的颜色变量
  const getColorVariables = () => {
    return [
      { key: '--bg-primary', name: '主背景色', description: '应用主要背景颜色' },
      { key: '--bg-secondary', name: '次要背景色', description: '卡片和面板背景颜色' },
      { key: '--bg-tertiary', name: '第三背景色', description: '输入框和控件背景颜色' },
      { key: '--text-primary', name: '主要文字色', description: '主要文本颜色' },
      { key: '--text-secondary', name: '次要文字色', description: '辅助文本颜色' },
      { key: '--accent-color', name: '强调色', description: '按钮和链接颜色' },
      { key: '--success-color', name: '成功色', description: '成功状态颜色' },
      { key: '--error-color', name: '错误色', description: '错误状态颜色' },
      { key: '--warning-color', name: '警告色', description: '警告状态颜色' },
      { key: '--border-color', name: '边框色', description: '边框和分割线颜色' }
    ]
  }
  
  // 预览主题
  const previewTheme = (themeName) => {
    previewMode.value = true
    applyTheme(themeName)
    
    // 5秒后自动取消预览
    setTimeout(() => {
      if (previewMode.value) {
        previewMode.value = false
        applyTheme(currentTheme.value)
      }
    }, 5000)
  }
  
  // 取消预览
  const cancelPreview = () => {
    previewMode.value = false
    applyTheme(currentTheme.value)
  }
  
  // 监听系统主题变化
  const watchSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    mediaQuery.addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        applyTheme('system')
      }
    })
  }
  
  // 初始化
  const init = () => {
    loadThemeSettings()
    applyTheme(currentTheme.value)
    watchSystemTheme()
  }
  
  // 监听自定义颜色变化
  watch(customColors, () => {
    if (currentTheme.value === 'custom') {
      applyCustomColors()
    }
  }, { deep: true })
  
  return {
    currentTheme,
    customColors,
    isCustomizing,
    previewMode,
    PRESET_THEMES,
    applyTheme,
    updateCustomColor,
    resetCustomColors,
    createCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    getColorVariables,
    previewTheme,
    cancelPreview,
    init
  }
}