import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import '@unocss/reset/tailwind.css'
import 'uno.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/store/auth'
import { useActivityStore } from '@/store/activity'
import { useMinistryStore } from '@/store/ministry'

/**
 * 创建 Vue 应用实例
 */
const app = createApp(App)

// 注册 Pinia 状态管理
const pinia = createPinia()
app.use(pinia)

// 注册路由
app.use(router)

// 注册 Ant Design Vue
app.use(Antd)

/**
 * 初始化应用数据
 */
const initializeApp = async () => {
  const authStore = useAuthStore()
  const activityStore = useActivityStore()
  const ministryStore = useMinistryStore()

  try {
    // 初始化认证状态
    authStore.initAuth()

    // 加载数据
    await Promise.all([
      activityStore.fetchActivities(),
      activityStore.fetchCourses(),
      ministryStore.fetchMinistries(),
      ministryStore.fetchMembers()
    ])

    console.log('应用数据初始化完成')
  } catch (error) {
    console.error('应用数据初始化失败:', error)
  }
}

// 挂载应用前初始化数据
initializeApp().then(() => {
  app.mount('#app')
})
