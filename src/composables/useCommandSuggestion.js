import { ref, computed } from 'vue'

/**
 * Warp 风格的命令自动建议
 * 基于命令历史进行智能匹配
 */
export function useCommandSuggestion() {
  const commandHistory = ref([])
  const currentInput = ref('')

  /**
   * 添加命令到历史
   */
  const addToHistory = (command) => {
    if (!command || command.trim().length === 0) return

    // 去重：移除已存在的相同命令
    const index = commandHistory.value.indexOf(command)
    if (index > -1) {
      commandHistory.value.splice(index, 1)
    }

    // 添加到开头（最新的在前面）
    commandHistory.value.unshift(command)

    // 限制历史记录数量（保留最近 1000 条）
    if (commandHistory.value.length > 1000) {
      commandHistory.value = commandHistory.value.slice(0, 1000)
    }
  }

  /**
   * 加载历史记录
   */
  const loadHistory = (history) => {
    if (Array.isArray(history)) {
      commandHistory.value = history
    }
  }

  /**
   * 获取建议列表
   * 返回所有匹配的命令
   */
  const suggestions = computed(() => {
    if (!currentInput.value || currentInput.value.length === 0) {
      return []
    }

    // 在历史中查找所有以当前输入开头的命令
    const matches = commandHistory.value.filter(cmd =>
      cmd.startsWith(currentInput.value) && cmd !== currentInput.value
    )

    // 去重并限制数量
    return [...new Set(matches)].slice(0, 10)
  })

  /**
   * 接受建议
   * 返回完整的命令
   */
  const acceptSuggestion = (suggestion) => {
    if (suggestion) {
      currentInput.value = suggestion
      return suggestion
    }
    return currentInput.value
  }

  /**
   * 清空当前输入
   */
  const clearInput = () => {
    currentInput.value = ''
  }

  /**
   * 更新当前输入
   */
  const updateInput = (input) => {
    currentInput.value = input
  }

  return {
    commandHistory,
    currentInput,
    suggestions,
    addToHistory,
    loadHistory,
    acceptSuggestion,
    clearInput,
    updateInput
  }
}
