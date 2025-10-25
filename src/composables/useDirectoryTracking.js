/**
 * 目录跟踪功能
 * 从终端输出中提取当前工作目录
 */

import { ref } from 'vue'

export function useDirectoryTracking() {
  const currentDir = ref('~')

  /**
   * 从终端输出中提取目录
   * 支持多种方式:
   * - OSC 7 escape sequence: \033]7;file://hostname/path\007
   * - user@host:~/path %
   * - ~/path $
   * - [user@host path]$
   */
  const extractDirectory = (output) => {
    if (!output) return null

    // 匹配 OSC 7 escape sequence（优先级最高）
    const osc7Match = output.match(/\x1b\]7;file:\/\/[^/]*([^\x07]+)\x07/)
    if (osc7Match) {
      return osc7Match[1].trim()
    }

    // 匹配 user@host:path % 格式（zsh）
    const zshMatch = output.match(/[^:]+:([^\s%]+)\s*%/)
    if (zshMatch) {
      return zshMatch[1].trim()
    }

    // 匹配 path $ 格式（bash）
    const bashMatch = output.match(/^([^\s$]+)\s*\$/)
    if (bashMatch) {
      return bashMatch[1].trim()
    }

    // 匹配 [user@host path]$ 格式
    const bracketMatch = output.match(/\[[^\]]+\s+([^\]]+)\]\$/)
    if (bracketMatch) {
      return bracketMatch[1].trim()
    }

    return null
  }

  /**
   * 更新目录（如果提取成功）
   */
  const updateFromOutput = (output) => {
    const dir = extractDirectory(output)
    if (dir) {
      currentDir.value = dir
      return true
    }
    return false
  }

  /**
   * 手动设置目录
   */
  const setDirectory = (dir) => {
    currentDir.value = dir
  }

  /**
   * 重置为主目录
   */
  const resetToHome = () => {
    currentDir.value = '~'
  }

  return {
    currentDir,
    extractDirectory,
    updateFromOutput,
    setDirectory,
    resetToHome
  }
}
