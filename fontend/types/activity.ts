/**
 * 活动相关类型定义
 */

export interface ActivityPhase {
  id: string
  title: string
  description: string
  assignedMembers: string[]
  notes?: string
  order: number // 环节顺序
}

export interface Activity {
  id: string
  title: string
  description: string
  date: string // 活动日期 (ISO 字符串格式)
  startTime: string // 活动开始时间 (ISO 字符串格式)
  endTime: string // 活动结束时间 (ISO 字符串格式)
  location: string
  campId: string // 归属营会ID
  phases: ActivityPhase[] // 活动环节
  createdAt: string // 创建时间 (ISO 字符串格式)
  notes?: string
  updatedAt?: string // 更新时间 (ISO 字符串格式)
}

export interface Course {
  id: string
  title: string
  instructor: string
  description: string
  duration: number // 分钟
  activities: string[]
  createdAt: string // 创建时间 (ISO 字符串格式)
  updatedAt?: string // 更新时间 (ISO 字符串格式)
}

/**
 * 营会职责类型定义
 */
export interface CampDutyAssignee {
  userId: string
  userName: string
  role?: string // 在该职责中的具体角色
}

export type DutyCategory =
  | 'preparation'  // 准备工作 (物资、场地、宣传等)
  | 'logistics'    // 后勤保障 (餐饮、交通、住宿等)
  | 'coordination' // 现场协调 (统筹、应急、接待等)
  | 'support'      // 技术支持 (设备、音响、网络等)

export interface CampDuty {
  id: string
  campId: string           // 所属营会
  title: string           // 职责名称
  description: string     // 职责详细说明
  category: DutyCategory  // 职责类型
  assignees: CampDutyAssignee[] // 多负责人
  timeRange?: {           // 可选时间范围
    start: string         // 开始时间 (ISO 字符串格式)
    end: string           // 结束时间 (ISO 字符串格式)
  }
  createdAt: string       // 创建时间 (ISO 字符串格式)
  updatedAt?: string      // 更新时间 (ISO 字符串格式)
}

/**
 * 营会相关类型定义
 */
export interface Camp {
  id: string
  name: string
  description?: string
  startDate: string    // 开始日期 (ISO 字符串格式)
  endDate?: string     // 结束日期 (ISO 字符串格式)
  location?: string
  activities: string[] // 关联的活动ID
  duties: string[]     // 关联的职责ID
  createdAt: string    // 创建时间 (ISO 字符串格式)
  updatedAt?: string   // 更新时间 (ISO 字符串格式)
}
