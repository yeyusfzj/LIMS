import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import {
  requirePermission,
  requireRole,
  requireAllPermissions,
  requireAnyPermission
} from '../middleware/permissionMiddleware'
import { permissionService } from '../services/permissionService'

// Mock permissionService
vi.mock('../services/permissionService')

describe('权限中间件测试', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('requirePermission 中间件', () => {
    it('应该在用户未认证时返回 401', async () => {
      const middleware = requirePermission('sample', 'read')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证,请先登录'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('应该在用户有权限时允许访问', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }

      vi.mocked(permissionService.checkPermission).mockResolvedValue(true)

      const middleware = requirePermission('sample', 'read')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'sample',
        'read'
      )
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('应该在用户无权限时返回 403', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }
      ;(mockRequest as any).path = '/api/samples'
      ;(mockRequest as any).method = 'POST'

      vi.mocked(permissionService.checkPermission).mockResolvedValue(false)

      const middleware = requirePermission('sample', 'create')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有权限执行此操作',
          details: {
            required: 'sample:create',
            current: ['user']
          }
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('应该在权限检查出错时返回 500', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }

      vi.mocked(permissionService.checkPermission).mockRejectedValue(
        new Error('数据库错误')
      )

      const middleware = requirePermission('sample', 'read')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requireRole 中间件', () => {
    it('应该在用户具有所需角色时允许访问', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['admin']
      }

      vi.mocked(permissionService.getUserRoles).mockResolvedValue([
        'admin',
        'user'
      ])

      const middleware = requireRole('admin')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(permissionService.getUserRoles).toHaveBeenCalledWith('user-123')
      expect(nextFunction).toHaveBeenCalled()
    })

    it('应该在用户不具有所需角色时返回 403', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }
      ;(mockRequest as any).path = '/api/admin'
      ;(mockRequest as any).method = 'GET'

      vi.mocked(permissionService.getUserRoles).mockResolvedValue(['user'])

      const middleware = requireRole('admin', 'superadmin')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PERMISSION_DENIED',
          message: '您的角色不允许执行此操作',
          details: {
            required: ['admin', 'superadmin'],
            current: ['user']
          }
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requireAllPermissions 中间件', () => {
    it('应该在用户具有所有权限时允许访问', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['admin']
      }

      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      const middleware = requireAllPermissions([
        { resource: 'sample', action: 'read' },
        { resource: 'sample', action: 'update' }
      ])

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(permissionService.checkPermission).toHaveBeenCalledTimes(2)
      expect(nextFunction).toHaveBeenCalled()
    })

    it('应该在用户缺少任一权限时返回 403', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }
      ;(mockRequest as any).path = '/api/samples'
      ;(mockRequest as any).method = 'PUT'

      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const middleware = requireAllPermissions([
        { resource: 'sample', action: 'read' },
        { resource: 'sample', action: 'update' }
      ])

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requireAnyPermission 中间件', () => {
    it('应该在用户具有任一权限时允许访问', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }

      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const middleware = requireAnyPermission([
        { resource: 'sample', action: 'create' },
        { resource: 'sample', action: 'read' }
      ])

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(permissionService.checkPermission).toHaveBeenCalledTimes(2)
      expect(nextFunction).toHaveBeenCalled()
    })

    it('应该在用户不具有任何权限时返回 403', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['guest']
      }
      ;(mockRequest as any).path = '/api/samples'
      ;(mockRequest as any).method = 'GET'

      vi.mocked(permissionService.checkPermission)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)

      const middleware = requireAnyPermission([
        { resource: 'sample', action: 'create' },
        { resource: 'sample', action: 'read' }
      ])

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('需求验证', () => {
    it('需求 18.2: 应该验证用户是否具有所需权限', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['admin']
      }

      vi.mocked(permissionService.checkPermission).mockResolvedValue(true)

      const middleware = requirePermission('sample', 'delete')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      // 验证权限检查被调用
      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'sample',
        'delete'
      )
      // 验证有权限时允许访问
      expect(nextFunction).toHaveBeenCalled()
    })

    it('需求 18.2: 应该记录权限验证失败的尝试', async () => {
      ;(mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }
      ;(mockRequest as any).path = '/api/samples/delete'
      ;(mockRequest as any).method = 'DELETE'

      vi.mocked(permissionService.checkPermission).mockResolvedValue(false)

      const middleware = requirePermission('sample', 'delete')

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      // 验证返回 403 错误
      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有权限执行此操作',
          details: {
            required: 'sample:delete',
            current: ['user']
          }
        }
      })
      // 验证请求被阻止
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })
})
