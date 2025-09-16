<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="mb-24px">
      <h1 class="text-24px font-600 text-gray-800 mb-8px">仪表盘</h1>
      <p class="text-14px text-gray-500">营会活动总览和日程安排</p>
    </div>

    <!-- 统计卡片 -->
    <div class="mb-24px">
      <div class="flex items-center justify-between mb-12px">
        <h2 class="text-16px font-500 text-gray-700">数据概览</h2>
        <a-button 
          type="text" 
          size="small" 
          @click="statsCollapsed = !statsCollapsed"
          class="text-gray-500 hover:text-blue-600"
        >
          <template #icon>
            <i 
              class="text-14px transition-transform duration-200"
              :class="statsCollapsed ? 'i-carbon:chevron-down' : 'i-carbon:chevron-up'"
            />
          </template>
          {{ statsCollapsed ? '展开' : '收起' }}
        </a-button>
      </div>
      
      <div 
        v-show="!statsCollapsed" 
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16px transition-all duration-300"
      >
        <a-card size="small" class="text-center hover:shadow-md transition-shadow">
          <div class="text-32px font-600 text-blue-600 mb-8px">{{ stats.totalActivities }}</div>
          <div class="text-14px text-gray-600">总活动数</div>
        </a-card>
        
        <a-card size="small" class="text-center hover:shadow-md transition-shadow">
          <div class="text-32px font-600 text-green-600 mb-8px">{{ stats.todayActivities }}</div>
          <div class="text-14px text-gray-600">今日活动</div>
        </a-card>
        
        <a-card size="small" class="text-center hover:shadow-md transition-shadow">
          <div class="text-32px font-600 text-orange-600 mb-8px">{{ stats.totalMembers }}</div>
          <div class="text-14px text-gray-600">服侍人员</div>
        </a-card>
        
        <a-card size="small" class="text-center hover:shadow-md transition-shadow">
          <div class="text-32px font-600 text-purple-600 mb-8px">{{ stats.totalMinistries }}</div>
          <div class="text-14px text-gray-600">服侍类型</div>
        </a-card>
      </div>
    </div>

    <!-- 日历视图控制 -->
    <div class="flex items-center justify-between mb-24px">
      <div class="flex items-center space-x-16px">
        <div class="text-16px font-500 text-blue-600">
          <i class="i-carbon:calendar mr-8px" />
          周视图
        </div>
        
        <div class="text-18px font-500 text-gray-700">
          {{ viewTitle }}
        </div>
      </div>

      <div class="flex items-center space-x-8px">
        <a-button @click="navigatePrev">
          <template #icon>
            <i class="i-carbon:chevron-left" />
          </template>
        </a-button>
        
        <a-button @click="goToToday">今天</a-button>
        
        <a-button @click="navigateNext">
          <template #icon>
            <i class="i-carbon:chevron-right" />
          </template>
        </a-button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-24px">
      <!-- 日历区域 -->
      <div class="lg:col-span-2">
        <a-card title="活动日程" :loading="loading">
          <!-- 周视图 -->
          <div class="calendar-week">
            <div class="grid grid-cols-7 gap-1 mb-16px">
              <div
                v-for="day in weekDays"
                :key="day.format('YYYY-MM-DD')"
                class="text-center p-8px bg-gray-50 rounded-4px cursor-pointer hover:bg-blue-50 transition-colors"
                :class="{ 'bg-blue-100 border-2 border-blue-500': day.isSame(selectedDate, 'day') }"
                @click="selectDate(day)"
              >
                <div class="text-12px text-gray-500">{{ day.format('ddd') }}</div>
                <div 
                  class="text-16px font-500"
                  :class="{ 'text-blue-600': day.isSame(selectedDate, 'day'), 'text-gray-700': !day.isSame(selectedDate, 'day') }"
                >
                  {{ day.format('DD') }}
                </div>
                <!-- 显示当天活动数量 -->
                <div v-if="getDayActivitiesCount(day) > 0" class="text-10px text-blue-600 mt-1">
                  {{ getDayActivitiesCount(day) }}项活动
                </div>
              </div>
            </div>
            
            <!-- 选中日期的活动列表 -->
            <div class="mb-16px">
              <h3 class="text-16px font-500 text-gray-700 mb-12px flex items-center">
                <i class="i-carbon:calendar mr-8px text-blue-600" />
                {{ selectedDate.format('MM月DD日') }} ({{ selectedDate.format('dddd') }})
              </h3>
              
              <!-- 上午活动 -->
              <div class="mb-16px">
                <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                  <i class="i-carbon:sun mr-6px text-orange-500" />
                  上午
                </div>
                <div class="space-y-6px ml-20px">
                  <div
                    v-for="activity in getMorningActivities(selectedDate)"
                    :key="activity.id"
                    class="p-10px border border-gray-200 rounded-6px cursor-pointer hover:bg-blue-50 transition-colors"
                    @click="handleActivityClick(activity)"
                  >
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
                      <a-tag :color="getStatusColor(activity.status)" size="small">
                        {{ getStatusText(activity.status) }}
                      </a-tag>
                    </div>
                  </div>
                  <div v-if="getMorningActivities(selectedDate).length === 0" class="text-12px text-gray-400 ml-4px">
                    暂无安排
                  </div>
                </div>
              </div>
              
              <!-- 下午活动 -->
              <div>
                <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                  <i class="i-carbon:moon mr-6px text-blue-500" />
                  下午/晚上
                </div>
                <div class="space-y-6px ml-20px">
                  <div
                    v-for="activity in getAfternoonActivities(selectedDate)"
                    :key="activity.id"
                    class="p-10px border border-gray-200 rounded-6px cursor-pointer hover:bg-blue-50 transition-colors"
                    @click="handleActivityClick(activity)"
                  >
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
                      <a-tag :color="getStatusColor(activity.status)" size="small">
                        {{ getStatusText(activity.status) }}
                      </a-tag>
                    </div>
                  </div>
                  <div v-if="getAfternoonActivities(selectedDate).length === 0" class="text-12px text-gray-400 ml-4px">
                    暂无安排
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </div>

      <!-- 详情侧栏 -->
      <div class="space-y-24px">
        <!-- 活动详情 -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center justify-between">
              <span>{{ detailTitle }}</span>
              <a-radio-group 
                v-if="selectedActivity" 
                v-model:value="detailViewMode" 
                size="small"
                @change="handleDetailViewChange"
              >
                <a-radio-button value="activity">活动</a-radio-button>
                <a-radio-button value="course">课程</a-radio-button>
                <a-radio-button value="member">人员</a-radio-button>
              </a-radio-group>
            </div>
          </template>
          
          <div v-if="selectedActivity">
            <!-- 活动详情视图 -->
            <div v-if="detailViewMode === 'activity'" class="space-y-12px">
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
                  {{ formatDateTime(selectedActivity.startTime) }} <br>
                  至 {{ formatDateTime(selectedActivity.endTime) }}
                </div>
              </div>
              
              <div>
                <div class="text-12px text-gray-500 mb-4px">活动地点</div>
                <div class="text-14px text-gray-800">{{ selectedActivity.location }}</div>
              </div>
              
              <div v-if="selectedActivity.notes">
                <div class="text-12px text-gray-500 mb-4px">备注说明</div>
                <div class="text-14px text-gray-600">{{ selectedActivity.notes }}</div>
              </div>
              
              <div>
                <div class="text-12px text-gray-500 mb-4px">参与人员</div>
                <div class="space-y-4px">
                  <a-tag
                    v-for="memberId in selectedActivity.assignedMembers"
                    :key="memberId"
                    class="mb-4px cursor-pointer hover:bg-blue-100"
                    @click="switchToMemberView(memberId)"
                  >
                    {{ getMemberName(memberId) }}
                  </a-tag>
                </div>
              </div>
            </div>

            <!-- 课程详情视图 -->
            <div v-else-if="detailViewMode === 'course'" class="space-y-12px">
              <div v-if="selectedCourse">
                <div>
                  <div class="text-12px text-gray-500 mb-4px">课程名称</div>
                  <div class="text-14px text-gray-800">{{ selectedCourse.title }}</div>
                </div>
                
                <div v-if="selectedCourse.instructor">
                  <div class="text-12px text-gray-500 mb-4px">讲师</div>
                  <div class="text-14px text-gray-800">{{ selectedCourse.instructor }}</div>
                </div>
                
                <div v-if="selectedCourse.description">
                  <div class="text-12px text-gray-500 mb-4px">课程描述</div>
                  <div class="text-14px text-gray-600">{{ selectedCourse.description }}</div>
                </div>
                
                <div v-if="selectedCourse.duration">
                  <div class="text-12px text-gray-500 mb-4px">课程时长</div>
                  <div class="text-14px text-gray-800">{{ selectedCourse.duration }}分钟</div>
                </div>
                
                <div>
                  <div class="text-12px text-gray-500 mb-4px">相关活动</div>
                  <div class="space-y-4px">
                    <a-tag
                      v-for="activityId in selectedCourse.activities"
                      :key="activityId"
                      class="mb-4px"
                      color="blue"
                    >
                      {{ getActivityTitle(activityId) }}
                    </a-tag>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-20px text-gray-400">
                该活动暂无关联课程信息
              </div>
            </div>

            <!-- 人员详情视图 -->
            <div v-else-if="detailViewMode === 'member'" class="space-y-12px">
              <div v-if="selectedMember">
                <div>
                  <div class="text-12px text-gray-500 mb-4px">姓名</div>
                  <div class="text-14px text-gray-800">{{ selectedMember.name }}</div>
                </div>
                
                <div v-if="selectedMember.phone">
                  <div class="text-12px text-gray-500 mb-4px">联系电话</div>
                  <div class="text-14px text-gray-800">{{ selectedMember.phone }}</div>
                </div>
                
                <div v-if="selectedMember.skills && selectedMember.skills.length > 0">
                  <div class="text-12px text-gray-500 mb-4px">技能特长</div>
                  <div class="space-y-4px">
                    <a-tag
                      v-for="skill in selectedMember.skills"
                      :key="skill"
                      class="mb-4px"
                      color="green"
                    >
                      {{ skill }}
                    </a-tag>
                  </div>
                </div>
                
                <div v-if="selectedMember.availability">
                  <div class="text-12px text-gray-500 mb-4px">可服侍时间</div>
                  <div class="text-14px text-gray-800">{{ selectedMember.availability }}</div>
                </div>
                
                <div v-if="selectedMember.notes">
                  <div class="text-12px text-gray-500 mb-4px">注意事项</div>
                  <div class="text-14px text-gray-600">{{ selectedMember.notes }}</div>
                </div>
                
                <div>
                  <div class="text-12px text-gray-500 mb-4px">其他服侍安排</div>
                  <div class="space-y-6px max-h-200px overflow-y-auto">
                    <div
                      v-for="activity in getMemberOtherActivities(selectedMember.id)"
                      :key="activity.id"
                      class="p-8px border border-gray-200 rounded-4px cursor-pointer hover:bg-blue-50"
                      @click="selectedActivity = activity"
                    >
                      <div class="text-13px font-500 text-gray-800">{{ activity.title }}</div>
                      <div class="text-11px text-gray-500">
                        {{ formatDateTime(activity.startTime) }}
                      </div>
                    </div>
                    <div v-if="getMemberOtherActivities(selectedMember.id).length === 0" class="text-12px text-gray-400">
                      暂无其他服侍安排
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-20px text-gray-400">
                请选择要查看的服侍人员
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-32px text-gray-400">
            点击活动查看详情
          </div>
        </a-card>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/auth'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import { useDashboardStore } from '@/store/dashboard'
import type { Activity } from '@/types/activity'

/**
 * 仪表盘页面
 */

// 路由
const router = useRouter()

// 状态管理
const authStore = useAuthStore()
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()
const dashboardStore = useDashboardStore()

// 响应式状态
const loading = ref(false)
const selectedActivity = ref<Activity | null>(null)
const statsCollapsed = ref(false)
const detailViewMode = ref<'activity' | 'course' | 'member'>('activity')
const selectedMemberId = ref<string>('')

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentView = computed({
  get: () => dashboardStore.currentView,
  set: (value) => dashboardStore.switchView(value)
})
const selectedDate = computed(() => dashboardStore.selectedDate)
const viewTitle = computed(() => dashboardStore.viewTitle)
const weekDays = computed(() => dashboardStore.weekDays)

const todayActivities = computed(() => {
  const today = selectedDate.value.format('YYYY-MM-DD')
  return activityStore.activities.filter(activity => 
    dayjs(activity.startTime).format('YYYY-MM-DD') === today
  )
})

const weekActivities = computed(() => activityStore.weekActivities)

// 统计数据
const stats = computed(() => ({
  totalActivities: activityStore.activities.length,
  todayActivities: activityStore.todayActivities.length,
  totalMembers: ministryStore.members.length,
  totalMinistries: ministryStore.ministries.length
}))

// 详情面板相关计算属性
const detailTitle = computed(() => {
  if (!selectedActivity.value) return '活动详情'
  
  switch (detailViewMode.value) {
    case 'course':
      return '课程详情'
    case 'member':
      return '人员详情'
    default:
      return '活动详情'
  }
})

const selectedCourse = computed(() => {
  if (!selectedActivity.value) return null
  
  // 查找与当前活动相关的课程
  return activityStore.courses.find(course => 
    course.activities && course.activities.includes(selectedActivity.value!.id)
  )
})

const selectedMember = computed(() => {
  if (!selectedMemberId.value) {
    // 如果没有选择特定成员，默认显示第一个参与成员
    if (selectedActivity.value && selectedActivity.value.assignedMembers.length > 0) {
      return ministryStore.members.find(m => m.id === selectedActivity.value!.assignedMembers[0])
    }
    return null
  }
  
  return ministryStore.members.find(m => m.id === selectedMemberId.value)
})

// 监听选中日期变化
watch(selectedDate, (newDate) => {
  // 如果是天视图，自动选择第一个活动
  if (currentView.value === 'day' && todayActivities.value.length > 0) {
    selectedActivity.value = todayActivities.value[0]
  }
})

/**
 * 格式化时间
 */
const formatTime = (date: Date) => {
  return dayjs(date).format('HH:mm')
}

const formatDateTime = (date: Date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colors = {
    planned: 'blue',
    ongoing: 'green',
    completed: 'gray',
    cancelled: 'red'
  }
  return colors[status as keyof typeof colors] || 'default'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const texts = {
    planned: '计划中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status as keyof typeof texts] || status
}

/**
 * 获取成员姓名
 */
const getMemberName = (memberId: string) => {
  const member = ministryStore.members.find(m => m.id === memberId)
  return member?.name || `成员${memberId}`
}

/**
 * 获取某天的活动数量
 */
const getDayActivitiesCount = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities.filter(activity => 
    dayjs(activity.startTime).format('YYYY-MM-DD') === dayStr
  ).length
}

/**
 * 获取上午活动（12点前）
 */
const getMorningActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      const activityDay = dayjs(activity.startTime).format('YYYY-MM-DD')
      const activityHour = dayjs(activity.startTime).hour()
      return activityDay === dayStr && activityHour < 12
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

/**
 * 获取下午/晚上活动（12点后）
 */
const getAfternoonActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      const activityDay = dayjs(activity.startTime).format('YYYY-MM-DD')
      const activityHour = dayjs(activity.startTime).hour()
      return activityDay === dayStr && activityHour >= 12
    })
    .sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf())
}

/**
 * 处理活动点击事件
 */
const handleActivityClick = (activity: Activity) => {
  selectedActivity.value = activity
  detailViewMode.value = 'activity'
  selectedMemberId.value = ''
}

/**
 * 获取活动标题
 */
const getActivityTitle = (activityId: string) => {
  const activity = activityStore.activities.find(a => a.id === activityId)
  return activity ? activity.title : '未知活动'
}

/**
 * 获取成员的其他服侍安排
 */
const getMemberOtherActivities = (memberId: string) => {
  return activityStore.activities.filter(activity => 
    activity.assignedMembers.includes(memberId) && 
    activity.id !== selectedActivity.value?.id
  )
}

/**
 * 切换到成员视图
 */
const switchToMemberView = (memberId: string) => {
  detailViewMode.value = 'member'
  selectedMemberId.value = memberId
}

/**
 * 处理详情视图切换
 */
const handleDetailViewChange = () => {
  if (detailViewMode.value === 'member' && !selectedMemberId.value) {
    // 如果切换到成员视图但没有选择成员，自动选择第一个
    if (selectedActivity.value && selectedActivity.value.assignedMembers.length > 0) {
      selectedMemberId.value = selectedActivity.value.assignedMembers[0]
    }
  }
}

/**
 * 处理视图切换
 */
const handleViewChange = () => {
  selectedActivity.value = null
}

/**
 * 选择日期
 */
const selectDate = (date: dayjs.Dayjs) => {
  dashboardStore.selectDate(date)
  selectedActivity.value = null
}

/**
 * 导航操作
 */
const navigatePrev = () => {
  dashboardStore.navigatePrev()
  selectedActivity.value = null
}

const navigateNext = () => {
  dashboardStore.navigateNext()
  selectedActivity.value = null
}

const goToToday = () => {
  dashboardStore.goToToday()
  selectedActivity.value = null
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
      ministryStore.fetchMinistries()
    ])
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

<style scoped>
.calendar-week, .calendar-day {
  min-height: 400px;
}
</style>
