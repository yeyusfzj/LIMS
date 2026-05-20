import { Router } from 'express'
import { permissionController } from '../controllers/permissionController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有权限路由都需要认证
router.use(authenticate)

/**
 * 获取当前用户的权限列表
 * GET /api/permissions/me
 */
router.get('/me', permissionController.getUserPermissions.bind(permissionController))

/**
 * 获取当前用户的角色列表
 * GET /api/permissions/me/roles
 */
router.get('/me/roles', permissionController.getUserRoles.bind(permissionController))

/**
 * 创建权限
 * POST /api/permissions
 * 需要权限: permission:create
 */
router.post(
  '/',
  requirePermission('permission', 'create'),
  permissionController.createPermission.bind(permissionController)
)

/**
 * 创建角色
 * POST /api/permissions/roles
 * 需要权限: role:create
 */
router.post(
  '/roles',
  requirePermission('role', 'create'),
  permissionController.createRole.bind(permissionController)
)

/**
 * 为角色分配权限
 * POST /api/permissions/roles/assign-permission
 * 需要权限: role:update
 */
router.post(
  '/roles/assign-permission',
  requirePermission('role', 'update'),
  permissionController.assignPermissionToRole.bind(permissionController)
)

/**
 * 从角色移除权限
 * POST /api/permissions/roles/remove-permission
 * 需要权限: role:update
 */
router.post(
  '/roles/remove-permission',
  requirePermission('role', 'update'),
  permissionController.removePermissionFromRole.bind(permissionController)
)

/**
 * 为用户分配角色
 * POST /api/permissions/users/assign-role
 * 需要权限: user:update
 */
router.post(
  '/users/assign-role',
  requirePermission('user', 'update'),
  permissionController.assignRoleToUser.bind(permissionController)
)

/**
 * 从用户移除角色
 * POST /api/permissions/users/remove-role
 * 需要权限: user:update
 */
router.post(
  '/users/remove-role',
  requirePermission('user', 'update'),
  permissionController.removeRoleFromUser.bind(permissionController)
)

export default router
