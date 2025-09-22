/**
 * 密码生成和管理工具 - 后端API版本
 * 密码生成和管理现在由后端负责，前端只负责获取和显示
 */

import { authAPI, request } from '@/api'

/**
 * 密码配置接口
 */
export interface PasswordConfig {
  currentPassword: string
  lastUpdated: string
  updateInterval: number // 更新间隔（分钟）
  nextUpdateTime: string
  email: string
  enabled: boolean
}

/**
 * 邮箱白名单配置接口
 */
export interface EmailWhitelistConfig {
  whitelistedEmails: string[]
  lastUpdated: string
  description: string
}

/**
 * 生成强密码
 * @param length 密码长度
 * @returns 强密码字符串
 */
export const generateStrongPassword = (length: number = 12): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'

  const allChars = lowercase + uppercase + numbers + symbols

  let password = ''

  // 确保至少包含每种字符类型
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // 生成剩余字符
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 生成中等强度密码
 * @param length 密码长度
 * @returns 中等强度密码
 */
export const generateMediumPassword = (length: number = 10): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'

  const allChars = lowercase + uppercase + numbers

  let password = ''

  // 确保至少包含字母和数字
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]

  // 生成剩余字符
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 加载密码配置
 * 直接从 public/json/auth.json 文件读取，不使用缓存
 */
export const loadPasswordConfig = async (): Promise<PasswordConfig | null> => {
  try {
    const response = await authAPI.getPasswordConfig()
    console.log('从后端API获取的密码配置:', response)

    // 后端返回的数据嵌套在 data 字段中
    const data = response.data || response
    if (!data) {
      console.warn('后端返回的数据为空')
      return null
    }

    // 计算 nextUpdateTime（因为后端没有直接返回）
    const now = new Date()
    const nextUpdateTime = new Date(now.getTime() + (data.updateInterval || 60) * 60 * 1000)

    // 转换后端返回的数据格式为前端期望的格式
    return {
      currentPassword: '', // 后端不返回实际密码
      lastUpdated: data.lastUpdated,
      updateInterval: data.updateInterval || 60,
      nextUpdateTime: nextUpdateTime.toISOString(),
      email: data.email || 'system@example.com',
      enabled: data.enabled !== false
    }
  } catch (error) {
    console.warn('加载密码配置失败:', error)
    return null
  }
}

/**
 * 保存密码配置
 * 由于前端无法直接写入文件，此函数会触发文件下载，用户需要手动替换文件
 */
export const savePasswordConfig = async (config: PasswordConfig): Promise<boolean> => {
  try {
    // 调用后端API刷新密码
    const result = await authAPI.refreshPassword()
    console.log('密码已刷新:', result.message)
    return true
  } catch (error) {
    console.error('保存密码配置失败:', error)
    return false
  }
}

/**
 * 初始化密码配置
 */
export const initializePasswordConfig = async (
  updateInterval: number = 60, // 默认1小时
  email: string = '52282858@qq.com'
): Promise<PasswordConfig> => {
  const newPassword = generateStrongPassword()
  const now = new Date()

  const config: PasswordConfig = {
    currentPassword: newPassword,
    lastUpdated: now.toISOString(),
    updateInterval: updateInterval,
    nextUpdateTime: new Date(now.getTime() + updateInterval * 60 * 1000).toISOString(),
    email: email,
    enabled: true
  }

  await savePasswordConfig(config)
  return config
}

/**
 * 检查是否需要更新密码
 */
export const shouldUpdatePassword = (config: PasswordConfig): boolean => {
  if (!config.enabled) return false

  const now = new Date()
  const nextUpdate = new Date(config.nextUpdateTime)

  return now >= nextUpdate
}

/**
 * 更新密码
 */
export const updatePassword = async (config: PasswordConfig): Promise<PasswordConfig> => {
  const newPassword = generateStrongPassword()
  const now = new Date()

  const updatedConfig: PasswordConfig = {
    ...config,
    currentPassword: newPassword,
    lastUpdated: now.toISOString(),
    nextUpdateTime: new Date(now.getTime() + config.updateInterval * 60 * 1000).toISOString()
  }

  await savePasswordConfig(updatedConfig)

  // 发送邮件通知（这里可以集成邮件服务）
  await sendPasswordNotification(updatedConfig)

  return updatedConfig
}

/**
 * 发送密码更新通知
 */
export const sendPasswordNotification = async (config: PasswordConfig): Promise<void> => {
  // 这里可以集成邮件服务
  // 暂时记录到控制台
  console.log(`新密码已生成: ${config.currentPassword}`)
  console.log(`下次更新时间: ${config.nextUpdateTime}`)
  console.log(`通知邮箱: ${config.email}`)

  // TODO: 集成邮件服务发送通知
  // const emailData = {
  //   to: config.email,
  //   subject: '营会管理系统密码更新通知',
  //   body: `新密码: ${config.currentPassword}\n更新时间: ${config.lastUpdated}\n下次更新: ${config.nextUpdateTime}`
  // }
  // await sendEmail(emailData)
}

/**
 * 获取当前密码
 */
export const getCurrentPassword = async (): Promise<string | null> => {
  try {
    // 调用后端API获取当前密码（仅开发环境可用）
    const result = await authAPI.getCurrentPassword()
    console.log('从后端获取的当前密码:', result.password ? '已获取' : '未获取')
    return result.password
  } catch (error) {
    console.error('获取当前密码失败:', error)
    return null
  }
}

/**
 * 验证密码
 */
export const validatePassword = async (inputPassword: string): Promise<boolean> => {
  try {
    const currentPassword = await getCurrentPassword()
    console.log('currentPassword', currentPassword)
    return currentPassword === inputPassword
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
}

/**
 * 加载邮箱白名单配置（已移除，邮箱白名单验证在后端邮件发送时进行）
 * @deprecated 此函数不再使用，邮箱白名单验证已在后端实现
 */
export const loadEmailWhitelist = async (): Promise<EmailWhitelistConfig | null> => {
  console.warn('loadEmailWhitelist函数已弃用，邮箱白名单验证在后端邮件发送时进行')
  return null
}

/**
 * 验证邮箱是否在白名单中（已移除，前端不再进行预验证）
 * @deprecated 此函数不再使用，邮箱白名单验证已在后端邮件发送时进行
 */
export const validateEmailInWhitelist = async (email: string): Promise<boolean> => {
  console.warn('validateEmailInWhitelist函数已弃用，邮箱白名单验证在后端邮件发送时进行')
  return true // 前端不再进行预验证，总是返回true
}

/**
 * 发送临时访问密码到指定邮箱
 */
export const sendPasswordToEmail = async (email: string): Promise<{success: boolean, message: string}> => {
  try {
    // 邮箱白名单验证和密码获取都在后端进行
    // 前端只需发送邮箱地址

    // 调用后端邮件API发送密码
    const emailResult = await authAPI.sendPasswordEmail(email)

    if (emailResult.success) {
      return {
        success: true,
        message: `临时访问密码已发送到 ${email}，请查收邮件`
      }
    } else {
      return {
        success: false,
        message: emailResult.message || '发送邮件失败'
      }
    }

  } catch (error) {
    console.error('发送密码邮件失败:', error)
    return {
      success: false,
      message: `${error || '发送失败，请稍后重试'}`
    }
  }
}

/**
 * 验证邮箱格式
 */
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 获取密码过期剩余时间（分钟）
 */
export const getPasswordExpirationTime = async (): Promise<number> => {
  try {
    const config = await loadPasswordConfig()
    if (!config) {
      console.warn('无法加载密码配置，返回默认值 0')
      return 0
    }


    const now = new Date()
    const expirationTime = new Date(config.nextUpdateTime)

    // 检查日期是否有效
    if (isNaN(expirationTime.getTime())) {
      console.error('nextUpdateTime 无效:', config.nextUpdateTime)
      return 0
    }

    const remainingMs = expirationTime.getTime() - now.getTime()
    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / (1000 * 60)))


    return remainingMinutes
  } catch (error) {
    console.error('获取密码过期时间失败:', error)
    return 0
  }
}
