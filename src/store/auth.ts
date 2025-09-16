import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'

/**
 * 认证状态管理 - 简化版
 */
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const isAuthenticated = computed(() => !!token.value)

  // 默认密码 - 生产环境建议修改
  const DEFAULT_PASSWORD = 'admin123'

  /**
   * 登录
   * @param password 密码
   */
  const login = async (password: string): Promise<boolean> => {
    try {
      // 简单密码验证
      if (password === DEFAULT_PASSWORD) {
        token.value = generateToken()
        user.value = {
          id: '1',
          username: 'admin',
          email: '52282858@qq.com',
          role: 'admin',
          createdAt: new Date()
        }

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
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
  }

  /**
   * 初始化认证状态（从 localStorage 恢复）
   */
  const initAuth = () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user_info')

    if (savedToken && savedUser) {
      token.value = savedToken
      user.value = JSON.parse(savedUser)
    }
  }

  /**
   * 生成认证令牌
   */
  const generateToken = (): string => {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  return {
    // 状态
    user,
    token,
    isAuthenticated,

    // 操作
    login,
    logout,
    initAuth,
    changePassword,

    // 默认密码（仅开发环境）
    DEFAULT_PASSWORD: import.meta.env.DEV ? DEFAULT_PASSWORD : undefined
  }
})
