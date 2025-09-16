<template>
  <a-layout class="min-h-screen">
    <!-- 侧边栏 -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      class="bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl"
      :width="240"
      :collapsed-width="64"
    >
      <!-- Logo -->
      <div class="h-64px flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div class="text-18px font-700 text-white" v-if="!collapsed">
          <i class="i-carbon:camp mr-8px" />
          营会管理系统
        </div>
        <div class="text-20px text-white" v-else>
          <i class="i-carbon:camp" />
        </div>
      </div>

      <!-- 菜单 -->
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        mode="inline"
        :inline-collapsed="collapsed"
        theme="dark"
        class="bg-transparent border-0 mt-8px"
        @click="handleMenuClick"
      >
        <a-menu-item key="dashboard" class="menu-item-custom">
          <template #icon>
            <i class="i-carbon:dashboard text-18px" />
          </template>
          <span>仪表盘</span>
        </a-menu-item>

        <a-menu-item key="ministry" v-if="isAuthenticated" class="menu-item-custom">
          <template #icon>
            <i class="i-carbon:group text-18px" />
          </template>
          <span>服侍者管理</span>
        </a-menu-item>

        <a-menu-item key="activity" v-if="isAuthenticated" class="menu-item-custom">
          <template #icon>
            <i class="i-carbon:calendar text-18px" />
          </template>
          <span>活动管理</span>
        </a-menu-item>

        <a-menu-item key="settings" v-if="isAuthenticated" class="menu-item-custom">
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
      <a-layout-header class="bg-white shadow-lg px-20px h-64px flex items-center justify-between border-b border-gray-100">
        <!-- 左侧：折叠按钮和面包屑 -->
        <div class="flex items-center">
          <a-button
            type="text"
            @click="collapsed = !collapsed"
            class="mr-20px w-40px h-40px flex items-center justify-center rounded-lg hover:bg-blue-50 transition-all duration-200"
          >
            <template #icon>
              <i 
                class="text-20px text-gray-600 hover:text-blue-600 transition-all duration-200"
                :class="collapsed ? 'i-carbon:menu' : 'i-carbon:close'"
              />
            </template>
          </a-button>

          <a-breadcrumb class="text-gray-600">
            <a-breadcrumb-item>
              <router-link to="/" class="text-blue-600 hover:text-blue-700 transition-colors">
                <i class="i-carbon:home mr-4px" />
                首页
              </router-link>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="currentPageTitle" class="text-gray-700 font-500">
              {{ currentPageTitle }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <!-- 右侧：用户信息和操作 -->
        <div class="flex items-center">
          <!-- 登录状态显示 -->
          <template v-if="isAuthenticated">
            <a-dropdown placement="bottomRight">
              <a-button type="text" class="flex items-center px-12px py-6px rounded-lg hover:bg-gray-50 transition-all duration-200">
                <div class="w-32px h-32px bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-8px">
                  <i class="i-carbon:user text-16px text-white" />
                </div>
                <span class="text-gray-700 font-500">{{ user?.username || '管理员' }}</span>
                <i class="i-carbon:chevron-down text-12px ml-8px text-gray-500" />
              </a-button>
              <template #overlay>
                <a-menu @click="handleUserMenuClick" class="min-w-160px">
                  <a-menu-item key="profile">
                    <i class="i-carbon:user text-14px mr-8px text-blue-500" />
                    个人信息
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="logout">
                    <i class="i-carbon:logout text-14px mr-8px text-red-500" />
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>

          <!-- 未登录状态 -->
          <template v-else>
            <a-button type="primary" @click="goToLogin" class="px-16px h-40px rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
              <i class="i-carbon:login text-16px mr-6px" />
              登录
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
import { ref, computed, watch } from 'vue'
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

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)

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
        router.push('/dashboard')
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
  margin: 6px 12px;
  border-radius: 10px;
  height: 48px;
  line-height: 48px;
  padding-left: 20px !important;
  padding-right: 20px !important;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
}

:deep(.ant-menu-item:hover) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15)) !important;
  color: #ffffff !important;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

:deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #3b82f6, #6366f1) !important;
  color: #ffffff !important;
  transform: translateX(4px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

:deep(.ant-menu-item-selected::after) {
  display: none;
}

:deep(.ant-menu-item .anticon) {
  font-size: 18px;
  margin-right: 12px;
}

/* 收缩状态菜单项 */
:deep(.ant-menu-inline-collapsed .ant-menu-item) {
  padding-left: 22px !important;
  text-align: center;
}

/* 面包屑样式 */
:deep(.ant-breadcrumb) {
  font-size: 14px;
}

:deep(.ant-breadcrumb-separator) {
  color: #d1d5db;
}
</style>
