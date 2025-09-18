import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

/**
 * 仪表盘状态管理
 */
export const useDashboardStore = defineStore('dashboard', () => {
  // 状态
  const currentView = ref<'week' | 'day'>('week')
  const selectedDate = ref(dayjs())
  const loading = ref(false)


  const weekDays = computed(() => {
    const days = []
    const startOfWeek = selectedDate.value.startOf('week')
    
    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'))
    }
    
    return days
  })

  /**
   * 切换视图模式
   */
  const switchView = (view: 'week' | 'day') => {
    currentView.value = view
  }

  /**
   * 选择日期
   */
  const selectDate = (date: dayjs.Dayjs) => {
    selectedDate.value = date
  }

  /**
   * 导航到上一周/天
   */
  const navigatePrev = () => {
    if (currentView.value === 'week') {
      selectedDate.value = selectedDate.value.subtract(1, 'week')
    } else {
      selectedDate.value = selectedDate.value.subtract(1, 'day')
    }
  }

  /**
   * 导航到下一周/天
   */
  const navigateNext = () => {
    if (currentView.value === 'week') {
      selectedDate.value = selectedDate.value.add(1, 'week')
    } else {
      selectedDate.value = selectedDate.value.add(1, 'day')
    }
  }

  /**
   * 回到今天
   */
  const goToToday = () => {
    selectedDate.value = dayjs()
  }

  return {
    // 状态
    currentView,
    selectedDate,
    loading,
    
    // 计算属性
    weekDays,
    
    // 操作
    switchView,
    selectDate,
    navigatePrev,
    navigateNext,
    goToToday
  }
})
