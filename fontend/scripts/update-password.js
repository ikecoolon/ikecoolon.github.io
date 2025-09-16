/**
 * 密码更新脚本
 * 直接更新 public/json/auth.json 文件中的密码
 */

const fs = require('fs');
const path = require('path');

/**
 * 生成强密码
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
 * 更新密码配置
 */
function updatePasswordConfig(updateInterval = 60, email = '52282858@qq.com') {
  const authPath = path.join(__dirname, '..', 'public', 'json', 'auth.json');

  try {
    // 读取当前配置
    let currentConfig = {};
    if (fs.existsSync(authPath)) {
      currentConfig = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    }

    // 生成新密码
    const newPassword = generateStrongPassword();
    const now = new Date();

    // 更新配置
    const updatedConfig = {
      ...currentConfig,
      currentPassword: newPassword,
      lastUpdated: now.toISOString(),
      updateInterval: updateInterval,
      nextUpdateTime: new Date(now.getTime() + updateInterval * 60 * 1000).toISOString(),
      email: email,
      enabled: true
    };

    // 写入文件
    fs.writeFileSync(authPath, JSON.stringify(updatedConfig, null, 2), 'utf8');

    console.log('✅ 密码更新成功!');
    console.log('🔐 新密码:', newPassword);
    console.log('📅 更新时间:', updatedConfig.lastUpdated);
    console.log('⏰ 下次更新:', updatedConfig.nextUpdateTime);
    console.log('📧 通知邮箱:', updatedConfig.email);
    console.log('📁 文件路径:', authPath);

    return newPassword;

  } catch (error) {
    console.error('❌ 密码更新失败:', error.message);
    process.exit(1);
  }
}

/**
 * 查看当前密码配置
 */
function viewPasswordConfig() {
  const authPath = path.join(__dirname, '..', 'public', 'json', 'auth.json');

  try {
    if (!fs.existsSync(authPath)) {
      console.log('❌ auth.json 文件不存在');
      return;
    }

    const config = JSON.parse(fs.readFileSync(authPath, 'utf8'));

    console.log('📋 当前密码配置:');
    console.log('🔐 当前密码:', config.currentPassword || '未设置');
    console.log('📅 最后更新:', config.lastUpdated || '未设置');
    console.log('⏰ 更新间隔:', (config.updateInterval || 0) + ' 分钟');
    console.log('📅 下次更新:', config.nextUpdateTime || '未设置');
    console.log('📧 通知邮箱:', config.email || '未设置');
    console.log('🔄 自动更新:', config.enabled ? '启用' : '禁用');

  } catch (error) {
    console.error('❌ 读取配置失败:', error.message);
  }
}

/**
 * 初始化密码配置
 */
function initializePasswordConfig(updateInterval = 60, email = '52282858@qq.com') {
  const authPath = path.join(__dirname, '..', 'public', 'json', 'auth.json');

  try {
    const newPassword = generateStrongPassword();
    const now = new Date();

    const config = {
      currentPassword: newPassword,
      lastUpdated: now.toISOString(),
      updateInterval: updateInterval,
      nextUpdateTime: new Date(now.getTime() + updateInterval * 60 * 1000).toISOString(),
      email: email,
      enabled: true
    };

    // 确保目录存在
    const dirPath = path.dirname(authPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(authPath, JSON.stringify(config, null, 2), 'utf8');

    console.log('✅ 密码配置初始化成功!');
    console.log('🔐 新密码:', newPassword);
    console.log('📅 更新时间:', config.lastUpdated);
    console.log('⏰ 下次更新:', config.nextUpdateTime);
    console.log('📧 通知邮箱:', config.email);
    console.log('📁 文件路径:', authPath);

    return newPassword;

  } catch (error) {
    console.error('❌ 密码配置初始化失败:', error.message);
    process.exit(1);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'update':
    const interval = parseInt(args[1]) || 60;
    const email = args[2] || '52282858@qq.com';
    updatePasswordConfig(interval, email);
    break;

  case 'view':
    viewPasswordConfig();
    break;

  case 'init':
    const initInterval = parseInt(args[1]) || 60;
    const initEmail = args[2] || '52282858@qq.com';
    initializePasswordConfig(initInterval, initEmail);
    break;

  default:
    console.log('🔧 密码管理工具');
    console.log('');
    console.log('使用方法:');
    console.log('  node scripts/update-password.js update [间隔分钟] [邮箱]  - 更新密码');
    console.log('  node scripts/update-password.js view                       - 查看当前配置');
    console.log('  node scripts/update-password.js init [间隔分钟] [邮箱]    - 初始化配置');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/update-password.js update 60 admin@example.com');
    console.log('  node scripts/update-password.js view');
    console.log('  node scripts/update-password.js init 120 admin@example.com');
    break;
}
