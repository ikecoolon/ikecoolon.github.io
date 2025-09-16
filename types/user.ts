/**
 * 用户相关类型定义
 */

export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  avatar?: string
  phone?: string
  createdAt: Date
  updatedAt?: Date
}
