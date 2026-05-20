import { Router } from 'express'
import { roleController } from '../controllers/roleController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import {
  validate,
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  createPermissionSchema
} from '../validators/roleValidator'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

// ============================================
// 角色管理路由
// ============================================

/**
 * @route   POST /api/roles
 * @desc    创建角色
 * @access  需要 role:create 权限
 */
router.post(
  '/',
  requirePermission('role', 'create'),
  validate(createRoleSchema),
  roleController.createRole.bind(roleController)
)

/**
 * @route   GET /api/roles
 * @desc    获取角色列表
 * @access  需要 role:read 权限
 */
router.get(
  '/',
  requirePermission('role', 'read'),
  roleController.listRoles.bind(roleController)
)

/**
 * @route   GET /api/roles/:id
 * @desc    获取角色详情
 * @access  需要 role:read 权限
 */
router.get(
  '/:id',
  requirePermission('role', 'read'),
  roleController.getRoleById.bind(roleController)
)

/**
 * @route   PUT /api/roles/:id
 * @desc    更新角色信息
 * @access  需要 role:update 权限
 */
router.put(
  '/:id',
  requirePermission('role', 'update'),
  validate(updateRoleSchema),
  roleController.updateRole.bind(roleController)
)

/**
 * @route   DELETE /api/roles/:id
 * @desc    删除角色
 * @access  需要 role:delete 权限
 */
router.delete(
  '/:id',
  requirePermission('role', 'delete'),
  roleController.deleteRole.bind(roleController)
)

/**
 * @route   POST /api/roles/:id/permissions
 * @desc    为角色分配权限
 * @access  需要 role:update 权限
 */
router.post(
  '/:id/permissions',
  requirePermission('role', 'update'),
  validate(assignPermissionsSchema),
  roleController.assignPermissions.bind(roleController)
)

/**
 * @route   DELETE /api/roles/:id/permissions
 * @desc    从角色移除权限
 * @access  需要 role:update 权限
 */
router.delete(
  '/:id/permissions',
  requirePermission('role', 'update'),
  validate(assignPermissionsSchema),
  roleController.removePermissions.bind(roleController)
)

// ============================================
// 权限管理路由
// ============================================

/**
 * @route   POST /api/permissions
 * @desc    创建权限
 * @access  需要 permission:create 权限
 */
router.post(
  '/permissions',
  requirePermission('permission', 'create'),
  validate(createPermissionSchema),
  roleController.createPermission.bind(roleController)
)

/**
 * @route   GET /api/permissions
 * @desc    获取权限列表
 * @access  需要 permission:read 权限
 */
router.get(
  '/permissions',
  requirePermission('permission', 'read'),
  roleController.listPermissions.bind(roleController)
)

/**
 * @route   DELETE /api/permissions/:id
 * @desc    删除权限
 * @access  需要 permission:delete 权限
 */
router.delete(
  '/permissions/:id',
  requirePermission('permission', 'delete'),
  roleController.deletePermission.bind(roleController)
)

export default router
