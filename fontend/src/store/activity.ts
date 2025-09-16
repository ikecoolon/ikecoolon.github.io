import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { request } from '@/api'
import type { Activity, Course } from '@/types/activity'
import dayjs from 'dayjs'

/**
 * 活动管理状态
 */
export const useActivityStore = defineStore('activity', () => {
  // 状态
  const activities = ref<Activity[]>([])
  const courses = ref<Course[]>([])
  const loading = ref(false)

  // 计算属性
  const todayActivities = computed(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return activities.value.filter(activity =>
      dayjs(activity.date).format('YYYY-MM-DD') === today
    )
  })

  const weekActivities = computed(() => {
    const startOfWeek = dayjs().startOf('week')
    const endOfWeek = dayjs().endOf('week')

    return activities.value.filter(activity => {
      const activityDate = dayjs(activity.date)
      return activityDate.isAfter(startOfWeek) && activityDate.isBefore(endOfWeek)
    })
  })

  /**
   * 获取所有活动
   */
  const fetchActivities = async () => {
    loading.value = true
    try {
      const data = await request.get<Activity[]>('camps.json')
      activities.value = data || []
    } catch (error) {
      console.error('获取活动失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取课程信息
   */
  const fetchCourses = async () => {
    loading.value = true
    try {
      const data = await request.get<Course[]>('courses.json')
      courses.value = data || []
    } catch (error) {
      console.error('获取课程失败:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存活动数据
   */
  const saveActivities = async () => {
    try {
      await request.post('camps.json', activities.value)
    } catch (error) {
      console.error('保存活动失败:', error)
      throw error
    }
  }

  /**
   * 保存课程数据
   */
  const saveCourses = async () => {
    try {
      await request.post('courses.json', courses.value)
    } catch (error) {
      console.error('保存课程失败:', error)
      throw error
    }
  }

  /**
   * 添加活动
   */
  const addActivity = async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
    try {
      const newActivity: Activity = {
        ...activity,
        id: `activity_${Date.now()}`,
        createdAt: new Date()
      }

      activities.value.push(newActivity)
      await saveActivities()
      return newActivity
    } catch (error) {
      console.error('添加活动失败:', error)
      throw error
    }
  }

  /**
   * 更新活动
   */
  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      const index = activities.value.findIndex(a => a.id === id)
      if (index !== -1) {
        activities.value[index] = { ...activities.value[index], ...updates }
        await saveActivities()
      }
    } catch (error) {
      console.error('更新活动失败:', error)
      throw error
    }
  }

  /**
   * 删除活动
   */
  const deleteActivity = async (id: string) => {
    try {
      const index = activities.value.findIndex(a => a.id === id)
      if (index !== -1) {
        activities.value.splice(index, 1)
        await saveActivities()
      }
    } catch (error) {
      console.error('删除活动失败:', error)
      throw error
    }
  }

  /**
   * 添加课程
   */
  const addCourse = async (course: Omit<Course, 'id' | 'createdAt'>) => {
    try {
      const newCourse: Course = {
        ...course,
        id: `course_${Date.now()}`,
        createdAt: new Date()
      }

      courses.value.push(newCourse)
      await saveCourses()
      return newCourse
    } catch (error) {
      console.error('添加课程失败:', error)
      throw error
    }
  }

  /**
   * 更新课程
   */
  const updateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      const index = courses.value.findIndex(c => c.id === id)
      if (index !== -1) {
        courses.value[index] = { ...courses.value[index], ...updates }
        await saveCourses()
      }
    } catch (error) {
      console.error('更新课程失败:', error)
      throw error
    }
  }

  /**
   * 删除课程
   */
  const deleteCourse = async (id: string) => {
    try {
      const index = courses.value.findIndex(c => c.id === id)
      if (index !== -1) {
        courses.value.splice(index, 1)
        await saveCourses()
      }
    } catch (error) {
      console.error('删除课程失败:', error)
      throw error
    }
  }

  return {
    // 状态
    activities,
    courses,
    loading,

    // 计算属性
    todayActivities,
    weekActivities,

    // 操作
    fetchActivities,
    fetchCourses,
    saveActivities,
    saveCourses,
    addActivity,
    updateActivity,
    deleteActivity,
    addCourse,
    updateCourse,
    deleteCourse
  }
})
