
export interface MinistryMember {
  id: string
  name: string
  phone: string
  email?: string
  notes?: string
  createdAt: string   // 创建时间 (ISO 字符串格式)
  updatedAt?: string  // 更新时间 (ISO 字符串格式)
}
