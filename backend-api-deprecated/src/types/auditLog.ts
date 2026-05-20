/**
 * 审计日志类型定义
 */

// 审计日志操作类型
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RELEASE = 'RELEASE',
  SIGN = 'SIGN',
  DISTRIBUTE = 'DISTRIBUTE',
  RECALL = 'RECALL',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TRANSFER = 'TRANSFER',
  SPLIT = 'SPLIT',
  MERGE = 'MERGE'
}

// 审计日志资源类型
export enum AuditResource {
  SAMPLE = 'SAMPLE',
  RESULT = 'RESULT',
  WORKFLOW = 'WORKFLOW',
  TASK = 'TASK',
  AUDIT = 'AUDIT',
  REPORT = 'REPORT',
  REPORT_TEMPLATE = 'REPORT_TEMPLATE',
  USER = 'USER',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  FORMULA = 'FORMULA'
}

// 创建审计日志 DTO
export interface CreateAuditLogDto {
  userId: string
  username: string
  action: AuditAction | string
  resource: AuditResource | string
  resourceId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

// 审计日志查询参数
export interface AuditLogQuery {
  userId?: string
  username?: string
  action?: string
  resource?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

// 审计日志响应
export interface AuditLogResponse {
  id: string
  userId: string
  username: string
  action: string
  resource: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// 分页审计日志响应
export interface PaginatedAuditLogsResponse {
  items: AuditLogResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
