/**
 * 数据管理
 * 从 public/json/ 目录读取默认数据，修改后保存到 localStorage
 * 支持调用后端API进行认证和密码管理
 */

import { message } from 'ant-design-vue'

// 后端API基础URL
const BACKEND_URL = 'http://localhost:9010'

/**
 * 从 public/json/ 目录读取默认数据
 */
const loadDefaultData = async <T>(filename: string): Promise<T | null> => {
  try {
    const response = await fetch(`/json/${filename}`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn(`加载默认数据失败 ${filename}:`, error)
  }
  return null
}

/**
 * 通用请求方法 - 读写数据
 */
const request = {
  get<T = any>(filename: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // 直接从文件加载数据，不使用localStorage缓存
        const fileData = await loadDefaultData<T>(filename)
        if (fileData !== null) {
          resolve(fileData)
        } else {
          resolve({} as T)
        }
      } catch (error) {
        console.error('读取数据失败:', error)
        message.error('读取数据失败')
        reject(error)
      }
    })
  },

  post<T = any>(filename: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        // 前端无法直接写入文件，使用文件下载方式提示用户更新
        if (filename === 'auth.json') {
          // 为auth.json提供特殊的处理
          console.log('🔐 密码配置已更新，请使用以下命令更新文件：')
          console.log('npm run update-password')
          console.log('或者手动更新 public/json/auth.json 文件')
          console.log('新密码:', data.currentPassword)
        }

        // 触发文件下载，让用户可以手动替换文件
        const dataStr = JSON.stringify(data, null, 2)
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)

        resolve({
          success: true,
          message: '数据已准备下载，请替换对应的文件',
          data: data
        } as T)
      } catch (error) {
        console.error('保存数据失败:', error)
        message.error('保存数据失败')
        reject(error)
      }
    })
  }
}

/**
 * 数据导出/导入工具
 */
const dataManager = {
  /**
   * 导出数据到文件
   */
  async exportData(filename: string) {
    try {
      const data = await loadDefaultData(filename)
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        message.success(`${filename} 导出成功`)
      } else {
        message.warning('没有数据可以导出')
      }
    } catch (error) {
      message.error('导出数据失败')
      console.error('导出数据失败:', error)
    }
  },

  /**
   * 导出所有数据
   */
  async exportAllData() {
    try {
      const [ministries, participants, camps, courses] = await Promise.all([
        loadDefaultData('ministries.json'),
        loadDefaultData('participants.json'),
        loadDefaultData('camps.json'),
        loadDefaultData('courses.json')
      ])

      const allData = {
        ministries: ministries || [],
        participants: participants || [],
        camps: camps || [],
        courses: courses || [],
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `camp-data-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('全部数据导出成功')
    } catch (error) {
      message.error('导出全部数据失败')
      console.error('导出全部数据失败:', error)
    }
  },

  /**
   * 从文件导入数据
   * 注意：前端无法直接写入文件，请手动替换相应的文件
   */
  importData(filename: string, file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          // 验证JSON格式
          JSON.parse(data)

          // 触发文件下载，让用户手动替换
          const blob = new Blob([data], { type: 'application/json' })
          const url = URL.createObjectURL(blob)

          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          URL.revokeObjectURL(url)

          message.success(`${filename} 已准备下载，请手动替换 public/json/${filename} 文件`)
          console.log(`📁 请手动替换文件: public/json/${filename}`)
          console.log('📄 文件内容已复制到剪贴板')

          resolve(data)
        } catch (error) {
          message.error('数据格式错误')
          reject(error)
        }
      }
      reader.onerror = () => {
        message.error('文件读取失败')
        reject(new Error('文件读取失败'))
      }
      reader.readAsText(file)
    })
  },

  /**
   * 导入全部数据
   * 注意：前端无法直接写入文件，请手动替换相应的文件
   */
  importAllData(file: File): Promise<{[key: string]: string}> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          const backupData = JSON.parse(data)

          const fileContents: {[key: string]: string} = {}

          // 为每个数据文件创建下载链接
          const filesToUpdate = ['ministries', 'participants', 'camps', 'courses']
          filesToUpdate.forEach(key => {
            if (backupData[key]) {
              const filename = `${key}.json`
              const fileData = JSON.stringify(backupData[key], null, 2)
              fileContents[filename] = fileData

              // 触发文件下载
              const blob = new Blob([fileData], { type: 'application/json' })
              const url = URL.createObjectURL(blob)

              const link = document.createElement('a')
              link.href = url
              link.download = filename
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              URL.revokeObjectURL(url)
            }
          })

          message.success('数据文件已准备下载，请手动替换 public/json/ 目录下的相应文件')
          console.log('📁 请手动替换以下文件:')
          Object.keys(fileContents).forEach(filename => {
            console.log(`   - public/json/${filename}`)
          })

          resolve(fileContents)
        } catch (error) {
          message.error('数据格式错误')
          reject(error)
        }
      }
      reader.onerror = () => {
        message.error('文件读取失败')
        reject(new Error('文件读取失败'))
      }
      reader.readAsText(file)
    })
  },

  /**
   * 重置数据
   * 注意：前端无法直接修改文件，请手动重置相应的文件
   */
  resetData(filename?: string) {
    if (filename) {
      console.log(`🔄 请手动重置文件: public/json/${filename}`)
      console.log('💡 提示: 可以使用默认的空数组 [] 或者从备份文件恢复')
      message.info(`请手动重置 ${filename} 文件`)
    } else {
      const files = ['ministries.json', 'participants.json', 'camps.json', 'courses.json']
      console.log('🔄 请手动重置以下文件:')
      files.forEach(file => {
        console.log(`   - public/json/${file}`)
      })
      console.log('💡 提示: 可以使用默认的空数组 [] 或者从备份文件恢复')
      message.info('请手动重置所有数据文件')
    }
  }
}

/**
 * 认证API - 调用后端服务
 */
const authAPI = {
  /**
   * 获取密码配置
   */
  async getPasswordConfig() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/password-config`)
      const data = await response.json()

      if (data.success) {
        return data.data
      } else {
        throw new Error(data.message || '获取密码配置失败')
      }
    } catch (error) {
      console.error('获取密码配置失败:', error)
      throw error
    }
  },

  /**
   * 验证密码
   */
  async verifyPassword(password: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || '密码验证失败')
      }
    } catch (error) {
      console.error('密码验证失败:', error)
      throw error
    }
  },

  /**
   * 验证Token
   */
  async verifyToken(token: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || 'Token验证失败')
      }
    } catch (error) {
      console.error('Token验证失败:', error)
      throw error
    }
  },

  /**
   * 获取当前密码（仅开发环境）
   */
  async getCurrentPassword() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/current-password`)
      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || '获取当前密码失败')
      }
    } catch (error) {
      console.error('获取当前密码失败:', error)
      throw error
    }
  },

  /**
   * 刷新密码
   */
  async refreshPassword() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/refresh-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || '刷新密码失败')
      }
    } catch (error) {
      console.error('刷新密码失败:', error)
      throw error
    }
  },

  /**
   * 发送密码邮件（密码由后端获取）
   */
  async sendPasswordEmail(email: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/send-password-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        return data
      } else {
        throw new Error(data.message || '发送邮件失败')
      }
    } catch (error) {
      console.error('发送邮件失败:', error)
      throw error
    }
  }
}

export {
  request,
  dataManager,
  authAPI
}
