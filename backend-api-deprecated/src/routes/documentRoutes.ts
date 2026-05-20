/**
 * 文档路由
 * 处理文档的下载、删除等通用操作
 */

import express from 'express'
import { documentController } from '../controllers/documentController'
import { authMiddleware } from '../middleware/authMiddleware'
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'
import { uploadInstrumentDocument } from '../middleware/fileUploadMiddleware'

const router = express.Router()

// 所有路由都需要先进行身份认证
router.use(authMiddleware)

/**
 * 通用文档操作
 */

// 下载文档
// GET /api/documents/:id
router.get(
  '/:id',
  requireInstrumentPermission.readDocument(),
  documentController.downloadDocument
)

// 删除仪器文档
// DELETE /api/documents/instrument/:id
router.delete(
  '/instrument/:id',
  requireInstrumentPermission.deleteDocument(),
  documentController.deleteInstrumentDocument
)

// 删除维护文档
// DELETE /api/documents/maintenance/:id
router.delete(
  '/maintenance/:id',
  requireInstrumentPermission.deleteMaintenance(),
  documentController.deleteMaintenanceDocument
)

// 删除报废文档
// DELETE /api/documents/disposal/:id
router.delete(
  '/disposal/:id',
  requireInstrumentPermission.deleteDocument(),
  documentController.deleteDisposalDocument
)

/**
 * 维护文档路由
 */

// 上传维护文档
// POST /api/documents/maintenance/:id
router.post(
  '/maintenance/:id',
  requireInstrumentPermission.createMaintenance(),
  uploadInstrumentDocument.single('file'),
  documentController.uploadMaintenanceDocument
)

// 获取维护文档列表
// GET /api/documents/maintenance/:id/list
router.get(
  '/maintenance/:id/list',
  requireInstrumentPermission.readMaintenance(),
  documentController.getMaintenanceDocuments
)

/**
 * 报废文档路由
 */

// 上传报废文档
// POST /api/documents/disposal/:id
router.post(
  '/disposal/:id',
  requireInstrumentPermission.createDisposal(),
  uploadInstrumentDocument.single('file'),
  documentController.uploadDisposalDocument
)

// 获取报废文档列表
// GET /api/documents/disposal/:id/list
router.get(
  '/disposal/:id/list',
  requireInstrumentPermission.readDisposal(),
  documentController.getDisposalDocuments
)

export default router
