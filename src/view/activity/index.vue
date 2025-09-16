<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-24px">
      <div>
        <h1 class="text-24px font-600 text-gray-800 mb-8px">活动管理</h1>
        <p class="text-14px text-gray-500">管理营会活动安排和课程信息</p>
      </div>
      
      <a-button type="primary" @click="showAddModal = true">
        <template #icon>
          <i class="i-carbon:add" />
        </template>
        添加活动
      </a-button>
    </div>

    <!-- 活动列表 -->
    <a-card title="活动列表" :loading="loading">
      <template #extra>
        <div class="flex items-center space-x-8px">
          <a-select
            v-model:value="statusFilter"
            placeholder="状态筛选"
            style="width: 120px"
            allowClear
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="planned">计划中</a-select-option>
            <a-select-option value="ongoing">进行中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
          
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
          
          <template v-if="column.key === 'time'">
            <div>
              <div>{{ formatDateTime(record.startTime) }}</div>
              <div class="text-12px text-gray-500">至 {{ formatTime(record.endTime) }}</div>
            </div>
          </template>
          
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'assignedMembers'">
            <div class="space-y-2px">
              <a-tag
                v-for="memberId in record.assignedMembers.slice(0, 3)"
                :key="memberId"
                size="small"
              >
                {{ getMemberName(memberId) }}
              </a-tag>
              <div v-if="record.assignedMembers.length > 3" class="text-12px text-gray-500">
                +{{ record.assignedMembers.length - 3 }} 更多
              </div>
            </div>
          </template>
          
          <template v-if="column.key === 'action'">
            <a-dropdown>
              <a-button type="text" size="small">
                <template #icon>
                  <i class="i-carbon:overflow-menu-horizontal" />
                </template>
              </a-button>
              <template #overlay>
                <a-menu @click="handleActionClick($event, record)">
                  <a-menu-item key="edit">编辑</a-menu-item>
                  <a-menu-item key="view">查看详情</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" class="text-red-600">删除</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/编辑活动模态框 -->
    <a-modal
      v-model:open="showAddModal"
      :title="editingActivity ? '编辑活动' : '添加活动'"
      width="700px"
      @ok="handleSaveActivity"
      @cancel="handleCancelModal"
    >
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
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间" name="startTime">
              <a-date-picker
                v-model:value="formData.startTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                placeholder="选择开始时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间" name="endTime">
              <a-date-picker
                v-model:value="formData.endTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                placeholder="选择结束时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="活动地点" name="location">
              <a-input v-model:value="formData.location" placeholder="请输入活动地点" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="活动状态" name="status">
              <a-select v-model:value="formData.status" placeholder="选择活动状态">
                <a-select-option value="planned">计划中</a-select-option>
                <a-select-option value="ongoing">进行中</a-select-option>
                <a-select-option value="completed">已完成</a-select-option>
                <a-select-option value="cancelled">已取消</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="服侍类型" name="ministryIds">
          <a-select
            v-model:value="formData.ministryIds"
            mode="multiple"
            placeholder="请选择需要的服侍类型"
            :options="ministryOptions"
          />
        </a-form-item>
        
        <a-form-item label="指派人员" name="assignedMembers">
          <a-select
            v-model:value="formData.assignedMembers"
            mode="multiple"
            placeholder="请选择参与人员"
            :options="memberOptions"
            :filter-option="filterMemberOption"
            show-search
          />
        </a-form-item>
        
        <a-form-item label="备注说明">
          <a-textarea
            v-model:value="formData.notes"
            placeholder="其他需要说明的信息、注意事项等"
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
            {{ formatDateTime(selectedActivity.startTime) }} - {{ formatTime(selectedActivity.endTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="活动地点">
            {{ selectedActivity.location }}
          </a-descriptions-item>
          <a-descriptions-item label="活动状态">
            <a-tag :color="getStatusColor(selectedActivity.status)">
              {{ getStatusText(selectedActivity.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="服侍类型">
            <div class="space-y-4px">
              <a-tag
                v-for="ministryId in selectedActivity.ministryIds"
                :key="ministryId"
                color="blue"
              >
                {{ getMinistryName(ministryId) }}
              </a-tag>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="参与人员">
            <div class="space-y-4px">
              <a-tag
                v-for="memberId in selectedActivity.assignedMembers"
                :key="memberId"
              >
                {{ getMemberName(memberId) }}
              </a-tag>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="备注说明" v-if="selectedActivity.notes">
            {{ selectedActivity.notes }}
          </a-descriptions-item>
        </a-descriptions>
        
        <!-- 职责要求 -->
        <div>
          <h4 class="text-16px font-500 mb-12px">职责要求</h4>
          <div class="space-y-8px">
            <div
              v-for="ministryId in selectedActivity.ministryIds"
              :key="ministryId"
              class="p-12px bg-gray-50 rounded-8px"
            >
              <div class="font-500 text-14px mb-4px">{{ getMinistryName(ministryId) }}</div>
              <div class="text-12px text-gray-600 space-y-2px">
                <div
                  v-for="responsibility in getMinistryResponsibilities(ministryId)"
                  :key="responsibility"
                >
                  • {{ responsibility }}
                </div>
              </div>
            </div>
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
import type { Activity, ActivityStatus } from '@/types/activity'

/**
 * 活动管理页面
 */

// 状态管理
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()

// 响应式状态
const loading = ref(false)
const searchText = ref('')
const statusFilter = ref<ActivityStatus | ''>('')
const showAddModal = ref(false)
const showDetailModal = ref(false)
const editingActivity = ref<Activity | null>(null)
const selectedActivity = ref<Activity | null>(null)
const formRef = ref<FormInstance>()

// 计算属性
const activities = computed(() => activityStore.activities)
const ministries = computed(() => ministryStore.ministries)
const members = computed(() => ministryStore.members)

const filteredActivities = computed(() => {
  let result = activities.value

  // 状态筛选
  if (statusFilter.value) {
    result = result.filter(activity => activity.status === statusFilter.value)
  }

  // 文本搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(activity =>
      activity.title.toLowerCase().includes(keyword) ||
      activity.description.toLowerCase().includes(keyword) ||
      activity.location.toLowerCase().includes(keyword)
    )
  }

  return result
})

const ministryOptions = computed(() =>
  ministries.value.map(m => ({ label: m.name, value: m.id }))
)

const memberOptions = computed(() =>
  members.value.map(m => ({ label: m.name, value: m.id }))
)

// 表格列配置
const columns: TableColumnProps[] = [
  {
    title: '活动信息',
    key: 'title',
    width: 250
  },
  {
    title: '时间安排',
    key: 'time',
    width: 180
  },
  {
    title: '地点',
    dataIndex: 'location',
    key: 'location',
    width: 120
  },
  {
    title: '状态',
    key: 'status',
    width: 100
  },
  {
    title: '参与人员',
    key: 'assignedMembers',
    width: 150
  },
  {
    title: '操作',
    key: 'action',
    width: 80,
    fixed: 'right'
  }
]

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  startTime: null as Dayjs | null,
  endTime: null as Dayjs | null,
  location: '',
  status: 'planned' as ActivityStatus,
  ministryIds: [] as string[],
  assignedMembers: [] as string[],
  notes: ''
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入活动标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入活动描述', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
  status: [{ required: true, message: '请选择活动状态', trigger: 'change' }],
  ministryIds: [{ required: true, message: '请选择至少一个服侍类型', trigger: 'change' }]
}

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
 * 获取状态颜色和文本
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
  const member = members.value.find(m => m.id === memberId)
  return member?.name || `成员${memberId}`
}

/**
 * 获取服侍类型名称
 */
const getMinistryName = (ministryId: string) => {
  const ministry = ministries.value.find(m => m.id === ministryId)
  return ministry?.name || `服侍${ministryId}`
}

/**
 * 获取服侍类型职责
 */
const getMinistryResponsibilities = (ministryId: string) => {
  const ministry = ministries.value.find(m => m.id === ministryId)
  return ministry?.responsibilities || []
}

/**
 * 成员选项过滤
 */
const filterMemberOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

/**
 * 处理操作点击
 */
const handleActionClick = ({ key }: { key: string }, activity: Activity) => {
  if (key === 'edit') {
    editingActivity.value = activity
    
    // 填充表单数据
    Object.assign(formData, {
      title: activity.title,
      description: activity.description,
      startTime: dayjs(activity.startTime),
      endTime: dayjs(activity.endTime),
      location: activity.location,
      status: activity.status,
      ministryIds: [...activity.ministryIds],
      assignedMembers: [...activity.assignedMembers],
      notes: activity.notes || ''
    })
    
    showAddModal.value = true
  } else if (key === 'view') {
    selectedActivity.value = activity
    showDetailModal.value = true
  } else if (key === 'delete') {
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
}

/**
 * 保存活动
 */
const handleSaveActivity = async () => {
  try {
    await formRef.value?.validate()
    
    const activityData = {
      title: formData.title,
      description: formData.description,
      startTime: formData.startTime!.toDate(),
      endTime: formData.endTime!.toDate(),
      location: formData.location,
      status: formData.status,
      ministryIds: formData.ministryIds,
      assignedMembers: formData.assignedMembers,
      notes: formData.notes
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
    
    handleCancelModal()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

/**
 * 取消模态框
 */
const handleCancelModal = () => {
  showAddModal.value = false
  editingActivity.value = null
  
  // 重置表单
  Object.assign(formData, {
    title: '',
    description: '',
    startTime: null,
    endTime: null,
    location: '',
    status: 'planned',
    ministryIds: [],
    assignedMembers: [],
    notes: ''
  })
  
  formRef.value?.resetFields()
}

/**
 * 初始化数据
 */
onMounted(() => {
  Promise.all([
    activityStore.fetchActivities(),
    ministryStore.fetchMinistries(),
    ministryStore.fetchMembers()
  ])
})
</script>
