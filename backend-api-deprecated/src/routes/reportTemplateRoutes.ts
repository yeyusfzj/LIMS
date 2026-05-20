/**
 * 报告模板路由
 */

import { Router } from 'express'
import reportTemplateController from '../controllers/reportTemplateController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createTemplateSchema,
  updateTemplateSchema,
  queryTemplateSchema
} from '../validators/reportTemplateValidator'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

/**
 * @route   POST /api/report-templates
 * @desc    创建报告模板
 * @access  Private (需要 report:create 权限)
 */
router.post(
  '/',
  requirePermission('report', 'create'),
  validateRequest(createTemplateSchema),
  reportTemplateController.createTemplate
)

/**
 * @route   GET /api/report-templates
 * @desc    查询报告模板列表
 * @access  Private (需要 report:read 权限)
 */
router.get(
  '/',
  requirePermission('report', 'read'),
  validateRequest(queryTemplateSchema, 'query'),
  reportTemplateController.listTemplates
)

/**
 * @route   GET /api/report-templates/:id
 * @desc    获取报告模板详情
 * @access  Private (需要 report:read 权限)
 */
router.get(
  '/:id',
  requirePermission('report', 'read'),
  reportTemplateController.getTemplate
)

/**
 * @route   PUT /api/report-templates/:id
 * @desc    更新报告模板
 * @access  Private (需要 report:update 权限)
 */
router.put(
  '/:id',
  requirePermission('report', 'update'),
  validateRequest(updateTemplateSchema),
  reportTemplateController.updateTemplate
)

/**
 * @route   POST /api/report-templates/:id/activate
 * @desc    激活报告模板
 * @access  Private (需要 report:update 权限)
 */
router.post(
  '/:id/activate',
  requirePermission('report', 'update'),
  reportTemplateController.activateTemplate
)

/**
 * @route   POST /api/report-templates/:id/deactivate
 * @desc    停用报告模板
 * @access  Private (需要 report:update 权限)
 */
router.post(
  '/:id/deactivate',
  requirePermission('report', 'update'),
  reportTemplateController.deactivateTemplate
)

/**
 * @route   DELETE /api/report-templates/:id
 * @desc    删除报告模板
 * @access  Private (需要 report:delete 权限)
 */
router.delete(
  '/:id',
  requirePermission('report', 'delete'),
  reportTemplateController.deleteTemplate
)

/**
 * @route   GET /api/report-templates/:id/versions
 * @desc    获取模板版本信息
 * @access  Private (需要 report:read 权限)
 */
router.get(
  '/:id/versions',
  requirePermission('report', 'read'),
  reportTemplateController.getTemplateVersions
)

export default router
