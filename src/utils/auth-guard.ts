/**
 * 认证守卫工具 - 简化版
 * 用于保护需要认证的组件和功能
 */

import { Modal, message } from 'ant-design-vue'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

/**
 * 权限检查结果
 */
export interface AuthCheckResult {
  hasPermission: boolean
  message?: string
}

/**
 * 检查用户是否有编辑权限
 */
export const checkEditPermission = (): AuthCheckResult => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return {
      hasPermission: false,
      message: '请先登录获取编辑权限'
    }
  }

  return {
    hasPermission: true
  }
}

/**
 * 编辑权限守卫装饰器
 * 在执行编辑操作前自动检查权限
 */
export const requireAuth = (action: () => Promise<void> | void) => {
  return async () => {
    const result = checkEditPermission()

    if (!result.hasPermission) {
      showAuthDialog(result.message || '需要认证')
      return
    }

    try {
      await action()
    } catch (error) {
      console.error('操作失败:', error)
      message.error('操作失败，请重试')
    }
  }
}

/**
 * 显示认证对话框
 */
export const showAuthDialog = (reason?: string) => {
  const router = useRouter()

  Modal.confirm({
    title: '需要认证',
    content: reason || '此操作需要管理员权限，请先登录',
    okText: '去登录',
    cancelText: '取消',
    onOk() {
      router.push('/login')
    }
  })
}

/**
 * 编辑权限指令
 * 用于 Vue 模板中的权限控制
 */
export const authDirective = {
  mounted(el: HTMLElement, binding: any) {
    const { hasPermission } = checkEditPermission()

    if (!hasPermission) {
      // 禁用元素
      el.style.opacity = '0.5'
      el.style.cursor = 'not-allowed'
      el.style.pointerEvents = 'none'

      // 添加点击提示
      el.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        showAuthDialog()
      })
    }
  },

  updated(el: HTMLElement, binding: any) {
    const { hasPermission } = checkEditPermission()

    if (hasPermission) {
      // 恢复元素状态
      el.style.opacity = '1'
      el.style.cursor = 'pointer'
      el.style.pointerEvents = 'auto'
    } else {
      // 禁用元素
      el.style.opacity = '0.5'
      el.style.cursor = 'not-allowed'
      el.style.pointerEvents = 'none'
    }
  }
}

/**
 * 编辑权限组合式函数
 */
export const useAuthGuard = () => {
  const authStore = useAuthStore()

  const hasEditPermission = () => {
    return authStore.isAuthenticated
  }

  const requireEditAuth = (action: () => Promise<void> | void) => {
    return requireAuth(action)
  }

  const showLoginDialog = (reason?: string) => {
    showAuthDialog(reason)
  }

  return {
    hasEditPermission,
    requireEditAuth,
    showLoginDialog
  }
}
