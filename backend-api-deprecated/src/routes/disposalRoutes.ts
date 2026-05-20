/**
 * 报废管理路由
 * 定义所有报废管理相关的API端点
 */

import express from 'express'
import disposalController from '../controllers/disposalController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 报废管理路由
 */

// 获取报废申请列表
// GET /api/disposals?page=1&pageSize=20&status=PENDING
router.get(
  '/',
  requireInstrumentPermission.readDisposal(),
  disposalController.getDisposals
)

// 获取报废统计数据
// GET /api/disposals/statistics?startDate=2024-01-01&endDate=2024-12-31
router.get(
  '/statistics',
  requireInstrumentPermission.readDisposal(),
  disposalController.getDisposalStatistics
)

// 获取报废申请详情
// GET /api/disposals/:id
router.get(
  '/:id',
  requireInstrumentPermission.readDisposal(),
  disposalController.getDisposalById
)

// 批准报废申请
// PUT /api/disposals/:id/approve
router.put(
  '/:id/approve',
  requireInstrumentPermission.approveDisposal(),
  disposalController.approveDisposal
)

// 拒绝报废申请
// PUT /api/disposals/:id/reject
router.put(
  '/:id/reject',
  requireInstrumentPermission.approveDisposal(),
  disposalController.rejectDisposal
)

// 取消报废申请
// PUT /api/disposals/:id/cancel
router.put(
  '/:id/cancel',
  requireInstrumentPermission.createDisposal(),
  disposalController.cancelDisposal
)

export default router
