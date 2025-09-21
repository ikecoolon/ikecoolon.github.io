import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'
import { authAPI } from '@/api'

/**
 * 认证状态管理 - 自动密码生成版
 */
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const isAuthenticated = computed(() => !!token.value)
  const currentPassword = ref<string>('')
  const authVerified = ref<boolean>(false) // 标记认证是否已验证
  const authInitialized = ref<boolean>(false) // 标记认证初始化是否完成

  /**
   * 登录
   * @param password 密码
   * @param email 可选的邮箱地址
   */
  const login = async (password: string, email?: string): Promise<boolean> => {
    try {
      // 调用后端API验证密码
      const result = await authAPI.verifyPassword(password, email)

      if (result.success) {
        token.value = result.token
        user.value = result.user
        authVerified.value = true // 标记认证已验证

        // 保存到 localStorage
        localStorage.setItem('auth_token', token.value)
        localStorage.setItem('user_info', JSON.stringify(user.value))

        return true
      }
      return false
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }

  /**
   * 登出
   */
  const logout = () => {
    user.value = null
    token.value = ''
    authVerified.value = false // 重置认证验证状态
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  }

  /**
   * 初始化认证状态（从 localStorage 恢复并验证）
   */
  const initAuth = async () => {
    authInitialized.value = false // 标记初始化开始
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user_info')

    if (savedToken && savedUser) {
      try {
        // 验证token是否仍然有效
        const result = await authAPI.verifyToken(savedToken)
        if (result.success) {
          token.value = savedToken
          // 使用JWT token中的用户信息，而不是localStorage中的旧信息
          user.value = {
            id: result.user.userId,
            username: result.user.username,
            email: result.user.email,
            role: result.user.role,
            permissions: result.user.permissions
          }
          authVerified.value = true // 标记认证已验证

          // 更新localStorage中的用户信息
          localStorage.setItem('user_info', JSON.stringify(user.value))

          console.log('✅ Token验证成功，从JWT token恢复登录状态:', {
            email: user.value.email,
            role: user.value.role,
            permissions: user.value.permissions
          })
        } else {
          // Token无效，清除本地存储
          console.warn('❌ Token已过期，清除本地认证状态')
          logout()
        }
      } catch (error) {
        // 如果是网络错误等，暂时保留本地状态，但标记为未验证
        console.warn('⚠️  Token验证请求失败，保留本地状态但需要重新验证:', error.message)

        // 尝试解析用户信息，如果格式正确则暂时保留
        try {
          const parsedUser = JSON.parse(savedUser)
          if (parsedUser && parsedUser.id && parsedUser.username) {
            token.value = savedToken
            user.value = parsedUser
            console.log('⚠️  保留本地认证状态，用户可能需要重新登录验证')
          } else {
            logout()
          }
        } catch (parseError) {
          console.warn('❌ 本地用户信息格式错误，清除认证状态')
          logout()
        }
      }
    } else {
      console.log('ℹ️  未找到本地认证信息，需要登录')
    }

    authInitialized.value = true // 标记初始化完成
  }


  /**
   * 修改密码（可选功能）
   */
  const changePassword = async (newPassword: string): Promise<boolean> => {
    try {
      // 这里可以实现密码修改逻辑
      // 暂时只是返回成功
      console.log('密码已修改为:', newPassword)
      return true
    } catch (error) {
      console.error('修改密码失败:', error)
      return false
    }
  }

  /**
   * 获取当前密码（仅用于显示和调试）
   */
  const getCurrentPassword = async (): Promise<string | null> => {
    try {
      // 使用当前登录用户的邮箱来获取密码
      const userEmail = user.value?.email
      if (!userEmail) {
        console.warn('用户邮箱不存在，无法获取密码')
        currentPassword.value = ''
        return null
      }

      const result = await authAPI.getCurrentPassword(userEmail)
      currentPassword.value = result.password || ''
      return result.password
    } catch (error) {
      console.error('获取当前密码失败:', error)
      currentPassword.value = ''
      return null
    }
  }

  /**
   * 等待认证初始化完成
   */
  const waitForAuthInit = async (): Promise<void> => {
    if (authInitialized.value) return

    return new Promise((resolve) => {
      // 创建一个响应式监听器
      const checkInit = () => {
        if (authInitialized.value) {
          resolve()
        } else {
          // 继续等待
          setTimeout(checkInit, 50)
        }
      }
      checkInit()
    })
  }

  return {
    // 状态
    user,
    token,
    isAuthenticated,
    currentPassword,
    authVerified,
    authInitialized,

    // 操作
    login,
    logout,
    initAuth,
    waitForAuthInit,
    changePassword,
    getCurrentPassword
  }
})
