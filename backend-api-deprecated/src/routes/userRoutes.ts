import { Router } from 'express'
import { userController } from '../controllers/userController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  userQuerySchema
} from '../validators/userValidator'

const router = Router()

/**
 * 用户管理路由
 * 所有路由都需要认证和相应权限
 */

// 创建用户
router.post(
  '/',
  authenticate,
  requirePermission('user', 'create'),
  validateRequest(createUserSchema),
  userController.createUser.bind(userController)
)

// 获取用户列表
router.get(
  '/',
  authenticate,
  requirePermission('user', 'read'),
  validateRequest(userQuerySchema, 'query'),
  userController.listUsers.bind(userController)
)

// 获取用户详情
router.get(
  '/:id',
  authenticate,
  requirePermission('user', 'read'),
  userController.getUserById.bind(userController)
)

// 更新用户信息
router.put(
  '/:id',
  authenticate,
  requirePermission('user', 'update'),
  validateRequest(updateUserSchema),
  userController.updateUser.bind(userController)
)

// 更新用户状态
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('user', 'update'),
  userController.updateUserStatus.bind(userController)
)

// 重置用户密码
router.post(
  '/:id/reset-password',
  authenticate,
  requirePermission('user', 'update'),
  validateRequest(resetPasswordSchema),
  userController.resetPassword.bind(userController)
)

// 删除用户（软删除）
router.delete(
  '/:id',
  authenticate,
  requirePermission('user', 'delete'),
  userController.deleteUser.bind(userController)
)

export default router
