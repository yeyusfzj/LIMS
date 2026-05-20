/**
 * 校准管理路由
 * 定义所有校准管理相关的API端点
 */

import express from 'express'
import calibrationController from '../controllers/calibrationController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 校准管理路由
 */

// 获取校准记录列表
// GET /api/calibration?page=1&pageSize=20&calibrationResult=QUALIFIED
router.get(
  '/',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getCalibrationRecords
)

// 获取即将到期的校准列表
// GET /api/calibration/expiring?daysAhead=30
router.get(
  '/expiring',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getExpiringCalibrations
)

// 获取过期未校准的记录
// GET /api/calibration/overdue
router.get(
  '/overdue',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getOverdueCalibrations
)

// 获取校准统计数据
// GET /api/calibration/statistics?startDate=2024-01-01&endDate=2024-12-31
router.get(
  '/statistics',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getCalibrationStatistics
)

// 获取校准记录详情
// GET /api/calibration/:id
router.get(
  '/:id',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getCalibrationById
)

// 更新校准记录
// PUT /api/calibration/:id
router.put(
  '/:id',
  requireInstrumentPermission.updateCalibration(),
  calibrationController.updateCalibration
)

// 删除校准记录
// DELETE /api/calibration/:id
router.delete(
  '/:id',
  requireInstrumentPermission.deleteCalibration(),
  calibrationController.deleteCalibration
)

export default router
