/**
 * 质量判定路由
 */

import { Router } from 'express'
import { judgmentController } from '../controllers/judgmentController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 判定规则管理
router.post(
  '/judgment-rules',
  requirePermission('judgment', 'create'),
  (req, res, next) => judgmentController.createJudgmentRule(req, res, next)
)

router.put(
  '/judgment-rules/:id',
  requirePermission('judgment', 'update'),
  (req, res, next) => judgmentController.updateJudgmentRule(req, res, next)
)

router.get(
  '/judgment-rules',
  requirePermission('judgment', 'read'),
  (req, res, next) => judgmentController.listJudgmentRules(req, res, next)
)

router.get(
  '/judgment-rules/:id',
  requirePermission('judgment', 'read'),
  (req, res, next) => judgmentController.getJudgmentRule(req, res, next)
)

router.delete(
  '/judgment-rules/:id',
  requirePermission('judgment', 'delete'),
  (req, res, next) => judgmentController.deleteJudgmentRule(req, res, next)
)

// 质量判定
router.post(
  '/samples/:id/judgment',
  requirePermission('judgment', 'create'),
  (req, res, next) => judgmentController.performQualityJudgment(req, res, next)
)

router.get(
  '/samples/:id/judgment',
  requirePermission('judgment', 'read'),
  (req, res, next) => judgmentController.getJudgment(req, res, next)
)

// 判定复核
router.post(
  '/judgments/:id/review',
  requirePermission('judgment', 'update'),
  (req, res, next) => judgmentController.reviewJudgment(req, res, next)
)

// 判定历史
router.get(
  '/judgment-history',
  requirePermission('judgment', 'read'),
  (req, res, next) => judgmentController.listJudgmentHistory(req, res, next)
)

// 批量判定
router.post(
  '/judgments/batch',
  requirePermission('judgment', 'create'),
  (req, res, next) => judgmentController.batchJudgment(req, res, next)
)

export default router
