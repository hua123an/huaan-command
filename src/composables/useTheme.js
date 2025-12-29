import { watch, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'

// 防抖函数
function debounce(fn, delay) {
  let timeoutId = null
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 主题定义 - iFlow风格
const themes = {
  dark: {
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
    '--warning-color': '#ffd60a',
    '--terminal-bg': '#1c1c1e',
    '--terminal-fg': '#e4e4e7',
    '--terminal-cursor': '#0a84ff',
    '--terminal-black': '#1c1c1e',
    '--terminal-red': '#ff453a',
    '--terminal-green': '#32d74b',
    '--terminal-yellow': '#ffd60a',
    '--terminal-blue': '#0a84ff',
    '--terminal-magenta': '#bf5af2',
    '--terminal-cyan': '#5ac8fa',
    '--terminal-white': '#e4e4e7',
  },
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f8f8fa',
    '--bg-tertiary': '#ffffff', // iFlow风格的纯白色
    '--bg-hover': 'rgba(0, 0, 0, 0.05)',
    '--bg-active': 'rgba(0, 0, 0, 0.08)',
    '--text-primary': '#1a1a1a', // iFlow风格的深黑色
    '--text-secondary': '#8e8e93', // 系统灰色
    '--text-tertiary': '#999999',
    '--border-color': '#e5e5e5', // iFlow风格的浅边框
    '--border-hover': 'rgba(0, 0, 0, 0.2)',
    '--accent-color': '#0071e3', // Apple蓝色
    '--accent-hover': '#005bb5',
    '--success-color': '#4caf50',
    '--error-color': '#ff453a',
    '--warning-color': '#ff9500',
    '--terminal-bg': '#ffffff', // iFlow风格的纯白终端背景
    '--terminal-fg': '#1a1a1a', // iFlow风格的深色文字
    '--terminal-cursor': '#1a1a1a', // iFlow风格的深色光标
    '--terminal-black': '#1a1a1a',
    '--terminal-red': '#ff453a',
    '--terminal-green': '#32d74b',
    '--terminal-yellow': '#ffd60a',
    '--terminal-blue': '#0071e3',
    '--terminal-magenta': '#bf5af2',
    '--terminal-cyan': '#5ac8fa',
    '--terminal-white': '#8e8e93',
  }
}

export function useTheme() {
  const settingsStore = useSettingsStore()

  // 应用主题到 DOM
  const applyTheme = (themeName) => {
    // 处理 auto 主题
    let actualTheme = themeName
    if (themeName === 'auto') {
      // 检测系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      actualTheme = prefersDark ? 'dark' : 'light'
    }

    const theme = themes[actualTheme] || themes.dark
    const root = document.documentElement

    // 添加过渡类以启用平滑过渡
    root.classList.add('theme-transitioning')
    
    // 应用 CSS 变量
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // 添加主题类
    root.setAttribute('data-theme', actualTheme)
    
    // 移除过渡类（过渡完成后）
    setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 300)
  }

  // 防抖的主题切换函数
  const debouncedApplyTheme = debounce(applyTheme, 150)

  // 监听主题变化
  const watchTheme = () => {
    watch(
      () => settingsStore.settings.theme,
      (newTheme) => {
        debouncedApplyTheme(newTheme)
      },
      { immediate: true }
    )

    // 监听系统主题变化（当设置为 auto 时）
    if (settingsStore.settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const debouncedHandleSystemChange = debounce(() => {
        if (settingsStore.settings.theme === 'auto') {
          applyTheme('auto')
        }
      }, 150)
      
      mediaQuery.addEventListener('change', debouncedHandleSystemChange)
      
      // 返回清理函数
      return () => {
        mediaQuery.removeEventListener('change', debouncedHandleSystemChange)
      }
    }
    
    return () => {}
  }

  // 初始化主题
  const initTheme = () => {
    applyTheme(settingsStore.settings.theme)
    watchTheme()
  }

  // 获取终端主题配置
  const getTerminalTheme = () => {
    // 处理 auto 主题
    let actualTheme = settingsStore.settings.theme
    if (actualTheme === 'auto') {
      // 检测系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      actualTheme = prefersDark ? 'dark' : 'light'
    }

    // 确保使用有效的主题
    actualTheme = actualTheme === 'light' ? 'light' : 'dark'
    const colors = themes[actualTheme]

    return {
      background: colors['--terminal-bg'],
      foreground: colors['--terminal-fg'],
      cursor: colors['--terminal-cursor'],
      cursorAccent: colors['--terminal-bg'],
      // 选中文本的高亮颜色
      selectionBackground: actualTheme === 'dark' ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 113, 227, 0.25)',
      selectionForeground: undefined, // 使用默认前景色
      black: colors['--terminal-black'],
      red: colors['--terminal-red'],
      green: colors['--terminal-green'],
      yellow: colors['--terminal-yellow'],
      blue: colors['--terminal-blue'],
      magenta: colors['--terminal-magenta'],
      cyan: colors['--terminal-cyan'],
      white: colors['--terminal-white'],
      brightBlack: '#636366',
      brightRed: '#ff6961',
      brightGreen: '#5de86d',
      brightYellow: '#ffe055',
      brightBlue: '#409cff',
      brightMagenta: '#d282ff',
      brightCyan: '#7fd5ff',
      brightWhite: '#f5f5f7',
    }
  }

  return {
    applyTheme,
    initTheme,
    getTerminalTheme,
  }
}

