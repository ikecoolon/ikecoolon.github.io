<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="mb-24px">
      <h1 class="text-24px font-600 text-gray-800 mb-8px">营会管理</h1>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between mb-24px">
      <!-- 面包屑导航 -->
      <div class="flex items-center space-x-16px">
        <div v-if="viewMode === 'detail'" class="flex items-center space-x-8px">
          <a-button type="text" @click="backToList" class="p-0 h-auto">
            <template #icon>
              <i class="i-carbon:arrow-left" />
            </template>
          </a-button>
          <span class="text-16px font-500">{{ selectedCamp?.name }}</span>
        </div>
        <div v-else class="flex items-center space-x-16px">
          <a-radio-group v-model:value="statusFilter" @change="handleStatusFilterChange">
            <a-radio-button value="all">全部</a-radio-button>
            <a-radio-button value="planning">规划中</a-radio-button>
            <a-radio-button value="active">进行中</a-radio-button>
            <a-radio-button value="completed">已完成</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <a-button type="primary" @click="showAddModal = true">
        <template #icon>
          <i class="i-carbon:add" />
        </template>
        添加营会
      </a-button>
    </div>

    <!-- 营会列表视图 -->
    <div v-if="viewMode === 'list'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16px">
      <!-- 添加营会卡片 -->
      <a-card class="cursor-pointer hover:shadow-md transition-shadow" @click="showAddModal = true">
        <div class="flex flex-col items-center justify-center h-120px text-gray-400">
          <i class="i-carbon:add text-32px mb-8px" />
          <div class="text-16px">添加新营会</div>
        </div>
      </a-card>

      <!-- 营会卡片列表 -->
      <a-card v-for="camp in filteredCamps" :key="camp.id" class="hover:shadow-md transition-shadow">
        <template #title>
          <div class="flex items-center justify-between">
            <span class="truncate">{{ camp.name }}</span>
            <a-tag :color="getStatusColor(camp)">
              {{ getStatusText(camp) }}
            </a-tag>
          </div>
        </template>

        <div class="space-y-8px cursor-pointer" @click="handleCampClick(camp)">
          <div class="text-14px text-gray-600">
            <i class="i-carbon:calendar mr-4px" />
            起始日期：{{ formatDate(camp.startDate) }}
          </div>

          <div v-if="camp.endDate" class="text-14px text-gray-600">
            <i class="i-carbon:calendar mr-4px" />
            结束日期：{{ formatDate(camp.endDate) }}
          </div>

          <div v-if="camp.location" class="text-14px text-gray-600">
            <i class="i-carbon:location mr-4px" />
            地点：{{ camp.location }}
          </div>


          <div class="text-12px text-gray-500 mt-8px">
            {{camp.description||'--'}}
          </div>
        </div>

        <template #actions>
          <a-button type="text" size="small" @click.stop.prevent="editCamp(camp)"
            class="text-blue-600 hover:text-blue-800 transition-colors" title="编辑营会">
            <i class="i-carbon:edit" />
          </a-button>
          <a-button type="text" size="small" @click.stop.prevent="deleteCamp(camp)"
            class="text-red-600 hover:text-red-800 transition-colors" title="删除营会">
            <i class="i-carbon:trash-can" />
          </a-button>
        </template>
      </a-card>
    </div>

    <!-- 空状态 -->
    <div v-if="viewMode === 'list' && filteredCamps.length === 0" class="text-center py-40px text-gray-400">
      <i class="i-carbon:campsite text-48px mb-16px block" />
      <div class="text-16px mb-8px">暂无营会</div>
      <div class="text-14px">点击上方按钮添加第一个营会</div>
    </div>

    <!-- 营会详情视图 -->
    <div v-if="viewMode === 'detail' && selectedCamp" class="space-y-24px">
      <!-- 基本信息 -->
      <a-card title="基本信息">
        <div class="grid grid-cols-2 gap-16px">
          <div>
            <div class="text-12px text-gray-500 mb-4px">营会名称</div>
            <div class="text-16px font-500">{{ selectedCamp.name }}</div>
          </div>
          <div>
            <div class="text-12px text-gray-500 mb-4px">状态</div>
            <a-tag :color="getStatusColor(selectedCamp)">
              {{ getStatusText(selectedCamp) }}
            </a-tag>
          </div>
          <div>
            <div class="text-12px text-gray-500 mb-4px">起始日期</div>
            <div class="text-14px">{{ formatDate(selectedCamp.startDate) }}</div>
          </div>
          <div>
            <div class="text-12px text-gray-500 mb-4px">结束日期</div>
            <div class="text-14px">{{ selectedCamp.endDate ? formatDate(selectedCamp.endDate) : '未设置' }}</div>
          </div>
          <div class="col-span-2">
            <div class="text-12px text-gray-500 mb-4px">地点</div>
            <div class="text-14px">{{ selectedCamp.location || '未设置' }}</div>
          </div>
          <div class="col-span-2">
            <div class="text-12px text-gray-500 mb-4px">描述</div>
            <div class="text-14px">{{ selectedCamp.description || '暂无描述' }}</div>
          </div>
        </div>
      </a-card>

      <!-- 关联活动 -->
      <a-card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>关联活动</span>
            <a-button type="primary" size="small" @click="showActivityModal = true">
              <template #icon>
                <i class="i-carbon:add" />
              </template>
              添加活动
            </a-button>
          </div>
        </template>

        <div class="space-y-8px max-h-400px overflow-y-auto">
          <div v-for="activityId in selectedCamp.activities" :key="activityId"
            class="p-12px border border-gray-200 rounded-8px flex items-center justify-between hover:bg-gray-50">
            <div class="flex-1">
              <div class="text-14px font-500">{{ getActivityTitle(activityId) }}</div>
              <div class="text-12px text-gray-500 mt-4px">
                {{ getActivityTime(activityId) }}
              </div>
            </div>
            <a-tag :color="getActivityStatusColor(getActivityStatus(activityStore.activities.find(a => a.id === activityId)))" size="small" class="mr-8px">
              {{ getActivityStatusText(getActivityStatus(activityStore.activities.find(a => a.id === activityId))) }}
            </a-tag>
            <a-button type="text" size="small" @click="removeActivityFromCamp(activityId)"
              class="text-red-500 hover:text-red-700">
              <i class="i-carbon:trash-can" />
            </a-button>
          </div>
          <div v-if="selectedCamp.activities.length === 0" class="text-center py-20px text-gray-400">
            暂无关联活动
          </div>
        </div>
      </a-card>

      <!-- 职责分配 -->
      <a-card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>职责分配</span>
            <a-button type="primary" size="small" @click="addDuty()">
              <template #icon>
                <i class="i-carbon:add" />
              </template>
              添加职责
            </a-button>
          </div>
        </template>

        <div class="space-y-12px">
          <!-- 按类别分组显示职责 -->
          <div v-for="category in dutyCategories" :key="category.key">
            <div class="flex items-center gap-6px mb-8px">
              <span>{{ category.icon }}</span>
              <span class="font-500">{{ category.label }}</span>
              <span class="text-gray-500 text-12px">({{ getCategoryDuties(category.key).length }}项)</span>
            </div>

            <div class="space-y-8px ml-20px">
              <div
                v-for="duty in getCategoryDuties(category.key)"
                :key="duty.id"
                class="p-12px border-1 border-gray-200 border-solid rounded-8px bg-gray-50 mb-8px transition-all duration-200 hover:bg-gray-100 hover:border-gray-300"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="text-14px font-500 text-gray-800 mb-4px">{{ duty.title }}</div>
                    <div class="text-12px text-gray-600 leading-1.4 mb-8px">{{ duty.description }}</div>

                    <div class="flex items-center gap-12px text-12px text-gray-500">
                      <div class="flex items-center gap-4px">
                        <i class="i-carbon:group" />
                        <span>{{ duty.assignees.map(a => a.userName).join('、') }}</span>
                      </div>
                      <div v-if="duty.timeRange" class="flex items-center gap-4px">
                        <i class="i-carbon:time" />
                        <span>{{ formatDate(duty.timeRange.start) }} - {{ formatDate(duty.timeRange.end) }}</span>
                      </div>
                    </div>
                  </div>

                  <a-dropdown>
                    <a-button type="text" size="small">
                      <i class="i-carbon:overflow-menu-horizontal" />
                    </a-button>
                    <template #overlay>
                      <a-menu @click="handleDutyMenuClick($event, duty)">
                        <a-menu-item key="edit">编辑</a-menu-item>
                        <a-menu-item key="delete" class="text-red-600">删除</a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </div>
            </div>

            <div v-if="getCategoryDuties(category.key).length === 0" class="text-12px text-gray-400 ml-20px py-8px">
              暂无{{ category.label }}职责
            </div>
          </div>

          <div v-if="getCampDuties(selectedCamp.id).length === 0" class="text-center py-20px text-gray-400">
            暂无职责分配
          </div>
        </div>
      </a-card>

      <!-- 职责表单 -->
      <a-card v-if="showDutyForm" title="添加职责">
        <a-form
          ref="dutyFormRef"
          :model="dutyFormData"
          :rules="dutyFormRules"
          layout="vertical"
        >
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="职责名称" name="title">
                <a-input v-model:value="dutyFormData.title" placeholder="请输入职责名称" :maxlength="50" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="职责类型" name="category">
                <a-select v-model:value="dutyFormData.category" placeholder="请选择职责类型">
                  <a-select-option value="preparation">准备工作</a-select-option>
                  <a-select-option value="logistics">后勤保障</a-select-option>
                  <a-select-option value="coordination">现场协调</a-select-option>
                  <a-select-option value="support">技术支持</a-select-option>
                  <a-select-option value="childcare">幼儿看护</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="职责说明" name="description">
            <a-textarea
              v-model:value="dutyFormData.description"
              placeholder="详细描述该职责的具体工作内容和注意事项"
              :rows="4"
              :maxlength="500"
              show-count
            />
          </a-form-item>

          <a-form-item label="负责人" name="assignees">
            <a-select
              v-model:value="selectedAssigneeIds"
              mode="multiple"
              placeholder="选择负责人（可多选）"
              :options="memberOptions"
              show-search
              :filter-option="(input: string, option: any) => option.children.toLowerCase().includes(input.toLowerCase())"
            />
          </a-form-item>

          <a-form-item label="时间范围 (可选)">
            <a-range-picker
              v-model:value="dutyFormData.timeRangeValue"
              placeholder="选择时间范围"
              format="YYYY-MM-DD"
              class="w-full"
            />
            <div class="text-12px text-gray-500 mt-4px">
              如果不设置时间范围，该职责将持续整个营会期间
            </div>
          </a-form-item>
        </a-form>

        <div class="flex justify-end space-x-8px mt-16px">
          <a-button @click="cancelDutyForm">取消</a-button>
          <a-button type="primary" @click="handleSubmitDuty">
            {{ isEditingDuty ? '更新职责' : '添加职责' }}
          </a-button>
        </div>
      </a-card>
    </div>

    <!-- 活动选择模态框 -->
    <a-modal v-model:open="showActivityModal" title="添加活动到营会" :width="600" @ok="handleAddActivityToCamp"
      @cancel="handleCancelAddActivity">
      <div class="space-y-16px">
        <a-alert message="选择要关联的活动" description="这些活动将与当前营会关联显示" type="info" show-icon />

        <div class="max-h-300px overflow-y-auto">
          <a-checkbox-group v-model:value="selectedActivityIds">
            <div class="space-y-8px">
              <a-checkbox v-for="activity in availableActivities" :key="activity.id" :value="activity.id"
                class="w-full">
                <div class="flex items-center justify-between w-full">
                  <div>
                    <div class="text-14px font-500">{{ activity.title }}</div>
                    <div class="text-12px text-gray-500">
                      {{ dayjs(activity.date).format('MM-DD HH:mm') }} -
                      {{ dayjs(activity.endTime).format('HH:mm') }}
                    </div>
                  </div>
                  <a-tag :color="getActivityStatusColor(getActivityStatus(activity))" size="small">
                    {{ getActivityStatusText(getActivityStatus(activity)) }}
                  </a-tag>
                </div>
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>

        <div v-if="availableActivities.length === 0" class="text-center py-20px text-gray-400">
          暂无可用的活动
        </div>
      </div>
    </a-modal>

    <!-- 添加职责到营会模态框 -->

    <!-- 添加/编辑营会模态框 -->
    <a-modal v-model:open="showAddModal" :title="isEditing ? '编辑营会' : '添加营会'" :width="600" @ok="handleSubmit"
      @cancel="handleCancel">
      <a-form :model="formData" :rules="formRules" ref="formRef" layout="vertical">
        <a-form-item label="营会名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入营会名称" :maxlength="50" show-count />
        </a-form-item>

        <a-form-item label="营会日期" name="dateRange">
          <a-range-picker v-model:value="formData.dateRange" placeholder="请选择营会起始和结束日期" format="YYYY-MM-DD"
            :disabled-date="disabledDate" class="w-full" />
        </a-form-item>

        <a-form-item label="地点" name="location">
          <a-input v-model:value="formData.location" placeholder="请输入营会地点" :maxlength="100" />
        </a-form-item>


        <a-form-item label="描述" name="description">
          <a-textarea v-model:value="formData.description" placeholder="请输入营会描述（可选）" :rows="4" :maxlength="200"
            show-count />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs, { Dayjs } from 'dayjs'
import { useCampStore } from '@/store/camp'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import type { Camp, DutyCategory } from '@/types/activity'

/**
 * 营会管理页面
 */

// 状态管理
const campStore = useCampStore()
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()

// 响应式状态
const showAddModal = ref(false)
const showActivityModal = ref(false)
const showDutyForm = ref(false)
const isEditing = ref(false)
const isEditingDuty = ref(false)
const statusFilter = ref<'all' | 'planning' | 'active' | 'completed'>('all')
const editingCampId = ref<string>('')
const editingDutyId = ref<string>('')
const selectedCamp = ref<Camp | null>(null)
const selectedActivityIds = ref<string[]>([])
const selectedAssigneeIds = ref<string[]>([])

// 视图模式：'list' | 'detail'
const viewMode = ref<'list' | 'detail'>('list')

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  dateRange: [] as Dayjs[],
  location: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入营会名称', trigger: 'blur' },
    { min: 2, max: 50, message: '营会名称长度应在2-50个字符之间', trigger: 'blur' }
  ],
  dateRange: [
    { required: true, message: '请选择营会日期范围', trigger: 'change' }
  ]
}

// 职责表单数据
const dutyFormData = reactive({
  title: '',
  description: '',
  category: 'preparation' as DutyCategory,
  timeRangeValue: [] as Dayjs[]
})

// 职责表单验证规则
const dutyFormRules = {
  title: [
    { required: true, message: '请输入职责名称', trigger: 'blur' },
    { min: 2, max: 50, message: '职责名称长度应在2-50个字符之间', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入职责说明', trigger: 'blur' },
    { min: 10, message: '职责说明至少需要10个字符', trigger: 'blur' }
  ],
  category: [{ required: true, message: '请选择职责类型', trigger: 'change' }]
}

// 表单引用
const formRef = ref()
const dutyFormRef = ref()

// 计算属性
const filteredCamps = computed(() => {
  if (statusFilter.value === 'all') {
    return campStore.camps
  }

  // 根据状态过滤（camp store 已经处理了排序）
  switch (statusFilter.value) {
    case 'planning':
      return campStore.planningCamps
    case 'active':
      return campStore.activeCamps
    case 'completed':
      return campStore.completedCamps
    default:
      return campStore.camps
  }
})

// 可用的活动列表（排除已关联到当前营会的活动）
const availableActivities = computed(() => {
  if (!selectedCamp.value) return []

  return activityStore.activities.filter(activity =>
    !selectedCamp.value!.activities.includes(activity.id)
  )
})

// 成员选项
const memberOptions = computed(() =>
  ministryStore.members.map(member => ({
    label: member.name,
    value: member.id
  }))
)

// 职责分类配置
const dutyCategories = computed(() => [
  { key: 'preparation', label: '准备工作', icon: '📋' },
  { key: 'logistics', label: '后勤保障', icon: '📦' },
  { key: 'coordination', label: '现场协调', icon: '🤝' },
  { key: 'support', label: '技术支持', icon: '🔧' },
  { key: 'childcare', label: '幼儿看护', icon: '👶' }
])

// 获取营会的职责列表
const getCampDuties = (campId: string) => {
  return campStore.getCampDuties(campId)
}

// 获取指定类别的职责
const getCategoryDuties = (category: string) => {
  if (!selectedCamp.value) return []
  return getCampDuties(selectedCamp.value.id).filter(duty => duty.category === category)
}

// 方法
const formatDate = (date: string | Date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const getStatusColor = (camp: Camp) => {
  const now = dayjs()
  const startDate = dayjs(camp.startDate)
  const endDate = camp.endDate ? dayjs(camp.endDate) : startDate.add(7, 'day')

  if (now.isBefore(startDate)) {
    return 'blue' // 规划中
  } else if ((now.isAfter(startDate) || now.isSame(startDate)) && (now.isBefore(endDate) || now.isSame(endDate))) {
    return 'green' // 进行中
  } else {
    return 'gray' // 已完成
  }
}

const getStatusText = (camp: Camp) => {
  const now = dayjs()
  const startDate = dayjs(camp.startDate)
  const endDate = camp.endDate ? dayjs(camp.endDate) : startDate.add(7, 'day')

  if (now.isBefore(startDate)) {
    return '规划中'
  } else if ((now.isAfter(startDate) || now.isSame(startDate)) && (now.isBefore(endDate) || now.isSame(endDate))) {
    return '进行中'
  } else {
    return '已完成'
  }
}

const getActivityStatus = (activity: any) => {
  const now = dayjs()
  const activityDate = dayjs(activity.date)
  const activityEndTime = dayjs(activity.endTime)

  if (now.isBefore(activityDate)) {
    return 'planned' // 计划中
  } else if (now.isAfter(activityDate) && now.isBefore(activityEndTime)) {
    return 'ongoing' // 进行中
  } else if (now.isAfter(activityEndTime)) {
    return 'completed' // 已完成
  }
  return 'planned' // 默认计划中
}

const getActivityStatusColor = (status: string) => {
  const colors = {
    planned: 'blue',
    ongoing: 'green',
    completed: 'gray',
    cancelled: 'red'
  }
  return colors[status as keyof typeof colors] || 'default'
}

const getActivityStatusText = (status: string) => {
  const texts = {
    planned: '计划中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status as keyof typeof texts] || status
}

const disabledDate = (current: Dayjs) => {
  // 不能选择过去的日期
  return current && current < dayjs().startOf('day')
}

const handleStatusFilterChange = () => {
  // 状态过滤器改变时的处理
}

const handleCampClick = (camp: Camp) => {
  // 点击营会卡片时切换到详情视图
  selectedCamp.value = camp
  viewMode.value = 'detail'
}

const backToList = () => {
  // 返回列表视图
  viewMode.value = 'list'
  selectedCamp.value = null
  showDutyForm.value = false
  resetDutyForm()
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    description: '',
    dateRange: [],
    location: ''
  })
}

const editCamp = (camp: Camp) => {
  try {

    // 设置编辑状态
    isEditing.value = true
    editingCampId.value = camp.id

    // 准备日期范围
    let dateRange: Dayjs[] = []
    try {
      if (camp.endDate) {
        dateRange = [dayjs(camp.startDate), dayjs(camp.endDate)]
      } else {
        dateRange = [dayjs(camp.startDate)]
      }
    } catch (dateError) {
      console.error('日期转换错误:', dateError)
      // 如果日期转换失败，使用当前日期
      dateRange = [dayjs()]
    }

    // 填充表单数据
    Object.assign(formData, {
      name: camp.name || '',
      description: camp.description || '',
      dateRange: dateRange,
      location: camp.location || ''
    })

    // 打开模态框
    showAddModal.value = true

  } catch (error) {
    console.error('编辑营会失败:', error)
    message.error('编辑营会失败，请重试')
  }
}

const deleteCamp = (camp: Camp) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除营会"${camp.name}"吗？此操作不可撤销。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      try {
        await campStore.deleteCamp(camp.id)
        message.success('营会删除成功')
      } catch (error) {
        console.error('删除营会失败:', error)
        message.error('删除营会失败')
      }
    }
  })
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    // 处理日期时间，确保开始时间为 00:00:00，结束时间为 23:59:59
    const startDate = formData.dateRange[0]
      .startOf('day') // 设置为当天的 00:00:00
      .format() // 保存为 ISO 字符串格式

    const endDate = formData.dateRange.length > 1
      ? formData.dateRange[1]
        .endOf('day') // 设置为当天的 23:59:59
        .format() // 保存为 ISO 字符串格式
      : formData.dateRange[0]
        .endOf('day') // 如果只有一个日期，也设置为当天的 23:59:59
        .format() // 保存为 ISO 字符串格式


    const campData = {
      name: formData.name,
      description: formData.description,
      startDate: startDate,
      endDate: endDate,
      location: formData.location,
      activities: [], // 新建营会时活动为空
      duties: [] // 新建营会时职责为空
    }

    if (isEditing.value) {
      await campStore.updateCamp(editingCampId.value, campData)
      message.success('营会更新成功')
    } else {
      await campStore.addCamp(campData)
      message.success('营会添加成功')
    }

    showAddModal.value = false
    resetForm()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const handleCancel = () => {
  showAddModal.value = false
  resetForm()
  isEditing.value = false
  editingCampId.value = ''
}


const handleAddActivityToCamp = async () => {
  if (!selectedCamp.value || selectedActivityIds.value.length === 0) {
    message.warning('请选择要关联的活动')
    return
  }

  try {
    // 更新营会的活动列表
    const updatedActivities = [
      ...selectedCamp.value.activities,
      ...selectedActivityIds.value
    ]

    await campStore.updateCamp(selectedCamp.value.id, {
      activities: updatedActivities
    })

    message.success(`成功添加 ${selectedActivityIds.value.length} 个活动`)
    showActivityModal.value = false
    selectedActivityIds.value = []
  } catch (error) {
    console.error('添加活动失败:', error)
    message.error('添加活动失败')
  }
}

const handleCancelAddActivity = () => {
  showActivityModal.value = false
  selectedActivityIds.value = []
}

const removeActivityFromCamp = async (activityId: string) => {
  if (!selectedCamp.value) return

  Modal.confirm({
    title: '确认移除',
    content: '确定要从营会中移除这个活动吗？',
    okText: '确认移除',
    okType: 'danger',
    onOk: async () => {
      try {
        const updatedActivities = selectedCamp.value!.activities.filter((id: string) => id !== activityId)

        await campStore.updateCamp(selectedCamp.value!.id, {
          activities: updatedActivities
        })

        message.success('活动移除成功')
      } catch (error) {
        console.error('移除活动失败:', error)
        message.error('移除活动失败')
      }
    }
  })
}

/**
 * 处理职责菜单点击
 */
const handleDutyMenuClick = ({ key }: { key: string }, duty: any) => {
  if (key === 'edit') {
    editDuty(duty)
  } else if (key === 'delete') {
    deleteDuty(duty)
  }
}



/**
 * 删除职责
 */
const deleteDuty = (duty: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除职责"${duty.title}"吗？此操作不可撤销。`,
    okText: '确认删除',
    okType: 'danger',
    onOk: async () => {
      try {
        await campStore.deleteDuty(duty.id)
        message.success('职责删除成功')
      } catch (error) {
        console.error('删除职责失败:', error)
        message.error('删除职责失败')
      }
    }
  })
}

/**
 * 提交职责
 */
const handleSubmitDuty = async () => {
  try {
    await dutyFormRef.value.validate()

    // 构建负责人数据
    const assignees = selectedAssigneeIds.value.map(userId => {
      const member = ministryStore.members.find(m => m.id === userId)
      return {
        userId,
        userName: member?.name || '未知用户'
      }
    })

    // 构建时间范围
    const timeRange = dutyFormData.timeRangeValue.length > 0 ? {
      start: dutyFormData.timeRangeValue[0].format(), // 保存为 ISO 字符串格式
      end: dutyFormData.timeRangeValue[1].format()    // 保存为 ISO 字符串格式
    } : undefined

    const dutyData = {
      campId: selectedCamp.value!.id,
      title: dutyFormData.title,
      description: dutyFormData.description,
      category: dutyFormData.category,
      assignees,
      timeRange
    }

    if (isEditingDuty.value) {
      await campStore.updateDuty(editingDutyId.value, dutyData)
      message.success('职责更新成功')
    } else {
      await campStore.addDuty(dutyData)
      message.success('职责添加成功')
    }

    // 关闭内联表单
    showDutyForm.value = false
    resetDutyForm()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}


/**
 * 重置职责表单
 */
const resetDutyForm = () => {
  Object.assign(dutyFormData, {
    title: '',
    description: '',
    category: 'preparation' as DutyCategory,
    timeRangeValue: []
  })
  selectedAssigneeIds.value = []
  isEditingDuty.value = false
  editingDutyId.value = ''
}

/**
 * 添加职责
 */
const addDuty = () => {
  isEditingDuty.value = false
  editingDutyId.value = ''
  selectedAssigneeIds.value = []

  Object.assign(dutyFormData, {
    title: '',
    description: '',
    category: 'preparation' as DutyCategory,
    timeRangeValue: []
  })

  showDutyForm.value = true
}

/**
 * 编辑职责
 */
const editDuty = (duty: any) => {
  isEditingDuty.value = true
  editingDutyId.value = duty.id

  // 填充表单数据
  Object.assign(dutyFormData, {
    title: duty.title,
    description: duty.description,
    category: duty.category,
    timeRangeValue: duty.timeRange ? [dayjs(duty.timeRange.start), dayjs(duty.timeRange.end)] : []
  })

  // 设置负责人
  selectedAssigneeIds.value = duty.assignees.map((a: any) => a.userId)

  showDutyForm.value = true
}

/**
 * 取消职责表单
 */
const cancelDutyForm = () => {
  showDutyForm.value = false
  resetDutyForm()
}

/**
 * 获取活动标题
 */
const getActivityTitle = (activityId: string) => {
  const activity = activityStore.activities.find(a => a.id === activityId)
  return activity ? activity.title : `活动 ${activityId}`
}

/**
 * 获取活动时间
 */
const getActivityTime = (activityId: string) => {
  const activity = activityStore.activities.find(a => a.id === activityId)
  if (activity) {
    const startTime = dayjs(activity.date).format('MM-DD HH:mm')
    const endTime = dayjs(activity.endTime).format('HH:mm')
    return `${startTime}-${endTime}`
  }
  return ''
}

// 初始化
onMounted(async () => {
  await Promise.all([
    campStore.fetchCamps(),
    campStore.fetchDuties(),
    ministryStore.fetchMembers(),
  ])

  // 确保活动数据也已加载
  if (activityStore.activities.length === 0) {
    await activityStore.fetchActivities()
  }
})
</script>
