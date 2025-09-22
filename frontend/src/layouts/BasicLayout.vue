<template>
  <!-- 认证初始化加载状态 -->
  <div v-if="!authInitialized" class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">正在验证登录状态...</p>
    </div>
  </div>

  <!-- 主布局 -->
  <a-layout v-else class="min-h-screen">
    <!-- 侧边栏 -->
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible
      class="bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl" :width="160" :collapsed-width="64">
      <!-- Logo -->
      <div class="logo-section h-64px flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 shadow-lg border-b border-slate-600/30">
        <div class="text-18px font-700 text-white/95" v-if="!collapsed">
          <i class="i-carbon:camp mr-8px text-blue-400" />
          <span class="bg-gradient-to-r from-white to-slate-100 bg-clip-text text-transparent font-800">
            营会中心
          </span>
        </div>
        <div class="text-20px text-white/90" v-else>
          <i class="i-carbon:camp text-blue-400" />
        </div>
      </div>

      <!-- 菜单 -->
      <a-menu v-model:selectedKeys="selectedKeys" v-model:openKeys="openKeys" mode="inline" :inline-collapsed="collapsed"
        theme="dark" class="bg-transparent border-0 mt-8px" @click="handleMenuClick">
        <a-menu-item key="dashboard" v-if="hasPermission('dashboard')">
          <template #icon>
            <i class="i-carbon:dashboard text-18px" />
          </template>
          <span>概况</span>
        </a-menu-item>

        <a-menu-item key="ministry" v-if="hasPermission('ministry')">
          <template #icon>
            <i class="i-carbon:group text-18px" />
          </template>
          <span>服侍者</span>
        </a-menu-item>

        <a-menu-item key="activity" v-if="hasPermission('activity')">
          <template #icon>
            <i class="i-carbon:calendar text-18px" />
          </template>
          <span>活动管理</span>
        </a-menu-item>

        <a-menu-item key="camp" v-if="hasPermission('camp')">
          <template #icon>
            <i class="i-carbon:campsite text-18px" />
          </template>
          <span>营会管理</span>
        </a-menu-item>

        <a-menu-item key="settings" v-if="hasPermission('settings')">
          <template #icon>
            <i class="i-carbon:settings text-18px" />
          </template>
          <span>系统设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- 主内容区 -->
    <a-layout>
      <!-- 顶部导航 -->
      <a-layout-header
        class="bg-gradient-to-r from-slate-50 to-white shadow-lg px-20px h-64px flex items-center justify-between border-b border-gray-200">
        <!-- 左侧：折叠按钮和面包屑 -->
        <div class="flex items-center">
          <a-button type="text" @click="collapsed = !collapsed"
            class="mr-20px w-40px h-40px flex items-center justify-center rounded-lg hover:bg-blue-100 transition-all duration-200">
            <template #icon>
              <i class="text-20px text-slate-700 hover:text-blue-700 transition-all duration-200"
                :class="collapsed ? 'i-carbon:collapse-categories':'i-carbon:menu'  " />
            </template>
          </a-button>

          <a-breadcrumb class="text-slate-700">
            <a-breadcrumb-item>
              <router-link to="/" class="  ">
                <i class="i-carbon:home mr-4px text-blue-600" />
                <span class="text-blue-600 hover:text-blue-700 font-600 transition-colors">首页</span>
              </router-link>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="currentPageTitle" class="font-600">
              <span class="text-white/60 ">{{ currentPageTitle }}</span>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <!-- 右侧：用户信息和操作 -->
        <div class="flex items-center">
          <!-- 登录状态显示 -->
          <template v-if="isAuthenticated">
            <a-dropdown placement="bottomRight">
              <a-button type="text"
                class="flex items-center px-12px py-6px rounded-lg hover:bg-blue-50 transition-all duration-200">
                <div
                  class="w-32px h-32px bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mr-8px shadow-sm">
                  <i class="i-carbon:user text-16px text-white" />
                </div>
                <span class="text-white/60 font-500">{{ user?.username || '管理员' }}</span>
                <i class="i-carbon:chevron-down text-12px ml-8px text-slate-600" />
              </a-button>
              <template #overlay>
                <a-menu @click="handleUserMenuClick" class="min-w-160px">
                  <a-menu-item key="logout">
                    <i class="i-carbon:logout text-14px mr-8px text-red-600" />
                    <span class="text-slate-700">退出登录</span>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>

          <!-- 未登录状态 -->
          <template v-else>
            <a-button type="primary" @click="goToLogin"
              class="px-16px h-40px rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
              <i class="i-carbon:login text-16px mr-6px" />
              以维护者访问
            </a-button>
          </template>
        </div>
      </a-layout-header>

      <!-- 页面内容 -->
      <a-layout-content class="m-16px">
        <div class="bg-white rounded-8px shadow-sm min-h-600px">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/store/auth'

/**
 * 基础布局组件
 */

// 路由
const router = useRouter()
const route = useRoute()

// 状态管理
const authStore = useAuthStore()

// 响应式状态
const collapsed = ref(false)
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])
const authInitialized = ref(false)

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)

// 权限检查函数
const hasPermission = (permission: string) => {
  const userPermissions = user.value?.permissions || []
  return userPermissions.includes(permission)
}

const currentPageTitle = computed(() => {
  return route.meta?.title as string || ''
})

// 监听路由变化更新选中菜单
watch(
  () => route.name,
  (newName) => {
    if (newName) {
      selectedKeys.value = [String(newName).toLowerCase()]
    }
  },
  { immediate: true }
)

// 初始化认证状态
onMounted(async () => {
  try {
    await authStore.initAuth()
  } catch (error) {
    console.warn('认证状态初始化失败:', error)
  } finally {
    authInitialized.value = true
  }
})

/**
 * 处理菜单点击
 */
const handleMenuClick = ({ key }: { key: string }) => {
  if (key === 'dashboard') {
    router.push('/dashboard')
  } else if (key === 'ministry') {
    router.push('/ministry')
  } else if (key === 'activity') {
    router.push('/activity')
  } else if (key === 'camp') {
    router.push('/camp')
  } else if (key === 'settings') {
    router.push('/settings')
  }
}

/**
 * 处理用户菜单点击
 */
const handleUserMenuClick = ({ key }: { key: string }) => {
  if (key === 'logout') {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk() {
        authStore.logout()
        message.success('已退出登录')
        router.push('/login')
      }
    })
  } else if (key === 'profile') {
    message.info('个人信息功能开发中...')
  }
}

/**
 * 跳转到登录页
 */
const goToLogin = () => {
  router.push('/login')
}

// 初始化认证状态
authStore.initAuth()
</script>

<style scoped>
.ant-layout-sider {
  position: relative;
  z-index: 10;
}

/* Logo 区域样式优化 */
:deep(.logo-section) {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

:deep(.logo-section::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.1), rgba(51, 65, 85, 0.05));
  pointer-events: none;
}

.ant-layout-header {
  position: relative;
  z-index: 9;
}

/* 菜单样式优化 */
:deep(.ant-menu-inline) {
  border-right: none;
  background: transparent;
}

:deep(.ant-menu-item) {
  margin: 6px 8px;
  border-radius: 10px;
  height: 48px;
  line-height: 48px;
  padding-left: 16px !important;
  padding-right: 16px !important;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.85) !important;
  width: calc(100% - 16px);
  box-sizing: border-box;
}

:deep(.ant-menu-item:hover) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2)) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  transform: translateY(-1px);
}

:deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
  color: #ffffff !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

:deep(.ant-menu-item-selected::after) {
  display: none;
}

:deep(.ant-menu-item .anticon) {
  font-size: 18px;
  margin-right: 12px;
  color: rgba(255, 255, 255, 0.7) !important;
}

:deep(.ant-menu-item:hover .anticon) {
  color: #ffffff !important;
}

:deep(.ant-menu-item-selected .anticon) {
  color: #ffffff !important;
}

/* 收缩状态菜单项 */
:deep(.ant-menu-inline-collapsed .ant-menu-item) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin: 6px 8px;
  width: calc(100% - 16px);
  display: flex !important;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.85) !important;
}

:deep(.ant-menu-inline-collapsed .ant-menu-item:hover) {
  color: #ffffff !important;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2)) !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  transform: translateY(-1px);
}

:deep(.ant-menu-inline-collapsed .ant-menu-item-selected) {
  color: #ffffff !important;
  background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

/* 收缩状态下的图标样式 */
:deep(.ant-menu-inline-collapsed .ant-menu-item .anticon) {
  margin-right: 0 !important;
  font-size: 20px;
  flex-shrink: 0;
  color: inherit !important;
}

/* 隐藏收缩状态下的文字 */
:deep(.ant-menu-inline-collapsed .ant-menu-item span) {
  display: none !important;
}

/* 面包屑样式 */
:deep(.ant-breadcrumb) {
  font-size: 14px;
}

:deep(.ant-breadcrumb-separator) {
  color: #64748b;
  font-weight: 500;
}

:deep(.ant-breadcrumb a) {
  color: #1e40af;
  font-weight: 600;
  transition: color 0.2s ease;
}

:deep(.ant-breadcrumb a:hover) {
  color: #1d4ed8;
}

:deep(.ant-breadcrumb-link) {
  color: #0f172a !important;
  font-weight: 600;
}
</style>
