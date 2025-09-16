import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/api'
import type { Ministry, MinistryMember } from '@/types/ministry'

/**
 * 服侍者管理状态
 */
export const useMinistryStore = defineStore('ministry', () => {
  // 状态
  const ministries = ref<Ministry[]>([])
  const members = ref<MinistryMember[]>([])
  const loading = ref(false)

  /**
   * 获取所有服侍类型
   */
  const fetchMinistries = async () => {
    loading.value = true
    try {
      const data = await request.get<Ministry[]>('ministries.json')
      ministries.value = data || []
    } catch (error) {
      console.error('获取服侍类型失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取所有服侍者
   */
  const fetchMembers = async () => {
    loading.value = true
    try {
      const data = await request.get<MinistryMember[]>('participants.json')
      members.value = data || []
    } catch (error) {
      console.error('获取服侍者失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存服侍类型
   */
  const saveMinistries = async () => {
    try {
      await request.post('ministries.json', ministries.value)
    } catch (error) {
      console.error('保存服侍类型失败:', error)
      throw error
    }
  }

  /**
   * 保存服侍者
   */
  const saveMembers = async () => {
    try {
      await request.post('participants.json', members.value)
    } catch (error) {
      console.error('保存服侍者失败:', error)
      throw error
    }
  }

  /**
   * 添加服侍者
   */
  const addMember = async (member: Omit<MinistryMember, 'id' | 'createdAt'>) => {
    try {
      const newMember: MinistryMember = {
        ...member,
        id: `member_${Date.now()}`,
        createdAt: new Date()
      }

      members.value.push(newMember)
      await saveMembers()
      return newMember
    } catch (error) {
      console.error('添加服侍者失败:', error)
      throw error
    }
  }

  /**
   * 更新服侍者信息
   */
  const updateMember = async (id: string, updates: Partial<MinistryMember>) => {
    try {
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value[index] = { ...members.value[index], ...updates }
        await saveMembers()
      }
    } catch (error) {
      console.error('更新服侍者失败:', error)
      throw error
    }
  }

  /**
   * 删除服侍者
   */
  const deleteMember = async (id: string) => {
    try {
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value.splice(index, 1)
        await saveMembers()
      }
    } catch (error) {
      console.error('删除服侍者失败:', error)
      throw error
    }
  }

  /**
   * 添加服侍类型
   */
  const addMinistry = async (ministry: Omit<Ministry, 'id' | 'createdAt'>) => {
    try {
      const newMinistry: Ministry = {
        ...ministry,
        id: `ministry_${Date.now()}`,
        createdAt: new Date()
      }

      ministries.value.push(newMinistry)
      await saveMinistries()
      return newMinistry
    } catch (error) {
      console.error('添加服侍类型失败:', error)
      throw error
    }
  }

  /**
   * 更新服侍类型
   */
  const updateMinistry = async (id: string, updates: Partial<Ministry>) => {
    try {
      const index = ministries.value.findIndex(m => m.id === id)
      if (index !== -1) {
        ministries.value[index] = { ...ministries.value[index], ...updates }
        await saveMinistries()
      }
    } catch (error) {
      console.error('更新服侍类型失败:', error)
      throw error
    }
  }

  /**
   * 删除服侍类型
   */
  const deleteMinistry = async (id: string) => {
    try {
      const index = ministries.value.findIndex(m => m.id === id)
      if (index !== -1) {
        ministries.value.splice(index, 1)
        await saveMinistries()
      }
    } catch (error) {
      console.error('删除服侍类型失败:', error)
      throw error
    }
  }

  return {
    // 状态
    ministries,
    members,
    loading,

    // 操作
    fetchMinistries,
    fetchMembers,
    saveMinistries,
    saveMembers,
    addMember,
    updateMember,
    deleteMember,
    addMinistry,
    updateMinistry,
    deleteMinistry
  }
})
