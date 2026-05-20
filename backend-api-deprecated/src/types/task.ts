/**
 * 任务类型定义
 */

import { TaskStatus, Priority } from '@prisma/client'

/**
 * 创建任务 DTO
 */
export interface CreateTaskDto {
  instanceId: string
  nodeId: string
  nodeName: string
  nodeType: string
  assignedTo?: string
  priority?: Priority
}

/**
 * 更新任务 DTO
 */
export interface UpdateTaskDto {
  assignedTo?: string
  status?: TaskStatus
  priority?: Priority
  result?: Record<string, any>
}

/**
 * 完成任务 DTO
 */
export interface CompleteTaskDto {
  result?: Record<string, any>
}

/**
 * 任务查询参数
 */
export interface TaskQuery {
  instanceId?: string
  assignedTo?: string
  status?: TaskStatus
  priority?: Priority
  nodeType?: string
  page?: number
  pageSize?: number
}

/**
 * 任务分配 DTO
 */
export interface AssignTaskDto {
  userId: string
}
