/**
 * 🛡️ SafetyChecker - 安全检查器
 *
 * 负责：
 * 1. 检测危险操作
 * 2. 生成操作预览
 * 3. 管理用户确认流程
 * 4. 评估操作风险等级
 */

/**
 * 风险等级定义
 */
export const RiskLevel = {
  SAFE: 'safe',           // 安全操作，无需确认
  LOW: 'low',             // 低风险，可以批量确认
  MEDIUM: 'medium',       // 中等风险，需要单独确认
  HIGH: 'high',           // 高风险，需要仔细确认
  CRITICAL: 'critical'    // 极高风险，需要二次确认
}

/**
 * 危险命令模式
 */
const DANGEROUS_PATTERNS = {
  // 文件删除
  DELETE: {
    patterns: [
      /rm\s+-rf/i,
      /rm\s+-fr/i,
      /del\s+\/s/i,
      /rmdir\s+\/s/i,
      /Remove-Item.*-Recurse/i
    ],
    level: RiskLevel.CRITICAL,
    message: '递归删除文件/目录'
  },

  // 权限提升
  PRIVILEGE: {
    patterns: [
      /sudo/i,
      /su\s+/i,
      /runas/i,
      /elevate/i
    ],
    level: RiskLevel.HIGH,
    message: '需要管理员权限'
  },

  // 磁盘操作
  DISK_OPS: {
    patterns: [
      /dd\s+/i,
      /mkfs/i,
      /format/i,
      /fdisk/i,
      /parted/i
    ],
    level: RiskLevel.CRITICAL,
    message: '磁盘格式化/分区操作'
  },

  // 网络操作
  NETWORK: {
    patterns: [
      /curl.*\|\s*(sh|bash)/i,
      /wget.*\|\s*(sh|bash)/i,
      /nc\s+-l/i,
      /netcat.*-l/i
    ],
    level: RiskLevel.HIGH,
    message: '从网络下载并执行脚本'
  },

  // 系统配置
  SYSTEM_CONFIG: {
    patterns: [
      /\/etc\//,
      /\/sys\//,
      /\/proc\//,
      /\/boot\//,
      /registry/i,
      /regedit/i
    ],
    level: RiskLevel.HIGH,
    message: '修改系统配置'
  },

  // 敏感文件
  SENSITIVE_FILES: {
    patterns: [
      /\.ssh\//,
      /\.aws\//,
      /\.env/,
      /credentials/i,
      /password/i,
      /private.*key/i
    ],
    level: RiskLevel.CRITICAL,
    message: '访问敏感文件或凭证'
  }
}

/**
 * 敏感路径列表
 */
const SENSITIVE_PATHS = [
  '/etc',
  '/sys',
  '/proc',
  '/boot',
  '/var/log',
  '~/.ssh',
  '~/.aws',
  '~/.gnupg',
  '/System',
  '/Library/System',
  'C:\\Windows',
  'C:\\Program Files'
]

/**
 * SafetyChecker 类
 */
export class SafetyChecker {
  constructor() {
    this.pendingOperations = []
    this.approvedOperations = new Set()
    this.deniedOperations = new Set()
  }

  /**
   * 检查命令是否安全
   * @param {string} command - 要执行的命令
   * @returns {Object} 检查结果
   */
  checkCommand(command) {
    const risks = []
    let maxLevel = RiskLevel.SAFE

    // 检查所有危险模式
    for (const [category, config] of Object.entries(DANGEROUS_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(command)) {
          risks.push({
            category,
            level: config.level,
            message: config.message,
            matched: command.match(pattern)[0]
          })

          // 更新最高风险等级
          if (this._isHigherRisk(config.level, maxLevel)) {
            maxLevel = config.level
          }
        }
      }
    }

    return {
      isSafe: maxLevel === RiskLevel.SAFE,
      level: maxLevel,
      risks,
      needsApproval: maxLevel !== RiskLevel.SAFE,
      command
    }
  }

  /**
   * 检查文件路径是否安全
   * @param {string} path - 文件路径
   * @param {string} operation - 操作类型 (read/write/delete)
   * @returns {Object} 检查结果
   */
  checkFilePath(path, operation = 'read') {
    const risks = []
    let level = RiskLevel.SAFE

    // 检查敏感路径
    for (const sensitivePath of SENSITIVE_PATHS) {
      if (path.startsWith(sensitivePath) || path.includes(sensitivePath)) {
        risks.push({
          category: 'SENSITIVE_PATH',
          level: operation === 'write' || operation === 'delete'
            ? RiskLevel.CRITICAL
            : RiskLevel.MEDIUM,
          message: `访问敏感路径: ${sensitivePath}`
        })
        level = risks[0].level
        break
      }
    }

    // 检查操作类型
    if (operation === 'delete') {
      level = this._isHigherRisk(RiskLevel.HIGH, level) ? RiskLevel.HIGH : level
    } else if (operation === 'write' && level === RiskLevel.SAFE) {
      level = RiskLevel.LOW
    }

    return {
      isSafe: level === RiskLevel.SAFE,
      level,
      risks,
      needsApproval: level !== RiskLevel.SAFE,
      path,
      operation
    }
  }

  /**
   * 添加待确认的操作
   * @param {Object} operation - 操作详情
   * @returns {string} 操作 ID
   */
  addPendingOperation(operation) {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.pendingOperations.push({
      id,
      ...operation,
      timestamp: Date.now(),
      status: 'pending'
    })

    return id
  }

  /**
   * 批准操作
   * @param {string} operationId - 操作 ID
   */
  approveOperation(operationId) {
    const op = this.pendingOperations.find(o => o.id === operationId)
    if (op) {
      op.status = 'approved'
      this.approvedOperations.add(operationId)
    }
  }

  /**
   * 拒绝操作
   * @param {string} operationId - 操作 ID
   */
  denyOperation(operationId) {
    const op = this.pendingOperations.find(o => o.id === operationId)
    if (op) {
      op.status = 'denied'
      this.deniedOperations.add(operationId)
    }
  }

  /**
   * 批量批准操作
   * @param {Array<string>} operationIds - 操作 ID 列表
   */
  approveAll(operationIds) {
    operationIds.forEach(id => this.approveOperation(id))
  }

  /**
   * 获取待确认的操作
   * @returns {Array} 待确认的操作列表
   */
  getPendingOperations() {
    return this.pendingOperations.filter(op => op.status === 'pending')
  }

  /**
   * 清理已处理的操作
   * @param {number} maxAge - 最大保留时间（毫秒）
   */
  cleanup(maxAge = 3600000) { // 默认 1 小时
    const now = Date.now()
    this.pendingOperations = this.pendingOperations.filter(
      op => op.status === 'pending' || (now - op.timestamp) < maxAge
    )
  }

  /**
   * 生成操作预览
   * @param {Object} operation - 操作详情
   * @returns {Object} 预览信息
   */
  generatePreview(operation) {
    const { type, params } = operation

    switch (type) {
      case 'write_file':
        return this._generateFileWritePreview(params)
      case 'execute_command':
        return this._generateCommandPreview(params)
      case 'delete_file':
        return this._generateFileDeletePreview(params)
      default:
        return {
          title: operation.type,
          description: '未知操作类型',
          details: params
        }
    }
  }

  /**
   * 比较风险等级
   * @private
   */
  _isHigherRisk(level1, level2) {
    const levels = [
      RiskLevel.SAFE,
      RiskLevel.LOW,
      RiskLevel.MEDIUM,
      RiskLevel.HIGH,
      RiskLevel.CRITICAL
    ]
    return levels.indexOf(level1) > levels.indexOf(level2)
  }

  /**
   * 生成文件写入预览
   * @private
   */
  _generateFileWritePreview(params) {
    const { path, content, oldContent } = params

    let changes = []
    if (oldContent) {
      // 生成 diff
      changes = this._generateDiff(oldContent, content)
    }

    return {
      title: '📝 写入文件',
      path,
      description: oldContent ? '修改现有文件' : '创建新文件',
      changes,
      stats: {
        oldLines: oldContent ? oldContent.split('\n').length : 0,
        newLines: content.split('\n').length,
        size: content.length
      }
    }
  }

  /**
   * 生成命令执行预览
   * @private
   */
  _generateCommandPreview(params) {
    const { cmd, workingDir } = params
    const check = this.checkCommand(cmd)

    return {
      title: '⚡ 执行命令',
      command: cmd,
      workingDir,
      description: check.risks.length > 0
        ? `⚠️ 检测到 ${check.risks.length} 个风险`
        : '普通命令执行',
      risks: check.risks,
      riskLevel: check.level
    }
  }

  /**
   * 生成文件删除预览
   * @private
   */
  _generateFileDeletePreview(params) {
    const { path } = params

    return {
      title: '🗑️ 删除文件',
      path,
      description: '此操作不可撤销',
      warning: '文件删除后无法恢复'
    }
  }

  /**
   * 生成简单的 diff
   * @private
   */
  _generateDiff(oldContent, newContent) {
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    const changes = []

    const maxLines = Math.max(oldLines.length, newLines.length)
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]

      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          changes.push({ type: 'remove', line: oldLine, number: i + 1 })
        }
        if (newLine !== undefined) {
          changes.push({ type: 'add', line: newLine, number: i + 1 })
        }
      }
    }

    return changes.slice(0, 50) // 最多显示 50 行变化
  }
}

/**
 * 全局单例实例
 */
export const safetyChecker = new SafetyChecker()

/**
 * 便捷函数
 */
export const checkCommand = (command) => safetyChecker.checkCommand(command)
export const checkFilePath = (path, operation) => safetyChecker.checkFilePath(path, operation)
export const requireApproval = (operation) => safetyChecker.addPendingOperation(operation)
