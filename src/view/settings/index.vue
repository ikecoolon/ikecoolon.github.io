<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="mb-24px">
      <h1 class="text-24px font-600 text-gray-800 mb-8px">系统设置</h1>
      <p class="text-14px text-gray-500">配置系统参数和安全设置</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-24px">
      <!-- 密码设置 -->
      <a-card title="密码设置" class="mb-24px">
        <div class="space-y-16px">
          <div>
            <div class="text-14px font-500 mb-8px">当前密码</div>
            <div class="text-16px font-mono bg-gray-50 p-8px rounded-4px">
              {{ authStore.DEFAULT_PASSWORD || '未设置' }}
            </div>
            <div class="text-12px text-gray-500 mt-4px">
              默认密码：admin123
            </div>
          </div>

          <a-alert
            message="注意事项"
            description="此系统使用简单的本地认证。如需修改密码，请在代码中直接修改 DEFAULT_PASSWORD。"
            type="info"
            show-icon
          />
        </div>
      </a-card>

      <!-- 系统状态 -->
      <a-card title="系统状态">
        <div class="space-y-16px">
          <div class="p-16px bg-green-50 rounded-8px">
            <div class="text-14px font-500 text-green-800 mb-8px">数据状态</div>
            <div class="text-12px text-green-600 mb-12px">
              系统正在正常运行，所有数据从配置文件加载
            </div>
            <div class="space-y-4px text-12px">
              <div>📊 活动数据：{{ activityStore.activities.length }} 项</div>
              <div>👥 服侍者数据：{{ ministryStore.members.length }} 项</div>
              <div>📚 课程数据：{{ activityStore.courses.length }} 项</div>
              <div>🏢 服侍类型：{{ ministryStore.ministries.length }} 项</div>
            </div>
          </div>

          <div class="p-16px bg-blue-50 rounded-8px">
            <div class="text-14px font-500 text-blue-800 mb-8px">数据来源</div>
            <div class="text-12px text-blue-600 mb-12px">
              所有数据均从 public/json/ 目录下的配置文件读取
            </div>
            <div class="space-y-4px text-12px">
              <div>📁 public/json/camps.json - 活动数据</div>
              <div>📁 public/json/courses.json - 课程数据</div>
              <div>📁 public/json/ministries.json - 服侍类型</div>
              <div>📁 public/json/participants.json - 服侍者数据</div>
            </div>
          </div>

          <div class="p-16px bg-green-50 rounded-8px">
            <div class="text-14px font-500 text-green-800 mb-8px">数据修改功能</div>
            <div class="text-12px text-green-600 mb-12px">
              系统支持在线数据修改，修改后会自动保存到浏览器本地存储
            </div>
            <div class="space-y-4px text-12px">
              <div>✅ 支持在线数据修改和保存</div>
              <div>💾 数据自动保存到本地存储</div>
              <div>📤 可导出为JSON文件手动更新原始配置</div>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 系统信息 -->
      <a-card title="系统信息">
        <a-descriptions :column="1" size="small">
          <a-descriptions-item label="系统版本">
            {{ systemInfo.version }}
          </a-descriptions-item>
          <a-descriptions-item label="最后更新">
            {{ systemInfo.lastUpdate }}
          </a-descriptions-item>
          <a-descriptions-item label="活动总数">
            {{ systemInfo.totalActivities }}
          </a-descriptions-item>
          <a-descriptions-item label="服侍者总数">
            {{ systemInfo.totalMembers }}
          </a-descriptions-item>
          <a-descriptions-item label="上次密码更新">
            {{ systemInfo.lastPasswordUpdate }}
          </a-descriptions-item>
          <a-descriptions-item label="下次密码更新">
            {{ systemInfo.nextPasswordUpdate }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 数据管理 -->
      <a-card title="数据管理">
        <div class="space-y-16px">
          <div class="p-16px bg-blue-50 rounded-8px">
            <div class="text-14px font-500 text-blue-800 mb-8px">数据备份</div>
            <div class="text-12px text-blue-600 mb-12px">
              定期备份系统数据，确保数据安全
            </div>
            <a-button size="small" @click="handleBackupData" :loading="backing">
              <template #icon>
                <i class="i-carbon:cloud-upload" />
              </template>
              备份数据
            </a-button>
          </div>
          
          <div class="p-16px bg-orange-50 rounded-8px">
            <div class="text-14px font-500 text-orange-800 mb-8px">数据恢复</div>
            <div class="text-12px text-orange-600 mb-12px">
              从备份文件恢复数据
            </div>
            <a-upload
              :show-upload-list="false"
              :before-upload="handleRestoreData"
              accept=".json"
            >
              <a-button size="small" :loading="restoring">
                <template #icon>
                  <i class="i-carbon:cloud-download" />
                </template>
                恢复数据
              </a-button>
            </a-upload>
          </div>
          
          <div class="p-16px bg-red-50 rounded-8px">
            <div class="text-14px font-500 text-red-800 mb-8px">重置系统</div>
            <div class="text-12px text-red-600 mb-12px">
              清除所有数据，重置为初始状态（谨慎操作）
            </div>
            <a-button size="small" danger @click="handleResetSystem">
              <template #icon>
                <i class="i-carbon:warning" />
              </template>
              重置系统
            </a-button>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'
import { useAuthStore } from '@/store/auth'
import { dataManager } from '@/api'

/**
 * 系统设置页面
 */

// 状态管理
const activityStore = useActivityStore()
const ministryStore = useMinistryStore()
const authStore = useAuthStore()

// 响应式状态
const backing = ref(false)
const restoring = ref(false)

// 系统信息
const systemInfo = computed(() => ({
  version: '1.0.0',
  lastUpdate: dayjs().format('YYYY-MM-DD HH:mm'),
  totalActivities: activityStore.activities.length,
  totalMembers: ministryStore.members.length,
  dataSource: 'JSON配置文件 + 本地存储'
}))

/**
 * 备份数据
 */
const handleBackupData = async () => {
  backing.value = true
  try {
    dataManager.exportAllData()
  } catch (error) {
    console.error('备份失败:', error)
    message.error('备份失败')
  } finally {
    backing.value = false
  }
}

/**
 * 恢复数据
 */
const handleRestoreData = (file: File) => {
  Modal.confirm({
    title: '确认恢复数据',
    content: '恢复数据将覆盖当前所有修改，确定继续吗？',
    okText: '确认恢复',
    cancelText: '取消',
    async onOk() {
      restoring.value = true
      try {
        await dataManager.importAllData(file)
        message.success('数据恢复成功，请刷新页面')

        // 延迟刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('恢复失败:', error)
        message.error('数据恢复失败')
      } finally {
        restoring.value = false
      }
    }
  })

  return false // 阻止默认上传行为
}

/**
 * 重置系统
 */
const handleResetSystem = () => {
  Modal.confirm({
    title: '确认重置系统',
    content: '重置系统将清除所有本地修改数据，恢复到原始配置状态。此操作不可撤销！',
    okText: '确认重置',
    okType: 'danger',
    async onOk() {
      try {
        dataManager.resetData()
        message.success('系统重置成功，请刷新页面')

        // 延迟刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        console.error('重置失败:', error)
        message.error('系统重置失败')
      }
    }
  })
}
</script>
