/**
 * 活动相关类型定义
 */

export type ActivityStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'

export interface Activity {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  location: string
  assignedMembers: string[]
  ministryIds: string[]
  notes?: string
  status: ActivityStatus
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
