import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/api'
import type { Camp, CampDuty, DutyCategory } from '@/types/activity'
import dayjs from 'dayjs'

/**
 * 营会管理状态
 */
export const useCampStore = defineStore('camp', () => {
  // 状态
  const camps = ref<Camp[]>([])
  const duties = ref<CampDuty[]>([])
  const loading = ref(false)

  // 计算属性
  const planningCamps = computed(() => {
    const now = dayjs()
    return camps.value.filter(camp => {
      const startDate = dayjs(camp.startDate)
      return startDate.isAfter(now)
    })
  })

  const activeCamps = computed(() => {
    const now = dayjs()
    return camps.value.filter(camp => {
      const startDate = dayjs(camp.startDate)
      const endDate = camp.endDate ? dayjs(camp.endDate) : startDate.add(7, 'day')
      return (now.isAfter(startDate) || now.isSame(startDate)) && (now.isBefore(endDate) || now.isSame(endDate))
    })
  })

  const completedCamps = computed(() => {
    const now = dayjs()
    return camps.value.filter(camp => {
      const endDate = camp.endDate ? dayjs(camp.endDate) : dayjs(camp.startDate).add(7, 'day')
      return now.isAfter(endDate)
    })
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
      return (now.isAfter(startDate) || now.isSame(startDate)) && (now.isBefore(endDate) || now.isSame(endDate))
    })
  }

  /**
   * 获取职责列表
   */
  const fetchDuties = async () => {
    try {
      const data = await request.get<CampDuty[]>('camp-duties.json')
      duties.value = data || []
    } catch (error) {
      console.error('获取职责失败:', error)
      duties.value = []
    }
  }

  /**
   * 保存职责数据
   */
  const saveDuties = async () => {
    try {
      await request.post('camp-duties.json', duties.value)
    } catch (error) {
      console.error('保存职责失败:', error)
      throw error
    }
  }

  /**
   * 添加职责
   */
  const addDuty = async (duty: Omit<CampDuty, 'id' | 'createdAt'>) => {
    try {
      const newDuty: CampDuty = {
        ...duty,
        id: `duty_${Date.now()}`,
        createdAt: new Date()
      }

      duties.value.push(newDuty)
      await saveDuties()

      // 更新对应营会的职责列表
      const camp = camps.value.find(c => c.id === duty.campId)
      if (camp) {
        camp.duties = [...camp.duties, newDuty.id]
        await saveCamps()
      }

      return newDuty
    } catch (error) {
      console.error('添加职责失败:', error)
      throw error
    }
  }

  /**
   * 更新职责
   */
  const updateDuty = async (id: string, updates: Partial<CampDuty>) => {
    try {
      const index = duties.value.findIndex(d => d.id === id)
      if (index !== -1) {
        duties.value[index] = {
          ...duties.value[index],
          ...updates,
          updatedAt: new Date()
        }
        await saveDuties()
      }
    } catch (error) {
      console.error('更新职责失败:', error)
      throw error
    }
  }

  /**
   * 删除职责
   */
  const deleteDuty = async (id: string) => {
    try {
      const index = duties.value.findIndex(d => d.id === id)
      if (index !== -1) {
        const duty = duties.value[index]

        // 从营会的职责列表中移除
        const camp = camps.value.find(c => c.id === duty.campId)
        if (camp) {
          camp.duties = camp.duties.filter(dutyId => dutyId !== id)
          await saveCamps()
        }

        duties.value.splice(index, 1)
        await saveDuties()
      }
    } catch (error) {
      console.error('删除职责失败:', error)
      throw error
    }
  }

  /**
   * 获取营会的职责列表
   */
  const getCampDuties = (campId: string) => {
    return duties.value.filter(duty => duty.campId === campId)
  }

  /**
   * 获取用户的职责列表
   */
  const getUserDuties = (userId: string) => {
    return duties.value.filter(duty =>
      duty.assignees.some(assignee => assignee.userId === userId)
    )
  }

  return {
    // 状态
    camps,
    duties,
    loading,

    // 计算属性
    planningCamps,
    activeCamps,
    completedCamps,

    // 操作
    fetchCamps,
    saveCamps,
    addCamp,
    updateCamp,
    deleteCamp,
    getCampById,
    getCurrentCamp,

    // 职责操作
    fetchDuties,
    saveDuties,
    addDuty,
    updateDuty,
    deleteDuty,
    getCampDuties,
    getUserDuties
  }
})
