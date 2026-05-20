import { Request, Response, NextFunction } from 'express'
import { permissionService } from '../services/permissionService'
import { logger } from '../config/logger'

/**
 * 仪器管理权限定义
 * 定义所有仪器管理相关的权限资源和操作
 */
export const InstrumentPermissions = {
  // 仪器管理权限
  INSTRUMENT_CREATE: { resource: 'instrument', action: 'create' },
  INSTRUMENT_READ: { resource: 'instrument', action: 'read' },
  INSTRUMENT_UPDATE: { resource: 'instrument', action: 'update' },
  INSTRUMENT_DELETE: { resource: 'instrument', action: 'delete' },

  // 流转管理权限
  TRANSFER_CREATE: { resource: 'transfer', action: 'create' },
  TRANSFER_READ: { resource: 'transfer', action: 'read' },
  TRANSFER_CONFIRM: { resource: 'transfer', action: 'confirm' },
  TRANSFER_REJECT: { resource: 'transfer', action: 'reject' },

  // 维护管理权限
  MAINTENANCE_CREATE: { resource: 'maintenance', action: 'create' },
  MAINTENANCE_READ: { resource: 'maintenance', action: 'read' },
  MAINTENANCE_UPDATE: { resource: 'maintenance', action: 'update' },
  MAINTENANCE_DELETE: { resource: 'maintenance', action: 'delete' },

  // 校准管理权限
  CALIBRATION_CREATE: { resource: 'calibration', action: 'create' },
  CALIBRATION_READ: { resource: 'calibration', action: 'read' },
  CALIBRATION_UPDATE: { resource: 'calibration', action: 'update' },
  CALIBRATION_DELETE: { resource: 'calibration', action: 'delete' },

  // 报废管理权限
  DISPOSAL_CREATE: { resource: 'disposal', action: 'create' },
  DISPOSAL_READ: { resource: 'disposal', action: 'read' },
  DISPOSAL_APPROVE: { resource: 'disposal', action: 'approve' },

  // 文档管理权限
  DOCUMENT_CREATE: { resource: 'document', action: 'create' },
  DOCUMENT_READ: { resource: 'document', action: 'read' },
  DOCUMENT_DELETE: { resource: 'document', action: 'delete' }
} as const

/**
 * 仪器管理权限检查中间件工厂函数
 * @param resource 资源类型
 * @param action 操作类型
 * @returns Express 中间件
 */
export function checkInstrumentPermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 检查用户是否已认证
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          success: false,
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
        logger.warn('Instrument permission denied', {
          userId: user.userId,
          username: user.username,
          resource,
          action,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          success: false,
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
      logger.error('Instrument permission check middleware error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
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
export function requireAllInstrumentPermissions(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          success: false,
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
        logger.warn('Multiple instrument permissions check failed', {
          userId: user.userId,
          username: user.username,
          required: permissions,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          success: false,
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
      logger.error('Multiple instrument permissions check error:', error)
      res.status(500).json({
        success: false,
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
export function requireAnyInstrumentPermission(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user
      if (!user || !user.userId) {
        res.status(401).json({
          success: false,
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
        logger.warn('Any instrument permission check failed', {
          userId: user.userId,
          username: user.username,
          required: permissions,
          path: req.path,
          method: req.method
        })

        res.status(403).json({
          success: false,
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
      logger.error('Any instrument permission check error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
    }
  }
}

/**
 * 便捷的权限检查函数
 * 使用预定义的权限常量
 */
export const requireInstrumentPermission = {
  // 仪器管理
  createInstrument: () => checkInstrumentPermission('instrument', 'create'),
  readInstrument: () => checkInstrumentPermission('instrument', 'read'),
  updateInstrument: () => checkInstrumentPermission('instrument', 'update'),
  deleteInstrument: () => checkInstrumentPermission('instrument', 'delete'),

  // 流转管理
  createTransfer: () => checkInstrumentPermission('transfer', 'create'),
  readTransfer: () => checkInstrumentPermission('transfer', 'read'),
  confirmTransfer: () => checkInstrumentPermission('transfer', 'confirm'),
  rejectTransfer: () => checkInstrumentPermission('transfer', 'reject'),

  // 维护管理
  createMaintenance: () => checkInstrumentPermission('maintenance', 'create'),
  readMaintenance: () => checkInstrumentPermission('maintenance', 'read'),
  updateMaintenance: () => checkInstrumentPermission('maintenance', 'update'),
  deleteMaintenance: () => checkInstrumentPermission('maintenance', 'delete'),

  // 校准管理
  createCalibration: () => checkInstrumentPermission('calibration', 'create'),
  readCalibration: () => checkInstrumentPermission('calibration', 'read'),
  updateCalibration: () => checkInstrumentPermission('calibration', 'update'),
  deleteCalibration: () => checkInstrumentPermission('calibration', 'delete'),

  // 报废管理
  createDisposal: () => checkInstrumentPermission('disposal', 'create'),
  readDisposal: () => checkInstrumentPermission('disposal', 'read'),
  approveDisposal: () => checkInstrumentPermission('disposal', 'approve'),

  // 文档管理
  createDocument: () => checkInstrumentPermission('document', 'create'),
  readDocument: () => checkInstrumentPermission('document', 'read'),
  deleteDocument: () => checkInstrumentPermission('document', 'delete')
}
