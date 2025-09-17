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
  date: Date // 活动日期
  startTime: Date // 活动开始时间
  endTime: Date // 活动结束时间
  location: string
  campId: string // 归属营会ID
  phases: ActivityPhase[] // 活动环节
  createdAt: Date
  notes?: string
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
    start: Date
    end: Date
  }
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
  activities: string[] // 关联的活动ID
  duties: string[]     // 关联的职责ID
  createdAt: Date
  updatedAt?: Date
}
