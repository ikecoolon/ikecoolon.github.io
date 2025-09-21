/**
 * 邮件服务测试脚本
 */

const fs = require('fs');
const path = require('path');

/**
 * 模拟邮件发送服务（用于测试）
 */
class MockEmailService {
  constructor() {
    this.sentEmails = [];
  }

  async send(emailOptions) {
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    const emailRecord = {
      id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      text: emailOptions.text,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    this.sentEmails.push(emailRecord);

    return {
      success: true,
      messageId: emailRecord.id,
      message: '邮件发送成功（模拟）'
    };
  }

  getSentEmails() {
    return this.sentEmails;
  }

  clearEmails() {
    this.sentEmails = [];
  }
}

/**
 * 加载邮件配置
 */
function loadEmailConfig() {
  const configPath = path.join(__dirname, '..', 'public', 'json', 'email-config.json');

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('加载邮件配置失败:', error.message);
    return null;
  }
}

/**
 * 验证邮件配置
 */
function validateEmailConfig(config) {
  const errors = [];

  if (!config) {
    errors.push('配置文件不存在');
    return { valid: false, errors };
  }

  if (!config.enabled) {
    errors.push('邮件服务未启用');
  }

  if (!config.smtp?.host) {
    errors.push('SMTP服务器地址未配置');
  }

  if (!config.smtp?.auth?.user) {
    errors.push('发件邮箱未配置');
  }

  if (!config.smtp?.auth?.pass) {
    errors.push('邮箱密码/授权码未配置');
  }

  if (!config.from?.address) {
    errors.push('发件人地址未配置');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 测试邮件配置
 */
async function testEmailConfig() {
  console.log('🧪 开始测试邮件配置...\n');

  const config = loadEmailConfig();

  if (!config) {
    console.log('❌ 邮件配置文件不存在');
    console.log('💡 请先运行: node scripts/setup-email.cjs');
    return;
  }

  console.log('📋 配置信息:');
  console.log(`   启用状态: ${config.enabled ? '✅' : '❌'}`);
  console.log(`   服务商: ${config.service?.toUpperCase() || '未设置'}`);
  console.log(`   SMTP服务器: ${config.smtp?.host || '未设置'}:${config.smtp?.port || '未设置'}`);
  console.log(`   发件邮箱: ${config.smtp?.auth?.user || '未设置'}`);
  console.log(`   发件人: ${config.from?.name || '未设置'} <${config.from?.address || '未设置'}>`);
  console.log('');

  const validation = validateEmailConfig(config);

  if (!validation.valid) {
    console.log('❌ 配置验证失败:');
    validation.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
    console.log('\n🔧 请运行以下命令重新配置:');
    console.log('   node scripts/setup-email.cjs');
    return;
  }

  console.log('✅ 配置验证通过');
  console.log('');

  // 测试邮件发送
  console.log('📧 测试邮件发送...');

  const mockService = new MockEmailService();

  try {
    // 测试密码邮件
    const testPassword = 'TestPass123!';
    const testEmail = config.smtp.auth.user; // 发送给自己测试

    const emailOptions = {
      to: testEmail,
      subject: '营会管理系统 - 邮件测试',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1890ff;">📧 邮件服务测试</h2>
          <p>这是一封测试邮件，验证邮件服务是否正常工作。</p>
          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>测试信息:</strong><br>
            • 时间: ${new Date().toLocaleString('zh-CN')}<br>
            • 配置状态: ✅ 正常<br>
            • 服务商: ${config.service.toUpperCase()}<br>
            • 密码示例: ${testPassword}
          </div>
          <p style="color: #666; font-size: 14px;">
            如果您收到这封邮件，说明邮件服务配置正确。
          </p>
        </div>
      `,
      text: `
邮件服务测试

这是一封测试邮件，验证邮件服务是否正常工作。

测试信息:
• 时间: ${new Date().toLocaleString('zh-CN')}
• 配置状态: 正常
• 服务商: ${config.service.toUpperCase()}
• 密码示例: ${testPassword}

如果您收到这封邮件，说明邮件服务配置正确。
      `.trim()
    };

    const result = await mockService.send(emailOptions);

    if (result.success) {
      console.log('✅ 邮件发送测试成功');
      console.log(`   消息ID: ${result.messageId}`);
      console.log(`   收件人: ${testEmail}`);
      console.log(`   主题: ${emailOptions.subject}`);

      // 显示发送的邮件内容
      const sentEmails = mockService.getSentEmails();
      if (sentEmails.length > 0) {
        console.log('\n📄 发送的邮件内容:');
        console.log('   HTML版本: ✓');
        console.log('   文本版本: ✓');
        console.log('   时间戳:', sentEmails[0].timestamp);
      }

    } else {
      console.log('❌ 邮件发送测试失败');
      console.log(`   错误: ${result.message}`);
    }

  } catch (error) {
    console.log('❌ 测试过程中发生错误');
    console.log(`   错误信息: ${error.message}`);
  }

  console.log('\n🎉 邮件配置测试完成！');

  if (validation.valid) {
    console.log('\n💡 下一步:');
    console.log('1. 在实际环境中配置真实的SMTP信息');
    console.log('2. 测试真实的邮件发送功能');
    console.log('3. 在前端界面测试邮箱密码获取功能');
  }
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log('📧 邮件服务测试帮助');
  console.log('====================\n');

  console.log('测试内容:');
  console.log('• 验证邮件配置文件');
  console.log('• 检查SMTP配置完整性');
  console.log('• 模拟邮件发送过程');
  console.log('• 显示配置信息\n');

  console.log('使用方法:');
  console.log('node scripts/test-email.cjs\n');

  console.log('相关命令:');
  console.log('• 配置邮件: node scripts/setup-email.cjs');
  console.log('• 查看配置: node scripts/setup-email.cjs show');
  console.log('• 获取帮助: node scripts/setup-email.cjs help\n');
}

// 主函数
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    testEmailConfig();
  }
}

module.exports = {
  MockEmailService,
  loadEmailConfig,
  validateEmailConfig,
  testEmailConfig
};
