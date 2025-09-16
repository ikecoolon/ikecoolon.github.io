import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/api'
import type { Camp } from '@/types/activity'
import dayjs from 'dayjs'

/**
 * 营会管理状态
 */
export const useCampStore = defineStore('camp', () => {
  // 状态
  const camps = ref<Camp[]>([])
  const loading = ref(false)

  // 计算属性
  const activeCamps = computed(() => {
    return camps.value.filter(camp => camp.status === 'active')
  })

  const upcomingCamps = computed(() => {
    const now = dayjs()
    return camps.value.filter(camp => {
      const startDate = dayjs(camp.startDate)
      return camp.status === 'planning' && startDate.isAfter(now)
    })
  })

  const completedCamps = computed(() => {
    return camps.value.filter(camp => camp.status === 'completed')
  })

  /**
   * 获取所有营会
   */
  const fetchCamps = async () => {
    loading.value = true
    try {
      const data = await request.get<Camp[]>('camp.json')
      camps.value = data || []
    } catch (error) {
      console.error('获取营会失败:', error)
      camps.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存营会数据
   */
  const saveCamps = async () => {
    try {
      await request.post('camp.json', camps.value)
    } catch (error) {
      console.error('保存营会失败:', error)
      throw error
    }
  }

  /**
   * 添加营会
   */
  const addCamp = async (camp: Omit<Camp, 'id' | 'createdAt'>) => {
    try {
      const newCamp: Camp = {
        ...camp,
        id: `camp_${Date.now()}`,
        createdAt: new Date()
      }

      camps.value.push(newCamp)
      await saveCamps()
      return newCamp
    } catch (error) {
      console.error('添加营会失败:', error)
      throw error
    }
  }

  /**
   * 更新营会
   */
  const updateCamp = async (id: string, updates: Partial<Camp>) => {
    try {
      const index = camps.value.findIndex(c => c.id === id)
      if (index !== -1) {
        camps.value[index] = {
          ...camps.value[index],
          ...updates,
          updatedAt: new Date()
        }
        await saveCamps()
      }
    } catch (error) {
      console.error('更新营会失败:', error)
      throw error
    }
  }

  /**
   * 删除营会
   */
  const deleteCamp = async (id: string) => {
    try {
      const index = camps.value.findIndex(c => c.id === id)
      if (index !== -1) {
        camps.value.splice(index, 1)
        await saveCamps()
      }
    } catch (error) {
      console.error('删除营会失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取营会
   */
  const getCampById = (id: string) => {
    return camps.value.find(camp => camp.id === id)
  }

  /**
   * 获取当前活跃的营会
   */
  const getCurrentCamp = () => {
    const now = dayjs()
    return camps.value.find(camp => {
      const startDate = dayjs(camp.startDate)
      const endDate = camp.endDate ? dayjs(camp.endDate) : startDate.add(7, 'day')
      return camp.status === 'active' && (now.isAfter(startDate) || now.isSame(startDate)) && (now.isBefore(endDate) || now.isSame(endDate))
    })
  }

  return {
    // 状态
    camps,
    loading,

    // 计算属性
    activeCamps,
    upcomingCamps,
    completedCamps,

    // 操作
    fetchCamps,
    saveCamps,
    addCamp,
    updateCamp,
    deleteCamp,
    getCampById,
    getCurrentCamp
  }
})
