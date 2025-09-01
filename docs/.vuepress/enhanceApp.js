import moment from 'moment'
import ProductList from './components/ProductList.vue'

export default ({ 
  Vue,  // VuePress 正在使用的 Vue 构造函数
  options, // 附加到根实例的一些选项
  router, // 当前应用的路由实例
  siteData, // 站点元数据
  isServer // 当前应用配置是处于 服务端渲染 或 客户端
}) => {
  // 设置moment区域
  moment.locale('zh-CN')
  
  // 注册全局组件
  Vue.component('ProductList', ProductList)
  
  // 仅在客户端添加路由导航守卫
  if (!isServer) {
    router.beforeEach((to, from, next) => {
      // 执行路由前的操作
      next()
    })
    
    // 记录上一次导航，防止重复处理
    window.__lastNavigation = ''
    
    router.afterEach((to, from) => {
      // 防止重复触发
      const navigationKey = `${from.path}->${to.path}`
      if (window.__lastNavigation === navigationKey) {
        return
      }
      window.__lastNavigation = navigationKey
      
      // 页面跳转后的操作
      console.log('路由已变化:', from.path, '->', to.path)
      
      // 在路由变化后重新初始化scrollspy
      Vue.nextTick(() => {
        initScrollSpy()
      })
    })
    
    // 全局Mixin，在组件挂载后初始化scrollspy
    Vue.mixin({
      mounted() {
        // 仅在页面主组件中执行
        if (this.$el && this.$el.classList && this.$el.classList.contains('theme-container')) {
          Vue.nextTick(() => {
            initScrollSpy()
          })
        }
      }
    })
    
    // 备用初始化方法
    const initScrollSpyBackup = () => {
      if (document.readyState === 'complete') {
        initScrollSpy()
      } else {
        window.addEventListener('load', () => {
          setTimeout(initScrollSpy, 1000)
        })
      }
    }
    
    // 多重触发以确保初始化成功
    Vue.nextTick(initScrollSpyBackup)
    setTimeout(initScrollSpyBackup, 2000)
  }
}

// ScrollSpy功能实现
function initScrollSpy() {
  // 等待DOM完全加载
  setTimeout(() => {
    try {
      // 尝试多种选择器来找到右侧导航
      const anchorContainer = document.querySelector('#anchor') || 
                             document.querySelector('.sidebar-sub-headers') ||
                             document.querySelector('.anchor-links')
      
      if (!anchorContainer) {
        console.log('ScrollSpy: 未找到右侧导航容器')
        return
      }
      
      const anchors = anchorContainer.querySelectorAll('a[href*="#"]')
      const headers = document.querySelectorAll('.theme-hope-content h2[id], .theme-hope-content h3[id], .theme-hope-content h4[id], .theme-default-content h2[id], .theme-default-content h3[id], .theme-default-content h4[id]')
      
      if (!anchors.length || !headers.length) {
        console.log('ScrollSpy: 未找到足够的锚点或标题元素', { anchors: anchors.length, headers: headers.length })
        return
      }
      
      console.log('ScrollSpy: 初始化成功', { anchors: anchors.length, headers: headers.length })
      
      // 移除之前的滚动监听器
      if (window.__scrollSpyHandler) {
        window.removeEventListener('scroll', window.__scrollSpyHandler)
      }
      
      // 创建新的滚动监听器
      window.__scrollSpyHandler = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const viewportHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        
        // 如果接近页面底部，高亮最后一个标题
        if (scrollTop + viewportHeight >= documentHeight - 50) {
          setActiveAnchor(anchors, headers[headers.length - 1])
          return
        }
        
        // 找到当前可视区域内的标题
        let currentHeader = null
        for (let i = headers.length - 1; i >= 0; i--) {
          const header = headers[i]
          const headerTop = getElementTop(header)
          
          // 考虑导航栏高度的偏移量
          const offset = 120 // 调整这个值来微调触发位置
          
          if (scrollTop >= headerTop - offset) {
            currentHeader = header
            break
          }
        }
        
        if (currentHeader) {
          setActiveAnchor(anchors, currentHeader)
        }
      }, 100)
      
      // 添加滚动监听器
      window.addEventListener('scroll', window.__scrollSpyHandler, { passive: true })
      
      // 立即执行一次以设置初始状态
      window.__scrollSpyHandler()
    } catch (error) {
      console.error('ScrollSpy初始化失败:', error)
    }
  }, 500) // 增加延迟确保页面完全渲染
}

// 设置当前激活的锚点
function setActiveAnchor(anchors, currentHeader) {
  if (!currentHeader || !currentHeader.id) return
  
  try {
    // 移除所有活动状态
    anchors.forEach(anchor => {
      anchor.classList.remove('active')
      if (anchor.parentElement) {
        anchor.parentElement.classList.remove('active')
      }
    })
    
    // 设置当前标题对应的锚点为活动状态
    const targetAnchor = Array.from(anchors).find(anchor => {
      const href = anchor.getAttribute('href')
      return href && (href.endsWith('#' + currentHeader.id) || href.includes('#' + currentHeader.id))
    })
    
    if (targetAnchor) {
      targetAnchor.classList.add('active')
      if (targetAnchor.parentElement) {
        targetAnchor.parentElement.classList.add('active')
      }
      console.log('ScrollSpy: 设置活动锚点', currentHeader.id)
    }
  } catch (error) {
    console.error('ScrollSpy设置活动锚点失败:', error)
  }
}

// 获取元素相对于文档顶部的位置
function getElementTop(element) {
  let offsetTop = 0
  while (element) {
    offsetTop += element.offsetTop
    element = element.offsetParent
  }
  return offsetTop
}

// 节流函数
function throttle(func, wait) {
  let timeout
  let lastExecTime = 0
  
  return function executedFunction(...args) {
    const now = Date.now()
    
    if (now - lastExecTime > wait) {
      func.apply(this, args)
      lastExecTime = now
    } else {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(this, args)
        lastExecTime = Date.now()
      }, wait - (now - lastExecTime))
    }
  }
} 