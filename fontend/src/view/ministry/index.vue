<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between mb-24px">
      
      <a-button type="primary" @click="showAddModal = true">
        <template #icon>
          <i class="i-carbon:add" />
        </template>
        添加服侍者
      </a-button>
    </div>


    <div class="grid grid-cols-1 lg:grid-cols-3 gap-24px">
      <!-- 服侍者列表 -->
      <div class="lg:col-span-2">
        <a-card title="服侍者列表" :loading="loading">
          <template #extra>
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索服侍者"
              style="width: 200px"
            />
          </template>
          
          <div class="space-y-8px max-h-600px overflow-y-auto">
            <div
              v-for="member in filteredMembers"
              :key="member.id"
              class="p-16px border border-gray-200 rounded-8px cursor-pointer hover:bg-blue-50 transition-colors"
              @click="selectedMember = member"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-8px mb-8px">
                    <div class="text-16px font-500 text-gray-800">{{ member.name }}</div>
                    <div class="flex space-x-4px">
                      <a-tag
                        v-for="ministryId in member.ministryIds"
                        :key="ministryId"
                        size="small"
                        color="blue"
                      >
                        {{ getMinistryName(ministryId) }}
                      </a-tag>
                    </div>
                  </div>
                  
                  <div class="text-14px text-gray-600 mb-4px">
                    <i class="i-carbon:phone mr-8px" />{{ member.phone }}
                    <i class="i-carbon:email ml-16px mr-8px" />{{ member.email }}
                  </div>
                  
                </div>
                
                <a-dropdown>
                  <a-button type="text" size="small">
                    <template #icon>
                      <i class="i-carbon:overflow-menu-horizontal" />
                    </template>
                  </a-button>
                  <template #overlay>
                    <a-menu @click="handleMemberMenuClick($event, member)">
                      <a-menu-item key="edit">编辑</a-menu-item>
                      <a-menu-item key="delete" class="text-red-600">删除</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </div>
            
            <div v-if="filteredMembers.length === 0" class="text-center py-40px text-gray-400">
              暂无服侍者数据
            </div>
          </div>
        </a-card>
      </div>

      <!-- 详情和服侍类型 -->
      <div class="space-y-24px">
        <!-- 服侍者详情 -->
        <a-card title="服侍者详情" size="small">
          <div v-if="selectedMember">
            <div class="space-y-12px">
              <div>
                <div class="text-12px text-gray-500 mb-4px">姓名</div>
                <div class="text-14px text-gray-800">{{ selectedMember.name }}</div>
              </div>

              <div>
                <div class="text-12px text-gray-500 mb-4px">联系方式</div>
                <div class="text-14px text-gray-800">
                  <div>电话：{{ selectedMember.phone }}</div>
                  <div>邮箱：{{ selectedMember.email }}</div>
                </div>
              </div>

              <div v-if="selectedMember.notes">
                <div class="text-12px text-gray-500 mb-4px">备注</div>
                <div class="text-14px text-gray-600">{{ selectedMember.notes }}</div>
              </div>

              <!-- 相关活动 -->
              <div>
                <div class="text-12px text-gray-500 mb-8px">参与的活动</div>
                <div class="space-y-4px text-12px">
                  <div
                    v-for="activity in getMemberActivities(selectedMember.id)"
                    :key="activity.id"
                    class="p-8px bg-gray-50 rounded-4px"
                  >
                    <div class="font-500">{{ activity.title }}</div>
                    <div class="text-gray-500">{{ formatDateTime(activity.startTime) }}</div>
                  </div>
                </div>
                <div v-if="getMemberActivities(selectedMember.id).length === 0" class="text-12px text-gray-400">
                  暂无参与的活动
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-32px text-gray-400">
            点击服侍者查看详情
          </div>
        </a-card>

        <!-- 服侍类型 -->
        <a-card title="服侍类型" size="small">
          <div class="space-y-8px">
            <div
              v-for="ministry in ministries"
              :key="ministry.id"
              class="p-12px bg-gray-50 rounded-8px"
            >
              <div class="font-500 text-14px text-gray-800 mb-4px">{{ ministry.name }}</div>
              <div class="text-12px text-gray-600 mb-8px">{{ ministry.description }}</div>
              <div class="text-12px text-gray-500">
                人数：{{ getMemberCount(ministry.id) }} 人
              </div>
            </div>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 添加/编辑服侍者模态框 -->
    <a-modal
      v-model:open="showAddModal"
      :title="editingMember ? '编辑服侍者' : '添加服侍者'"
      width="600px"
      @ok="handleSaveMember"
      @cancel="handleCancelModal"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" name="name">
              <a-input v-model:value="formData.name" placeholder="请输入姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="电话" name="phone">
              <a-input v-model:value="formData.phone" placeholder="请输入电话号码" />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formData.email" placeholder="请输入邮箱地址" />
        </a-form-item>
        
        <a-form-item label="服侍类型" name="ministryIds">
          <a-select
            v-model:value="formData.ministryIds"
            mode="multiple"
            placeholder="请选择服侍类型"
            :options="ministryOptions"
          />
        </a-form-item>
        
        <a-form-item label="备注">
          <a-textarea
            v-model:value="formData.notes"
            placeholder="其他需要说明的信息"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import dayjs from 'dayjs'
import { useMinistryStore } from '@/store/ministry'
import { useActivityStore } from '@/store/activity'
import type { MinistryMember } from '@/types/ministry'

/**
 * 服侍者管理页面
 */

// 状态管理
const ministryStore = useMinistryStore()
const activityStore = useActivityStore()

// 响应式状态
const loading = ref(false)
const searchText = ref('')
const selectedMember = ref<MinistryMember | null>(null)
const showAddModal = ref(false)
const editingMember = ref<MinistryMember | null>(null)
const formRef = ref<FormInstance>()

// 计算属性
const members = computed(() => ministryStore.members)
const ministries = computed(() => ministryStore.ministries)
const activities = computed(() => activityStore.activities)

const filteredMembers = computed(() => {
  if (!searchText.value) return members.value
  
  return members.value.filter(member =>
    member.name.includes(searchText.value) ||
    member.phone.includes(searchText.value) ||
    member.email.includes(searchText.value)
  )
})


const ministryOptions = computed(() => 
  ministries.value.map(m => ({ label: m.name, value: m.id }))
)


// 表单数据
const formData = reactive({
  name: '',
  phone: '',
  email: '',
  ministryIds: [] as string[],
  notes: ''
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  ministryIds: [{ required: true, message: '请选择至少一个服侍类型', trigger: 'change' }]
}

/**
 * 获取服侍类型名称
 */
const getMinistryName = (ministryId: string) => {
  const ministry = ministries.value.find(m => m.id === ministryId)
  return ministry?.name || `服侍${ministryId}`
}

/**
 * 获取服侍类型成员数量
 */
const getMemberCount = (ministryId: string) => {
  return members.value.filter(m => m.ministryIds.includes(ministryId)).length
}

/**
 * 获取成员参与的活动
 */
const getMemberActivities = (memberId: string) => {
  return activities.value.filter(activity => 
    activity.assignedMembers.includes(memberId)
  )
}

/**
 * 格式化日期时间
 */
const formatDateTime = (date: Date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

/**
 * 处理服侍者菜单点击
 */
const handleMemberMenuClick = ({ key }: { key: string }, member: MinistryMember) => {
  if (key === 'edit') {
    editingMember.value = member
    
    // 填充表单数据
    Object.assign(formData, {
      name: member.name,
      phone: member.phone,
      email: member.email,
      ministryIds: [...member.ministryIds],
      notes: member.notes || ''
    })
    
    showAddModal.value = true
  } else if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除服侍者"${member.name}"吗？`,
      async onOk() {
        try {
          await ministryStore.deleteMember(member.id)
          message.success('删除成功')
          
          if (selectedMember.value?.id === member.id) {
            selectedMember.value = null
          }
        } catch (error) {
          message.error('删除失败')
        }
      }
    })
  }
}

/**
 * 保存服侍者
 */
const handleSaveMember = async () => {
  try {
    await formRef.value?.validate()
    
    const memberData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      ministryIds: formData.ministryIds,
      notes: formData.notes
    }
    
    if (editingMember.value) {
      // 编辑
      await ministryStore.updateMember(editingMember.value.id, memberData)
      message.success('更新成功')
      
      // 更新选中的成员数据
      if (selectedMember.value?.id === editingMember.value.id) {
        selectedMember.value = { ...selectedMember.value, ...memberData }
      }
    } else {
      // 新增
      const newMember = await ministryStore.addMember(memberData)
      message.success('添加成功')
      selectedMember.value = newMember
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
  editingMember.value = null
  
  // 重置表单
  Object.assign(formData, {
    name: '',
    phone: '',
    email: '',
    ministryIds: [],
    notes: ''
  })
  
  formRef.value?.resetFields()
}

/**
 * 初始化数据
 */
onMounted(() => {
  Promise.all([
    ministryStore.fetchMembers(),
    ministryStore.fetchMinistries(),
    activityStore.fetchActivities()
  ])
})
</script>
