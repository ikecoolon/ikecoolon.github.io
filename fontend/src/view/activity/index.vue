<template>
  <div class="p-24px">
    <!-- 页面标题和导航 -->
    <div class="flex items-center justify-between mb-24px">
      <!-- 面包屑导航 -->
      <div class="flex items-center space-x-16px">
        <div v-if="viewMode === 'detail'" class="flex items-center space-x-8px">
          <a-button type="text" @click="backToList" class="p-0 h-auto">
            <template #icon>
              <i class="i-carbon:arrow-left" />
            </template>
          </a-button>
          <span class="text-16px font-500">{{ selectedActivity?.title }}</span>
        </div>
        <div v-else>
          <h1 class="text-24px font-600 text-gray-800 mb-8px">活动管理</h1>
          <p class="text-14px text-gray-500">管理营会活动安排和课程信息</p>
        </div>
      </div>

      <a-button type="primary" @click="viewMode === 'list' ? showAddDetail() : handleSaveActivity()">
        <template #icon>
          <i class="i-carbon:add" />
        </template>
        {{ viewMode === 'list' ? '添加活动' : '保存活动' }}
      </a-button>
    </div>

    <!-- 活动列表视图 -->
    <a-card v-if="viewMode === 'list'" title="活动列表" :loading="loading">
      <template #extra>
        <div class="flex items-center space-x-8px">
          <a-input-search
            v-model:value="searchText"
            placeholder="搜索活动"
            style="width: 200px"
          />
        </div>
      </template>
      
      <a-table
        :columns="columns"
        :data-source="filteredActivities"
        :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div>
              <div class="font-500">{{ record.title }}</div>
              <div class="text-12px text-gray-500">{{ record.description }}</div>
            </div>
          </template>

          <template v-if="column.key === 'dateRange'">
            <div class="space-y-4px">
              <div class="text-12px text-gray-800">{{ formatDateTimeRange(record.startTime, record.endTime) }}</div>
            </div>
          </template>

          <template v-if="column.key === 'phases'">
            <a-button
              type="link"
              size="small"
              @click="handleViewPhases(record)"
              class="p-0 h-auto text-blue-600 hover:text-blue-800"
            >
              {{ record.phases?.length || 0 }} 个环节
            </a-button>
          </template>

          <template v-if="column.key === 'action'">
            <div class="flex items-center space-x-4px">
              <a-button type="link" size="small" @click="handleViewDetail(record)">
                查看
              </a-button>
              <a-button type="link" size="small" @click="showEditDetail(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="handleCopyActivity(record)">
                复制
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 活动详情视图 -->
    <div v-if="viewMode === 'detail'" class="space-y-24px">
      <!-- 活动基本信息 -->
      <a-card title="活动信息" :loading="loading">
        <a-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          layout="vertical"
        >
          <a-form-item label="活动标题" name="title">
            <a-input v-model:value="formData.title" placeholder="请输入活动标题" />
          </a-form-item>

          <a-form-item label="活动描述" name="description">
            <a-textarea
              v-model:value="formData.description"
              placeholder="请输入活动描述"
              :rows="3"
            />
          </a-form-item>

          <a-form-item label="活动时间范围" name="dateRange">
            <a-range-picker
              v-model:value="formData.dateRange"
              :show-time="{ format: 'HH:mm' }"
              format="YYYY-MM-DD HH:mm"
              placeholder="选择活动开始和结束时间"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="活动地点" name="location">
            <a-input v-model:value="formData.location" placeholder="请输入活动地点" />
          </a-form-item>

          <a-form-item label="归属营会" name="campId">
            <a-select
              v-model:value="formData.campId"
              placeholder="请选择归属营会"
              :options="campOptions"
              show-search
              :filter-option="filterCampOption"
            />
          </a-form-item>
        </a-form>
      </a-card>

      <!-- 活动环节管理 -->
      <a-card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>活动环节</span>
            <a-button type="primary" size="small" @click="addPhase">
              <template #icon>
                <i class="i-carbon:add" />
              </template>
              添加环节
            </a-button>
          </div>
        </template>

        <div class="space-y-8px">
          <div
            v-for="(phase, index) in formData.phases"
            :key="phase.id"
            class="p-12px border border-gray-200 rounded-8px"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-500 text-14px mb-4px">{{ phase.title }}</div>
                <div class="text-12px text-gray-600 mb-8px">{{ phase.description }}</div>
                <div v-if="phase.assignedMembers.length > 0" class="text-12px text-gray-500">
                  负责人：{{ phase.assignedMembers.map(id => getMemberName(id)).join(', ') }}
                </div>
                <div v-if="phase.notes" class="text-12px text-orange-600 mt-4px">
                  注意事项：{{ phase.notes }}
                </div>
              </div>
              <div class="flex items-center space-x-4px ml-8px">
                <!-- 排序按钮 -->
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === 0"
                  @click="movePhaseUp(index)"
                  title="上移"
                >
                  <template #icon>
                    <i class="i-carbon:arrow-up" />
                  </template>
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === formData.phases.length - 1"
                  @click="movePhaseDown(index)"
                  title="下移"
                >
                  <template #icon>
                    <i class="i-carbon:arrow-down" />
                  </template>
                </a-button>

                <!-- 编辑和删除按钮 -->
                <a-button type="text" size="small" @click="editPhase(phase)">
                  <template #icon>
                    <i class="i-carbon:edit" />
                  </template>
                </a-button>
                <a-button type="text" size="small" danger @click="removePhase(index)">
                  <template #icon>
                    <i class="i-carbon:trash-can" />
                  </template>
                </a-button>
              </div>
            </div>
          </div>

          <div v-if="formData.phases.length === 0" class="text-center py-20px text-gray-400">
            暂无活动环节
          </div>
        </div>
      </a-card>

      <!-- 操作按钮 -->
      <div class="flex justify-end space-x-8px">
        <a-button @click="backToList">取消</a-button>
        <a-button type="primary" @click="handleSaveActivity" :loading="loading">
          {{ editingActivity ? '更新活动' : '创建活动' }}
        </a-button>
      </div>
    </div>


    <!-- 环节管理模态框 -->
    <a-modal
      v-model:open="showPhaseModal"
      :title="editingPhase ? '编辑环节' : '添加环节'"
      width="600px"
      @ok="handleSavePhase"
      @cancel="handleCancelPhaseModal"
    >
      <a-form
        ref="phaseFormRef"
        :model="phaseFormData"
        :rules="phaseFormRules"
        layout="vertical"
      >
        <a-form-item label="环节标题" name="title">
          <a-input v-model:value="phaseFormData.title" placeholder="请输入环节标题" />
        </a-form-item>

        <a-form-item label="环节描述" name="description">
          <a-textarea
            v-model:value="phaseFormData.description"
            placeholder="请输入环节描述"
            :rows="2"
          />
        </a-form-item>


        <a-form-item label="负责人">
          <a-select
            v-model:value="phaseFormData.assignedMembers"
            mode="multiple"
            placeholder="请选择负责人"
            :options="memberOptions"
            :filter-option="filterMemberOption"
            show-search
          />
        </a-form-item>

        <a-form-item label="注意事项">
          <a-textarea
            v-model:value="phaseFormData.notes"
            placeholder="请输入注意事项"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 活动详情模态框 -->
    <a-modal
      v-model:open="showDetailModal"
      title="活动详情"
      width="600px"
      :footer="null"
    >
      <div v-if="selectedActivity" class="space-y-16px">
        <div>
          <h3 class="text-18px font-600 mb-8px">{{ selectedActivity.title }}</h3>
          <p class="text-gray-600">{{ selectedActivity.description }}</p>
        </div>
        
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="活动时间">
            {{ formatDateTimeRange(selectedActivity.startTime, selectedActivity.endTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="活动地点">
            {{ selectedActivity.location }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 活动环节详情 -->
        <div>
          <h4 class="text-16px font-500 mb-12px">活动环节</h4>
          <div class="space-y-8px">
            <div
              v-for="phase in selectedActivity.phases"
              :key="phase.id"
              class="p-12px bg-gray-50 rounded-8px"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-500 text-14px mb-4px">{{ phase.title }}</div>
                  <div class="text-12px text-gray-600 mb-8px">{{ phase.description }}</div>
                  <div v-if="phase.assignedMembers.length > 0" class="text-12px text-blue-600">
                    负责人：{{ phase.assignedMembers.map(id => getMemberName(id)).join(', ') }}
                  </div>
                  <div v-if="phase.notes" class="text-12px text-orange-600 mt-4px">
                    注意事项：{{ phase.notes }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="selectedActivity.phases.length === 0" class="text-center py-20px text-gray-400">
              暂无活动环节
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 环节详情模态框 -->
    <a-modal
      v-model:open="showPhasesModal"
      :title="`${selectedActivityForPhases?.title} - 环节详情`"
      width="700px"
      :footer="null"
    >
      <div v-if="selectedActivityForPhases" class="space-y-16px">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-16px font-600 mb-4px">{{ selectedActivityForPhases.title }}</h3>
            <p class="text-12px text-gray-500">{{ formatDateTimeRange(selectedActivityForPhases.startTime, selectedActivityForPhases.endTime) }} · {{ selectedActivityForPhases.location }}</p>
          </div>
          <a-tag color="blue">
            {{ selectedActivityForPhases.phases?.length || 0 }} 个环节
          </a-tag>
        </div>

        <div class="space-y-12px">
          <div
            v-for="(phase, index) in selectedActivityForPhases.phases"
            :key="phase.id"
            class="border border-gray-200 rounded-8px p-16px"
          >
            <div class="flex items-start justify-between mb-8px">
              <div class="flex items-center space-x-8px">
                <div class="w-24px h-24px bg-blue-500 text-white rounded-full flex items-center justify-center text-12px font-500">
                  {{ index + 1 }}
                </div>
                <h4 class="text-16px font-600 text-gray-800">{{ phase.title }}</h4>
              </div>
              <a-tag size="small" color="blue">环节 {{ index + 1 }}</a-tag>
            </div>

            <p class="text-14px text-gray-600 mb-12px">{{ phase.description }}</p>

            <div class="grid grid-cols-2 gap-12px">
              <div v-if="phase.assignedMembers.length > 0" class="space-y-4px">
                <div class="text-12px font-500 text-gray-700">负责人</div>
                <div class="flex flex-wrap gap-4px">
                  <a-tag
                    v-for="memberId in phase.assignedMembers"
                    :key="memberId"
                    color="blue"
                    size="small"
                  >
                    {{ getMemberName(memberId) }}
                  </a-tag>
                </div>
              </div>

              <div v-if="phase.notes" class="space-y-4px">
                <div class="text-12px font-500 text-gray-700">注意事项</div>
                <div class="text-12px text-orange-600 bg-orange-50 p-8px rounded-4px">
                  {{ phase.notes }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedActivityForPhases.phases.length === 0" class="text-center py-40px text-gray-400">
            <i class="i-carbon:task text-32px mb-8px block" />
            <div>暂无活动环节</div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { TableColumnProps } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import { useCampStore } from '@/store/camp'
import type { Activity, ActivityPhase } from '@/types/activity'

/**
 * 活动管理页面
 */

// 状态管理
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()
const campStore = useCampStore()

// 响应式状态
const loading = ref(false)
const searchText = ref('')
const showDetailModal = ref(false)
const showPhasesModal = ref(false)
const editingActivity = ref<Activity | null>(null)
const selectedActivity = ref<Activity | null>(null)
const selectedActivityForPhases = ref<Activity | null>(null)
const formRef = ref<FormInstance>()

// 视图模式：'list' | 'detail'
const viewMode = ref<'list' | 'detail'>('list')

// 环节管理状态
const showPhaseModal = ref(false)
const editingPhase = ref<ActivityPhase | null>(null)
const phaseFormRef = ref<FormInstance>()

// 计算属性
const activities = computed(() => activityStore.activities)
const members = computed(() => ministryStore.members)

const filteredActivities = computed(() => {
  let result = activities.value

  // 文本搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(activity =>
      activity.title.toLowerCase().includes(keyword) ||
      activity.description.toLowerCase().includes(keyword) ||
      activity.location.toLowerCase().includes(keyword)
    )
  }

  // 按日期降序排列（最新的活动在前面）
  result.sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())

  return result
})

const memberOptions = computed(() =>
  members.value.map(m => ({ label: m.name, value: m.id }))
)

const campOptions = computed(() =>
  campStore.camps.map(camp => ({
    label: camp.name,
    value: camp.id
  }))
)

const filterCampOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

// 表格列配置
const columns: TableColumnProps[] = [
  {
    title: '活动信息',
    key: 'title',
    width: 220
  },
  {
    title: '活动时间',
    key: 'dateRange',
    width: 220
  },
  {
    title: '地点',
    dataIndex: 'location',
    key: 'location',
    width: 140
  },
  {
    title: '环节数量',
    key: 'phases',
    width: 120
  },
  {
    title: '操作',
    key: 'action',
    width: 140,
    fixed: 'right'
  }
]

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  dateRange: [] as Dayjs[],
  location: '',
  campId: '',
  phases: [] as ActivityPhase[]
})

// 环节表单数据
const phaseFormData = reactive({
  id: '',
  title: '',
  description: '',
  assignedMembers: [] as string[],
  notes: '',
  order: 0
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入活动描述', trigger: 'blur' }],
  dateRange: [
    { required: true, message: '请选择活动时间范围', trigger: 'change' },
    { type: 'array', min: 2, message: '请选择完整的开始和结束时间', trigger: 'change' }
  ],
  location: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
  campId: [{ required: true, message: '请选择归属营会', trigger: 'change' }]
}

// 环节表单验证规则
const phaseFormRules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入环节标题', trigger: 'blur' }],
}

/**
 * 格式化时间范围
 */
const formatDateTimeRange = (startTime: string | Date, endTime: string | Date) => {
  const start = dayjs(startTime).format('YYYY-MM-DD HH:mm')
  const end = dayjs(endTime).format('YYYY-MM-DD HH:mm')
  return `${start} ~ ${end}`
}

/**
 * 获取成员姓名
 */
const getMemberName = (memberId: string) => {
  const member = members.value.find(m => m.id === memberId)
  return member?.name || `成员${memberId}`
}


/**
 * 成员选项过滤
 */
const filterMemberOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

/**
 * 查看活动详情
 */
const handleViewDetail = (activity: Activity) => {
  selectedActivity.value = activity
  showDetailModal.value = true
}

/**
 * 返回列表视图
 */
const backToList = () => {
  viewMode.value = 'list'
  selectedActivity.value = null
  resetForm()
}

/**
 * 进入详情视图（新增）
 */
const showAddDetail = () => {
  viewMode.value = 'detail'
  editingActivity.value = null
  selectedActivity.value = null
  resetForm()
}

/**
 * 进入详情视图（编辑）
 */
const showEditDetail = (activity: Activity) => {
  viewMode.value = 'detail'
  editingActivity.value = activity
  selectedActivity.value = activity

  // 填充表单数据
  Object.assign(formData, {
    title: activity.title,
    description: activity.description,
    dateRange: [dayjs(activity.startTime), dayjs(activity.endTime)],
    location: activity.location,
    campId: activity.campId,
    phases: [...activity.phases]
  })
}

/**
 * 查看活动环节详情
 */
const handleViewPhases = (activity: Activity) => {
  selectedActivityForPhases.value = activity
  showPhasesModal.value = true
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(formData, {
    title: '',
    description: '',
    dateRange: [],
    location: '',
    campId: '',
    phases: []
  })
  editingActivity.value = null
  selectedActivity.value = null
  formRef.value?.resetFields()
}


/**
 * 删除活动
 */
const handleDelete = (activity: Activity) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除活动"${activity.title}"吗？`,
    async onOk() {
      try {
        await activityStore.deleteActivity(activity.id)
        message.success('删除成功')
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

/**
 * 复制活动
 */
const handleCopyActivity = async (activity: Activity) => {
  try {
    // 创建新活动的副本
    const copiedActivity = {
      title: `${activity.title} (副本)`,
      description: activity.description,
      date: activity.startTime, // 使用开始时间作为日期
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location,
      campId: activity.campId,
      phases: activity.phases.map(phase => ({
        ...phase,
        id: `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 生成新ID
        order: phase.order
      }))
    }

    // 添加新活动
    await activityStore.addActivity(copiedActivity)

    message.success(`活动"${activity.title}"已复制成功`)
  } catch (error) {
    console.error('复制活动失败:', error)
    message.error('复制活动失败')
  }
}

/**
 * 保存活动
 */
const handleSaveActivity = async () => {
  try {
    await formRef.value?.validate()

    // 验证至少有一个环节
    if (formData.phases.length === 0) {
      message.error('请至少添加一个活动环节')
      return
    }

    const activityData = {
      title: formData.title,
      description: formData.description,
      date: formData.dateRange[0].format(),
      startTime: formData.dateRange[0].format(),
      endTime: formData.dateRange[1].format(),
      location: formData.location,
      campId: formData.campId,
      phases: formData.phases
    }

    if (editingActivity.value) {
      // 编辑
      await activityStore.updateActivity(editingActivity.value.id, activityData)
      message.success('更新成功')
    } else {
      // 新增
      await activityStore.addActivity(activityData)
      message.success('添加成功')
    }

    // 保存成功后返回列表视图
    backToList()
  } catch (error) {
    console.error('保存失败:', error)
  }
}


/**
 * 添加环节
 */
const addPhase = () => {
  editingPhase.value = null
  Object.assign(phaseFormData, {
    id: '',
    title: '',
    description: '',
    assignedMembers: [],
    notes: '',
    order: formData.phases.length
  })
  showPhaseModal.value = true
}

/**
 * 编辑环节
 */
const editPhase = (phase: ActivityPhase) => {
  editingPhase.value = phase
  Object.assign(phaseFormData, {
    id: phase.id,
    title: phase.title,
    description: phase.description,
    assignedMembers: [...phase.assignedMembers],
    notes: phase.notes || '',
    order: phase.order
  })
  showPhaseModal.value = true
}

/**
 * 删除环节
 */
const removePhase = (index: number) => {
  formData.phases.splice(index, 1)
  // 重新排序
  formData.phases.forEach((phase, idx) => {
    phase.order = idx
  })
}

/**
 * 上移环节
 */
const movePhaseUp = (index: number) => {
  if (index > 0) {
    // 交换位置
    const temp = formData.phases[index]
    formData.phases[index] = formData.phases[index - 1]
    formData.phases[index - 1] = temp

    // 更新排序
    formData.phases.forEach((phase, idx) => {
      phase.order = idx
    })
  }
}

/**
 * 下移环节
 */
const movePhaseDown = (index: number) => {
  if (index < formData.phases.length - 1) {
    // 交换位置
    const temp = formData.phases[index]
    formData.phases[index] = formData.phases[index + 1]
    formData.phases[index + 1] = temp

    // 更新排序
    formData.phases.forEach((phase, idx) => {
      phase.order = idx
    })
  }
}

/**
 * 保存环节
 */
const handleSavePhase = async () => {
  try {
    await phaseFormRef.value?.validate()

    const phaseData: ActivityPhase = {
      id: phaseFormData.id || `phase_${Date.now()}`,
      title: phaseFormData.title,
      description: phaseFormData.description,
      assignedMembers: phaseFormData.assignedMembers,
      notes: phaseFormData.notes,
      order: phaseFormData.order
    }

    if (editingPhase.value) {
      // 编辑
      const index = formData.phases.findIndex(p => p.id === editingPhase.value!.id)
      if (index !== -1) {
        formData.phases[index] = phaseData
      }
    } else {
      // 新增
      formData.phases.push(phaseData)
    }

    showPhaseModal.value = false
  } catch (error) {
    console.error('保存环节失败:', error)
  }
}

/**
 * 取消环节模态框
 */
const handleCancelPhaseModal = () => {
  showPhaseModal.value = false
  editingPhase.value = null
  phaseFormRef.value?.resetFields()
}



/**
 * 初始化数据
 */
onMounted(() => {
  Promise.all([
    activityStore.fetchActivities(),
    ministryStore.fetchMembers(),
    campStore.fetchCamps()
  ])
})
</script>
