/**
 * 通用类型定义
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginationResponse<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}
