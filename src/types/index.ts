// 终端会话类型定义
export interface TerminalSession {
  id: string
  title: string
  shell: 'bash' | 'zsh' | 'fish' | 'cmd' | 'powershell'
  workingDirectory: string
  environment: Record<string, string>
  createdAt: number
  lastActiveAt: number
  isActive: boolean
  pid?: number
}

// 终端配置类型
export interface TerminalConfig {
  fontSize: number
  fontFamily: string
  cursorBlink: boolean
  cursorStyle: 'block' | 'underline' | 'bar'
  theme: TerminalTheme
  scrollback: number
  allowProposedApi: boolean
}

// 终端主题类型
export interface TerminalTheme {
  foreground: string
  background: string
  cursor: string
  cursorAccent: string
  selection: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

// AI 配置类型
export interface AIConfig {
  provider: 'openai' | 'deepseek' | 'kimi' | 'zhipu' | 'claude' | 'gemini'
  apiKey: string
  baseUrl?: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
}

// AI 消息类型
export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    model?: string
    tokens?: number
    cost?: number
  }
}

// AI 对话类型
export interface AIConversation {
  id: string
  title: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
  sessionId?: string
}

// 任务类型定义
export interface Task {
  id: string
  name: string
  command: string
  workingDirectory: string
  environment: Record<string, string>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  output: string[]
  error?: string
  exitCode?: number
  startTime?: number
  endTime?: number
  dependencies: string[]
  tags: string[]
  priority: 'low' | 'medium' | 'high'
}

// 任务执行结果
export interface TaskResult {
  id: string
  success: boolean
  output: string
  error?: string
  exitCode: number
  duration: number
  timestamp: number
}

// 应用设置类型
export interface AppSettings {
  theme: {
    mode: 'light' | 'dark' | 'auto'
    primaryColor: string
    customTheme?: Record<string, string>
  }
  terminal: TerminalConfig
  ai: AIConfig
  shortcuts: Record<string, string>
  performance: {
    enableMonitoring: boolean
    maxHistorySize: number
    memoryWarningThreshold: number
  }
  privacy: {
    enableTelemetry: boolean
    enableErrorReporting: boolean
    enableUsageAnalytics: boolean
  }
}

// 通知类型
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: NotificationAction[]
  timestamp: number
}

export interface NotificationAction {
  label: string
  action: () => void | Promise<void>
  style?: 'primary' | 'secondary' | 'danger'
}

// 错误类型
export interface AppError {
  name: string
  message: string
  code?: string | number
  stack?: string
  context?: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

// 性能指标类型
export interface PerformanceMetrics {
  renderTime: number
  mountTime: number
  updateCount: number
  memoryUsage: {
    used: number
    total: number
    limit: number
    percentage: number
  }
  lastUpdate: number
  averageRenderTime: number
  maxRenderTime: number
  minRenderTime: number
}

// 性能事件类型
export interface PerformanceEvent {
  type: string
  value: number | object
  timestamp: number
  component: string
}

// 内存泄漏检测结果
export interface MemoryLeak {
  timestamp: number
  component: string
  memoryUsage: number
  trend: number
  severity: 'low' | 'medium' | 'high'
}

// 文件系统类型
export interface FileSystemItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: number
  permissions?: string
  isHidden: boolean
  children?: FileSystemItem[]
}

// 命令历史类型
export interface CommandHistory {
  id: string
  command: string
  workingDirectory: string
  timestamp: number
  exitCode?: number
  duration?: number
  sessionId: string
}

// 快捷键类型
export interface Shortcut {
  id: string
  name: string
  description: string
  keys: string[]
  action: string
  context?: 'global' | 'terminal' | 'ai' | 'tasks'
  enabled: boolean
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: number
}

// 事件类型
export interface AppEvent {
  type: string
  payload: unknown
  timestamp: number
  source: string
}

// 插件类型 (为未来扩展准备)
export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  config?: Record<string, unknown>
  hooks?: Record<string, Function>
}

// 主题类型
export interface Theme {
  id: string
  name: string
  type: 'light' | 'dark'
  colors: Record<string, string>
  terminal: TerminalTheme
  custom: boolean
}

// 导出所有类型的联合类型
export type AllTypes = 
  | TerminalSession
  | TerminalConfig
  | TerminalTheme
  | AIConfig
  | AIMessage
  | AIConversation
  | Task
  | TaskResult
  | AppSettings
  | Notification
  | NotificationAction
  | AppError
  | PerformanceMetrics
  | PerformanceEvent
  | MemoryLeak
  | FileSystemItem
  | CommandHistory
  | Shortcut
  | ApiResponse
  | AppEvent
  | Plugin
  | Theme