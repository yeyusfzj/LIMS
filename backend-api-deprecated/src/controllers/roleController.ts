import { Request, Response, NextFunction } from 'express'
import { roleService } from '../services/roleService'
import { logger } from '../config/logger'

export class RoleController {
  /**
   * 创建角色
   */
  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).user?.userId

      if (!createdBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      const role = await roleService.createRole(req.body, createdBy)

      res.status(201).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Create role error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('已存在')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: error.message
            }
          })
          return
        }
        
        if (error.message.includes('不存在')) {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message
            }
          })
          return
        }
      }

      next(error)
    }
  }

  /**
   * 获取角色列表
   */
  async listRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        name: req.query.name as string,
        hasPermission: req.query.hasPermission as string
      }

      const result = await roleService.listRoles(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('List roles error:', error)
      next(error)
    }
  }

  /**
   * 获取角色详情
   */
  async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const role = await roleService.getRoleById(id)

      res.status(200).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Get role error:', error)
      
      if (error instanceof Error && error.message === '角色不存在') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
        return
      }

      next(error)
    }
  }

  /**
   * 更新角色信息
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const updatedBy = (req as any).user?.userId

      if (!updatedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      const role = await roleService.updateRole(id, req.body, updatedBy)

      res.status(200).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Update role error:', error)
      
      if (error instanceof Error) {
        if (error.message === '角色不存在') {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message
            }
          })
          return
        }
        
        if (error.message.includes('已被使用') || error.message.includes('不存在')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: error.message
            }
          })
          return
        }
      }

      next(error)
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const deletedBy = (req as any).user?.userId

      if (!deletedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      await roleService.deleteRole(id, deletedBy)

      res.status(200).json({
        success: true,
        message: '角色删除成功'
      })
    } catch (error) {
      logger.error('Delete role error:', error)
      
      if (error instanceof Error) {
        if (error.message === '角色不存在') {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message
            }
          })
          return
        }
        
        if (error.message.includes('正在被使用')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: error.message
            }
          })
          return
        }
      }

      next(error)
    }
  }

  /**
   * 为角色分配权限
   */
  async assignPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { permissionIds } = req.body
      const assignedBy = (req as any).user?.userId

      if (!assignedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      if (!permissionIds || !Array.isArray(permissionIds)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '权限ID列表不能为空且必须是数组'
          }
        })
        return
      }

      const role = await roleService.assignPermissions(id, permissionIds, assignedBy)

      res.status(200).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Assign permissions error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message
            }
          })
          return
        }
      }

      next(error)
    }
  }

  /**
   * 从角色移除权限
   */
  async removePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { permissionIds } = req.body
      const removedBy = (req as any).user?.userId

      if (!removedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      if (!permissionIds || !Array.isArray(permissionIds)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '权限ID列表不能为空且必须是数组'
          }
        })
        return
      }

      const role = await roleService.removePermissions(id, permissionIds, removedBy)

      res.status(200).json({
        success: true,
        data: role
      })
    } catch (error) {
      logger.error('Remove permissions error:', error)
      
      if (error instanceof Error && error.message === '角色不存在') {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        })
        return
      }

      next(error)
    }
  }

  /**
   * 创建权限
   */
  async createPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).user?.userId

      if (!createdBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

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

      const permission = await roleService.createPermission({ resource, action }, createdBy)

      res.status(201).json({
        success: true,
        data: permission
      })
    } catch (error) {
      logger.error('Create permission error:', error)
      
      if (error instanceof Error && error.message === '权限已存在') {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message
          }
        })
        return
      }

      next(error)
    }
  }

  /**
   * 获取权限列表
   */
  async listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        resource: req.query.resource as string,
        action: req.query.action as string
      }

      const result = await roleService.listPermissions(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('List permissions error:', error)
      next(error)
    }
  }

  /**
   * 删除权限
   */
  async deletePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const deletedBy = (req as any).user?.userId

      if (!deletedBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      await roleService.deletePermission(id, deletedBy)

      res.status(200).json({
        success: true,
        message: '权限删除成功'
      })
    } catch (error) {
      logger.error('Delete permission error:', error)
      
      if (error instanceof Error) {
        if (error.message === '权限不存在') {
          res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: error.message
            }
          })
          return
        }
        
        if (error.message.includes('正在被使用')) {
          res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: error.message
            }
          })
          return
        }
      }

      next(error)
    }
  }
}

export const roleController = new RoleController()
