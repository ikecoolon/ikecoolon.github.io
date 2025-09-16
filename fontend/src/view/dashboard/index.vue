<template>
  <div class="p-24px">
    <!-- 页面标题和营会选择 -->
      <div class="flex items-center justify-between mb-8px">
        <h1 class="text-24px font-600 text-gray-800">营会概况</h1>

        <!-- 营会选择器 -->
        <div class="flex items-center space-x-16px">
          <div class="text-14px text-gray-600">选择营会：</div>
          <a-select
            v-model:value="selectedCampId"
            placeholder="请选择营会"
            class="w-300px"
            @change="handleCampChange"
            show-search
            :filter-option="filterOption"
          >
            <a-select-option value="">全部活动</a-select-option>
            <a-select-option
              v-for="camp in campStore.camps"
              :key="camp.id"
              :value="camp.id"
            >
              <div class="flex items-start justify-between min-h-32px">
                <div class="flex-1 pr-8px">
                  <div class="font-medium">{{ camp.name }}</div>
                  <div class="text-xs text-gray-500">
                    {{ formatDate(camp.startDate) }} ~
                    {{ camp.endDate ? formatDate(camp.endDate) : '未设置' }}
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <a-tag
                    :color="getCampStatusColor(camp.status)"
                    size="small"
                  >
                    {{ getCampStatusText(camp.status) }}
                  </a-tag>
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
    <!-- 统计卡片 -->
    <div class="mb-24px">
      <div class="flex items-center  mb-12px">
        <h2 class="text-16px font-500 text-gray-700">统计数据</h2>
        <a-button 
          type="text" 
          size="small" 
          @click="statsCollapsed = !statsCollapsed"
          class="text-gray-500 hover:text-blue-600 ml-2"
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
        
      </div>
    </div>

    

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-24px">
      <!-- 日历区域 -->
      <div class="lg:col-span-2">
        <a-card :title="`活动日程(${ viewTitle })`" :loading="loading">
          <!-- 营会视图 -->
          <div class="calendar-camp">
            <div class="grid grid-cols-7 gap-1 mb-16px">
              <div
                v-for="day in visibleDays"
                :key="day.format('YYYY-MM-DD')"
                class="text-center p-8px bg-gray-50 rounded-4px cursor-pointer hover:bg-blue-50 transition-colors"
                :class="{ 'bg-blue-100 border-2 border-blue-500': day.isSame(selectedDate, 'day') }"
                @click="selectDate(day)"
              >
                <div class="text-12px text-gray-500">{{ getWeekdayText(day.day()) }}</div>
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

            <!-- 滑动控制 -->
            <div v-if="campDays.length > 7" class="flex items-center justify-center space-x-8px mb-16px">
              <a-button
                size="small"
                :disabled="!canScrollLeft"
                @click="scrollCalendar(-7)"
              >
                <template #icon>
                  <i class="i-carbon:chevron-left" />
                </template>
                上一页
              </a-button>

              <span class="text-12px text-gray-500">
                {{ calendarStartIndex + 1 }}-{{ Math.min(calendarStartIndex + 7, campDays.length) }} /
                {{ campDays.length }} 天
              </span>

              <a-button
                size="small"
                :disabled="!canScrollRight"
                @click="scrollCalendar(7)"
              >
                <template #icon>
                  <i class="i-carbon:chevron-right" />
                </template>
                下一页
              </a-button>
            </div>
            
            <!-- 选中日期的活动列表 -->
            <div class="mb-16px">
              <h3 class="text-16px font-500 text-gray-700 mb-12px flex items-center">
                <i class="i-carbon:calendar mr-8px text-blue-600" />
                {{ selectedDate.format('MM月DD日') }} ({{ getFullWeekdayText(selectedDate.day()) }})
              </h3>
              
              <!-- 上午活动 (6:00-12:00) -->
              <div class="mb-16px">
                <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                  <i class="i-carbon:sun mr-6px text-orange-500" />
                  上午 (6:00-12:00)
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

              <!-- 下午活动 (12:00-18:00) -->
              <div class="mb-16px">
                <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                  <i class="i-carbon:time mr-6px text-green-500" />
                  下午 (12:00-18:00)
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

              <!-- 晚上活动 (18:00-24:00) -->
              <div>
                <div class="text-14px font-500 text-gray-600 mb-8px flex items-center">
                  <i class="i-carbon:moon mr-6px text-blue-500" />
                  晚上 (18:00-24:00)
                </div>
                <div class="space-y-6px ml-20px">
                  <div
                    v-for="activity in getEveningActivities(selectedDate)"
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
                  <div v-if="getEveningActivities(selectedDate).length === 0" class="text-12px text-gray-400 ml-4px">
                    暂无安排
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-card>

        <!-- 职责清单 -->
        <a-card title="职责清单" class="mt-24px" :loading="loading">
          <div class="space-y-16px">
            <!-- 按类别分组显示职责 -->
            <div v-for="category in dutyCategories" :key="category.key">
              <div class="text-14px font-500 text-gray-700 mb-8px flex items-center">
                <span class="mr-4px">{{ category.icon }}</span>
                {{ category.label }} ({{ getCategoryDuties(category.key).length }}项)
              </div>

              <div class="space-y-8px ml-20px">
                <div
                  v-for="duty in getCategoryDuties(category.key)"
                  :key="duty.id"
                  class="duty-item"
                  @click="handleDutyClick(duty)"
                >
                  <div class="duty-card-content">
                    <div class="duty-title">{{ duty.title }}</div>
                    <div class="duty-description">{{ duty.description }}</div>

                    <div class="duty-meta">
                      <div class="duty-meta-item">
                        <i class="i-carbon:group" />
                        <span>{{ duty.assignees.map(a => a.userName).join('、') }}</span>
                      </div>
                      <div v-if="duty.timeRange" class="duty-meta-item">
                        <i class="i-carbon:time" />
                        <span>{{ formatDate(duty.timeRange.start) }} - {{ formatDate(duty.timeRange.end) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="getCategoryDuties(category.key).length === 0" class="text-12px text-gray-400 ml-20px py-8px">
                暂无{{ category.label }}职责
              </div>
            </div>

            <div v-if="getCurrentCampDuties().length === 0" class="text-center py-20px text-gray-400">
              暂无职责分配
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
                v-if="selectedActivity || selectedDuty"
                v-model:value="detailViewMode"
                size="small"
                @change="handleDetailViewChange"
              >
                <a-radio-button value="activity">活动</a-radio-button>
                <a-radio-button value="course">课程</a-radio-button>
                <a-radio-button value="member">人员</a-radio-button>
                <a-radio-button v-if="selectedDuty" value="duty">职责</a-radio-button>
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
                  {{ formatDateTime(selectedActivity.startTime) }} - {{ formatDateTime(selectedActivity.endTime) }}
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
                        {{ formatDateTime(activity.date) }}
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

            <!-- 职责详情视图 -->
            <div v-else-if="detailViewMode === 'duty'" class="space-y-12px">
              <div v-if="selectedDuty">
                <div>
                  <div class="text-12px text-gray-500 mb-4px">职责名称</div>
                  <div class="text-14px text-gray-800">{{ selectedDuty.title }}</div>
                </div>

                <div>
                  <div class="text-12px text-gray-500 mb-4px">职责类型</div>
                  <div class="text-14px text-gray-800">
                    <a-tag :color="getDutyCategoryColor(selectedDuty.category)">
                      {{ getDutyCategoryText(selectedDuty.category) }}
                    </a-tag>
                  </div>
                </div>

                <div>
                  <div class="text-12px text-gray-500 mb-4px">职责说明</div>
                  <div class="text-14px text-gray-600">{{ selectedDuty.description }}</div>
                </div>

                <div>
                  <div class="text-12px text-gray-500 mb-4px">负责人</div>
                  <div class="space-y-4px">
                    <a-tag
                      v-for="assignee in selectedDuty.assignees"
                      :key="assignee.userId"
                      class="mb-4px cursor-pointer hover:bg-blue-100"
                      color="geekblue"
                    >
                      {{ assignee.userName }}
                    </a-tag>
                  </div>
                </div>

                <div v-if="selectedDuty.timeRange">
                  <div class="text-12px text-gray-500 mb-4px">时间范围</div>
                  <div class="text-14px text-gray-800">
                    {{ formatDate(selectedDuty.timeRange.start) }} - {{ formatDate(selectedDuty.timeRange.end) }}
                  </div>
                </div>

                <div>
                  <div class="text-12px text-gray-500 mb-4px">创建时间</div>
                  <div class="text-14px text-gray-800">{{ formatDateTime(selectedDuty.createdAt) }}</div>
                </div>
              </div>
              <div v-else class="text-center py-20px text-gray-400">
                请选择要查看的职责
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import { useCampStore } from '@/store/camp'
import { useDashboardStore } from '@/store/dashboard'
import type { Activity, Camp, CampDuty, DutyCategory } from '@/types/activity'

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
const selectedDuty = ref<CampDuty | null>(null)
const statsCollapsed = ref(true)
const detailViewMode = ref<'activity' | 'course' | 'member' | 'duty'>('activity')
const selectedMemberId = ref<string>('')
const selectedCampId = ref<string>('')
const calendarStartIndex = ref(0)

// 计算属性
const currentView = computed({
  get: () => dashboardStore.currentView,
  set: (value) => dashboardStore.switchView(value)
})
const selectedDate = computed(() => dashboardStore.selectedDate)
const viewTitle = computed(() => dashboardStore.viewTitle)

// 营会相关计算属性
const selectedCamp = computed(() => {
  if (!selectedCampId.value) return null
  return campStore.camps.find((camp: Camp) => camp.id === selectedCampId.value)
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

// 显示的日期范围（支持滑动）
const visibleDays = computed(() => {
  const allDays = campDays.value
  const start = calendarStartIndex.value
  const end = Math.min(start + 7, allDays.length)
  return allDays.slice(start, end)
})

// 是否可以滑动
const canScrollLeft = computed(() => calendarStartIndex.value > 0)
const canScrollRight = computed(() => calendarStartIndex.value + 7 < campDays.value.length)

const todayActivities = computed(() => {
  const today = selectedDate.value.format('YYYY-MM-DD')
  return activityStore.activities.filter(activity =>
    dayjs(activity.date).format('YYYY-MM-DD') === today
  )
})

// 统计数据
const stats = computed(() => ({
  totalActivities: activityStore.activities.length,
  todayActivities: activityStore.todayActivities.length,
  totalMembers: ministryStore.members.length,
  totalMinistries: ministryStore.ministries.length
}))

// 详情面板相关计算属性
const detailTitle = computed(() => {
  if (!selectedActivity.value && !selectedDuty.value) return '详情'

  if (selectedDuty.value) return '职责详情'

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

// 职责分类配置
const dutyCategories = computed(() => [
  { key: 'preparation', label: '准备工作', icon: '📋' },
  { key: 'logistics', label: '后勤保障', icon: '📦' },
  { key: 'coordination', label: '现场协调', icon: '🤝' },
  { key: 'support', label: '技术支持', icon: '🔧' }
])

// 获取当前选中营会的职责
const getCurrentCampDuties = () => {
  if (!selectedCampId.value) return []
  return campStore.getCampDuties(selectedCampId.value)
}

// 获取指定类别的职责
const getCategoryDuties = (category: string) => {
  return getCurrentCampDuties().filter(duty => duty.category === category)
}

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
const formatTime = (date: Date) => {
  return dayjs(date).format('HH:mm')
}

const formatDateTime = (date: Date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const formatDate = (date: Date) => {
  return dayjs(date).format('YYYY年MM月DD日')
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
 * 获取活动状态文本
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
 * 获取营会状态颜色
 */
const getCampStatusColor = (status: string) => {
  const colors = {
    planning: 'orange',
    active: 'green',
    completed: 'blue',
    cancelled: 'red'
  }
  return colors[status as keyof typeof colors] || 'default'
}

/**
 * 获取营会状态文本
 */
const getCampStatusText = (status: string) => {
  const texts = {
    planning: '计划中',
    active: '进行中',
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
    dayjs(activity.date).format('YYYY-MM-DD') === dayStr &&
    (!selectedCampId.value || activity.campId === selectedCampId.value)
  ).length
}

/**
 * 获取上午活动（6:00-12:00）
 */
const getMorningActivities = (day: dayjs.Dayjs) => {
  const dayStr = day.format('YYYY-MM-DD')
  return activityStore.activities
    .filter(activity => {
      const activityDay = dayjs(activity.date).format('YYYY-MM-DD')
      const activityHour = dayjs(activity.startTime).hour()
      return activityDay === dayStr &&
             activityHour >= 6 && activityHour < 12 &&
             (!selectedCampId.value || activity.campId === selectedCampId.value)
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
      const activityDay = dayjs(activity.date).format('YYYY-MM-DD')
      const activityHour = dayjs(activity.startTime).hour()
      return activityDay === dayStr &&
             activityHour >= 12 && activityHour < 18 &&
             (!selectedCampId.value || activity.campId === selectedCampId.value)
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
      const activityDay = dayjs(activity.date).format('YYYY-MM-DD')
      const activityHour = dayjs(activity.startTime).hour()
      return activityDay === dayStr &&
             activityHour >= 18 &&
             (!selectedCampId.value || activity.campId === selectedCampId.value)
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
 * 处理职责点击
 */
const handleDutyClick = (duty: CampDuty) => {
  selectedDuty.value = duty
  selectedActivity.value = null
  selectedMemberId.value = ''
  detailViewMode.value = 'duty'
}

/**
 * 获取职责类别颜色
 */
const getDutyCategoryColor = (category: DutyCategory) => {
  const colors = {
    preparation: 'orange',
    logistics: 'blue',
    coordination: 'green',
    support: 'purple'
  }
  return colors[category] || 'default'
}

/**
 * 获取职责类别文本
 */
const getDutyCategoryText = (category: DutyCategory) => {
  const texts = {
    preparation: '准备工作',
    logistics: '后勤保障',
    coordination: '现场协调',
    support: '技术支持'
  }
  return texts[category] || category
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
  // 重置日历起始索引
  calendarStartIndex.value = 0

  // 如果选择了营会，设置选中日期为营会的起始日期
  if (selectedCamp.value) {
    dashboardStore.selectDate(dayjs(selectedCamp.value.startDate))
  }
}

/**
 * 日历滑动
 */
const scrollCalendar = (direction: number) => {
  const newIndex = calendarStartIndex.value + direction
  if (newIndex >= 0 && newIndex < campDays.value.length) {
    calendarStartIndex.value = newIndex
  }
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
      ministryStore.fetchMinistries(),
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

<style scoped>
.calendar-week, .calendar-day {
  min-height: 400px;
}

/* 职责卡片样式 */
.duty-card {
  transition: all 0.2s ease;
}

.duty-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.duty-card-content {
  cursor: pointer;
}

.duty-category-header {
  margin-bottom: 8px;
}

.duty-category-title {
  font-weight: 500;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.duty-category-count {
  color: #999;
  font-size: 12px;
}

.duty-item {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.duty-item:hover {
  background: #f0f8ff;
  border-color: #1890ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.duty-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.duty-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.duty-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.duty-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.duty-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
</style>
