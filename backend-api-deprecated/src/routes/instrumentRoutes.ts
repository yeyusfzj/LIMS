/**
 * 仪器管理路由
 * 定义所有仪器管理相关的API端点
 */

import express from 'express'
import instrumentController from '../controllers/instrumentController'
import transferController from '../controllers/transferController'
import maintenanceController from '../controllers/maintenanceController'
import calibrationController from '../controllers/calibrationController'
import disposalController from '../controllers/disposalController'
import { documentController } from '../controllers/documentController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'
import { uploadInstrumentDocument } from '../middleware/fileUploadMiddleware'

console.log('instrumentController:', instrumentController)
console.log('typeof instrumentController:', typeof instrumentController)

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 仪器管理基础路由
 */

// 创建仪器
// POST /api/instruments
router.post(
  '/',
  requireInstrumentPermission.createInstrument(),
  instrumentController.createInstrument
)

// 获取仪器列表(分页、筛选)
// GET /api/instruments?page=1&pageSize=20&status=IN_USE&department=xxx
router.get(
  '/',
  requireInstrumentPermission.readInstrument(),
  instrumentController.getInstruments
)

// 批量删除仪器
// POST /api/instruments/batch-delete
router.post(
  '/batch-delete',
  requireInstrumentPermission.deleteInstrument(),
  instrumentController.batchDeleteInstruments
)

// 导出仪器数据
// POST /api/instruments/export
router.post(
  '/export',
  requireInstrumentPermission.readInstrument(),
  instrumentController.exportInstruments
)

// 下载导出文件
// GET /api/instruments/export/:fileName
router.get(
  '/export/:fileName',
  requireInstrumentPermission.readInstrument(),
  instrumentController.downloadExportFile
)

// 验证仪器编码唯一性
// GET /api/instruments/validate-code/:code?excludeId=xxx
router.get(
  '/validate-code/:code',
  requireInstrumentPermission.readInstrument(),
  instrumentController.validateInstrumentCode
)

// 通过编码获取仪器
// GET /api/instruments/code/:code
router.get(
  '/code/:code',
  requireInstrumentPermission.readInstrument(),
  instrumentController.getInstrumentByCode
)

// 获取仪器详情
// GET /api/instruments/:id
router.get(
  '/:id',
  requireInstrumentPermission.readInstrument(),
  instrumentController.getInstrumentById
)

// 更新仪器信息
// PUT /api/instruments/:id
router.put(
  '/:id',
  requireInstrumentPermission.updateInstrument(),
  instrumentController.updateInstrument
)

// 更新仪器状态
// PUT /api/instruments/:id/status
router.put(
  '/:id/status',
  requireInstrumentPermission.updateInstrument(),
  instrumentController.updateInstrumentStatus
)

// 删除仪器(软删除)
// DELETE /api/instruments/:id
router.delete(
  '/:id',
  requireInstrumentPermission.deleteInstrument(),
  instrumentController.deleteInstrument
)

/**
 * 流转管理路由
 */

// 创建流转申请
// POST /api/instruments/:id/transfers
router.post(
  '/:id/transfers',
  requireInstrumentPermission.createTransfer(),
  transferController.createTransfer
)

// 获取仪器的流转历史
// GET /api/instruments/:id/transfers
router.get(
  '/:id/transfers',
  requireInstrumentPermission.readTransfer(),
  transferController.getInstrumentTransfers
)

/**
 * 维护管理路由
 */

// 创建维护记录
// POST /api/instruments/:id/maintenance
router.post(
  '/:id/maintenance',
  requireInstrumentPermission.createMaintenance(),
  maintenanceController.createMaintenance
)

// 获取仪器的维护记录
// GET /api/instruments/:id/maintenance
router.get(
  '/:id/maintenance',
  requireInstrumentPermission.readMaintenance(),
  maintenanceController.getInstrumentMaintenanceRecords
)

/**
 * 校准管理路由
 */

// 创建校准记录
// POST /api/instruments/:id/calibration
router.post(
  '/:id/calibration',
  requireInstrumentPermission.createCalibration(),
  calibrationController.createCalibration
)

// 获取仪器的校准记录
// GET /api/instruments/:id/calibration
router.get(
  '/:id/calibration',
  requireInstrumentPermission.readCalibration(),
  calibrationController.getInstrumentCalibrationRecords
)

/**
 * 报废管理路由
 */

// 创建报废申请
// POST /api/instruments/:id/disposal
router.post(
  '/:id/disposal',
  requireInstrumentPermission.createDisposal(),
  disposalController.createDisposal
)

/**
 * 文档管理路由
 */

// 上传仪器文档
// POST /api/instruments/:id/documents
router.post(
  '/:id/documents',
  requireInstrumentPermission.createDocument(),
  uploadInstrumentDocument.single('file'),
  documentController.uploadInstrumentDocument
)

// 获取仪器文档列表
// GET /api/instruments/:id/documents
router.get(
  '/:id/documents',
  requireInstrumentPermission.readDocument(),
  documentController.getInstrumentDocuments
)

export default router
