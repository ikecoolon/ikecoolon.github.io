<template>
  <div class="p-24px">
    <!-- 页面标题和营会选择 -->
    <div class="flex items-center justify-between mb-8px">
      <h1 class="text-24px font-600 text-gray-800">营会概况</h1>

      <!-- 营会选择器 -->
      <div class="flex items-center space-x-16px">
        <div class="text-14px text-gray-600">选择营会：</div>
        <a-select v-model:value="selectedCampId" placeholder="请选择营会" class="w-300px" @change="handleCampChange"
          show-search :filter-option="filterOption">
          <a-select-option value="">全部活动</a-select-option>
          <a-select-option v-for="camp in campStore.camps" :key="camp.id" :value="camp.id">
            <div class="flex items-start justify-between min-h-32px">
              <div class="flex-1 pr-8px">
                <div class="font-medium">{{ camp.name }}</div>
                <div class="text-xs text-gray-500">
                  {{ formatDate(camp.startDate) }} ~
                  {{ camp.endDate ? formatDate(camp.endDate) : '未设置' }}
                </div>
                <div class="text-xs text-blue-600 mt-1px">
                  {{ getCampActivityCount(camp.id) }} 个活动
                </div>
              </div>
            </div>
          </a-select-option>
        </a-select>

      </div>
    </div>

    <!-- 当没有营会数据时显示提示 -->
    <div v-if="campStore.camps.length === 0" class="text-center py-48px">
      <div class="text-16px text-gray-500 mb-8px">
        <i class="i-carbon:calendar mr-8px text-20px" />
        暂无营会数据
      </div>
      <div class="text-14px text-gray-400">
        请先在营会管理中创建营会数据
      </div>
    </div>

    <!-- 有营会数据时显示内容 -->
    <div v-else>



      <div class="grid grid-cols-1 lg:grid-cols-3 gap-24px" v-if="selectedCampId">


        <!-- 日历区域 -->
        <div class="lg:col-span-1" style="min-width: 320px;">
          <a-card :title="calendarTitle" :loading="loading" size="small">
            <!-- 营会视图 -->
            <div class="calendar-camp">
              <!-- 水平滚动日期容器 -->
              <div class="overflow-x-auto mb-16px scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
                style="scrollbar-width: thin; scrollbar-color: rgb(209 213 219) rgb(243 244 246);">
                <div class="flex gap-2 min-w-max px-2">
                  <div v-for="day in campDays" :key="day.format('YYYY-MM-DD')"
                    class="text-center p-8px bg-gray-50 rd-4px cursor-pointer hover:bg-blue-50 transition-colors flex-shrink-0 w-60px h-60px"
                    :class="{ 'bg-blue-100 border-2 border-blue-500': day.isSame(selectedDate, 'day') }"
                    @click="selectDate(day)">
                    <div class="text-12px text-gray-500">{{ getWeekdayText(day.day()) }}</div>
                    <div class="text-16px font-500"
                      :class="{ 'text-blue-600': day.isSame(selectedDate, 'day'), 'text-gray-700': !day.isSame(selectedDate, 'day') }">
                      {{ day.format('DD') }}
                    </div>
                  </div>
                </div>
              </div>


              <!-- 选中日期的活动列表 -->
              <div class="mb-16px">
                <a-divider class='m-2'></a-divider>
                <h3 class="text-16px font-500 text-gray-700  flex items-center">
                  <i class="i-carbon:calendar mr-8px text-blue-600" />
                  {{ selectedDate.format('MM月DD日') }} ({{ getFullWeekdayText(selectedDate.day()) }})
                </h3>
                <a-divider class='m-2'></a-divider>

                <!-- 上午活动 (6:00-12:00) -->
                <div class="mb-16px">
                  <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                    <i class="i-carbon:sun mr-6px text-orange-500" />
                    上午 (6:00-12:00)
                  </div>
                  <div class="space-y-6px ml-20px">
                    <div v-for="activity in getMorningActivities(selectedDate)" :key="activity.id"
                      class="p-10px border rounded-6px cursor-pointer hover:bg-blue-50 transition-colors"
                      :class="selectedActivity?.id === activity.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200'"
                      @click="handleActivityClick(activity)">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="text-14px font-500 text-gray-800">{{ activity.title }}</div>
                          <div class="text-12px text-gray-500">
                            {{ formatTime(activity.startTime) }} - {{ formatTime(activity.endTime) }}
                            <span class="ml-8px">
                              <i class="i-carbon:location mr-4px" />{{ activity.location }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="getMorningActivities(selectedDate).length === 0" class="text-12px text-gray-400 ml-4px">
                      暂无安排
                    </div>
                  </div>
                </div>

                <!-- 下午活动 (12:00-18:00) -->
                <div class="mb-16px">
                  <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                    <i class="i-carbon:time mr-6px text-green-500" />
                    下午 (12:00-18:00)
                  </div>
                  <div class="space-y-6px ml-20px">
                    <div v-for="activity in getAfternoonActivities(selectedDate)" :key="activity.id"
                      class="p-10px border rounded-6px cursor-pointer hover:bg-blue-50 transition-colors"
                      :class="selectedActivity?.id === activity.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200'"
                      @click="handleActivityClick(activity)">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="text-14px font-500 text-gray-800">{{ activity.title }}</div>
                          <div class="text-12px text-gray-500">
                            {{ formatTime(activity.startTime) }} - {{ formatTime(activity.endTime) }}
                            <span class="ml-8px">
                              <i class="i-carbon:location mr-4px" />{{ activity.location }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="getAfternoonActivities(selectedDate).length === 0"
                      class="text-12px text-gray-400 ml-4px">
                      暂无安排
                    </div>
                  </div>
                </div>

                <!-- 晚上活动 (18:00-24:00) -->
                <div>
                  <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                    <i class="i-carbon:moon mr-6px text-blue-500" />
                    晚上 (18:00-24:00)
                  </div>
                  <div class="space-y-6px ml-20px">
                    <div v-for="activity in getEveningActivities(selectedDate)" :key="activity.id"
                      class="p-10px border rounded-6px cursor-pointer hover:bg-blue-50 transition-colors"
                      :class="selectedActivity?.id === activity.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200'"
                      @click="handleActivityClick(activity)">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <div class="text-14px font-500 text-gray-800">{{ activity.title }}</div>
                          <div class="text-12px text-gray-500">
                            {{ formatTime(activity.startTime) }} - {{ formatTime(activity.endTime) }}
                            <span class="ml-8px">
                              <i class="i-carbon:location mr-4px" />{{ activity.location }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-if="getEveningActivities(selectedDate).length === 0" class="text-12px text-gray-400 ml-4px">
                      暂无安排
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-card>

        </div>

        <!-- 活动详情区域 -->
        <div class="lg:col-span-1" style="min-width: 320px;">
          <a-card title="活动详情" size="small">

            <div v-if="selectedActivity" class="space-y-12px">
              <div>
                <div class="text-12px text-gray-500 mb-4px">活动标题</div>
                <div class="text-14px text-gray-800">{{ selectedActivity.title }}</div>
              </div>

              <div>
                <div class="text-12px text-gray-500 mb-4px">活动描述</div>
                <div class="text-14px text-gray-600">{{ selectedActivity.description }}</div>
              </div>

              <div>
                <div class="text-12px text-gray-500 mb-4px">时间安排</div>
                <div class="text-14px text-gray-800">
                  {{ formatDateTime(selectedActivity.startTime) }} - {{ formatDateTime(selectedActivity.endTime) }}
                </div>
              </div>

              <div>
                <div class="text-12px text-gray-500 mb-4px">活动地点</div>
                <div class="text-14px text-gray-800">{{ selectedActivity.location }}</div>
              </div>

              <div v-if="selectedActivity?.notes">
                <div class="text-12px text-gray-500 mb-4px">备注说明</div>
                <div class="text-14px text-gray-600">{{ selectedActivity?.notes }}</div>
              </div>

              <div>
                <div class="text-12px text-gray-500 mb-6px">服侍者</div>
                <div class="flex flex-wrap gap-4px">
                  <div v-for="memberId in getActivityMembers(selectedActivity)" :key="memberId"
                    class="inline-flex items-center px-6px py-2px bg-blue-50 border border-blue-200 rounded-4px text-12px">
                    <span class="font-500 text-blue-800 mr-4px">{{ getMemberName(memberId) }}</span>
                    <span v-if="ministryStore.members.find(m => m.id === memberId)?.phone"
                      class="text-blue-600">
                      📞{{ ministryStore.members.find(m => m.id === memberId)?.phone }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 活动环节 -->
              <div>
                <div class="text-12px text-gray-500 mb-8px">活动环节 ({{ selectedActivity.phases?.length || 0 }}个)</div>
                <div class="space-y-12px max-h-500px overflow-y-auto">
                  <div v-for="(phase, index) in selectedActivity.phases" :key="phase.id"
                    class="p-12px border border-gray-200 rounded-8px bg-gray-50 hover:bg-gray-100 transition-colors">
                    <!-- 环节标题 -->
                    <div class="flex items-start mb-8px">
                      <div class="flex items-center space-x-8px flex-1 min-w-0">
                        <div class="w-24px h-24px bg-blue-500 text-white rounded-full flex items-center justify-center text-12px font-600 flex-shrink-0">
                          {{ index + 1 }}
                        </div>
                        <div class="text-15px font-600 text-gray-800 leading-relaxed break-words">{{ phase.title }}</div>
                      </div>
                    </div>

                    <!-- 环节描述 -->
                    <div v-if="phase.description" class="text-13px text-gray-600 mb-10px leading-relaxed break-words">
                      {{ phase.description }}
                    </div>

                    <!-- 负责人信息 -->
                    <div v-if="phase.assignedMembers && phase.assignedMembers.length > 0" class="mb-10px">
                      <div class="text-12px font-500 text-gray-700 mb-6px">负责人：</div>
                      <div class="space-y-4px">
                        <div v-for="memberId in phase.assignedMembers" :key="memberId"
                          class="flex items-center justify-between p-8px bg-blue-50 rounded-4px border border-blue-100">
                          <div class="text-13px font-500 text-blue-800 break-words min-w-0 flex-1">{{ getMemberName(memberId) }}</div>
                          <div v-if="ministryStore.members.find(m => m.id === memberId)?.phone"
                            class="text-12px text-blue-600 ml-8px flex-shrink-0">
                            📞 {{ ministryStore.members.find(m => m.id === memberId)?.phone }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 注意事项 -->
                    <div v-if="phase.notes" class="text-12px text-orange-700 bg-orange-50 border border-orange-200 p-8px rounded-4px leading-relaxed break-words">
                      <div class="flex items-start">
                        <i class="i-carbon:information mr-6px mt-1px text-orange-600 flex-shrink-0" />
                        <div class="flex-1">{{ phase.notes }}</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="!selectedActivity.phases || selectedActivity.phases.length === 0"
                    class="text-center py-16px text-gray-400 text-12px">
                    暂无活动环节
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-32px text-gray-400">
              点击活动查看详情
            </div>
          </a-card>
        </div>

        <!-- 职责分配区域 -->
        <div class="lg:col-span-1" style="min-width: 320px;">
          <a-card title="职责分配" size="small">
            <div class="space-y-12px  overflow-y-auto">
              <!-- 按类别分组显示职责 -->
              <div v-for="category in dutyCategories" :key="category.key">
                <div class="flex items-center gap-6px mb-8px">
                  <span>{{ category.icon }}</span>
                  <span class="font-500 text-14px">{{ category.label }}</span>
                  <span class="text-gray-500 text-12px">({{ getCategoryDuties(category.key).length }}项)</span>
                </div>

                <div class="space-y-6px ml-16px">
                  <div
                    v-for="duty in getCategoryDuties(category.key)"
                    :key="duty.id"
                    class="p-8px border border-gray-200 rounded-6px bg-gray-50"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="text-13px font-500 text-gray-800 mb-4px">{{ duty.title }}</div>
                        <div class="text-11px text-gray-600  mb-6px">{{ duty.description }}</div>

                        <div class="space-y-4px">
                          <!-- 负责人信息 -->
                          <div class="flex items-center gap-2px text-11px text-gray-500">
                            <i class="i-carbon:group" />
                            <span class="mr-4px">负责人：</span>
                          </div>
                          <div class="flex flex-wrap gap-4px">
                            <div v-for="assignee in duty.assignees" :key="assignee.userId"
                              class="inline-flex items-center px-4px py-2px bg-blue-50 border border-blue-200 rounded-4px text-10px">
                              <span class="font-500 text-blue-800 mr-2px">{{ getMemberName(assignee.userId) }}</span>
                              <span v-if="ministryStore.members.find(m => m.id === assignee.userId)?.phone"
                                class="text-blue-600">
                                📞{{ ministryStore.members.find(m => m.id === assignee.userId)?.phone }}
                              </span>
                            </div>
                          </div>

                          <!-- 时间范围 -->
                          <div v-if="duty.timeRange" class="flex items-center gap-2px text-11px text-gray-500">
                            <i class="i-carbon:time" />
                            <span>{{ formatDate(duty.timeRange.start) }} - {{ formatDate(duty.timeRange.end) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="getCategoryDuties(category.key).length === 0" class="text-11px text-gray-400 ml-16px py-4px">
                  暂无{{ category.label }}职责
                </div>
              </div>

              <div v-if="getCampDuties(selectedCampId).length === 0" class="text-center py-16px text-gray-400">
                <i class="i-carbon:group text-20px mb-4px block" />
                <div class="text-12px">暂无职责分配</div>
              </div>
            </div>
          </a-card>
        </div>
      </div>
      <div v-else>
        <div class="text-center py-32px text-gray-400">
          未选择任何营会
        </div>
        <a-empty ></a-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import { useCampStore } from '@/store/camp'
import { useDashboardStore } from '@/store/dashboard'
import type { Activity, Camp } from '@/types/activity'

/**
 * 仪表盘页面
 */


// 状态管理
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()
const campStore = useCampStore()
const dashboardStore = useDashboardStore()

// 响应式状态
const loading = ref(false)
const selectedActivity = ref<Activity | null>(null)
const selectedCampId = ref<string>('')

// 职责分类定义
const dutyCategories = [
  { key: 'preparation', label: '准备工作', icon: '📋' },
  { key: 'logistics', label: '后勤保障', icon: '🚛' },
  { key: 'coordination', label: '现场协调', icon: '👥' },
  { key: 'support', label: '技术支持', icon: '🔧' },
  { key: 'childcare', label: '孩童看护', icon: '👶' }
]

// 计算属性
const currentView = computed({
  get: () => dashboardStore.currentView,
  set: (value) => dashboardStore.switchView(value)
})
const selectedDate = computed(() => dashboardStore.selectedDate)

// 活动日程标题
const calendarTitle = computed(() => {
  if (!selectedCamp.value) return '活动日程()'

  const timeRange = campTimeRange.value

  return `活动日程 - (${timeRange})`
})
// 营会相关计算属性
const selectedCamp = computed(() => {
  if (!selectedCampId.value) return null
  return campStore.camps.find((camp: Camp) => camp.id === selectedCampId.value)
})

const campTimeRange = computed(() => {
  if (!selectedCamp.value) return '全部活动'

  const startDate = dayjs(selectedCamp.value.startDate).format('YYYY年M月D日')
  const endDate = selectedCamp.value.endDate
    ? dayjs(selectedCamp.value.endDate).format('YYYY年M月D日')
    : startDate

  return `${startDate}-${endDate}`
})


// 日期范围计算属性（基于所选营会或周视图）
const campDays = computed(() => {
  if (!selectedCamp.value) {
    // 如果没有选择营会，使用周视图
    return dashboardStore.weekDays
  }

  // 如果选择了营会，生成营会期间的所有日期
  const startDate = dayjs(selectedCamp.value.startDate)
  const endDate = selectedCamp.value.endDate ? dayjs(selectedCamp.value.endDate) : startDate.add(7, 'day')


  const days = []
  let current = startDate
  while (current.isBefore(endDate) || current.isSame(endDate)) {
    days.push(current)
    current = current.add(1, 'day')
  }
  return days
})


const todayActivities = computed(() => {
  const today = selectedDate.value.format('YYYY-MM-DD')
  return activityStore.activities.filter(activity =>
    dayjs(activity.date).format('YYYY-MM-DD') === today
  )
})





// 监听选中日期变化
watch(selectedDate, () => {
  // 如果是天视图，自动选择第一个活动
  if (currentView.value === 'day' && todayActivities.value.length > 0) {
    selectedActivity.value = todayActivities.value[0]
  }
})

/**
 * 格式化时间
 */
const formatTime = (date: string | Date) => {
  try {
    return dayjs(date).format('HH:mm')
  } catch (error) {
    console.warn('格式化时间出错:', date, error)
    return '时间未知'
  }
}

const formatDateTime = (date: string | Date) => {
  try {
    return dayjs(date).format('MM-DD HH:mm')
  } catch (error) {
    console.warn('格式化日期时间出错:', date, error)
    return '时间未知'
  }
}

const formatDate = (date: string | Date) => {
  try {
    return dayjs(date).format('YYYY年MM月DD日')
  } catch (error) {
    console.warn('格式化日期出错:', date, error)
    return '日期未知'
  }
}



/**
 * 获取成员姓名
 */
const getMemberName = (memberId: string) => {
  const member = ministryStore.members.find(m => m.id === memberId)
  return member?.name || `成员${memberId}`
}




/**
 * 获取上午活动（6:00-12:00）
 */
const getMorningActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      try {
        // 确保时间字段存在
        if (!activity.startTime) return false

        const activityDay = dayjs(activity.startTime).format('YYYY-MM-DD')
        const activityHour = dayjs(activity.startTime).hour()

        // 检查日期匹配且时间在上午范围内
        const dateMatches = activityDay === dayStr
        const timeMatches = activityHour >= 6 && activityHour < 12
        const campMatches = !selectedCampId.value || activity.campId === selectedCampId.value

        return dateMatches && timeMatches && campMatches
      } catch (error) {
        console.warn('处理上午活动时出错:', activity.title, error)
        return false
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

/**
 * 获取下午活动（12:00-18:00）
 */
const getAfternoonActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      try {
        // 确保时间字段存在
        if (!activity.startTime) return false

        const activityDay = dayjs(activity.startTime).format('YYYY-MM-DD')
        const activityHour = dayjs(activity.startTime).hour()

        // 检查日期匹配且时间在下午范围内
        const dateMatches = activityDay === dayStr
        const timeMatches = activityHour >= 12 && activityHour < 18
        const campMatches = !selectedCampId.value || activity.campId === selectedCampId.value

        return dateMatches && timeMatches && campMatches
      } catch (error) {
        console.warn('处理下午活动时出错:', activity.title, error)
        return false
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

/**
 * 获取晚上活动（18:00-24:00）
 */
const getEveningActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      try {
        // 确保时间字段存在
        if (!activity.startTime) return false

        const activityDay = dayjs(activity.startTime).format('YYYY-MM-DD')
        const activityHour = dayjs(activity.startTime).hour()

        // 检查日期匹配且时间在晚上范围内
        const dateMatches = activityDay === dayStr
        const timeMatches = activityHour >= 18
        const campMatches = !selectedCampId.value || activity.campId === selectedCampId.value

        return dateMatches && timeMatches && campMatches
      } catch (error) {
        console.warn('处理晚上活动时出错:', activity.title, error)
        return false
      }
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

/**
 * 获取简写星期中文
 */
const getWeekdayText = (dayIndex: number) => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[dayIndex]}`
}

/**
 * 获取完整星期中文
 */
const getFullWeekdayText = (dayIndex: number) => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[dayIndex]
}

/**
 * 处理活动点击事件
 */
const handleActivityClick = (activity: Activity) => {
  selectedActivity.value = activity
}


/**
 * 获取活动的参与成员列表
 */
const getActivityMembers = (activity: Activity) => {
  const memberIds = new Set<string>()
  if (activity.phases) {
    activity.phases.forEach(phase => {
      if (phase.assignedMembers) {
        phase.assignedMembers.forEach(memberId => memberIds.add(memberId))
      }
    })
  }
  return Array.from(memberIds)
}




/**
 * 选择日期
 */
const selectDate = (date: dayjs.Dayjs) => {
  dashboardStore.selectDate(date)
  selectedActivity.value = null
}

/**
 * 营会选择变化处理
 */
const handleCampChange = () => {
  // 如果选择了营会，设置选中日期为营会的起始日期
  if (selectedCamp.value) {
    dashboardStore.selectDate(dayjs(selectedCamp.value.startDate))
    // 刷新数据以确保新选择的营会活动正确显示
    refreshData()
  }
}


/**
 * 获取营会的活动数量
 */
const getCampActivityCount = (campId: string) => {
  return activityStore.activities.filter(activity => activity.campId === campId).length
}

/**
 * 获取指定类别的职责列表
 */
const getCategoryDuties = (category: string) => {
  const campDuties = getCampDuties(selectedCampId.value)
  return campDuties.filter(duty => duty.category === category)
}

/**
 * 获取营会的职责列表（用于模板中的计算）
 * 根据当前选择的日期过滤职责：
 * - 如果职责有时间段，只有当选择日期在这个时间段内才显示
 * - 如果职责没有时间段，表示贯穿整个营会，始终显示
 */
const getCampDuties = (campId: string) => {
  const allDuties = campStore.getCampDuties(campId)

  // 如果没有选择营会，直接返回所有职责
  if (!selectedCampId.value) return allDuties

  // 根据当前选择的日期过滤职责
  return allDuties.filter(duty => {
    // 如果职责没有时间段，表示贯穿整个营会，始终显示
    if (!duty.timeRange) return true

    // 如果有时间段，检查当前选择的日期是否在范围内
    const selectedDateStr = selectedDate.value.format('YYYY-MM-DD')
    const startDateStr = dayjs(duty.timeRange.start).format('YYYY-MM-DD')
    const endDateStr = dayjs(duty.timeRange.end).format('YYYY-MM-DD')

    return selectedDateStr >= startDateStr && selectedDateStr <= endDateStr
  })
}

/**
 * 过滤营会选项
 */
const filterOption = (input: string, option: any) => {
  // 从campStore中找到对应的camp数据
  const camp = campStore.camps.find(c => c.id === option.value)
  if (!camp) return false

  // 只搜索营会名称
  return camp.name.toLowerCase().includes(input.toLowerCase())
}

/**
 * 刷新数据
 */
const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      activityStore.fetchActivities(),
      ministryStore.fetchMembers(),
      campStore.fetchCamps(),
      campStore.fetchDuties()
    ])

    // 数据加载完成后，如果有营会数据且没有选中，则默认选中第一个
    const camps = campStore.camps
    if (camps.length > 0 && !selectedCampId.value) {
      selectedCampId.value = camps[0].id
    }
  } finally {
    loading.value = false
  }
}

/**
 * 初始化数据
 */
onMounted(() => {
  refreshData()
})
</script>

