/**
 * 邮件代理服务器
 * 用于在本地开发环境中处理真实的邮件发送
 */

const express = require('express')
const nodemailer = require('nodemailer')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 加载邮件配置
function loadEmailConfig() {
  const configPath = path.join(__dirname, '..', 'public', 'json', 'email-config.json')

  try {
    if (!fs.existsSync(configPath)) {
      throw new Error('邮件配置文件不存在')
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (error) {
    console.error('加载邮件配置失败:', error.message)
    throw error
  }
}

// 创建邮件传输器
function createTransporter(smtpConfig) {
  return nodemailer.createTransporter({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass
    }
  })
}

// 邮件发送接口
app.post('/api/send-email', async (req, res) => {
  try {
    console.log('📧 收到邮件发送请求...')

    const { options, config } = req.body

    if (!options || !config) {
      return res.status(400).json({
        success: false,
        message: '请求参数不完整',
        error: 'INVALID_REQUEST'
      })
    }

    // 加载完整配置
    const fullConfig = loadEmailConfig()

    // 创建邮件传输器
    const transporter = createTransporter(fullConfig.smtp)

    // 验证连接
    console.log('🔗 验证SMTP连接...')
    await transporter.verify()
    console.log('✅ SMTP连接验证成功')

    // 构建邮件选项
    const mailOptions = {
      from: `"${fullConfig.from.name}" <${fullConfig.from.address}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    }

    // 发送邮件
    console.log('📤 发送邮件...')
    const info = await transporter.sendMail(mailOptions)

    console.log('✅ 邮件发送成功!')
    console.log('   消息ID:', info.messageId)
    console.log('   收件人:', options.to)
    console.log('   主题:', options.subject)

    res.json({
      success: true,
      message: '邮件发送成功',
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('❌ 邮件发送失败:', error)

    let errorMessage = '邮件发送失败'
    let errorCode = 'UNKNOWN_ERROR'

    if (error.code === 'EAUTH') {
      errorMessage = '邮箱认证失败，请检查用户名和授权码'
      errorCode = 'AUTH_FAILED'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到SMTP服务器，请检查网络连接'
      errorCode = 'CONNECTION_FAILED'
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接超时，请检查网络或SMTP服务器状态'
      errorCode = 'TIMEOUT'
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      details: error.message
    })
  }
})

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '邮件代理服务器运行正常',
    timestamp: new Date().toISOString()
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 邮件代理服务器已启动!')
  console.log(`📡 监听端口: ${PORT}`)
  console.log('📧 邮件发送接口: POST http://localhost:3001/api/send-email')
  console.log('💚 健康检查接口: GET http://localhost:3001/api/health')
  console.log('⚡ 等待前端邮件发送请求...\n')

  console.log('📋 使用说明:')
  console.log('1. 确保邮件配置正确 (npm run test-email)')
  console.log('2. 在前端应用中发送邮件')
  console.log('3. 查看控制台日志了解发送状态')
  console.log('4. 按 Ctrl+C 停止服务器\n')
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 邮件代理服务器正在关闭...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 邮件代理服务器正在关闭...')
  process.exit(0)
})
