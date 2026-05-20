/**
 * 维护管理路由
 * 定义所有维护管理相关的API端点
 */

import express from 'express'
import maintenanceController from '../controllers/maintenanceController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 维护管理路由
 */

// 获取维护记录列表
// GET /api/maintenance?page=1&pageSize=20&maintenanceType=ROUTINE
router.get(
  '/',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getMaintenanceRecords
)

// 获取维护提醒列表
// GET /api/maintenance/reminders?daysAhead=30
router.get(
  '/reminders',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getMaintenanceReminders
)

// 获取过期未维护的记录
// GET /api/maintenance/overdue
router.get(
  '/overdue',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getOverdueMaintenanceRecords
)

// 获取维护统计数据
// GET /api/maintenance/statistics?startDate=2024-01-01&endDate=2024-12-31
router.get(
  '/statistics',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getMaintenanceStatistics
)

// 获取维护记录详情
// GET /api/maintenance/:id
router.get(
  '/:id',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getMaintenanceById
)

// 更新维护记录
// PUT /api/maintenance/:id
router.put(
  '/:id',
  requireInstrumentPermission.updateMaintenance(),
  maintenanceController.updateMaintenance
)

// 删除维护记录
// DELETE /api/maintenance/:id
router.delete(
  '/:id',
  requireInstrumentPermission.deleteMaintenance(),
  maintenanceController.deleteMaintenance
)

export default router
