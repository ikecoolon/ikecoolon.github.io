/**
 * 测试邮件代理服务器
 */

const http = require('http')

/**
 * 发送HTTP请求的工具函数
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(body)
          resolve({ statusCode: res.statusCode, response })
        } catch (error) {
          resolve({ statusCode: res.statusCode, response: body })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

/**
 * 测试健康检查接口
 */
async function testHealthCheck() {
  console.log('🏥 测试健康检查接口...')

  try {
    const { statusCode, response } = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (statusCode === 200) {
      console.log('✅ 健康检查通过')
      console.log('   响应:', response)
    } else {
      console.log('❌ 健康检查失败')
      console.log('   状态码:', statusCode)
      console.log('   响应:', response)
    }
  } catch (error) {
    console.log('❌ 连接失败:', error.message)
    console.log('💡 请确保邮件代理服务器正在运行: npm run mail-proxy')
  }
}

/**
 * 测试邮件发送接口
 */
async function testEmailSending() {
  console.log('\n📧 测试邮件发送接口...')

  const testEmail = {
    options: {
      to: '52282858@qq.com',
      subject: '邮件代理服务器测试',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>🎉 邮件代理服务器测试成功！</h2>
          <p>这是一封测试邮件，验证邮件代理服务器是否正常工作。</p>
          <div style="background: #f0f8ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>测试信息:</strong><br>
            • 时间: ${new Date().toLocaleString('zh-CN')}<br>
            • 发送方式: 邮件代理服务器<br>
            • 状态: 正常工作
          </div>
          <p style="color: #666;">如果您收到这封邮件，说明邮件代理服务器配置正确！</p>
        </div>
      `,
      text: `
邮件代理服务器测试

这是一封测试邮件，验证邮件代理服务器是否正常工作。

测试信息:
• 时间: ${new Date().toLocaleString('zh-CN')}
• 发送方式: 邮件代理服务器
• 状态: 正常工作

如果您收到这封邮件，说明邮件代理服务器配置正确！
      `.trim()
    },
    config: {
      smtp: {
        host: 'smtp.qq.com',
        port: 587,
        secure: false,
        auth: {
          user: '52282858@qq.com',
          pass: 'zcbmxvn@8895'
        }
      },
      from: {
        name: '营会中心',
        address: 'noreply@camp.com'
      }
    }
  }

  try {
    const { statusCode, response } = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/send-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, testEmail)

    if (statusCode === 200 && response.success) {
      console.log('✅ 邮件发送成功!')
      console.log('   消息ID:', response.messageId)
      console.log('   响应:', response.response)
    } else {
      console.log('❌ 邮件发送失败')
      console.log('   状态码:', statusCode)
      console.log('   错误信息:', response.message)
      if (response.details) {
        console.log('   详细错误:', response.details)
      }
    }
  } catch (error) {
    console.log('❌ 发送请求失败:', error.message)
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🧪 开始测试邮件代理服务器...\n')

  // 检查邮件代理服务器是否在运行
  console.log('🔍 检查邮件代理服务器状态...')
  try {
    await testHealthCheck()
  } catch (error) {
    console.log('\n❌ 邮件代理服务器未运行')
    console.log('💡 请先启动邮件代理服务器:')
    console.log('   npm run mail-proxy')
    console.log('   (在新终端窗口中运行)\n')
    process.exit(1)
  }

  // 等待一下再测试邮件发送
  console.log('\n⏳ 准备测试邮件发送...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 测试邮件发送
  await testEmailSending()

  console.log('\n🎉 测试完成!')

  console.log('\n📋 测试结果说明:')
  console.log('✅ 健康检查通过 - 邮件代理服务器正常运行')
  console.log('✅ 邮件发送成功 - SMTP连接和认证正常')
  console.log('📧 收到测试邮件 - 整个邮件系统工作正常')

  console.log('\n🚀 下一步:')
  console.log('1. 在浏览器中打开 http://localhost:9001')
  console.log('2. 进入登录页面，切换到邮箱模式')
  console.log('3. 输入邮箱地址: 52282858@qq.com')
  console.log('4. 点击"发送密码"按钮')
  console.log('5. 检查邮箱是否收到密码邮件')
}

// 运行测试
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testHealthCheck,
  testEmailSending,
  makeRequest
}
