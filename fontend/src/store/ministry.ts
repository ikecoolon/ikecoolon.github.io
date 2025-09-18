import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/api'
import type {  MinistryMember } from '@/types/ministry'
import dayjs from 'dayjs'

/**
 * 服侍者管理状态
 */
export const useMinistryStore = defineStore('ministry', () => {
  // 状态
  const members = ref<MinistryMember[]>([])
  const loading = ref(false)


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
   * 保存服侍者
   */
  const saveMembers = async () => {
    try {
      // 保存数据到本地文件或后端
      await request.post('participants.json', members.value)
      console.log('服侍者数据已保存:', members.value)
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
        createdAt: dayjs().format() // 保存为 ISO 字符串格式
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
        members.value[index] = {
          ...members.value[index],
          ...updates,
          updatedAt: dayjs().format() // 保存为 ISO 字符串格式
        }
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



  return {
    // 状态
    members,
    loading,

    // 操作
    fetchMembers,
    saveMembers,
    addMember,
    updateMember,
    deleteMember,
  }
})
