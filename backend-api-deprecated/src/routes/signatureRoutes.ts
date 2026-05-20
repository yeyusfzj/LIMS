/**
 * 电子签名路由
 */

import { Router } from 'express'
import signatureController from '../controllers/signatureController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

/**
 * @route POST /api/reports/:id/sign
 * @desc 签名报告
 * @access Private (需要 report:sign 权限)
 */
router.post(
  '/:id/sign',
  requirePermission('report', 'sign'),
  signatureController.signReport
)

/**
 * @route GET /api/reports/:reportId/signatures
 * @desc 获取报告的所有签名
 * @access Private (需要 report:read 权限)
 */
router.get(
  '/:reportId/signatures',
  requirePermission('report', 'read'),
  signatureController.getReportSignatures
)

/**
 * @route GET /api/reports/:reportId/signatures/:signatureId/verify
 * @desc 验证签名
 * @access Private (需要 report:read 权限)
 */
router.get(
  '/:reportId/signatures/:signatureId/verify',
  requirePermission('report', 'read'),
  signatureController.verifySignature
)

/**
 * @route POST /api/reports/:reportId/signatures/:signatureId/revoke
 * @desc 撤销签名
 * @access Private (需要 report:sign 权限)
 */
router.post(
  '/:reportId/signatures/:signatureId/revoke',
  requirePermission('report', 'sign'),
  signatureController.revokeSignature
)

/**
 * @route GET /api/signatures/:signatureId
 * @desc 获取签名详情
 * @access Private (需要 report:read 权限)
 */
router.get(
  '/signatures/:signatureId',
  requirePermission('report', 'read'),
  signatureController.getSignatureDetail
)

export default router
