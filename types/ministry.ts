/**
 * 服侍相关类型定义
 */

export interface Ministry {
  id: string
  name: string
  description: string
  responsibilities: string[]
  requirements: string[]
  createdAt: Date
  updatedAt?: Date
}

export interface MinistryMember {
  id: string
  name: string
  phone: string
  email: string
  ministryIds: string[]
  skills: string[]
  availability: string
  notes?: string
  createdAt: Date
  updatedAt?: Date
}
