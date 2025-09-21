import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@/types/user'

/**
 * 用户信息状态管理
 */
export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<User | null>(null)
  const loading = ref(false)

  /**
   * 获取用户信息
   */
  const fetchUserInfo = async () => {
    loading.value = true
    try {
      // TODO: 调用API获取用户信息
      // 暂时从 localStorage 获取
      const saved = localStorage.getItem('user_info')
      if (saved) {
        userInfo.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新用户信息
   */
  const updateUserInfo = async (updates: Partial<User>) => {
    try {
      if (userInfo.value) {
        userInfo.value = { ...userInfo.value, ...updates }
        localStorage.setItem('user_info', JSON.stringify(userInfo.value))
      }
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    }
  }

  return {
    // 状态
    userInfo,
    loading,
    
    // 操作
    fetchUserInfo,
    updateUserInfo
  }
})
