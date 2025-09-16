<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="mb-24px">
      <h1 class="text-24px font-600 text-gray-800 mb-8px">营会管理</h1>
      <p class="text-14px text-gray-500">管理营会信息，包括添加、编辑和删除营会</p>
    </div>

    <!-- 操作栏 -->
    <div class="flex items-center justify-between mb-24px">
      <div class="flex items-center space-x-16px">
        <a-radio-group v-model:value="statusFilter" @change="handleStatusFilterChange">
          <a-radio-button value="all">全部</a-radio-button>
          <a-radio-button value="planning">规划中</a-radio-button>
          <a-radio-button value="active">进行中</a-radio-button>
          <a-radio-button value="completed">已完成</a-radio-button>
        </a-radio-group>
      </div>

      <a-button type="primary" @click="showAddModal = true">
        <template #icon>
          <i class="i-carbon:add" />
        </template>
        添加营会
      </a-button>
    </div>

    <!-- 营会列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16px">
      <!-- 添加营会卡片 -->
      <a-card class="cursor-pointer hover:shadow-md transition-shadow" @click="showAddModal = true">
        <div class="flex flex-col items-center justify-center h-120px text-gray-400">
          <i class="i-carbon:add text-32px mb-8px" />
          <div class="text-16px">添加新营会</div>
        </div>
      </a-card>

      <!-- 营会卡片列表 -->
      <a-card
        v-for="camp in filteredCamps"
        :key="camp.id"
        class="hover:shadow-md transition-shadow cursor-pointer"
        @click="handleCampClick(camp)"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <span class="truncate">{{ camp.name }}</span>
            <a-tag :color="getStatusColor(camp.status)">
              {{ getStatusText(camp.status) }}
            </a-tag>
          </div>
        </template>

        <div class="space-y-8px">
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

          <div class="text-14px text-gray-600">
            <i class="i-carbon:group mr-4px" />
            活动数量：{{ camp.activities.length }}
          </div>

          <div v-if="camp.description" class="text-12px text-gray-500 mt-8px">
            {{ camp.description }}
          </div>
        </div>

        <template #actions>
          <a-button
            type="text"
            size="small"
            @click.stop="editCamp(camp)"
            class="text-blue-600"
          >
            <i class="i-carbon:edit" />
          </a-button>
          <a-button
            type="text"
            size="small"
            @click.stop="deleteCamp(camp)"
            class="text-red-600"
          >
            <i class="i-carbon:trash-can" />
          </a-button>
        </template>
      </a-card>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredCamps.length === 0" class="text-center py-40px text-gray-400">
      <i class="i-carbon:campsite text-48px mb-16px block" />
      <div class="text-16px mb-8px">暂无营会</div>
      <div class="text-14px">点击上方按钮添加第一个营会</div>
    </div>

    <!-- 营会详情模态框 -->
    <a-modal
      v-model:open="showDetailModal"
      :title="selectedCamp?.name"
      :width="800"
      :footer="null"
      @cancel="handleCloseDetail"
    >
      <div v-if="selectedCamp" class="space-y-16px">
        <!-- 基本信息 -->
        <div class="grid grid-cols-2 gap-16px">
          <div>
            <div class="text-12px text-gray-500 mb-4px">营会名称</div>
            <div class="text-16px font-500">{{ selectedCamp.name }}</div>
          </div>
          <div>
            <div class="text-12px text-gray-500 mb-4px">状态</div>
            <a-tag :color="getStatusColor(selectedCamp.status)">
              {{ getStatusText(selectedCamp.status) }}
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

        <!-- 关联活动 -->
        <div>
          <div class="flex items-center justify-between mb-8px">
            <div class="text-16px font-500">关联活动</div>
            <a-button type="primary" size="small" @click="showActivityModal = true">
              <template #icon>
                <i class="i-carbon:add" />
              </template>
              添加活动
            </a-button>
          </div>

          <div class="space-y-8px max-h-300px overflow-y-auto">
            <div
              v-for="activityId in selectedCamp.activities"
              :key="activityId"
              class="p-12px border border-gray-200 rounded-8px flex items-center justify-between"
            >
              <div class="flex-1">
                <div class="text-14px font-500">{{ getActivityTitle(activityId) }}</div>
                <div class="text-12px text-gray-500 mt-4px">
                  {{ getActivityTime(activityId) }}
                </div>
              </div>
              <a-button
                type="text"
                size="small"
                @click="removeActivityFromCamp(activityId)"
                class="text-red-500 hover:text-red-700"
              >
                <i class="i-carbon:trash-can" />
              </a-button>
            </div>
            <div v-if="selectedCamp.activities.length === 0" class="text-center py-20px text-gray-400">
              暂无关联活动
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 添加活动到营会模态框 -->
    <a-modal
      v-model:open="showActivityModal"
      title="添加活动到营会"
      :width="600"
      @ok="handleAddActivityToCamp"
      @cancel="handleCancelAddActivity"
    >
      <div class="space-y-16px">
        <a-alert
          message="选择要关联的活动"
          description="这些活动将与当前营会关联显示"
          type="info"
          show-icon
        />

        <div class="max-h-300px overflow-y-auto">
          <a-checkbox-group v-model:value="selectedActivityIds">
            <div class="space-y-8px">
              <a-checkbox
                v-for="activity in availableActivities"
                :key="activity.id"
                :value="activity.id"
                class="w-full"
              >
                <div class="flex items-center justify-between w-full">
                  <div>
                    <div class="text-14px font-500">{{ activity.title }}</div>
                    <div class="text-12px text-gray-500">
                      {{ dayjs(activity.startTime).format('MM-DD HH:mm') }} -
                      {{ dayjs(activity.endTime).format('HH:mm') }}
                    </div>
                  </div>
                  <a-tag :color="getStatusColor(activity.status)" size="small">
                    {{ getStatusText(activity.status) }}
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

    <!-- 添加/编辑营会模态框 -->
    <a-modal
      v-model:open="showAddModal"
      :title="isEditing ? '编辑营会' : '添加营会'"
      :width="600"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        :model="formData"
        :rules="formRules"
        ref="formRef"
        layout="vertical"
      >
        <a-form-item label="营会名称" name="name">
          <a-input
            v-model:value="formData.name"
            placeholder="请输入营会名称"
            :maxlength="50"
            show-count
          />
        </a-form-item>

        <a-form-item label="营会日期" name="dateRange">
          <a-range-picker
            v-model:value="formData.dateRange"
            placeholder="请选择营会起始和结束日期"
            format="YYYY-MM-DD"
            :disabled-date="disabledDate"
            class="w-full"
          />
        </a-form-item>

        <a-form-item label="地点" name="location">
          <a-input
            v-model:value="formData.location"
            placeholder="请输入营会地点"
            :maxlength="100"
          />
        </a-form-item>

        <a-form-item label="状态" name="status">
          <a-select v-model:value="formData.status" placeholder="请选择状态">
            <a-select-option value="planning">规划中</a-select-option>
            <a-select-option value="active">进行中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="描述" name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="请输入营会描述（可选）"
            :rows="4"
            :maxlength="200"
            show-count
          />
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
import type { Camp } from '@/types'

/**
 * 营会管理页面
 */

// 状态管理
const campStore = useCampStore()
const activityStore = useActivityStore()

// 响应式状态
const showAddModal = ref(false)
const showDetailModal = ref(false)
const showActivityModal = ref(false)
const isEditing = ref(false)
const statusFilter = ref<'all' | 'planning' | 'active' | 'completed'>('all')
const editingCampId = ref<string>('')
const selectedCamp = ref<Camp | null>(null)
const selectedActivityIds = ref<string[]>([])

// 表单数据
const formData = reactive({
  name: '',
  description: '',
  dateRange: [] as Dayjs[],
  location: '',
  status: 'planning' as Camp['status']
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

// 表单引用
const formRef = ref()

// 计算属性
const filteredCamps = computed(() => {
  if (statusFilter.value === 'all') {
    return campStore.camps
  }
  return campStore.camps.filter(camp => camp.status === statusFilter.value)
})

// 可用的活动列表（排除已关联到当前营会的活动）
const availableActivities = computed(() => {
  if (!selectedCamp.value) return []

  return activityStore.activities.filter(activity =>
    !selectedCamp.value!.activities.includes(activity.id)
  )
})

// 方法
const formatDate = (date: Date) => {
  return dayjs(date).format('YYYY-MM-DD')
}

const getStatusColor = (status: Camp['status']) => {
  const colors = {
    planning: 'blue',
    active: 'green',
    completed: 'gray',
    cancelled: 'red'
  }
  return colors[status] || 'default'
}

const getStatusText = (status: Camp['status']) => {
  const texts = {
    planning: '规划中',
    active: '进行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const disabledDate = (current: Dayjs) => {
  // 不能选择过去的日期
  return current && current < dayjs().startOf('day')
}

const handleStatusFilterChange = () => {
  // 状态过滤器改变时的处理
}

const handleCampClick = (camp: Camp) => {
  // 点击营会卡片时显示营会详情
  selectedCamp.value = camp
  showDetailModal.value = true
}

const resetForm = () => {
  Object.assign(formData, {
    name: '',
    description: '',
    dateRange: [],
    location: '',
    status: 'planning' as Camp['status']
  })
}

const editCamp = (camp: Camp) => {
  isEditing.value = true
  editingCampId.value = camp.id
  Object.assign(formData, {
    name: camp.name,
    description: camp.description || '',
    dateRange: camp.endDate
      ? [dayjs(camp.startDate), dayjs(camp.endDate)]
      : [dayjs(camp.startDate)],
    location: camp.location || '',
    status: camp.status
  })
  showAddModal.value = true
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

    const campData = {
      name: formData.name,
      description: formData.description,
      startDate: formData.dateRange[0].toDate(),
      endDate: formData.dateRange.length > 1 ? formData.dateRange[1].toDate() : undefined,
      location: formData.location,
      status: formData.status,
      activities: [] // 新建营会时活动为空
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

const handleCloseDetail = () => {
  showDetailModal.value = false
  selectedCamp.value = null
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
        const updatedActivities = selectedCamp.value!.activities.filter(id => id !== activityId)

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
    const startTime = dayjs(activity.startTime).format('MM-DD HH:mm')
    const endTime = dayjs(activity.endTime).format('HH:mm')
    return `${startTime}-${endTime}`
  }
  return ''
}

// 初始化
onMounted(async () => {
  await campStore.fetchCamps()
  // 确保活动数据也已加载
  if (activityStore.activities.length === 0) {
    await activityStore.fetchActivities()
  }
})
</script>

<style scoped>
/* 自定义样式 */
</style>
