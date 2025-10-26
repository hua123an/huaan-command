/**
 * 确认对话框 Composable
 * 用于关闭终端标签等需要用户确认的操作
 */

import { ref } from 'vue'

export function useConfirmDialog() {
  const showDialog = ref(false)
  const dialogTitle = ref('')
  const dialogMessage = ref('')
  const dialogType = ref('warning') // 'warning', 'danger', 'info'
  let resolveCallback = null

  /**
   * 显示确认对话框
   * @param {string} title - 对话框标题
   * @param {string} message - 对话框消息
   * @param {string} type - 对话框类型
   * @returns {Promise<boolean>} 用户的选择
   */
  function confirm(title, message, type = 'warning') {
    return new Promise((resolve) => {
      dialogTitle.value = title
      dialogMessage.value = message
      dialogType.value = type
      showDialog.value = true
      resolveCallback = resolve
    })
  }

  /**
   * 用户确认
   */
  function handleConfirm() {
    showDialog.value = false
    if (resolveCallback) {
      resolveCallback(true)
      resolveCallback = null
    }
  }

  /**
   * 用户取消
   */
  function handleCancel() {
    showDialog.value = false
    if (resolveCallback) {
      resolveCallback(false)
      resolveCallback = null
    }
  }

  return {
    showDialog,
    dialogTitle,
    dialogMessage,
    dialogType,
    confirm,
    handleConfirm,
    handleCancel
  }
}
