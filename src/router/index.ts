import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/auth'

/**
 * 路由配置
 */
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/BasicLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/view/dashboard/index.vue'),
        meta: {
          title: '仪表盘',
          icon: 'dashboard'
        }
      },
      {
        path: '/ministry',
        name: 'Ministry',
        component: () => import('@/view/ministry/index.vue'),
        meta: {
          title: '服侍者管理',
          icon: 'team'
        }
      },
      {
        path: '/activity',
        name: 'Activity',
        component: () => import('@/view/activity/index.vue'),
        meta: {
          title: '活动管理',
          icon: 'calendar'
        }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/view/settings/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'setting'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/view/login/index.vue'),
    meta: {
      title: '登录',
      hideInMenu: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/view/error/404.vue'),
    meta: {
      title: '页面未找到',
      hideInMenu: true
    }
  }
]

/**
 * 创建路由实例
 */
const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 路由守卫 - 简化版
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 营会管理系统`
  }

  // 已登录用户访问登录页，跳转到首页
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router
