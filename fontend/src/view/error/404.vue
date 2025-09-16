<template>
  <div class="min-h-screen flex-center bg-gray-50">
    <div class="text-center">
      <!-- 404 图标 -->
      <div class="text-160px text-gray-300 mb-24px">
        <i class="i-carbon:warning-hex" />
      </div>
      
      <!-- 错误信息 -->
      <div class="mb-32px">
        <h1 class="text-48px font-700 text-gray-800 mb-16px">404</h1>
        <h2 class="text-24px font-500 text-gray-600 mb-16px">页面未找到</h2>
        <p class="text-16px text-gray-500">
          抱歉，您访问的页面不存在或已被移除
        </p>
      </div>
      
      <!-- 操作按钮 -->
      <div class="space-x-16px">
        <a-button type="primary" size="large" @click="goHome">
          <template #icon>
            <i class="i-carbon:home" />
          </template>
          返回首页
        </a-button>
        
        <a-button size="large" @click="goBack">
          <template #icon>
            <i class="i-carbon:arrow-left" />
          </template>
          返回上一页
        </a-button>
      </div>
      
      <!-- 建议链接 -->
      <div class="mt-40px">
        <p class="text-14px text-gray-400 mb-16px">您可能在寻找：</p>
        <div class="flex justify-center space-x-24px">
          <a-button type="link" @click="goToDashboard">
            <i class="i-carbon:dashboard mr-4px" />
            总览
          </a-button>
          <a-button type="link" @click="goToActivity">
            <i class="i-carbon:calendar mr-4px" />
            活动管理
          </a-button>
          <a-button type="link" @click="goToMinistry">
            <i class="i-carbon:group mr-4px" />
            服侍者
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

/**
 * 404错误页面
 */

const router = useRouter()

/**
 * 返回首页
 */
const goHome = () => {
  router.push('/')
}

/**
 * 返回上一页
 */
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goHome()
  }
}

/**
 * 跳转到仪表盘
 */
const goToDashboard = () => {
  router.push('/dashboard')
}

/**
 * 跳转到活动管理
 */
const goToActivity = () => {
  router.push('/activity')
}

/**
 * 跳转到服侍者管理
 */
const goToMinistry = () => {
  router.push('/ministry')
}
</script>
