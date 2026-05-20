/**
 * 审核模块类型定义
 */

import { AuditStatus, AuditDecision } from '@prisma/client'

/**
 * 创建审核任务 DTO
 */
export interface CreateAuditTaskDto {
  taskId: string
  level: number
  auditorId: string
  comments?: string
}

/**
 * 提交审核 DTO
 */
export interface SubmitAuditDto {
  taskId: string
  auditConfig?: AuditConfig
}

/**
 * 审核配置
 */
export interface AuditConfig {
  levels: AuditLevel[]
}

/**
 * 审核级别配置
 */
export interface AuditLevel {
  level: number
  name: string
  auditorIds: string[]
  autoAssign?: boolean
}

/**
 * 执行审核 DTO
 */
export interface PerformAuditDto {
  taskId: string
  decision: AuditDecision
  comments?: string
  auditorId: string
}

/**
 * 审核退回 DTO
 */
export interface ReturnAuditDto {
  taskId: string
  reason: string
  auditorId: string
  notifyUserId: string
}

/**
 * 审核任务转交 DTO
 */
export interface ReassignAuditDto {
  taskId: string
  fromAuditorId: string
  toAuditorId: string
  reason: string
}

/**
 * 审核任务查询参数
 */
export interface AuditTaskQuery {
  taskId?: string
  auditorId?: string
  status?: AuditStatus
  level?: number
  page?: number
  pageSize?: number
}

/**
 * 审核任务响应
 */
export interface AuditTaskResponse {
  id: string
  taskId: string
  level: number
  auditorId: string
  status: AuditStatus
  decision?: AuditDecision
  comments?: string
  submittedAt: Date
  completedAt?: Date
  task?: {
    id: string
    taskNumber: string
    name: string
    description?: string
    status: string
    sampleId?: string
    sample?: {
      barcode: string
      sampleNumber: string
      sampleName: string
      clientName: string
    }
  }
}

/**
 * 审核结果
 */
export interface AuditResult {
  taskId: string
  auditTaskId: string
  level: number
  decision: AuditDecision
  nextLevel?: number
  isComplete: boolean
  message: string
}

/**
 * 创建审核意见模板 DTO
 */
export interface CreateTemplateDto {
  name: string
  type: string
  content: string
  isDefault?: boolean
}

/**
 * 更新审核意见模板 DTO
 */
export interface UpdateTemplateDto {
  name?: string
  type?: string
  content?: string
  isDefault?: boolean
}

/**
 * 创建审核流程配置 DTO
 */
export interface CreateWorkflowConfigDto {
  name: string
  sampleTypes: string[]
  levels: WorkflowLevel[]
  parallelAudit: boolean
}

/**
 * 更新审核流程配置 DTO
 */
export interface UpdateWorkflowConfigDto {
  name?: string
  sampleTypes?: string[]
  levels?: WorkflowLevel[]
  parallelAudit?: boolean
  status?: string
}

/**
 * 审核流程级别配置
 */
export interface WorkflowLevel {
  order: number
  name: string
  role: string
  required: boolean
  autoAssign: boolean
}

/**
 * 记录审核操作 DTO
 */
export interface RecordAuditActionDto {
  taskId: string
  action: string
  changes: Record<string, any>
  performedBy: string
}
