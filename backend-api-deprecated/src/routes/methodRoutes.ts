/**
 * 检测方法路由
 */

import { Router } from 'express'
import { methodController } from '../controllers/methodController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createMethodSchema,
  updateMethodSchema,
  methodIdSchema,
  copyMethodSchema,
  queryMethodSchema
} from '../validators/methodValidator'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// 获取检测方法列表
router.get(
  '/',
  validateRequest(queryMethodSchema, 'query'),
  requirePermission('method', 'read'),
  methodController.getMethodList.bind(methodController)
)

// 获取检测方法详情
router.get(
  '/:id',
  validateRequest(methodIdSchema, 'params', 'id'),
  requirePermission('method', 'read'),
  methodController.getMethodById.bind(methodController)
)

// 创建检测方法
router.post(
  '/',
  validateRequest(createMethodSchema, 'body'),
  requirePermission('method', 'create'),
  methodController.createMethod.bind(methodController)
)

// 更新检测方法
router.put(
  '/:id',
  validateRequest(methodIdSchema, 'params', 'id'),
  validateRequest(updateMethodSchema, 'body'),
  requirePermission('method', 'update'),
  methodController.updateMethod.bind(methodController)
)

// 删除检测方法
router.delete(
  '/:id',
  validateRequest(methodIdSchema, 'params', 'id'),
  requirePermission('method', 'delete'),
  methodController.deleteMethod.bind(methodController)
)

// 获取检测方法版本历史
router.get(
  '/:id/history',
  validateRequest(methodIdSchema, 'params', 'id'),
  requirePermission('method', 'read'),
  methodController.getMethodHistory.bind(methodController)
)

// 复制检测方法
router.post(
  '/:id/copy',
  validateRequest(methodIdSchema, 'params', 'id'),
  validateRequest(copyMethodSchema, 'body'),
  requirePermission('method', 'create'),
  methodController.copyMethod.bind(methodController)
)

// 归档检测方法
router.post(
  '/:id/archive',
  validateRequest(methodIdSchema, 'params', 'id'),
  requirePermission('method', 'update'),
  methodController.archiveMethod.bind(methodController)
)

// 激活检测方法
router.post(
  '/:id/activate',
  validateRequest(methodIdSchema, 'params', 'id'),
  requirePermission('method', 'update'),
  methodController.activateMethod.bind(methodController)
)

export default router
