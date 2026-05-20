import { Request, Response } from 'express'
import { permissionService } from '../services/permissionService'
import { logger } from '../config/logger'

/**
 * 权限管理控制器
 */
export class PermissionController {
  /**
   * 获取用户权限列表
   */
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId

      const permissions = await permissionService.getUserPermissions(userId)

      res.json({
        success: true,
        data: permissions
      })
    } catch (error) {
      logger.error('Get user permissions error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户权限失败'
        }
      })
    }
  }

  /**
   * 获取用户角色列表
   */
  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId

      const roles = await permissionService.getUserRoles(userId)

      res.json({
        success: true,
        data: roles
      })
    } catch (error) {
      logger.error('Get user roles error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户角色失败'
        }
      })
    }
  }

  /**
   * 创建权限
   */
  async createPermission(req: Request, res: Response): Promise<void> {
    try {
      const { resource, action } = req.body

      if (!resource || !action) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '资源类型和操作类型不能为空'
          }
        })
        return
      }

      const permission = await permissionService.createPermission(resource, action)

      res.status(201).json({
        success: true,
        data: permission
      })
    } catch (error) {
      logger.error('Create permission error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '创建权限失败'
        }
      })
    }
  }

  /**
   * 创建角色
   */
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body

      if (!name) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '角色名称不能为空'
          }
        })
        return
      }

      const role = await permissionService.createRole(name, description)

      res.status(201).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Create role error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '创建角色失败'
        }
      })
    }
  }

  /**
   * 为角色分配权限
   */
  async assignPermissionToRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId, permissionId } = req.body

      if (!roleId || !permissionId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '角色ID和权限ID不能为空'
          }
        })
        return
      }

      await permissionService.assignPermissionToRole(roleId, permissionId)

      res.json({
        success: true,
        message: '权限分配成功'
      })
    } catch (error) {
      logger.error('Assign permission to role error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '分配权限失败'
        }
      })
    }
  }

  /**
   * 从角色移除权限
   */
  async removePermissionFromRole(req: Request, res: Response): Promise<void> {
    try {
      const { roleId, permissionId } = req.body

      if (!roleId || !permissionId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '角色ID和权限ID不能为空'
          }
        })
        return
      }

      await permissionService.removePermissionFromRole(roleId, permissionId)

      res.json({
        success: true,
        message: '权限移除成功'
      })
    } catch (error) {
      logger.error('Remove permission from role error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '移除权限失败'
        }
      })
    }
  }

  /**
   * 为用户分配角色
   */
  async assignRoleToUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, roleId } = req.body

      if (!userId || !roleId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '用户ID和角色ID不能为空'
          }
        })
        return
      }

      await permissionService.assignRoleToUser(userId, roleId)

      res.json({
        success: true,
        message: '角色分配成功'
      })
    } catch (error) {
      logger.error('Assign role to user error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '分配角色失败'
        }
      })
    }
  }

  /**
   * 从用户移除角色
   */
  async removeRoleFromUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, roleId } = req.body

      if (!userId || !roleId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '用户ID和角色ID不能为空'
          }
        })
        return
      }

      await permissionService.removeRoleFromUser(userId, roleId)

      res.json({
        success: true,
        message: '角色移除成功'
      })
    } catch (error) {
      logger.error('Remove role from user error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '移除角色失败'
        }
      })
    }
  }
}

export const permissionController = new PermissionController()
