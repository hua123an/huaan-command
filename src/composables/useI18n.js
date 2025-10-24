import { ref, computed } from 'vue'

// 语言定义
export const SUPPORTED_LOCALES = {
  'zh-CN': {
    name: '简体中文',
    code: 'zh-CN',
    flag: '🇨🇳'
  },
  'zh-TW': {
    name: '繁體中文',
    code: 'zh-TW',
    flag: '🇹🇼'
  },
  'en-US': {
    name: 'English',
    code: 'en-US',
    flag: '🇺🇸'
  },
  'ja-JP': {
    name: '日本語',
    code: 'ja-JP',
    flag: '🇯🇵'
  },
  'ko-KR': {
    name: '한국어',
    code: 'ko-KR',
    flag: '🇰🇷'
  },
  'fr-FR': {
    name: 'Français',
    code: 'fr-FR',
    flag: '🇫🇷'
  },
  'de-DE': {
    name: 'Deutsch',
    code: 'de-DE',
    flag: '🇩🇪'
  },
  'es-ES': {
    name: 'Español',
    code: 'es-ES',
    flag: '🇪🇸'
  },
  'it-IT': {
    name: 'Italiano',
    code: 'it-IT',
    flag: '🇮🇹'
  },
  'pt-BR': {
    name: 'Português',
    code: 'pt-BR',
    flag: '🇧🇷'
  },
  'ru-RU': {
    name: 'Русский',
    code: 'ru-RU',
    flag: '🇷🇺'
  }
}

// 翻译文本
export const translations = {
  'zh-CN': {
    // 通用
    'app.name': 'Huaan Command',
    'app.subtitle': '智能终端命令管理工具',
    'loading': '加载中...',
    'error': '错误',
    'success': '成功',
    'warning': '警告',
    'info': '信息',
    'confirm': '确认',
    'cancel': '取消',
    'save': '保存',
    'delete': '删除',
    'edit': '编辑',
    'add': '添加',
    'remove': '移除',
    'close': '关闭',
    'open': '打开',
    'search': '搜索',
    'filter': '筛选',
    'settings': '设置',
    'help': '帮助',
    'about': '关于',
    
    // 导航
    'nav.tasks': '任务',
    'nav.terminal': '终端',
    'nav.settings': '设置',
    
    // 任务管理
    'task.name': '任务名称',
    'task.command': '命令',
    'task.status.pending': '等待中',
    'task.status.running': '运行中',
    'task.status.success': '成功',
    'task.status.failed': '失败',
    'task.status.cancelled': '已取消',
    'task.create': '新建任务',
    'task.run': '运行',
    'task.runAll': '运行所有',
    'task.cancel': '取消',
    'task.delete': '删除',
    'task.clear': '清空',
    'task.stats': '任务统计',
    
    // 终端
    'terminal.newTab': '新建终端',
    'terminal.closeTab': '关闭标签',
    'terminal.clear': '清空终端',
    'terminal.aiMode': 'AI 模式',
    'terminal.terminalMode': '终端模式',
    'terminal.input.placeholder': '输入命令，按 Enter 执行...',
    'terminal.ai.placeholder': '和 AI 对话，描述你想做什么...',
    
    // AI 功能
    'ai.enabled': 'AI 功能已启用',
    'ai.disabled': 'AI 功能已禁用',
    'ai.error.config': '请先配置 AI 设置',
    'ai.generating': 'AI 正在生成...',
    'ai.typing': 'AI 正在输入...',
    'ai.error': 'AI 错误',
    'ai.retry': '重试',
    
    // 设置
    'settings.theme': '主题',
    'settings.ai': 'AI 设置',
    'settings.terminal': '终端设置',
    'settings.shortcuts': '快捷键',
    'settings.notifications': '通知',
    'settings.language': '语言',
    
    'settings.theme.system': '跟随系统',
    'settings.theme.dark': '深色模式',
    'settings.theme.light': '浅色模式',
    'settings.theme.custom': '自定义',
    
    // 错误信息
    'error.network': '网络连接失败',
    'error.verification': '验证失败',
    'error.permission': '权限不足',
    'error.timeout': '操作超时',
    'error.unknown': '未知错误',
    
    // 成功信息
    'success.saved': '保存成功',
    'success.deleted': '删除成功',
    'success.updated': '更新成功',
    'success.completed': '操作完成'
  },
  
  'en-US': {
    // 通用
    'app.name': 'Huaan Command',
    'app.subtitle': 'Intelligent Terminal Command Manager',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Info',
    'confirm': 'Confirm',
    'cancel': 'Cancel',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'add': 'Add',
    'remove': 'Remove',
    'close': 'Close',
    'open': 'Open',
    'search': 'Search',
    'filter': 'Filter',
    'settings': 'Settings',
    'help': 'Help',
    'about': 'About',
    
    // 导航
    'nav.tasks': 'Tasks',
    'nav.terminal': 'Terminal',
    'nav.settings': 'Settings',
    
    // 任务管理
    'task.name': 'Task Name',
    'task.command': 'Command',
    'task.status.pending': 'Pending',
    'task.status.running': 'Running',
    'task.status.success': 'Success',
    'task.status.failed': 'Failed',
    'task.status.cancelled': 'Cancelled',
    'task.create': 'New Task',
    'task.run': 'Run',
    'task.runAll': 'Run All',
    'task.cancel': 'Cancel',
    'task.delete': 'Delete',
    'task.clear': 'Clear',
    'task.stats': 'Task Stats',
    
    // 终端
    'terminal.newTab': 'New Terminal',
    'terminal.closeTab': 'Close Tab',
    'terminal.clear': 'Clear Terminal',
    'terminal.aiMode': 'AI Mode',
    'terminal.terminalMode': 'Terminal Mode',
    'terminal.input.placeholder': 'Enter command, press Enter to execute...',
    'terminal.ai.placeholder': 'Chat with AI, describe what you want to do...',
    
    // AI 功能
    'ai.enabled': 'AI features enabled',
    'ai.disabled': 'AI features disabled',
    'ai.error.config': 'Please configure AI settings first',
    'ai.generating': 'AI is generating...',
    'ai.typing': 'AI is typing...',
    'ai.error': 'AI Error',
    'ai.retry': 'Retry',
    
    // 设置
    'settings.theme': 'Theme',
    'settings.ai': 'AI Settings',
    'settings.terminal': 'Terminal Settings',
    'settings.shortcuts': 'Shortcuts',
    'settings.notifications': 'Notifications',
    'settings.language': 'Language',
    
    'settings.theme.system': 'Follow System',
    'settings.theme.dark': 'Dark Mode',
    'settings.theme.light': 'Light Mode',
    'settings.theme.custom': 'Custom',
    
    // 错误信息
    'error.network': 'Network connection failed',
    'error.verification': 'Verification failed',
    'error.permission': 'Permission denied',
    'error.timeout': 'Operation timeout',
    'error.unknown': 'Unknown error',
    
    // 成功信息
    'success.saved': 'Saved successfully',
    'success.deleted': 'Deleted successfully',
    'success.updated': 'Updated successfully',
    'success.completed': 'Operation completed'
  }
}

// 国际化 Composable
export function useI18n() {
  // 当前语言
  const currentLocale = ref('zh-CN')
  
  // 获取翻译
  const t = (key, params = {}) => {
    const locale = currentLocale.value
    const translation = translations[locale]?.[key] || key
    
    // 处理参数替换
    return Object.entries(params).reduce((str, [param, value]) => {
      return str.replace(`{${param}}`, value)
    }, translation)
  }
  
  // 获取支持的语言列表
  const supportedLocales = computed(() => {
    return Object.entries(SUPPORTED_LOCALES).map(([code, info]) => ({
      code,
      ...info
    }))
  })
  
  // 获取当前语言信息
  const currentLocaleInfo = computed(() => {
    return SUPPORTED_LOCALES[currentLocale.value] || SUPPORTED_LOCALES['zh-CN']
  })
  
  // 设置语言
  const setLocale = (locale) => {
    if (SUPPORTED_LOCALES[locale]) {
      currentLocale.value = locale
      localStorage.setItem('huaan-locale', locale)
    }
  }
  
  // 自动检测语言
  const detectLocale = () => {
    const saved = localStorage.getItem('huaan-locale')
    if (saved && SUPPORTED_LOCALES[saved]) {
      currentLocale.value = saved
      return
    }
    
    // 浏览器语言检测
    const browserLang = navigator.language || navigator.languages?.[0]
    if (browserLang) {
      // 尝试精确匹配
      if (SUPPORTED_LOCALES[browserLang]) {
        currentLocale.value = browserLang
        return
      }
      
      // 尝试语言代码匹配
      const langCode = browserLang.split('-')[0]
      const matchedLocale = Object.keys(SUPPORTED_LOCALES).find(code => 
        code.startsWith(langCode)
      )
      
      if (matchedLocale) {
        currentLocale.value = matchedLocale
      }
    }
  }
  
  // 格式化日期
  const formatDate = (date, options = {}) => {
    const locale = currentLocale.value
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(date)
  }
  
  // 格式化数字
  const formatNumber = (number, options = {}) => {
    const locale = currentLocale.value
    return new Intl.NumberFormat(locale, options).format(number)
  }
  
  // 格式化相对时间
  const formatRelativeTime = (date) => {
    const locale = currentLocale.value
    const rtf = new Intl.RelativeTimeFormat(locale, {
      numeric: 'auto'
    })
    
    const diff = Date.now() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return rtf.format(-days, 'day')
    } else if (hours > 0) {
      return rtf.format(-hours, 'hour')
    } else if (minutes > 0) {
      return rtf.format(-minutes, 'minute')
    } else {
      return rtf.format(-seconds, 'second')
    }
  }
  
  // 初始化
  const init = () => {
    detectLocale()
  }
  
  return {
    currentLocale,
    supportedLocales,
    currentLocaleInfo,
    t,
    setLocale,
    detectLocale,
    formatDate,
    formatNumber,
    formatRelativeTime,
    init
  }
}