/**
 * 认证系统初始化器
 * 在应用启动时自动初始化密码配置
 */

import { initializePasswordConfig, loadPasswordConfig } from './passwordGenerator'

/**
 * 初始化认证系统
 */
export const initializeAuth = async (): Promise<void> => {
  try {
    // 检查是否已存在密码配置
    const existingConfig = await loadPasswordConfig()

    if (!existingConfig) {
      console.log('检测到首次运行，正在初始化密码系统...')

      // 初始化密码配置（默认1小时更新一次）
      const config = await initializePasswordConfig(60, '52282858@qq.com')

      console.log('密码系统初始化完成！')
      console.log(`初始密码: ${config.currentPassword}`)
      console.log(`密码文件位置: public/json/auth.json`)
      console.log(`密码更新间隔: ${config.updateInterval} 分钟`)
      console.log(`下次更新时间: ${config.nextUpdateTime}`)

      // 在开发环境下输出密码到控制台
      if (import.meta.env.DEV) {
        console.warn('⚠️  开发环境警告: 请妥善保管以上密码信息！')
      }
    } else {
      console.log('密码系统已初始化，跳过初始化步骤')
    }
  } catch (error) {
    console.error('认证系统初始化失败:', error)

    // 如果初始化失败，创建一个基本的密码配置
    try {
      console.log('尝试创建基本密码配置...')
      const config = await initializePasswordConfig(60, '52282858@qq.com')
      console.log('基本密码配置创建成功')
    } catch (fallbackError) {
      console.error('创建基本密码配置也失败:', fallbackError)
    }
  }
}

/**
 * 获取密码配置状态
 */
export const getAuthStatus = async () => {
  try {
    const config = await loadPasswordConfig()
    return {
      initialized: !!config,
      enabled: config?.enabled || false,
      lastUpdated: config?.lastUpdated || null,
      nextUpdateTime: config?.nextUpdateTime || null,
      updateInterval: config?.updateInterval || 0,
      email: config?.email || ''
    }
  } catch (error) {
    return {
      initialized: false,
      enabled: false,
      lastUpdated: null,
      nextUpdateTime: null,
      updateInterval: 0,
      email: ''
    }
  }
}
