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
          title: '总览',
          icon: 'dashboard',
          permissions: ['dashboard'] // 所有用户都可以访问总览
        }
      },
      {
        path: '/ministry',
        name: 'Ministry',
        component: () => import('@/view/ministry/index.vue'),
        meta: {
          title: '服侍者',
          icon: 'team',
          permissions: ['ministry'] // 需要ministry权限
        }
      },
      {
        path: '/activity',
        name: 'Activity',
        component: () => import('@/view/activity/index.vue'),
        meta: {
          title: '活动管理',
          icon: 'calendar',
          permissions: ['activity'] // 需要activity权限
        }
      },
      {
        path: '/camp',
        name: 'Camp',
        component: () => import('@/view/camp/index.vue'),
        meta: {
          title: '营会管理',
          icon: 'campsite',
          permissions: ['camp'] // 需要camp权限
        }
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/view/settings/index.vue'),
        meta: {
          title: '系统设置',
          icon: 'setting',
          permissions: ['settings'] // 需要settings权限
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
 * 路由守卫 - 密码验证和权限控制
 */
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 营会中心`
  }

  // 如果认证还没有初始化完成，等待初始化
  if (!authStore.authInitialized) {
    try {
      await authStore.waitForAuthInit()
    } catch (error) {
      console.warn('等待认证初始化失败:', error)
    }
  }

  // 允许访问登录页面和404页面
  if (to.name === 'Login' || to.name === 'NotFound') {
    // 已登录用户访问登录页，跳转到首页
    if (to.name === 'Login' && authStore.isAuthenticated) {
      next({ name: 'Dashboard' })
      return
    }
    next()
    return
  }

  // 其他页面都需要密码验证
  if (!authStore.isAuthenticated) {
    // 重定向到登录页面，带上原始路径
    next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 权限检查
  const requiredPermissions = to.meta?.permissions as string[]
  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = authStore.user?.permissions || []

    // 检查用户是否拥有所需权限
    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    )

    if (!hasPermission) {
      // 无权限访问，跳转到总览页面
      console.warn(`用户无权限访问 ${to.path}，跳转到总览页面`)
      next({ name: 'Dashboard' })
      return
    }
  }

  next()
})

export default router
