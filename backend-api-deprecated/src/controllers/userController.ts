import { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService'
import { logger } from '../config/logger'
import { UserStatus } from '@prisma/client'

export class UserController {
  /**
   * 创建用户
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const user = await userService.createUser(req.body, createdBy)

      res.status(201).json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Create user error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('已存在') || error.message.includes('已被使用')) {
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
   * 获取用户列表
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        username: req.query.username as string,
        email: req.query.email as string,
        fullName: req.query.fullName as string,
        department: req.query.department as string,
        status: req.query.status as UserStatus,
        roleId: req.query.roleId as string
      }

      const result = await userService.listUsers(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('List users error:', error)
      next(error)
    }
  }

  /**
   * 获取用户详情
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const user = await userService.getUserById(id)

      res.status(200).json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Get user error:', error)
      
      if (error instanceof Error && error.message === '用户不存在') {
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
   * 更新用户信息
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const user = await userService.updateUser(id, req.body, updatedBy)

      res.status(200).json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Update user error:', error)
      
      if (error instanceof Error) {
        if (error.message === '用户不存在') {
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
   * 更新用户状态
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { status } = req.body
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

      if (!status || !Object.values(UserStatus).includes(status)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的用户状态'
          }
        })
        return
      }

      const user = await userService.updateUserStatus(id, status, updatedBy)

      res.status(200).json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('Update user status error:', error)
      
      if (error instanceof Error && error.message === '用户不存在') {
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
   * 重置用户密码
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const resetBy = (req as any).user?.userId

      if (!resetBy) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      await userService.resetPassword(id, req.body, resetBy)

      res.status(200).json({
        success: true,
        message: '密码重置成功'
      })
    } catch (error) {
      logger.error('Reset password error:', error)
      
      if (error instanceof Error && error.message === '用户不存在') {
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
   * 删除用户
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      await userService.deleteUser(id, deletedBy)

      res.status(200).json({
        success: true,
        message: '用户删除成功'
      })
    } catch (error) {
      logger.error('Delete user error:', error)
      
      if (error instanceof Error && error.message === '用户不存在') {
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
}

export const userController = new UserController()
