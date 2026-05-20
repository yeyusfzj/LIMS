/**
 * 工作流类型定义
 */

import { WorkflowStatus } from '@prisma/client'

/**
 * 工作流节点类型
 */
export enum NodeType {
  START = 'START', // 开始节点
  END = 'END', // 结束节点
  TASK = 'TASK', // 任务节点
  DECISION = 'DECISION', // 决策节点
  PARALLEL = 'PARALLEL', // 并行节点
  MERGE = 'MERGE', // 合并节点
}

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  id: string
  type: NodeType
  name: string
  description?: string
  config?: Record<string, any> // 节点特定配置
}

/**
 * 工作流边定义
 */
export interface WorkflowEdge {
  id: string
  source: string // 源节点 ID
  target: string // 目标节点 ID
  condition?: string // 条件表达式（用于决策节点）
  label?: string
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * 创建工作流 DTO
 */
export interface CreateWorkflowDto {
  name: string
  description?: string
  config: WorkflowConfig
}

/**
 * 更新工作流 DTO
 */
export interface UpdateWorkflowDto {
  name?: string
  description?: string
  config?: WorkflowConfig
  status?: WorkflowStatus
  isActive?: boolean
}

/**
 * 工作流验证结果
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  type: 'DEAD_LOOP' | 'ISOLATED_NODE' | 'MISSING_START' | 'MISSING_END' | 'INVALID_EDGE' | 'DUPLICATE_NODE'
  message: string
  nodeIds?: string[]
  edgeIds?: string[]
}

/**
 * 工作流查询参数
 */
export interface WorkflowQuery {
  status?: WorkflowStatus
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}
