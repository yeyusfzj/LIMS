/**
 * 审计日志中间件
 * 自动记录 API 请求和关键操作
 */

import { Request, Response, NextFunction } from 'express'
import { auditLogService } from '../services/auditLogService'
import { AuditAction, AuditResource } from '../types/auditLog'
import { logger } from '../config/logger'

// 需要记录审计日志的操作映射
const AUDIT_ACTIONS: Record<string, { action: AuditAction; resource: AuditResource }> = {
  // 样品操作
  'POST /api/samples': { action: AuditAction.CREATE, resource: AuditResource.SAMPLE },
  'PUT /api/samples/:id': { action: AuditAction.UPDATE, resource: AuditResource.SAMPLE },
  'DELETE /api/samples/:id': { action: AuditAction.DELETE, resource: AuditResource.SAMPLE },
  'POST /api/samples/:id/transfer': { action: AuditAction.TRANSFER, resource: AuditResource.SAMPLE },
  'POST /api/samples/:id/split': { action: AuditAction.SPLIT, resource: AuditResource.SAMPLE },
  'POST /api/samples/merge': { action: AuditAction.MERGE, resource: AuditResource.SAMPLE },
  'POST /api/samples/:id/release': { action: AuditAction.RELEASE, resource: AuditResource.SAMPLE },
  
  // 检测结果操作
  'POST /api/results': { action: AuditAction.CREATE, resource: AuditResource.RESULT },
  'PUT /api/results/:id': { action: AuditAction.UPDATE, resource: AuditResource.RESULT },
  'DELETE /api/results/:id': { action: AuditAction.DELETE, resource: AuditResource.RESULT },
  
  // 审核操作
  'POST /api/audits': { action: AuditAction.CREATE, resource: AuditResource.AUDIT },
  'POST /api/audits/:id/review': { action: AuditAction.APPROVE, resource: AuditResource.AUDIT },
  
  // 报告操作
  'POST /api/reports': { action: AuditAction.CREATE, resource: AuditResource.REPORT },
  'POST /api/reports/:id/sign': { action: AuditAction.SIGN, resource: AuditResource.REPORT },
  'POST /api/reports/:id/distribute': { action: AuditAction.DISTRIBUTE, resource: AuditResource.REPORT },
  'POST /api/reports/:id/recall': { action: AuditAction.RECALL, resource: AuditResource.REPORT },
  
  // 报告模板操作
  'POST /api/report-templates': { action: AuditAction.CREATE, resource: AuditResource.REPORT_TEMPLATE },
  'PUT /api/report-templates/:id': { action: AuditAction.UPDATE, resource: AuditResource.REPORT_TEMPLATE },
  'DELETE /api/report-templates/:id': { action: AuditAction.DELETE, resource: AuditResource.REPORT_TEMPLATE },
  
  // 工作流操作
  'POST /api/workflows': { action: AuditAction.CREATE, resource: AuditResource.WORKFLOW },
  'PUT /api/workflows/:id': { action: AuditAction.UPDATE, resource: AuditResource.WORKFLOW },
  'DELETE /api/workflows/:id': { action: AuditAction.DELETE, resource: AuditResource.WORKFLOW },
  
  // 任务操作
  'POST /api/tasks': { action: AuditAction.CREATE, resource: AuditResource.TASK },
  'PUT /api/tasks/:id': { action: AuditAction.UPDATE, resource: AuditResource.TASK },
  'POST /api/tasks/:id/complete': { action: AuditAction.APPROVE, resource: AuditResource.TASK },
  
  // 用户操作
  'POST /api/users': { action: AuditAction.CREATE, resource: AuditResource.USER },
  'PUT /api/users/:id': { action: AuditAction.UPDATE, resource: AuditResource.USER },
  'DELETE /api/users/:id': { action: AuditAction.DELETE, resource: AuditResource.USER },
  
  // 角色操作
  'POST /api/roles': { action: AuditAction.CREATE, resource: AuditResource.ROLE },
  'PUT /api/roles/:id': { action: AuditAction.UPDATE, resource: AuditResource.ROLE },
  'DELETE /api/roles/:id': { action: AuditAction.DELETE, resource: AuditResource.ROLE },
  
  // 权限操作
  'POST /api/permissions': { action: AuditAction.CREATE, resource: AuditResource.PERMISSION },
  'PUT /api/permissions/:id': { action: AuditAction.UPDATE, resource: AuditResource.PERMISSION },
  'DELETE /api/permissions/:id': { action: AuditAction.DELETE, resource: AuditResource.PERMISSION }
}

/**
 * 审计日志中间件
 * 自动记录关键操作的审计日志
 */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 保存原始的 json 方法
  const originalJson = res.json.bind(res)

  // 重写 json 方法以在响应后记录审计日志
  res.json = function (body: any): Response {
    // 只记录成功的操作（2xx 状态码）
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // 异步记录审计日志，不阻塞响应
      setImmediate(() => {
        recordAuditLog(req, res, body).catch(error => {
          logger.error('Failed to record audit log in middleware', { error })
        })
      })
    }

    // 调用原始的 json 方法
    return originalJson(body)
  }

  next()
}

/**
 * 记录审计日志
 */
async function recordAuditLog(req: Request, _res: Response, responseBody: any): Promise<void> {
  try {
    // 获取用户信息
    const user = (req as any).user
    if (!user) {
      // 未认证的请求不记录审计日志
      return
    }

    // 构建路由模式（将路径参数替换为 :id）
    const routePattern = buildRoutePattern(req.method, req.path)

    // 检查是否需要记录审计日志
    const auditConfig = AUDIT_ACTIONS[routePattern]
    if (!auditConfig) {
      // 不在审计列表中的操作不记录
      return
    }

    // 提取资源 ID
    const resourceId = extractResourceId(req, responseBody)
    if (!resourceId) {
      logger.warn('Cannot extract resource ID for audit log', {
        method: req.method,
        path: req.path
      })
      return
    }

    // 提取变更内容
    const changes = extractChanges(req, auditConfig.action)

    // 获取 IP 地址和 User-Agent
    const ipAddress = getClientIp(req)
    const userAgent = req.get('user-agent')

    // 创建审计日志
    await auditLogService.createAuditLog({
      userId: user.userId,
      username: user.username,
      action: auditConfig.action,
      resource: auditConfig.resource,
      resourceId,
      changes,
      ipAddress,
      userAgent
    })
  } catch (error) {
    logger.error('Error recording audit log', { error })
    // 审计日志记录失败不应影响主流程
  }
}

/**
 * 构建路由模式
 * 将实际路径转换为路由模式（例如：/api/samples/123 -> /api/samples/:id）
 */
function buildRoutePattern(method: string, path: string): string {
  // 替换 UUID 格式的 ID
  const pattern = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id'
  )
  
  return `${method} ${pattern}`
}

/**
 * 提取资源 ID
 */
function extractResourceId(req: Request, responseBody: any): string | null {
  // 1. 尝试从路径参数获取
  if (req.params.id) {
    return req.params.id
  }

  // 2. 尝试从响应体获取
  if (responseBody && responseBody.id) {
    return responseBody.id
  }

  // 3. 尝试从响应体的 data 字段获取
  if (responseBody && responseBody.data && responseBody.data.id) {
    return responseBody.data.id
  }

  // 4. 对于批量操作，使用特殊标识
  if (Array.isArray(responseBody)) {
    return 'batch-operation'
  }

  return null
}

/**
 * 提取变更内容
 */
function extractChanges(req: Request, action: AuditAction): Record<string, any> | undefined {
  // 只记录创建和更新操作的变更内容
  if (action !== AuditAction.CREATE && action !== AuditAction.UPDATE) {
    return undefined
  }

  // 过滤敏感字段
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret']
  const changes: Record<string, any> = {}

  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (!sensitiveFields.includes(key)) {
        changes[key] = req.body[key]
      }
    })
  }

  return Object.keys(changes).length > 0 ? changes : undefined
}

/**
 * 获取客户端 IP 地址
 */
function getClientIp(req: Request): string | undefined {
  // 尝试从各种可能的头部获取真实 IP
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded
    return ips[0].trim()
  }

  const realIp = req.headers['x-real-ip']
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0]
  }

  return req.ip
}

/**
 * 手动记录审计日志的辅助函数
 * 用于在业务逻辑中显式记录审计日志
 */
export async function recordManualAuditLog(
  req: Request,
  action: AuditAction | string,
  resource: AuditResource | string,
  resourceId: string,
  changes?: Record<string, any>
): Promise<void> {
  const user = (req as any).user
  if (!user) {
    throw new Error('用户未认证，无法记录审计日志')
  }

  const ipAddress = getClientIp(req)
  const userAgent = req.get('user-agent')

  await auditLogService.createAuditLog({
    userId: user.userId,
    username: user.username,
    action,
    resource,
    resourceId,
    changes,
    ipAddress,
    userAgent
  })
}
