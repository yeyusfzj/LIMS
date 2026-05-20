import { Request, Response, NextFunction } from 'express'
import { permissionService } from '../services/permissionService'
import { logger } from '../config/logger'

/**
 * 权限检查中间件工厂函数
 * @param resource 资源类型
 * @param action 操作类型
 * @returns Express 中间件
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户是否已认证
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未认证,请先登录'
          }
        })
        return
      }

      // 检查用户权限
      const hasPermission = await permissionService.checkPermission(
        user.userId,
        resource,
        action
      )

      if (!hasPermission) {
        // 记录权限拒绝事件
        logger.warn('Permission denied', {
          userId: user.userId,
          username: user.username,
          resource,
          action,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: '您没有权限执行此操作',
            details: {
              required: `${resource}:${action}`,
              current: user.roles || []
            }
          }
        })
        return
      }

      // 权限验证通过,继续处理请求
      next()
    } catch (error) {
      logger.error('Permission check middleware error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
    }
  }
}

/**
 * 角色检查中间件工厂函数
 * @param allowedRoles 允许的角色列表
 * @returns Express 中间件
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户是否已认证
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未认证,请先登录'
          }
        })
        return
      }

      // 获取用户角色
      const userRoles = await permissionService.getUserRoles(user.userId)

      // 检查用户是否具有所需角色
      const hasRole = allowedRoles.some(role => userRoles.includes(role))

      if (!hasRole) {
        logger.warn('Role check failed', {
          userId: user.userId,
          username: user.username,
          required: allowedRoles,
          current: userRoles,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: '您的角色不允许执行此操作',
            details: {
              required: allowedRoles,
              current: userRoles
            }
          }
        })
        return
      }

      // 角色验证通过,继续处理请求
      next()
    } catch (error) {
      logger.error('Role check middleware error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '角色验证失败'
        }
      })
    }
  }
}

/**
 * 多权限检查中间件(需要满足所有权限)
 * @param permissions 权限列表 [{resource, action}, ...]
 * @returns Express 中间件
 */
export function requireAllPermissions(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未认证,请先登录'
          }
        })
        return
      }

      // 检查所有权限
      const checks = await Promise.all(
        permissions.map(p =>
          permissionService.checkPermission(user.userId, p.resource, p.action)
        )
      )

      const hasAllPermissions = checks.every(check => check === true)

      if (!hasAllPermissions) {
        logger.warn('Multiple permissions check failed', {
          userId: user.userId,
          username: user.username,
          required: permissions,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: '您没有足够的权限执行此操作',
            details: {
              required: permissions.map(p => `${p.resource}:${p.action}`)
            }
          }
        })
        return
      }

      next()
    } catch (error) {
      logger.error('Multiple permissions check error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
    }
  }
}

/**
 * 多权限检查中间件(满足任一权限即可)
 * @param permissions 权限列表 [{resource, action}, ...]
 * @returns Express 中间件
 */
export function requireAnyPermission(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未认证,请先登录'
          }
        })
        return
      }

      // 检查所有权限
      const checks = await Promise.all(
        permissions.map(p =>
          permissionService.checkPermission(user.userId, p.resource, p.action)
        )
      )

      const hasAnyPermission = checks.some(check => check === true)

      if (!hasAnyPermission) {
        logger.warn('Any permission check failed', {
          userId: user.userId,
          username: user.username,
          required: permissions,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: '您没有权限执行此操作',
            details: {
              required: permissions.map(p => `${p.resource}:${p.action}`)
            }
          }
        })
        return
      }

      next()
    } catch (error) {
      logger.error('Any permission check error:', error)
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
    }
  }
}
