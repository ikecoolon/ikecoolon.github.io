/**
 * 类型定义统一导出
 */

export * from './user'
export * from './ministry'
export * from './activity'
export * from './common'

// 重新导出 Camp 类型（已在 activity.ts 中定义）
export type { Camp } from './activity'
