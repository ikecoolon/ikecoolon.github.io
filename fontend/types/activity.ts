/**
 * 活动相关类型定义
 */

export interface ActivityPhase {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  assignedMembers: string[]
  notes?: string
  order: number // 环节顺序
}

export interface Activity {
  id: string
  title: string
  description: string
  date: Date // 活动日期
  location: string
  phases: ActivityPhase[] // 活动环节
  createdAt: Date
  updatedAt?: Date
}

export interface Course {
  id: string
  title: string
  instructor: string
  description: string
  duration: number // 分钟
  activities: string[]
  createdAt: Date
  updatedAt?: Date
}

/**
 * 营会相关类型定义
 */
export interface Camp {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate?: Date
  location?: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  activities: string[] // 关联的活动ID
  createdAt: Date
  updatedAt?: Date
}
