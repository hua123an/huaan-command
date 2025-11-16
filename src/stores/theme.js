import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 主题配置
  const currentTheme = ref('dark')
  const terminalTheme = ref('default')
  const fontSize = ref(14)
  const fontFamily = ref('SF Mono')
  const lineHeight = ref(1.2)
  const opacity = ref(0.95)
  
  // 可用的终端主题
  const terminalThemes = {
    default: {
      name: '默认暗色',
      background: 'rgba(28, 28, 30, 0)',
      foreground: '#e4e4e7',
      cursor: '#0a84ff',
      black: '#1c1c1e',
      red: '#ff453a',
      green: '#32d74b',
      yellow: '#ffd60a',
      blue: '#0a84ff',
      magenta: '#bf5af2',
      cyan: '#5ac8fa',
      white: '#e4e4e7',
      brightBlack: '#636366',
      brightRed: '#ff6961',
      brightGreen: '#5de86d',
      brightYellow: '#ffe055',
      brightBlue: '#409cff',
      brightMagenta: '#d282ff',
      brightCyan: '#7fd5ff',
      brightWhite: '#f5f5f7'
    },
    dracula: {
      name: 'Dracula',
      background: 'rgba(40, 42, 54, 0)',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      black: '#000000',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#bfbfbf',
      brightBlack: '#4d4d4d',
      brightRed: '#ff6e67',
      brightGreen: '#5af78e',
      brightYellow: '#f4f99d',
      brightBlue: '#caa9fa',
      brightMagenta: '#ff92d0',
      brightCyan: '#9aedfe',
      brightWhite: '#e6e6e6'
    },
    monokai: {
      name: 'Monokai',
      background: 'rgba(39, 40, 34, 0)',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5'
    },
    light: {
      name: '亮色主题',
      background: 'rgba(255, 255, 255, 0)',
      foreground: '#1c1c1e',
      cursor: '#007aff',
      black: '#000000',
      red: '#c41a16',
      green: '#1a9334',
      yellow: '#b35900',
      blue: '#007aff',
      magenta: '#af52de',
      cyan: '#007aff',
      white: '#f5f5f7',
      brightBlack: '#636366',
      brightRed: '#ff3b30',
      brightGreen: '#34c759',
      brightYellow: '#ff9500',
      brightBlue: '#007aff',
      brightMagenta: '#af52de',
      brightCyan: '#5ac8fa',
      brightWhite: '#ffffff'
    },
    solarized: {
      name: 'Solarized Dark',
      background: 'rgba(0, 43, 54, 0)',
      foreground: '#839496',
      cursor: '#839496',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3'
    }
  }
  
  // 可用字体
  const availableFonts = [
    'SF Mono',
    'Menlo',
    'Monaco',
    'Courier New',
    'Fira Code',
    'JetBrains Mono',
    'Consolas'
  ]
  
  // 加载主题设置
  function loadTheme() {
    try {
      const saved = localStorage.getItem('huaan-theme')
      if (saved) {
        const theme = JSON.parse(saved)
        currentTheme.value = theme.currentTheme || 'dark'
        terminalTheme.value = theme.terminalTheme || 'default'
        fontSize.value = theme.fontSize || 14
        fontFamily.value = theme.fontFamily || 'SF Mono'
        lineHeight.value = theme.lineHeight || 1.2
        opacity.value = theme.opacity || 0.95
      }
    } catch (error) {
      console.error('加载主题失败:', error)
    }
  }
  
  // 保存主题设置
  function saveTheme() {
    try {
      const theme = {
        currentTheme: currentTheme.value,
        terminalTheme: terminalTheme.value,
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
        lineHeight: lineHeight.value,
        opacity: opacity.value
      }
      localStorage.setItem('huaan-theme', JSON.stringify(theme))
    } catch (error) {
      console.error('保存主题失败:', error)
    }
  }
  
  // 获取当前终端主题配置
  function getCurrentTerminalTheme() {
    return terminalThemes[terminalTheme.value] || terminalThemes.default
  }
  
  // 应用主题
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme.value)
    document.documentElement.style.setProperty('--opacity', opacity.value)
  }
  
  // 监听变化并保存
  watch([currentTheme, terminalTheme, fontSize, fontFamily, lineHeight, opacity], () => {
    saveTheme()
    applyTheme()
  })
  
  // 初始化
  loadTheme()
  applyTheme()
  
  return {
    currentTheme,
    terminalTheme,
    fontSize,
    fontFamily,
    lineHeight,
    opacity,
    terminalThemes,
    availableFonts,
    getCurrentTerminalTheme,
    applyTheme
  }
})

