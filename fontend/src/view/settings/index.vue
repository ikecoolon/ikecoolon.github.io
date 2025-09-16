<template>
  <div class="p-24px">
    <!-- 页面标题 -->
    <div class="mb-24px">
      <h1 class="text-24px font-600 text-gray-800 mb-8px">系统设置</h1>
      <p class="text-14px text-gray-500">配置系统参数和安全设置</p>
    </div>

    <div class="max-w-2xl">
      <!-- 密码设置 -->
      <a-card title="密码设置">
        <div class="space-y-16px">
          <div>
            <div class="text-14px font-500 mb-8px">当前密码</div>
            <div class="text-16px font-mono bg-gray-50 p-8px rounded-4px break-all">
              {{ authStore.currentPassword || '加载中...' }}
            </div>
            <div class="text-12px text-gray-500 mt-4px">
              密码存储位置：public/json/auth.json
            </div>
          </div>

          <div class="grid grid-cols-2 gap-12px">
            <div>
              <div class="text-12px text-gray-500 mb-4px">更新间隔</div>
              <div class="text-14px">
                {{ authStatus.updateInterval }} 分钟
              </div>
            </div>
            <div>
              <div class="text-12px text-gray-500 mb-4px">下次更新</div>
              <div class="text-14px">
                {{ formatDateTime(authStatus.nextUpdateTime) }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-12px">
            <div>
              <div class="text-12px text-gray-500 mb-4px">最后更新</div>
              <div class="text-14px">
                {{ formatDateTime(authStatus.lastUpdated) }}
              </div>
            </div>
            <div>
              <div class="text-12px text-gray-500 mb-4px">状态</div>
              <div class="text-14px">
                <a-tag :color="authStatus.enabled ? 'green' : 'red'">
                  {{ authStatus.enabled ? '启用' : '禁用' }}
                </a-tag>
              </div>
            </div>
          </div>

          <a-alert
            message="自动密码管理"
            description="系统会在设定的时间间隔自动生成新密码并更新配置文件。密码文件存储在 public/json/auth.json 中。"
            type="info"
            show-icon
          />

          <div class="flex gap-8px">
            <a-button type="primary" @click="refreshPassword" :loading="refreshingPassword">
              <template #icon>
                <i class="i-carbon:refresh" />
              </template>
              刷新密码
            </a-button>
            <a-button @click="downloadAuthConfig">
              <template #icon>
                <i class="i-carbon:download" />
              </template>
              下载配置
            </a-button>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useAuthStore } from '@/store/auth'
import { getAuthStatus } from '@/utils/authInitializer'

/**
 * 系统设置页面
 */

// 状态管理
const authStore = useAuthStore()

// 响应式状态
const refreshingPassword = ref(false)
const authStatus = ref({
  initialized: false,
  enabled: false,
  lastUpdated: null,
  nextUpdateTime: null,
  updateInterval: 0,
  email: ''
})


/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '未设置'
  return dayjs(dateStr).format('MM-DD HH:mm')
}

/**
 * 刷新密码
 */
const refreshPassword = async () => {
  refreshingPassword.value = true
  try {
    await authStore.getCurrentPassword()
    await loadAuthStatus()
    message.success('密码刷新成功')
  } catch (error) {
    console.error('刷新密码失败:', error)
    message.error('刷新密码失败')
  } finally {
    refreshingPassword.value = false
  }
}

/**
 * 下载认证配置
 */
const downloadAuthConfig = async () => {
  try {
    const response = await fetch('/json/auth.json')
    if (response.ok) {
      const data = await response.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'auth-config.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('认证配置下载成功')
    } else {
      message.error('认证配置文件不存在')
    }
  } catch (error) {
    console.error('下载认证配置失败:', error)
    message.error('下载认证配置失败')
  }
}

/**
 * 加载认证状态
 */
const loadAuthStatus = async () => {
  try {
    const status = await getAuthStatus()
    authStatus.value = status as any
  } catch (error) {
    console.error('加载认证状态失败:', error)
  }
}

// 初始化时加载认证状态和密码
loadAuthStatus()
authStore.getCurrentPassword()
</script>
