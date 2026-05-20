/**
 * 数据备份路由
 */

import { Router } from 'express'
import { backupController } from '../controllers/backupController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有备份路由都需要认证和系统管理权限
router.use(authenticate)
router.use(requirePermission('system', 'manage'))

// 创建备份
router.post('/', backupController.createBackup.bind(backupController))

// 验证备份
router.post('/:id/verify', backupController.verifyBackup.bind(backupController))

// 获取备份列表
router.get('/', backupController.listBackups.bind(backupController))

// 获取备份详情
router.get('/:id', backupController.getBackup.bind(backupController))

// 删除备份
router.delete('/:id', backupController.deleteBackup.bind(backupController))

// 清理旧备份
router.post('/cleanup', backupController.cleanupOldBackups.bind(backupController))

export default router
