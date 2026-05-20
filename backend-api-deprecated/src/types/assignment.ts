/**
 * 自动派工类型定义
 */

import { Priority } from '@prisma/client'

/**
 * 派工策略枚举
 */
export enum AssignmentStrategy {
  SKILL_BASED = 'SKILL_BASED', // 基于技能
  WORKLOAD_BASED = 'WORKLOAD_BASED', // 基于工作负载
  ROUND_ROBIN = 'ROUND_ROBIN', // 轮询
  MANUAL = 'MANUAL', // 手动分配
}

/**
 * 派工规则配置
 */
export interface AssignmentRule {
  id: string
  name: string
  description?: string
  nodeType: string // 适用的节点类型
  strategy: AssignmentStrategy
  priority: number // 规则优先级，数字越大优先级越高
  conditions?: AssignmentCondition[] // 派工条件
  isActive: boolean
}

/**
 * 派工条件
 */
export interface AssignmentCondition {
  field: string // 条件字段（如 sampleType, priority 等）
  operator: 'equals' | 'contains' | 'in' | 'greaterThan' | 'lessThan'
  value: any
}

/**
 * 用户技能配置
 */
export interface UserSkill {
  userId: string
  skills: string[] // 技能列表（如 'chemical_analysis', 'microbiology' 等）
  certifications?: string[] // 资质证书
  maxConcurrentTasks?: number // 最大并发任务数
}

/**
 * 派工候选人
 */
export interface AssignmentCandidate {
  userId: string
  username: string
  fullName: string
  score: number // 匹配分数
  currentWorkload: number // 当前工作负载
  skills: string[]
  reason: string // 选择原因
}

/**
 * 派工结果
 */
export interface AssignmentResult {
  success: boolean
  taskId: string
  assignedTo?: string
  assignedUser?: {
    id: string
    username: string
    fullName: string
  }
  candidates?: AssignmentCandidate[]
  reason?: string // 失败原因
  strategy?: AssignmentStrategy
}

/**
 * 派工引擎配置
 */
export interface AssignmentEngineConfig {
  rules: AssignmentRule[]
  userSkills: Map<string, UserSkill>
  enableAutoAssignment: boolean
  fallbackToManual: boolean // 自动派工失败时是否回退到手动分配
}

/**
 * 工作负载统计
 */
export interface WorkloadStatistics {
  userId: string
  pendingTasks: number
  inProgressTasks: number
  totalTasks: number
  averageCompletionTime?: number // 平均完成时间（分钟）
}

/**
 * 派工上下文
 */
export interface AssignmentContext {
  taskId: string
  nodeType: string
  nodeName: string
  priority: Priority
  sampleId: string
  sampleType?: string
  sampleCategory?: string
  testMethod?: string
  workflowId: string
  instanceId: string
}
