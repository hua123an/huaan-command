import { ref, computed } from 'vue'
import { tools, getTool, getToolsByCategory, getToolsDescription, getToolsSchema } from './index'
import { validateToolParams, checkNeedsApproval, formatToolResult, detectDangerousOperation } from './validator'

/**
 * 工具执行器 Composable
 */
export const useToolExecutor = (context = {}) => {
  const executingTool = ref(null)
  const lastResult = ref(null)
  const executionHistory = ref([])

  /**
   * 执行工具
   */
  const executeTool = async (toolName, params, options = {}) => {
    const tool = getTool(toolName)

    if (!tool) {
      throw new Error(`工具 "${toolName}" 不存在`)
    }

    // 验证参数
    const validation = validateToolParams(tool, params)
    if (!validation.valid) {
      throw new Error(`参数验证失败：${validation.errors.join(', ')}`)
    }

    // 检测危险操作
    const warnings = detectDangerousOperation(tool, params)
    if (warnings.length > 0 && !options.skipWarnings) {
      console.warn('工具执行警告：', warnings)
      if (options.onWarning) {
        const shouldContinue = await options.onWarning(warnings)
        if (!shouldContinue) {
          throw new Error('用户取消操作')
        }
      }
    }

    // 检查是否需要批准
    const needsApproval = checkNeedsApproval(tool, params)
    if (needsApproval && !options.skipApproval) {
      if (options.onApprovalRequired) {
        const approved = await options.onApprovalRequired(tool, params)
        if (!approved) {
          throw new Error('操作未获批准')
        }
      } else {
        throw new Error('该操作需要用户批准')
      }
    }

    // 执行工具
    executingTool.value = toolName
    const startTime = Date.now()

    try {
      const result = await tool.execute(params, context)
      const formatted = formatToolResult(result, tool)
      const duration = Date.now() - startTime

      lastResult.value = {
        tool: toolName,
        params,
        result: formatted,
        duration,
        timestamp: new Date().toISOString()
      }

      // 添加到历史记录
      executionHistory.value.unshift(lastResult.value)
      if (executionHistory.value.length > 100) {
        executionHistory.value = executionHistory.value.slice(0, 100)
      }

      return formatted
    } catch (error) {
      const errorResult = {
        tool: toolName,
        params,
        result: {
          success: false,
          output: null,
          error: error.message
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }

      lastResult.value = errorResult
      executionHistory.value.unshift(errorResult)

      throw error
    } finally {
      executingTool.value = null
    }
  }

  /**
   * 批量执行工具
   */
  const executeBatch = async (operations, options = {}) => {
    const results = []

    for (const op of operations) {
      try {
        const result = await executeTool(op.tool, op.params, options)
        results.push({ success: true, tool: op.tool, result })
      } catch (error) {
        results.push({ success: false, tool: op.tool, error: error.message })
        if (options.stopOnError) {
          break
        }
      }
    }

    return results
  }

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    executionHistory.value = []
    lastResult.value = null
  }

  /**
   * 获取工具的执行统计
   */
  const getToolStats = computed(() => {
    const stats = {}

    executionHistory.value.forEach(record => {
      if (!stats[record.tool]) {
        stats[record.tool] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          totalDuration: 0,
          avgDuration: 0
        }
      }

      const s = stats[record.tool]
      s.count++
      s.totalDuration += record.duration

      if (record.result.success) {
        s.successCount++
      } else {
        s.failureCount++
      }

      s.avgDuration = s.totalDuration / s.count
    })

    return stats
  })

  return {
    // 状态
    executingTool,
    lastResult,
    executionHistory,
    toolStats: getToolStats,

    // 方法
    executeTool,
    executeBatch,
    clearHistory,

    // 工具信息
    tools,
    getTool,
    getToolsByCategory,
    getToolsDescription,
    getToolsSchema
  }
}
