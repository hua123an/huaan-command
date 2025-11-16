/**
 * 🔄 UndoManager - 操作撤销管理器
 *
 * 负责：
 * 1. 记录可撤销的操作
 * 2. 维护撤销栈
 * 3. 文件修改前自动备份
 * 4. 一键回滚操作
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * 操作类型定义
 */
export const OperationType = {
  FILE_WRITE: 'file_write',
  FILE_DELETE: 'file_delete',
  FILE_RENAME: 'file_rename',
  COMMAND_EXECUTE: 'command_execute',
  DIRECTORY_CHANGE: 'directory_change'
}

/**
 * 最大撤销栈大小
 */
const MAX_UNDO_STACK_SIZE = 50

/**
 * UndoManager 类
 */
export class UndoManager {
  constructor() {
    this.undoStack = []
    this.redoStack = []
    this.backups = new Map() // 文件备份存储
  }

  /**
   * 记录一个可撤销的操作
   * @param {Object} operation - 操作详情
   * @returns {string} 操作 ID
   */
  async recordOperation(operation) {
    const id = `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const record = {
      id,
      ...operation,
      timestamp: Date.now(),
      canUndo: true
    }

    // 如果是文件写入操作，先备份原文件
    if (operation.type === OperationType.FILE_WRITE) {
      await this._backupFile(operation.path, id)
      record.backupId = id
    }

    // 添加到撤销栈
    this.undoStack.push(record)

    // 清空重做栈（新操作后无法重做）
    this.redoStack = []

    // 限制栈大小
    if (this.undoStack.length > MAX_UNDO_STACK_SIZE) {
      const removed = this.undoStack.shift()
      // 清理旧备份
      if (removed.backupId) {
        this.backups.delete(removed.backupId)
      }
    }

    return id
  }

  /**
   * 撤销最后一个操作
   * @returns {Object} 撤销结果
   */
  async undo() {
    if (this.undoStack.length === 0) {
      throw new Error('没有可撤销的操作')
    }

    const operation = this.undoStack.pop()

    try {
      const result = await this._performUndo(operation)

      // 添加到重做栈
      this.redoStack.push(operation)

      return {
        success: true,
        operation,
        result
      }
    } catch (error) {
      // 如果撤销失败，重新加入撤销栈
      this.undoStack.push(operation)
      throw error
    }
  }

  /**
   * 重做最后一个撤销的操作
   * @returns {Object} 重做结果
   */
  async redo() {
    if (this.redoStack.length === 0) {
      throw new Error('没有可重做的操作')
    }

    const operation = this.redoStack.pop()

    try {
      const result = await this._performRedo(operation)

      // 重新加入撤销栈
      this.undoStack.push(operation)

      return {
        success: true,
        operation,
        result
      }
    } catch (error) {
      // 如果重做失败，重新加入重做栈
      this.redoStack.push(operation)
      throw error
    }
  }

  /**
   * 回滚到特定操作
   * @param {string} operationId - 操作 ID
   * @returns {Object} 回滚结果
   */
  async rollbackTo(operationId) {
    const index = this.undoStack.findIndex(op => op.id === operationId)

    if (index === -1) {
      throw new Error('操作不存在')
    }

    const results = []
    const operationsToUndo = this.undoStack.slice(index + 1).reverse()

    for (const operation of operationsToUndo) {
      try {
        const result = await this.undo()
        results.push(result)
      } catch (error) {
        return {
          success: false,
          completed: results.length,
          total: operationsToUndo.length,
          error: error.message,
          results
        }
      }
    }

    return {
      success: true,
      completed: results.length,
      total: operationsToUndo.length,
      results
    }
  }

  /**
   * 获取操作历史
   * @param {number} limit - 限制数量
   * @returns {Array} 操作历史列表
   */
  getHistory(limit = 20) {
    return this.undoStack.slice(-limit).reverse()
  }

  /**
   * 获取可重做的操作
   * @returns {Array} 可重做的操作列表
   */
  getRedoableOperations() {
    return [...this.redoStack].reverse()
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.undoStack = []
    this.redoStack = []
    this.backups.clear()
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      backupCount: this.backups.size,
      oldestOperation: this.undoStack[0]?.timestamp,
      newestOperation: this.undoStack[this.undoStack.length - 1]?.timestamp
    }
  }

  /**
   * 执行撤销操作
   * @private
   */
  async _performUndo(operation) {
    switch (operation.type) {
      case OperationType.FILE_WRITE:
        return await this._undoFileWrite(operation)

      case OperationType.FILE_DELETE:
        return await this._undoFileDelete(operation)

      case OperationType.FILE_RENAME:
        return await this._undoFileRename(operation)

      case OperationType.COMMAND_EXECUTE:
        return await this._undoCommandExecute(operation)

      case OperationType.DIRECTORY_CHANGE:
        return await this._undoDirectoryChange(operation)

      default:
        throw new Error(`不支持的操作类型: ${operation.type}`)
    }
  }

  /**
   * 执行重做操作
   * @private
   */
  async _performRedo(operation) {
    switch (operation.type) {
      case OperationType.FILE_WRITE:
        return await invoke('write_file', {
          path: operation.path,
          content: operation.newContent
        })

      case OperationType.FILE_DELETE:
        return await invoke('delete_file', { path: operation.path })

      case OperationType.FILE_RENAME:
        return await invoke('rename_file', {
          oldPath: operation.oldPath,
          newPath: operation.newPath
        })

      case OperationType.COMMAND_EXECUTE:
        return await invoke('execute_command', {
          cmd: operation.command,
          workingDir: operation.workingDir
        })

      case OperationType.DIRECTORY_CHANGE:
        return await invoke('change_directory', {
          path: operation.newDir,
          sessionId: operation.sessionId
        })

      default:
        throw new Error(`不支持的操作类型: ${operation.type}`)
    }
  }

  /**
   * 撤销文件写入
   * @private
   */
  async _undoFileWrite(operation) {
    const backup = this.backups.get(operation.backupId)

    if (!backup) {
      throw new Error('备份文件不存在，无法撤销')
    }

    // 恢复原文件内容
    if (backup.existed) {
      return await invoke('write_file', {
        path: operation.path,
        content: backup.content
      })
    } else {
      // 如果原文件不存在，删除新创建的文件
      return await invoke('delete_file', { path: operation.path })
    }
  }

  /**
   * 撤销文件删除
   * @private
   */
  async _undoFileDelete(operation) {
    const backup = this.backups.get(operation.backupId)

    if (!backup) {
      throw new Error('备份文件不存在，无法撤销')
    }

    // 恢复被删除的文件
    return await invoke('write_file', {
      path: operation.path,
      content: backup.content
    })
  }

  /**
   * 撤销文件重命名
   * @private
   */
  async _undoFileRename(operation) {
    // 将文件名改回原来的名字
    return await invoke('rename_file', {
      oldPath: operation.newPath,
      newPath: operation.oldPath
    })
  }

  /**
   * 撤销命令执行
   * @private
   */
  async _undoCommandExecute(operation) {
    // 大多数命令无法自动撤销
    if (operation.undoCommand) {
      return await invoke('execute_command', {
        cmd: operation.undoCommand,
        workingDir: operation.workingDir
      })
    }

    throw new Error('此命令无法自动撤销')
  }

  /**
   * 撤销目录切换
   * @private
   */
  async _undoDirectoryChange(operation) {
    return await invoke('change_directory', {
      path: operation.oldDir,
      sessionId: operation.sessionId
    })
  }

  /**
   * 备份文件
   * @private
   */
  async _backupFile(path, backupId) {
    try {
      const content = await invoke('read_file', { path })
      this.backups.set(backupId, {
        existed: true,
        content,
        timestamp: Date.now()
      })
    } catch (error) {
      // 文件不存在，记录为新文件
      this.backups.set(backupId, {
        existed: false,
        content: null,
        timestamp: Date.now()
      })
    }
  }

  /**
   * 创建文件写入操作记录
   * @param {string} path - 文件路径
   * @param {string} newContent - 新内容
   * @param {string} oldContent - 旧内容（可选）
   * @returns {Promise<string>} 操作 ID
   */
  async createFileWriteRecord(path, newContent, oldContent = null) {
    return await this.recordOperation({
      type: OperationType.FILE_WRITE,
      path,
      newContent,
      oldContent,
      description: `写入文件: ${path}`
    })
  }

  /**
   * 创建文件删除操作记录
   * @param {string} path - 文件路径
   * @returns {Promise<string>} 操作 ID
   */
  async createFileDeleteRecord(path) {
    return await this.recordOperation({
      type: OperationType.FILE_DELETE,
      path,
      description: `删除文件: ${path}`
    })
  }

  /**
   * 创建命令执行操作记录
   * @param {string} command - 命令
   * @param {string} workingDir - 工作目录
   * @param {string} undoCommand - 撤销命令（可选）
   * @returns {Promise<string>} 操作 ID
   */
  async createCommandRecord(command, workingDir, undoCommand = null) {
    return await this.recordOperation({
      type: OperationType.COMMAND_EXECUTE,
      command,
      workingDir,
      undoCommand,
      description: `执行命令: ${command}`
    })
  }
}

/**
 * 全局单例实例
 */
export const undoManager = new UndoManager()

/**
 * 便捷函数
 */
export const recordFileWrite = (path, newContent, oldContent) =>
  undoManager.createFileWriteRecord(path, newContent, oldContent)

export const recordFileDelete = (path) =>
  undoManager.createFileDeleteRecord(path)

export const recordCommand = (command, workingDir, undoCommand) =>
  undoManager.createCommandRecord(command, workingDir, undoCommand)

export const undo = () => undoManager.undo()
export const redo = () => undoManager.redo()
export const getHistory = (limit) => undoManager.getHistory(limit)
