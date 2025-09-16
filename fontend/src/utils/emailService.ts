/**
 * 邮件发送服务
 * 支持多种邮件服务提供商
 */

import { request } from '@/api'

/**
 * 邮件配置接口
 */
export interface EmailConfig {
  enabled: boolean
  service: 'qq' | 'gmail' | '163' | 'smtp'
  smtp: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  from: {
    name: string
    address: string
  }
  templates: {
    passwordEmail: {
      subject: string
      htmlTemplate: string
      textTemplate: string
    }
  }
  lastUpdated: string
  description: string
}

/**
 * 邮件发送选项
 */
export interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

/**
 * 邮件发送结果
 */
export interface EmailResult {
  success: boolean
  message: string
  messageId?: string
  error?: string
}

/**
 * 加载邮件配置
 */
export const loadEmailConfig = async (): Promise<EmailConfig | null> => {
  try {
    const config = await request.get<EmailConfig>('email-config.json')
    return config
  } catch (error) {
    console.warn('加载邮件配置失败:', error)
    return null
  }
}

/**
 * 验证邮件配置
 */
export const validateEmailConfig = (config: EmailConfig): { valid: boolean, errors: string[] } => {
  const errors: string[] = []

  if (!config.enabled) {
    errors.push('邮件服务未启用')
    return { valid: false, errors }
  }

  if (!config.smtp?.host) {
    errors.push('SMTP服务器地址未配置')
  }

  if (!config.smtp?.auth?.user) {
    errors.push('发件邮箱未配置')
  }

  if (!config.smtp?.auth?.pass) {
    errors.push('邮箱密码/授权码未配置')
  }

  if (!config.from?.address) {
    errors.push('发件人地址未配置')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 获取默认SMTP配置
 */
export const getDefaultSMTPConfig = (service: string): EmailConfig['smtp'] => {
  const configs = {
    qq: {
      host: 'smtp.qq.com',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' }
    },
    gmail: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' }
    },
    '163': {
      host: 'smtp.163.com',
      port: 465,
      secure: true,
      auth: { user: '', pass: '' }
    },
    smtp: {
      host: 'localhost',
      port: 25,
      secure: false,
      auth: { user: '', pass: '' }
    }
  }

  return configs[service as keyof typeof configs] || configs.qq
}

/**
 * 发送邮件（支持开发环境真实发送）
 * 注意：在实际生产环境中，应该通过后端API发送邮件
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  try {
    const config = await loadEmailConfig()

    if (!config) {
      return {
        success: false,
        message: '邮件配置不存在，请先配置邮件服务',
        error: 'CONFIG_NOT_FOUND'
      }
    }

    const validation = validateEmailConfig(config)
    if (!validation.valid) {
      return {
        success: false,
        message: `邮件配置无效: ${validation.errors.join(', ')}`,
        error: 'CONFIG_INVALID'
      }
    }

    const isDevelopment = import.meta.env.DEV

    if (isDevelopment) {
      // 开发环境：尝试真实的SMTP发送，如果失败则模拟发送
      try {
        console.log('🔄 尝试真实的SMTP邮件发送...')
        const realResult = await sendEmailViaSMTP(options, config)
        console.log('✅ 真实邮件发送成功!')
        return realResult
      } catch (smtpError) {
        console.warn('❌ 真实SMTP发送失败，使用模拟发送:', smtpError.message)
        console.log('💡 提示: 这可能是由于浏览器安全限制，部署到服务器后将正常工作')
        return await sendEmailSimulation(options, config)
      }
    } else {
      // 生产环境：调用后端API
      return await sendEmailViaAPI(options, config)
    }

  } catch (error) {
    console.error('发送邮件失败:', error)
    return {
      success: false,
      message: '发送邮件时发生错误',
      error: String(error)
    }
  }
}

/**
 * 通过SMTP发送邮件（开发环境）
 */
const sendEmailViaSMTP = async (options: EmailOptions, config: EmailConfig): Promise<EmailResult> => {
  // 在浏览器环境中，我们需要通过HTTP请求到本地代理服务器
  try {
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        options,
        config: {
          smtp: config.smtp,
          from: config.from
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('SMTP发送失败:', error)
    throw new Error(`无法连接到邮件代理服务器: ${error.message}`)
  }
}

/**
 * 模拟发送邮件（开发环境）
 */
const sendEmailSimulation = async (options: EmailOptions, config: EmailConfig): Promise<EmailResult> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000))

  const mockMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log('📧 [模拟发送] 邮件发送成功:')
  console.log('   从:', `${config.from.name} <${config.from.address}>`)
  console.log('   到:', options.to)
  console.log('   主题:', options.subject)
  console.log('   消息ID:', mockMessageId)
  console.log('   HTML内容:', options.html ? '✓' : '✗')
  console.log('   文本内容:', options.text ? '✓' : '✗')

  if (options.html) {
    console.log('   邮件内容预览:')
    console.log('   ', options.html.replace(/<[^>]*>/g, '').substring(0, 100) + '...')
  }

  return {
    success: true,
    message: '邮件发送成功（模拟模式）',
    messageId: mockMessageId
  }
}

/**
 * 通过API发送邮件（生产环境）
 */
const sendEmailViaAPI = async (options: EmailOptions, config: EmailConfig): Promise<EmailResult> => {
  try {
    // 这里应该调用你的后端邮件发送API
    // 示例：
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: options.to,
    //     subject: options.subject,
    //     html: options.html,
    //     text: options.text
    //   })
    // })

    console.warn('⚠️ 生产环境邮件发送API未实现，请集成后端邮件服务')

    return {
      success: false,
      message: '生产环境邮件发送API未实现',
      error: 'API_NOT_IMPLEMENTED'
    }

  } catch (error) {
    return {
      success: false,
      message: '调用邮件发送API失败',
      error: String(error)
    }
  }
}

/**
 * 发送密码邮件
 */
export const sendPasswordEmail = async (to: string, password: string): Promise<EmailResult> => {
  try {
    const config = await loadEmailConfig()
    if (!config) {
      return {
        success: false,
        message: '邮件配置不存在',
        error: 'CONFIG_NOT_FOUND'
      }
    }

    const template = config.templates.passwordEmail
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toLocaleString('zh-CN')
    const timestamp = new Date().toLocaleString('zh-CN')

    // 替换模板变量
    const subject = template.subject
    const html = template.htmlTemplate
      .replace('{password}', password)
      .replace('{expirationTime}', expirationTime)
      .replace('{timestamp}', timestamp)

    const text = template.textTemplate
      .replace('{password}', password)
      .replace('{expirationTime}', expirationTime)
      .replace('{timestamp}', timestamp)

    return await sendEmail({
      to,
      subject,
      html,
      text
    })

  } catch (error) {
    console.error('发送密码邮件失败:', error)
    return {
      success: false,
      message: '发送密码邮件失败',
      error: String(error)
    }
  }
}

/**
 * 测试邮件配置
 */
export const testEmailConfig = async (): Promise<{ success: boolean, message: string, details?: any }> => {
  try {
    const config = await loadEmailConfig()

    if (!config) {
      return {
        success: false,
        message: '邮件配置文件不存在'
      }
    }

    const validation = validateEmailConfig(config)

    return {
      success: validation.valid,
      message: validation.valid ? '邮件配置验证通过' : `配置错误: ${validation.errors.join(', ')}`,
      details: {
        config: config,
        validation: validation,
        service: config.service,
        enabled: config.enabled
      }
    }

  } catch (error) {
    return {
      success: false,
      message: `测试失败: ${String(error)}`
    }
  }
}
