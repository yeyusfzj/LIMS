/**
 * 流转管理路由
 * 定义所有流转管理相关的API端点
 */

import express from 'express'
import transferController from '../controllers/transferController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 流转管理路由
 */

// 获取流转列表
// GET /api/transfers?page=1&pageSize=20&status=PENDING
router.get(
  '/',
  requireInstrumentPermission.readTransfer(),
  transferController.getTransfers
)

// 获取流转详情
// GET /api/transfers/:id
router.get(
  '/:id',
  requireInstrumentPermission.readTransfer(),
  transferController.getTransferById
)

// 确认流转
// PUT /api/transfers/:id/confirm
router.put(
  '/:id/confirm',
  requireInstrumentPermission.confirmTransfer(),
  transferController.confirmTransfer
)

// 拒绝流转
// PUT /api/transfers/:id/reject
router.put(
  '/:id/reject',
  requireInstrumentPermission.confirmTransfer(),
  transferController.rejectTransfer
)

// 完成流转（归还）
// PUT /api/transfers/:id/complete
router.put(
  '/:id/complete',
  requireInstrumentPermission.confirmTransfer(),
  transferController.completeTransfer
)

// 取消流转
// PUT /api/transfers/:id/cancel
router.put(
  '/:id/cancel',
  requireInstrumentPermission.createTransfer(),
  transferController.cancelTransfer
)

export default router
