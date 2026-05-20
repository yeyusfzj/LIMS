/**
 * 审核路由
 */

import { Router } from 'express'
import { auditController } from '../controllers/auditController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有审核路由都需要认证
router.use(authenticate)

// ============================================
// 审核意见模板路由（必须在 /:id 之前）
// ============================================

/**
 * 获取审核意见模板列表
 * GET /api/audits/templates
 */
router.get(
  '/templates',
  requirePermission('audit', 'read'),
  auditController.listTemplates.bind(auditController)
)

/**
 * 获取单个审核意见模板
 * GET /api/audits/templates/:id
 */
router.get(
  '/templates/:id',
  requirePermission('audit', 'read'),
  auditController.getTemplate.bind(auditController)
)

/**
 * 创建审核意见模板
 * POST /api/audits/templates
 */
router.post(
  '/templates',
  requirePermission('audit', 'create'),
  auditController.createTemplate.bind(auditController)
)

/**
 * 更新审核意见模板
 * PUT /api/audits/templates/:id
 */
router.put(
  '/templates/:id',
  requirePermission('audit', 'update'),
  auditController.updateTemplate.bind(auditController)
)

/**
 * 删除审核意见模板
 * DELETE /api/audits/templates/:id
 */
router.delete(
  '/templates/:id',
  requirePermission('audit', 'delete'),
  auditController.deleteTemplate.bind(auditController)
)

// ============================================
// 审核流程配置路由（必须在 /:id 之前）
// ============================================

/**
 * 获取审核流程配置列表
 * GET /api/audits/workflow-configs
 */
router.get(
  '/workflow-configs',
  requirePermission('audit', 'read'),
  auditController.listWorkflowConfigs.bind(auditController)
)

/**
 * 获取单个审核流程配置
 * GET /api/audits/workflow-configs/:id
 */
router.get(
  '/workflow-configs/:id',
  requirePermission('audit', 'read'),
  auditController.getWorkflowConfig.bind(auditController)
)

/**
 * 创建审核流程配置
 * POST /api/audits/workflow-configs
 */
router.post(
  '/workflow-configs',
  requirePermission('audit', 'create'),
  auditController.createWorkflowConfig.bind(auditController)
)

/**
 * 更新审核流程配置
 * PUT /api/audits/workflow-configs/:id
 */
router.put(
  '/workflow-configs/:id',
  requirePermission('audit', 'update'),
  auditController.updateWorkflowConfig.bind(auditController)
)

/**
 * 删除审核流程配置
 * DELETE /api/audits/workflow-configs/:id
 */
router.delete(
  '/workflow-configs/:id',
  requirePermission('audit', 'delete'),
  auditController.deleteWorkflowConfig.bind(auditController)
)

// ============================================
// 审核历史记录路由（必须在 /:id 之前）
// ============================================

/**
 * 获取审核任务历史记录
 * GET /api/audits/tasks/:id/history
 */
router.get(
  '/tasks/:id/history',
  requirePermission('audit', 'read'),
  auditController.getAuditHistory.bind(auditController)
)

// ============================================
// 审核统计路由（必须在 /:id 之前）
// ============================================

/**
 * 获取审核统计信息
 * GET /api/audits/statistics
 */
router.get(
  '/statistics',
  requirePermission('audit', 'read'),
  auditController.getAuditStatistics.bind(auditController)
)

// ============================================
// 审核任务基础路由
// ============================================

/**
 * 提交样品审核
 * POST /api/audits
 */
router.post(
  '/',
  requirePermission('audit', 'create'),
  auditController.submitForAudit.bind(auditController)
)

/**
 * 查询审核任务列表
 * GET /api/audits
 */
router.get(
  '/',
  requirePermission('audit', 'read'),
  auditController.listAuditTasks.bind(auditController)
)

/**
 * 获取审核任务详情
 * GET /api/audits/:id
 * 注意：此路由必须放在所有具体路径之后
 */
router.get(
  '/:id',
  requirePermission('audit', 'read'),
  auditController.getAuditTask.bind(auditController)
)

/**
 * 执行审核
 * POST /api/audits/:id/review
 */
router.post(
  '/:id/review',
  requirePermission('audit', 'approve'),
  auditController.performAudit.bind(auditController)
)

/**
 * 审核任务转交
 * POST /api/audits/:id/reassign
 */
router.post(
  '/:id/reassign',
  requirePermission('audit', 'update'),
  auditController.reassignAuditTask.bind(auditController)
)

export default router
