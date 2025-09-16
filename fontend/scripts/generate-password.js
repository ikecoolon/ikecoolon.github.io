/**
 * 密码生成和管理脚本
 * 用于手动生成和管理营会管理系统的密码
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 生成强密码
 * @param {number} length - 密码长度
 * @returns {string} 生成的密码
 */
function generateStrongPassword(length = 12) {
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
 * @param {number} length - 密码长度
 * @returns {string} 生成的密码
 */
function generateMediumPassword(length = 10) {
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
 * 创建密码配置
 * @param {number} updateInterval - 更新间隔（分钟）
 * @param {string} email - 通知邮箱
 * @returns {object} 密码配置对象
 */
function createPasswordConfig(updateInterval = 60, email = '52282858@qq.com') {
  const now = new Date()
  const nextUpdateTime = new Date(now.getTime() + updateInterval * 60 * 1000)

  return {
    currentPassword: generateStrongPassword(),
    lastUpdated: now.toISOString(),
    updateInterval: updateInterval,
    nextUpdateTime: nextUpdateTime.toISOString(),
    email: email,
    enabled: true
  }
}

/**
 * 保存密码配置到文件
 * @param {object} config - 密码配置对象
 * @param {string} filePath - 文件路径
 */
function savePasswordConfig(config, filePath) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8')
    console.log(`✅ 密码配置已保存到: ${filePath}`)
    console.log(`🔑 新密码: ${config.currentPassword}`)
    console.log(`⏰ 更新间隔: ${config.updateInterval} 分钟`)
    console.log(`📧 通知邮箱: ${config.email}`)
    console.log(`📅 下次更新: ${new Date(config.nextUpdateTime).toLocaleString()}`)
  } catch (error) {
    console.error('❌ 保存密码配置失败:', error.message)
    process.exit(1)
  }
}

/**
 * 加载密码配置
 * @param {string} filePath - 文件路径
 * @returns {object|null} 密码配置对象
 */
function loadPasswordConfig(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('❌ 加载密码配置失败:', error.message)
    return null
  }
}

/**
 * 更新密码
 * @param {object} config - 当前配置
 * @returns {object} 更新后的配置
 */
function updatePassword(config) {
  const now = new Date()
  const nextUpdateTime = new Date(now.getTime() + config.updateInterval * 60 * 1000)

  return {
    ...config,
    currentPassword: generateStrongPassword(),
    lastUpdated: now.toISOString(),
    nextUpdateTime: nextUpdateTime.toISOString()
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'generate'
  const updateInterval = parseInt(args[1]) || 60
  const email = args[2] || '52282858@qq.com'

  const authFilePath = path.join(__dirname, '..', 'public', 'json', 'auth.json')

  console.log('🔐 营会管理系统密码管理工具')
  console.log('================================')

  switch (command) {
    case 'generate':
    case 'create':
      console.log('📝 生成新密码配置...')
      const newConfig = createPasswordConfig(updateInterval, email)
      savePasswordConfig(newConfig, authFilePath)
      break

    case 'update':
      console.log('🔄 更新密码...')
      const existingConfig = loadPasswordConfig(authFilePath)
      if (!existingConfig) {
        console.log('⚠️  密码配置文件不存在，请先运行 generate 命令')
        process.exit(1)
      }
      const updatedConfig = updatePassword(existingConfig)
      savePasswordConfig(updatedConfig, authFilePath)
      break

    case 'view':
    case 'show':
      console.log('👀 查看当前密码配置...')
      const currentConfig = loadPasswordConfig(authFilePath)
      if (!currentConfig) {
        console.log('⚠️  密码配置文件不存在')
        process.exit(1)
      }
      console.log('当前配置:')
      console.log(`🔑 密码: ${currentConfig.currentPassword}`)
      console.log(`⏰ 更新间隔: ${currentConfig.updateInterval} 分钟`)
      console.log(`📧 邮箱: ${currentConfig.email}`)
      console.log(`📅 最后更新: ${new Date(currentConfig.lastUpdated).toLocaleString()}`)
      console.log(`📅 下次更新: ${new Date(currentConfig.nextUpdateTime).toLocaleString()}`)
      console.log(`✅ 启用状态: ${currentConfig.enabled ? '是' : '否'}`)
      break

    case 'disable':
      console.log('🚫 禁用自动密码更新...')
      const configToDisable = loadPasswordConfig(authFilePath)
      if (configToDisable) {
        configToDisable.enabled = false
        savePasswordConfig(configToDisable, authFilePath)
      } else {
        console.log('⚠️  密码配置文件不存在')
      }
      break

    case 'enable':
      console.log('✅ 启用自动密码更新...')
      const configToEnable = loadPasswordConfig(authFilePath)
      if (configToEnable) {
        configToEnable.enabled = true
        savePasswordConfig(configToEnable, authFilePath)
      } else {
        console.log('⚠️  密码配置文件不存在')
      }
      break

    default:
      console.log('❓ 使用方法:')
      console.log('  node scripts/generate-password.js generate [更新间隔(分钟)] [邮箱]')
      console.log('  node scripts/generate-password.js update')
      console.log('  node scripts/generate-password.js view')
      console.log('  node scripts/generate-password.js enable')
      console.log('  node scripts/generate-password.js disable')
      console.log('')
      console.log('示例:')
      console.log('  node scripts/generate-password.js generate 120 admin@example.com')
      console.log('  node scripts/generate-password.js update')
      console.log('  node scripts/generate-password.js view')
      break
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export {
  generateStrongPassword,
  generateMediumPassword,
  createPasswordConfig,
  savePasswordConfig,
  loadPasswordConfig,
  updatePassword
}
