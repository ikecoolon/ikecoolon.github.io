/**
 * 邮箱白名单测试脚本
 */

const fs = require('fs');
const path = require('path');

/**
 * 生成强密码（模拟前端函数）
 */
function generateStrongPassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // 确保至少包含每种字符类型
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // 生成剩余字符
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 加载邮箱白名单配置
 */
function loadEmailWhitelist() {
  const whitelistPath = path.join(__dirname, '..', 'public', 'json', 'email-whitelist.json');

  try {
    if (!fs.existsSync(whitelistPath)) {
      console.error('❌ 邮箱白名单文件不存在');
      return null;
    }

    const data = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
    return data;
  } catch (error) {
    console.error('❌ 加载邮箱白名单失败:', error.message);
    return null;
  }
}

/**
 * 验证邮箱是否在白名单中
 */
function validateEmailInWhitelist(email, whitelist) {
  if (!whitelist) {
    console.error('❌ 白名单配置无效');
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  return whitelist.whitelistedEmails.some(
    whitelistEmail => whitelistEmail.toLowerCase().trim() === normalizedEmail
  );
}

/**
 * 验证邮箱格式
 */
function validateEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 发送临时访问密码到指定邮箱（模拟）
 */
function sendPasswordToEmail(email, currentPassword, whitelist) {
  // 验证邮箱格式
  if (!validateEmailFormat(email)) {
    return {
      success: false,
      message: '邮箱格式不正确'
    };
  }

  // 验证邮箱是否在白名单中
  if (!validateEmailInWhitelist(email, whitelist)) {
    return {
      success: false,
      message: '该邮箱不在白名单中，无法发送密码'
    };
  }

  // 模拟发送邮件
  const emailContent = {
    to: email,
    subject: '营会管理系统临时访问密码',
    body: `
亲爱的用户，

您的临时访问密码是：${currentPassword}

密码有效期至：${new Date(Date.now() + 60 * 60 * 1000).toLocaleString('zh-CN')}

请妥善保管此密码，每次访问都需要输入最新密码。

如有问题，请联系管理员。

营会管理系统
${new Date().toLocaleString('zh-CN')}
    `.trim(),
    timestamp: new Date().toISOString()
  };

  console.log('📧 模拟发送邮件:');
  console.log('   收件人:', emailContent.to);
  console.log('   主题:', emailContent.subject);
  console.log('   密码:', currentPassword);
  console.log('   时间:', emailContent.timestamp);

  return {
    success: true,
    message: `临时访问密码已发送到 ${email}`
  };
}

/**
 * 测试邮箱白名单功能
 */
function testEmailWhitelist() {
  console.log('🧪 开始测试邮箱白名单功能...\n');

  // 加载邮箱白名单
  const whitelist = loadEmailWhitelist();
  if (!whitelist) {
    console.log('❌ 测试失败：无法加载邮箱白名单');
    return;
  }

  console.log('✅ 白名单配置:');
  console.log('   白名单邮箱:', whitelist.whitelistedEmails.join(', '));
  console.log('   最后更新:', whitelist.lastUpdated);
  console.log('');

  // 生成测试密码
  const testPassword = generateStrongPassword();
  console.log('🔐 生成测试密码:', testPassword);
  console.log('');

  // 测试用例
  const testCases = [
    { email: '52282858@qq.com', expected: true, description: '白名单邮箱' },
    { email: 'admin@camp.com', expected: true, description: '管理员邮箱' },
    { email: 'manager@camp.com', expected: true, description: '经理邮箱' },
    { email: 'test@example.com', expected: false, description: '非白名单邮箱' },
    { email: 'invalid-email', expected: false, description: '无效邮箱格式' },
    { email: 'user@camp.com', expected: false, description: '其他camp.com邮箱' }
  ];

  console.log('📋 测试结果:');
  testCases.forEach((testCase, index) => {
    const isInWhitelist = validateEmailInWhitelist(testCase.email, whitelist);
    const formatValid = validateEmailFormat(testCase.email);
    const sendResult = sendPasswordToEmail(testCase.email, testPassword, whitelist);

    const status = (isInWhitelist === testCase.expected && sendResult.success === testCase.expected)
      ? '✅ 通过'
      : '❌ 失败';

    console.log(`   ${index + 1}. ${testCase.description} (${testCase.email}):`);
    console.log(`      格式验证: ${formatValid ? '✅' : '❌'}`);
    console.log(`      白名单验证: ${isInWhitelist ? '✅' : '❌'}`);
    console.log(`      发送结果: ${sendResult.success ? '✅' : '❌'} ${sendResult.message}`);
    console.log(`      测试状态: ${status}`);
    console.log('');
  });

  console.log('🎉 邮箱白名单测试完成！');
}

// 运行测试
if (require.main === module) {
  testEmailWhitelist();
}

module.exports = {
  loadEmailWhitelist,
  validateEmailInWhitelist,
  validateEmailFormat,
  sendPasswordToEmail,
  generateStrongPassword
};
