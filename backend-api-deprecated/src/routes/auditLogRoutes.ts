/**
 * 审计日志路由
 */

import { Router } from 'express'
import { auditLogController } from '../controllers/auditLogController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有审计日志路由都需要认证
router.use(authenticate)

/**
 * 获取审计统计
 * GET /api/audit-logs/statistics
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/statistics',
  requirePermission('audit-log', 'read'),
  auditLogController.getAuditStatistics.bind(auditLogController)
)

/**
 * 获取归档统计信息
 * GET /api/audit-logs/archive-statistics
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/archive-statistics',
  requirePermission('audit-log', 'read'),
  auditLogController.getArchiveStatistics.bind(auditLogController)
)

/**
 * 查询归档的审计日志
 * GET /api/audit-logs/archived
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/archived',
  requirePermission('audit-log', 'read'),
  auditLogController.listArchivedAuditLogs.bind(auditLogController)
)

/**
 * 获取资源的审计历史
 * GET /api/audit-logs/resource/:resource/:resourceId
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/resource/:resource/:resourceId',
  requirePermission('audit-log', 'read'),
  auditLogController.getResourceAuditHistory.bind(auditLogController)
)

/**
 * 获取用户的操作历史
 * GET /api/audit-logs/user/:userId
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/user/:userId',
  requirePermission('audit-log', 'read'),
  auditLogController.getUserAuditHistory.bind(auditLogController)
)

/**
 * 查询审计日志列表
 * GET /api/audit-logs
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/',
  requirePermission('audit-log', 'read'),
  auditLogController.listAuditLogs.bind(auditLogController)
)

/**
 * 获取审计日志详情
 * GET /api/audit-logs/:id
 * 权限：需要 audit-log:read 权限
 */
router.get(
  '/:id',
  requirePermission('audit-log', 'read'),
  auditLogController.getAuditLog.bind(auditLogController)
)

/**
 * 归档审计日志
 * POST /api/audit-logs/archive
 * 权限：需要 audit-log:manage 权限
 */
router.post(
  '/archive',
  requirePermission('audit-log', 'manage'),
  auditLogController.archiveAuditLogs.bind(auditLogController)
)

export default router
