/**
 * 营会管理系统邮件服务
 * 专用于发送临时访问密码邮件
 */

import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9010;

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'camp-system-jwt-secret-key-2024';

// 密码配置文件路径
const PASSWORD_CONFIG_PATH = path.join(__dirname, 'data', 'auth.json');

// 确保数据目录存在
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'camp-mail-service',
    timestamp: new Date().toISOString()
  });
});

// 邮件发送接口
app.post('/api/send-password-email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: email 或 password'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    // 发送邮件
    const result = await sendPasswordEmail(email, password);

    if (result.success) {
      res.json({
        success: true,
        message: '密码邮件发送成功',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }

  } catch (error) {
    console.error('邮件发送失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// ==================== 认证相关功能 ====================

/**
 * 生成强密码
 * @param {number} length - 密码长度
 * @returns {string} 生成的密码
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
 * 加载密码配置
 * @returns {object|null} 密码配置
 */
function loadPasswordConfig() {
  try {
    if (!fs.existsSync(PASSWORD_CONFIG_PATH)) {
      return null;
    }
    const data = fs.readFileSync(PASSWORD_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('加载密码配置失败:', error.message);
    return null;
  }
}

/**
 * 保存密码配置
 * @param {object} config - 密码配置
 */
function savePasswordConfig(config) {
  try {
    const dir = path.dirname(PASSWORD_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PASSWORD_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('保存密码配置失败:', error.message);
    throw error;
  }
}

/**
 * 初始化或更新密码配置
 */
function initializePasswordConfig() {
  const now = new Date();
  const nextUpdateTime = new Date(now.getTime() + 60 * 60 * 1000); // 默认1小时后更新

  return {
    currentPassword: generateStrongPassword(),
    lastUpdated: now.toISOString(),
    updateInterval: 60, // 60分钟
    nextUpdateTime: nextUpdateTime.toISOString(),
    email: '52282858@qq.com',
    enabled: true
  };
}

/**
 * 检查密码是否需要更新
 * @param {object} config - 密码配置
 * @returns {boolean} 是否需要更新
 */
function shouldUpdatePassword(config) {
  if (!config.enabled) return false;

  const now = new Date();
  const nextUpdate = new Date(config.nextUpdateTime);

  return now >= nextUpdate;
}

/**
 * 更新密码
 * @param {object} config - 当前配置
 * @returns {object} 更新后的配置
 */
function updatePassword(config) {
  const now = new Date();
  const nextUpdateTime = new Date(now.getTime() + config.updateInterval * 60 * 1000);

  return {
    ...config,
    currentPassword: generateStrongPassword(),
    lastUpdated: now.toISOString(),
    nextUpdateTime: nextUpdateTime.toISOString()
  };
}

// ==================== API 端点 ====================

/**
 * 获取密码配置
 */
app.get('/api/auth/password-config', (req, res) => {
  try {
    let config = loadPasswordConfig();

    // 如果配置不存在或密码需要更新，则初始化/更新配置
    if (!config || shouldUpdatePassword(config)) {
      config = config ? updatePassword(config) : initializePasswordConfig();
      savePasswordConfig(config);

      console.log('🔄 密码已更新:', config.currentPassword);
    }

    // 返回密码配置（不包含实际密码，只返回元数据）
    res.json({
      success: true,
      data: {
        lastUpdated: config.lastUpdated,
        updateInterval: config.updateInterval,
        nextUpdateTime: config.nextUpdateTime,
        email: config.email,
        enabled: config.enabled,
        // 计算密码过期剩余时间（秒）
        timeUntilExpiry: Math.max(0, Math.floor((new Date(config.nextUpdateTime) - new Date()) / 1000))
      }
    });
  } catch (error) {
    console.error('获取密码配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取密码配置失败',
      error: error.message
    });
  }
});

/**
 * 验证密码
 */
app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '缺少密码参数'
      });
    }

    let config = loadPasswordConfig();

    // 如果配置不存在或密码需要更新，则初始化/更新配置
    if (!config || shouldUpdatePassword(config)) {
      config = config ? updatePassword(config) : initializePasswordConfig();
      savePasswordConfig(config);
    }

    // 验证密码
    const isValid = password === config.currentPassword;

    if (isValid) {
      // 生成JWT token
      const token = jwt.sign(
        {
          userId: 'admin',
          username: 'admin',
          role: 'admin',
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '密码验证成功',
        token: token,
        user: {
          id: 'admin',
          username: 'admin',
          email: config.email,
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }
  } catch (error) {
    console.error('密码验证失败:', error);
    res.status(500).json({
      success: false,
      message: '密码验证失败',
      error: error.message
    });
  }
});

/**
 * 验证token
 */
app.post('/api/auth/verify-token', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '缺少token参数'
      });
    }

    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      message: 'Token验证成功',
      user: decoded
    });
  } catch (error) {
    console.error('Token验证失败:', error);

    let message = 'Token验证失败';
    if (error.name === 'TokenExpiredError') {
      message = 'Token已过期';
    } else if (error.name === 'JsonWebTokenError') {
      message = '无效的Token';
    }

    res.status(401).json({
      success: false,
      message: message,
      error: error.name
    });
  }
});

/**
 * 获取当前密码（仅用于调试）
 */
app.get('/api/auth/current-password', (req, res) => {
  try {
    // 在生产环境中应该禁用这个端点
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: '生产环境不支持此功能'
      });
    }

    let config = loadPasswordConfig();

    if (!config || shouldUpdatePassword(config)) {
      config = config ? updatePassword(config) : initializePasswordConfig();
      savePasswordConfig(config);
    }

    res.json({
      success: true,
      password: config.currentPassword,
      lastUpdated: config.lastUpdated,
      timeUntilExpiry: Math.max(0, Math.floor((new Date(config.nextUpdateTime) - new Date()) / 1000))
    });
  } catch (error) {
    console.error('获取当前密码失败:', error);
    res.status(500).json({
      success: false,
      message: '获取密码失败',
      error: error.message
    });
  }
});

/**
 * 刷新密码
 */
app.post('/api/auth/refresh-password', (req, res) => {
  try {
    let config = loadPasswordConfig();

    if (!config) {
      config = initializePasswordConfig();
    } else {
      config = updatePassword(config);
    }

    savePasswordConfig(config);

    console.log('🔄 密码已手动刷新:', config.currentPassword);

    res.json({
      success: true,
      message: '密码已刷新',
      lastUpdated: config.lastUpdated,
      nextUpdateTime: config.nextUpdateTime
    });
  } catch (error) {
    console.error('刷新密码失败:', error);
    res.status(500).json({
      success: false,
      message: '刷新密码失败',
      error: error.message
    });
  }
});

// 创建邮件传输器
function createTransporter() {
  return nodemailer.createTransporter({
    host: 'smtp.qq.com',
    port: 587,
    secure: false,
    auth: {
      user: '52282858@qq.com',
      pass: 'zcbmxvn@8895'
    }
  });
}

// 发送密码邮件
async function sendPasswordEmail(to, password) {
  try {
    const transporter = createTransporter();

    // 验证连接
    await transporter.verify();

    const expirationTime = new Date(Date.now() + 60 * 60 * 1000).toLocaleString('zh-CN');
    const timestamp = new Date().toLocaleString('zh-CN');

    const mailOptions = {
      from: '"营会中心" <noreply@camp.com>',
      to: to,
      subject: '营会管理系统临时访问密码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1890ff;">营会管理系统</h2>
          <p>亲爱的用户：</p>
          <p>您的临时访问密码是：<strong style="font-size: 18px; color: #ff4d4f;">${password}</strong></p>
          <p>密码有效期至：${expirationTime}</p>
          <p style="color: #666; font-size: 14px;">请妥善保管此密码，每次访问都需要输入最新密码。</p>
          <hr>
          <p style="color: #999; font-size: 12px;">
            如有问题，请联系管理员。<br>
            营会管理系统<br>
            ${timestamp}
          </p>
        </div>
      `,
      text: `
营会管理系统

亲爱的用户，

您的临时访问密码是：${password}

密码有效期至：${expirationTime}

请妥善保管此密码，每次访问都需要输入最新密码。

如有问题，请联系管理员。

营会管理系统
${timestamp}
      `.trim()
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ 密码邮件发送成功:', {
      to,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };

  } catch (error) {
    console.error('❌ 密码邮件发送失败:', error);

    let errorMessage = '邮件发送失败';
    if (error.code === 'EAUTH') {
      errorMessage = '邮箱认证失败，请检查用户名和授权码';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到SMTP服务器';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接超时';
    }

    return {
      success: false,
      message: errorMessage,
      error: error.code || 'UNKNOWN_ERROR'
    };
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 营会管理系统后端服务已启动!');
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log('📧 邮件接口: POST /api/send-password-email');
  console.log('🔐 认证接口:');
  console.log('   GET  /api/auth/password-config    - 获取密码配置');
  console.log('   POST /api/auth/verify-password    - 验证密码');
  console.log('   POST /api/auth/verify-token       - 验证Token');
  console.log('   GET  /api/auth/current-password   - 获取当前密码（调试用）');
  console.log('   POST /api/auth/refresh-password   - 刷新密码');
  console.log('💚 健康检查: GET /health');
  console.log('⚡ 等待请求...\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 邮件服务正在关闭...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 邮件服务正在关闭...');
  process.exit(0);
});
