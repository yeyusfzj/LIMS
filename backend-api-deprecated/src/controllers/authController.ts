import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'
import { loginSchema, refreshTokenSchema } from '../validators/authValidator'
import { logger } from '../config/logger'

export class AuthController {
  /**
   * 用户登录
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = loginSchema.validate(req.body)
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.details.map(d => ({
              field: d.path.join('.'),
              message: d.message
            }))
          }
        })
        return
      }

      // 执行登录
      const result = await authService.login(value)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Login error:', error)
      res.status(401).json({
        error: {
          code: 'AUTH_FAILED',
          message: error instanceof Error ? error.message : '登录失败'
        }
      })
    }
  }

  /**
   * 刷新令牌
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = refreshTokenSchema.validate(req.body)
      if (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.details.map(d => ({
              field: d.path.join('.'),
              message: d.message
            }))
          }
        })
        return
      }

      // 刷新令牌
      const result = await authService.refreshToken(value.refreshToken)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Token refresh error:', error)
      res.status(401).json({
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: error instanceof Error ? error.message : '令牌刷新失败'
        }
      })
    }
  }

  /**
   * 用户登出
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 从请求中获取用户信息（由认证中间件注入）
      const userId = (req as any).user?.userId
      const token = req.headers.authorization?.replace('Bearer ', '')

      if (!userId || !token) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      // 执行登出
      await authService.logout(userId, token)

      res.status(200).json({
        success: true,
        message: '登出成功'
      })
    } catch (error) {
      logger.error('Logout error:', error)
      res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: error instanceof Error ? error.message : '登出失败'
        }
      })
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的请求'
          }
        })
        return
      }

      // 查询用户信息
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          department: true,
          position: true,
          phone: true,
          status: true,
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: {
          ...user,
          roles: user.roles.map(ur => ur.role.name)
        }
      })
    } catch (error) {
      logger.error('Get current user error:', error)
      next(error)
    }
  }
}

export const authController = new AuthController()
