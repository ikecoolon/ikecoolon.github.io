/**
 * 本地数据管理
 * 从 public/json/ 目录读取默认数据，修改后保存到 localStorage
 */

import { message } from 'ant-design-vue'

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
export const request = {
  get<T = any>(filename: string): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // 首先尝试从 localStorage 获取数据（优先使用修改后的数据）
        const localData = localStorage.getItem(filename)
        if (localData) {
          resolve(JSON.parse(localData))
          return
        }

        // 如果 localStorage 没有数据，从默认文件加载
        const defaultData = await loadDefaultData<T>(filename)
        if (defaultData !== null) {
          // 将默认数据保存到 localStorage
          localStorage.setItem(filename, JSON.stringify(defaultData, null, 2))
          resolve(defaultData)
        } else {
          resolve([] as T)
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
        // 保存到 localStorage
        localStorage.setItem(filename, JSON.stringify(data, null, 2))
        resolve({ success: true, message: '保存成功' } as T)
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
export const dataManager = {
  /**
   * 导出数据到文件
   */
  exportData(filename: string) {
    const data = localStorage.getItem(filename)
    if (data) {
      const blob = new Blob([data], { type: 'application/json' })
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
  },

  /**
   * 导出所有数据
   */
  exportAllData() {
    const allData = {
      ministries: localStorage.getItem('ministries.json'),
      participants: localStorage.getItem('participants.json'),
      camps: localStorage.getItem('camps.json'),
      courses: localStorage.getItem('courses.json'),
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
  },

  /**
   * 从文件导入数据
   */
  importData(filename: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          localStorage.setItem(filename, data)
          message.success(`${filename} 导入成功`)
          resolve()
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
   */
  importAllData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          const backupData = JSON.parse(data)

          if (backupData.ministries) {
            localStorage.setItem('ministries.json', backupData.ministries)
          }
          if (backupData.participants) {
            localStorage.setItem('participants.json', backupData.participants)
          }
          if (backupData.camps) {
            localStorage.setItem('camps.json', backupData.camps)
          }
          if (backupData.courses) {
            localStorage.setItem('courses.json', backupData.courses)
          }

          message.success('全部数据导入成功，请刷新页面')
          resolve()
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
   */
  resetData(filename?: string) {
    if (filename) {
      localStorage.removeItem(filename)
      message.success(`${filename} 已重置`)
    } else {
      localStorage.removeItem('ministries.json')
      localStorage.removeItem('participants.json')
      localStorage.removeItem('camps.json')
      localStorage.removeItem('courses.json')
      message.success('全部数据已重置，请刷新页面')
    }
  }
}
