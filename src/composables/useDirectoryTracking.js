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
   * - hostname:~/path username$ (常见的 zsh/bash prompt)
   * - user@host:~/path %
   * - ~/path $
   * - [user@host path]$
   */
  const extractDirectory = (output) => {
    if (!output) return null

    // 移除 ANSI 转义序列
    const cleanOutput = output.replace(/\x1b\[[0-9;]*[mGKHf]/g, '')

    // 匹配 OSC 7 escape sequence（优先级最高）
    const osc7Match = output.match(/\x1b\]7;file:\/\/[^/]*([^\x07]+)\x07/)
    if (osc7Match) {
      return osc7Match[1].trim()
    }

    // 匹配 hostname:path username$ 格式（你的 zsh prompt）
    // 例如: huaaandeMacBook-Pro:ittools huaaan$
    const hostPathMatch = cleanOutput.match(/[^:\s]+:([^\s]+)\s+[^\s]+[\$%]/)
    if (hostPathMatch) {
      const dir = hostPathMatch[1].trim()
      // 展开 ~ 为完整路径前缀
      if (dir.startsWith('~')) {
        return dir
      }
      // 如果是相对路径，转换为绝对路径显示
      return dir
    }

    // 匹配 user@host:path % 格式（标准 zsh）
    const zshMatch = cleanOutput.match(/[^:]+:([^\s%]+)\s*%/)
    if (zshMatch) {
      return zshMatch[1].trim()
    }

    // 匹配 path $ 格式（bash）
    const bashMatch = cleanOutput.match(/^([^\s$]+)\s*\$/)
    if (bashMatch) {
      return bashMatch[1].trim()
    }

    // 匹配 [user@host path]$ 格式
    const bracketMatch = cleanOutput.match(/\[[^\]]+\s+([^\]]+)\]\$/)
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
