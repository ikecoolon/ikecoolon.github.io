/**
 * 邮件服务配置脚本
 * 帮助用户配置邮件发送服务
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * 创建读取接口
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 询问用户问题
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * 获取默认SMTP配置
 */
function getDefaultSMTPConfig(service) {
  const configs = {
    qq: {
      host: 'smtp.qq.com',
      port: 587,
      secure: false,
      description: 'QQ邮箱 SMTP 配置'
    },
    gmail: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      description: 'Gmail SMTP 配置'
    },
    '163': {
      host: 'smtp.163.com',
      port: 465,
      secure: true,
      description: '163邮箱 SMTP 配置'
    },
    smtp: {
      host: 'localhost',
      port: 25,
      secure: false,
      description: '自定义SMTP服务器'
    }
  };

  return configs[service] || configs.qq;
}

/**
 * 生成邮件配置
 */
function generateEmailConfig(answers) {
  const smtpConfig = getDefaultSMTPConfig(answers.service);

  return {
    enabled: true,
    service: answers.service,
    smtp: {
      host: answers.host || smtpConfig.host,
      port: parseInt(answers.port) || smtpConfig.port,
      secure: answers.secure !== undefined ? answers.secure : smtpConfig.secure,
      auth: {
        user: answers.email,
        pass: answers.password
      }
    },
    from: {
      name: answers.senderName || '营会管理系统',
      address: answers.senderEmail || answers.email
    },
    templates: {
      passwordEmail: {
        subject: '营会管理系统临时访问密码',
        htmlTemplate: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1890ff;">营会管理系统</h2>
          <p>亲爱的用户：</p>
          <p>您的临时访问密码是：<strong style="font-size: 18px; color: #ff4d4f;">{password}</strong></p>
          <p>密码有效期至：{expirationTime}</p>
          <p style="color: #666; font-size: 14px;">请妥善保管此密码，每次访问都需要输入最新密码。</p>
          <hr>
          <p style="color: #999; font-size: 12px;">
            如有问题，请联系管理员。<br>
            营会管理系统<br>
            {timestamp}
          </p>
        </div>`,
        textTemplate: `亲爱的用户，

您的临时访问密码是：{password}

密码有效期至：{expirationTime}

请妥善保管此密码，每次访问都需要输入最新密码。

如有问题，请联系管理员。

营会管理系统
{timestamp}`
      }
    },
    lastUpdated: new Date().toISOString(),
    description: `邮件服务配置 - ${smtpConfig.description}`
  };
}

/**
 * 保存配置到文件
 */
function saveConfig(config) {
  const configPath = path.join(__dirname, '..', 'public', 'json', 'email-config.json');

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存配置文件失败:', error.message);
    return false;
  }
}

/**
 * 主配置流程
 */
async function setupEmail() {
  console.log('🚀 营会管理系统 - 邮件服务配置');
  console.log('=====================================\n');

  try {
    // 询问是否启用邮件服务
    const enableEmail = await question('是否启用邮件服务？(y/n): ');
    if (enableEmail.toLowerCase() !== 'y' && enableEmail.toLowerCase() !== 'yes') {
      console.log('❌ 已取消邮件服务配置');
      rl.close();
      return;
    }

    // 选择邮件服务提供商
    console.log('\n📧 选择邮件服务提供商:');
    console.log('1. QQ邮箱 (smtp.qq.com)');
    console.log('2. Gmail (smtp.gmail.com)');
    console.log('3. 163邮箱 (smtp.163.com)');
    console.log('4. 自定义SMTP服务器');

    const serviceChoice = await question('请选择 (1-4): ');
    const serviceMap = {
      '1': 'qq',
      '2': 'gmail',
      '3': '163',
      '4': 'smtp'
    };

    const service = serviceMap[serviceChoice] || 'qq';
    const smtpConfig = getDefaultSMTPConfig(service);

    console.log(`\n✅ 已选择: ${smtpConfig.description}`);

    // 收集邮箱信息
    const email = await question('请输入发件邮箱地址: ');
    const password = await question('请输入邮箱密码/授权码: ');

    // 自定义SMTP设置（如果选择自定义）
    let host = smtpConfig.host;
    let port = smtpConfig.port;
    let secure = smtpConfig.secure;

    if (service === 'smtp') {
      host = await question(`SMTP服务器地址 (默认: ${host}): `) || host;
      port = await question(`SMTP端口 (默认: ${port}): `) || port;
      const secureInput = await question('使用SSL/TLS加密？(y/n, 默认: n): ');
      secure = secureInput.toLowerCase() === 'y' || secureInput.toLowerCase() === 'yes';
    }

    // 发件人信息
    const senderName = await question('发件人姓名 (默认: 营会管理系统): ') || '营会管理系统';
    const senderEmail = await question(`发件人邮箱 (默认: ${email}): `) || email;

    // 生成配置
    const answers = {
      service,
      email,
      password,
      host,
      port: port.toString(),
      secure,
      senderName,
      senderEmail
    };

    const config = generateEmailConfig(answers);

    // 保存配置
    if (saveConfig(config)) {
      console.log('\n✅ 邮件服务配置成功！');
      console.log('📁 配置文件: public/json/email-config.json');
      console.log('\n🔧 配置摘要:');
      console.log(`   服务商: ${service.toUpperCase()}`);
      console.log(`   发件邮箱: ${email}`);
      console.log(`   SMTP服务器: ${config.smtp.host}:${config.smtp.port}`);
      console.log(`   发件人: ${config.from.name} <${config.from.address}>`);

      // 测试建议
      console.log('\n🧪 建议步骤:');
      console.log('1. 先测试邮件配置: npm run test-email');
      console.log('2. 然后测试发送功能: 在登录页面尝试邮箱获取密码');
      console.log('3. 检查邮箱是否收到测试邮件');

    } else {
      console.log('\n❌ 配置保存失败，请检查文件权限');
    }

  } catch (error) {
    console.error('\n❌ 配置过程中出现错误:', error.message);
  } finally {
    rl.close();
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('📧 邮件服务配置帮助');
  console.log('======================\n');

  console.log('前置要求:');
  console.log('1. 准备一个邮箱账户 (QQ/Gmail/163等)');
  console.log('2. 获取邮箱的SMTP授权码 (不是登录密码)');
  console.log('3. 确保网络可以访问SMTP服务器\n');

  console.log('SMTP服务器信息:');
  console.log('• QQ邮箱: smtp.qq.com (端口: 587)');
  console.log('• Gmail: smtp.gmail.com (端口: 587)');
  console.log('• 163邮箱: smtp.163.com (端口: 465)\n');

  console.log('获取授权码的方法:');
  console.log('• QQ邮箱: 设置 -> 账户 -> POP3/IMAP/SMTP -> 生成授权码');
  console.log('• Gmail: 账户设置 -> 安全 -> 两步验证 -> 应用密码');
  console.log('• 163邮箱: 设置 -> POP3/SMTP/IMAP -> 客户端授权密码\n');

  console.log('使用方法:');
  console.log('node scripts/setup-email.cjs');
  console.log('然后按照提示进行配置\n');
}

/**
 * 显示当前配置
 */
function showCurrentConfig() {
  const configPath = path.join(__dirname, '..', 'public', 'json', 'email-config.json');

  try {
    if (!fs.existsSync(configPath)) {
      console.log('❌ 邮件配置文件不存在，请先运行配置脚本');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('📋 当前邮件配置:');
    console.log(`   启用状态: ${config.enabled ? '✅' : '❌'}`);
    console.log(`   服务商: ${config.service?.toUpperCase() || '未设置'}`);
    console.log(`   发件邮箱: ${config.smtp?.auth?.user || '未设置'}`);
    console.log(`   SMTP服务器: ${config.smtp?.host || '未设置'}:${config.smtp?.port || '未设置'}`);
    console.log(`   发件人: ${config.from?.name || '未设置'} <${config.from?.address || '未设置'}>`);
    console.log(`   更新时间: ${config.lastUpdated || '未设置'}`);

  } catch (error) {
    console.error('读取配置失败:', error.message);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'help':
    showHelp();
    break;

  case 'show':
    showCurrentConfig();
    break;

  default:
    setupEmail();
    break;
}
