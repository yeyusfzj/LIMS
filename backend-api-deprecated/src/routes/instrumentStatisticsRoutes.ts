/**
 * 仪器统计路由
 * 定义所有仪器统计分析相关的API端点
 */

import express from 'express'
import { instrumentStatisticsController } from '../controllers/instrumentStatisticsController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 统计分析路由
 */

// 获取综合统计数据
// GET /api/instrument-statistics/overall
router.get(
  '/overall',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getOverallStatistics
)

// 获取仪器状态统计
// GET /api/instrument-statistics/status
router.get(
  '/status',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getStatusStatistics
)

// 获取仪器价值统计
// GET /api/instrument-statistics/value
router.get(
  '/value',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getValueStatistics
)

// 获取使用年限分布
// GET /api/instrument-statistics/usage-years
router.get(
  '/usage-years',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getUsageYearsDistribution
)

// 获取校准到期统计
// GET /api/instrument-statistics/calibration-expiry
router.get(
  '/calibration-expiry',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getCalibrationExpiryStatistics
)

// 获取维护频率统计
// GET /api/instrument-statistics/maintenance-frequency?limit=10
router.get(
  '/maintenance-frequency',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getMaintenanceFrequencyStatistics
)

// 获取部门仪器统计
// GET /api/instrument-statistics/department
router.get(
  '/department',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getDepartmentStatistics
)

// 获取即将到期的校准列表
// GET /api/instrument-statistics/expiring-calibrations?days=30
router.get(
  '/expiring-calibrations',
  requireInstrumentPermission.readInstrument(),
  instrumentStatisticsController.getExpiringCalibrations
)

export default router
