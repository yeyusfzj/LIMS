import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import {
  checkInstrumentPermission,
  requireAllInstrumentPermissions,
  requireAnyInstrumentPermission,
  requireInstrumentPermission,
  InstrumentPermissions
} from '../middleware/instrumentPermissionMiddleware'
import { permissionService } from '../services/permissionService'
import { logger } from '../config/logger'

// Mock dependencies
vi.mock('../services/permissionService')
vi.mock('../config/logger')

describe('Instrument Permission Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      path: '/api/instruments',
      method: 'GET'
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
    vi.clearAllMocks()
  })

  describe('checkInstrumentPermission', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = checkInstrumentPermission('instrument', 'read')
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证,请先登录'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 403 if user does not have permission', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['普通用户']
      }

      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(false)

      const middleware = checkInstrumentPermission('instrument', 'create')
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'instrument',
        'create'
      )
      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有权限执行此操作',
          details: {
            required: 'instrument:create',
            current: ['普通用户']
          }
        }
      })
      expect(logger.warn).toHaveBeenCalledWith(
        'Instrument permission denied',
        expect.objectContaining({
          userId: 'user-123',
          username: 'testuser',
          resource: 'instrument',
          action: 'create'
        })
      )
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() if user has permission', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['设备管理员']
      }

      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = checkInstrumentPermission('instrument', 'create')
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'instrument',
        'create'
      )
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should return 500 if permission check throws error', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }

      vi.spyOn(permissionService, 'checkPermission').mockRejectedValue(
        new Error('Database error')
      )

      const middleware = checkInstrumentPermission('instrument', 'read')
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '权限验证失败'
        }
      })
      expect(logger.error).toHaveBeenCalled()
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('requireAllInstrumentPermissions', () => {
    it('should return 401 if user is not authenticated', async () => {
      const permissions = [
        { resource: 'instrument', action: 'read' },
        { resource: 'instrument', action: 'update' }
      ]
      const middleware = requireAllInstrumentPermissions(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 403 if user does not have all permissions', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }

      const permissions = [
        { resource: 'instrument', action: 'read' },
        { resource: 'instrument', action: 'update' }
      ]

      vi.spyOn(permissionService, 'checkPermission')
        .mockResolvedValueOnce(true)  // has read permission
        .mockResolvedValueOnce(false) // does not have update permission

      const middleware = requireAllInstrumentPermissions(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有足够的权限执行此操作',
          details: {
            required: ['instrument:read', 'instrument:update']
          }
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() if user has all permissions', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }

      const permissions = [
        { resource: 'instrument', action: 'read' },
        { resource: 'instrument', action: 'update' }
      ]

      vi.spyOn(permissionService, 'checkPermission')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      const middleware = requireAllInstrumentPermissions(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })
  })

  describe('requireAnyInstrumentPermission', () => {
    it('should return 401 if user is not authenticated', async () => {
      const permissions = [
        { resource: 'instrument', action: 'read' },
        { resource: 'instrument', action: 'update' }
      ]
      const middleware = requireAnyInstrumentPermission(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 403 if user does not have any permission', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }

      const permissions = [
        { resource: 'instrument', action: 'create' },
        { resource: 'instrument', action: 'delete' }
      ]

      vi.spyOn(permissionService, 'checkPermission')
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)

      const middleware = requireAnyInstrumentPermission(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有权限执行此操作',
          details: {
            required: ['instrument:create', 'instrument:delete']
          }
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should call next() if user has at least one permission', async () => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }

      const permissions = [
        { resource: 'instrument', action: 'read' },
        { resource: 'instrument', action: 'update' }
      ]

      vi.spyOn(permissionService, 'checkPermission')
        .mockResolvedValueOnce(true)  // has read permission
        .mockResolvedValueOnce(false) // does not have update permission

      const middleware = requireAnyInstrumentPermission(permissions)
      
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })
  })

  describe('requireInstrumentPermission convenience functions', () => {
    beforeEach(() => {
      (mockRequest as any).user = {
        userId: 'user-123',
        username: 'testuser'
      }
    })

    it('should check instrument create permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.createInstrument()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'instrument',
        'create'
      )
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should check transfer confirm permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.confirmTransfer()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'transfer',
        'confirm'
      )
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should check maintenance create permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.createMaintenance()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'maintenance',
        'create'
      )
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should check calibration read permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.readCalibration()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'calibration',
        'read'
      )
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should check disposal approve permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.approveDisposal()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'disposal',
        'approve'
      )
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should check document delete permission', async () => {
      vi.spyOn(permissionService, 'checkPermission').mockResolvedValue(true)

      const middleware = requireInstrumentPermission.deleteDocument()
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(permissionService.checkPermission).toHaveBeenCalledWith(
        'user-123',
        'document',
        'delete'
      )
      expect(nextFunction).toHaveBeenCalled()
    })
  })

  describe('InstrumentPermissions constants', () => {
    it('should define all instrument permissions correctly', () => {
      expect(InstrumentPermissions.INSTRUMENT_CREATE).toEqual({
        resource: 'instrument',
        action: 'create'
      })
      expect(InstrumentPermissions.TRANSFER_CONFIRM).toEqual({
        resource: 'transfer',
        action: 'confirm'
      })
      expect(InstrumentPermissions.MAINTENANCE_UPDATE).toEqual({
        resource: 'maintenance',
        action: 'update'
      })
      expect(InstrumentPermissions.CALIBRATION_DELETE).toEqual({
        resource: 'calibration',
        action: 'delete'
      })
      expect(InstrumentPermissions.DISPOSAL_APPROVE).toEqual({
        resource: 'disposal',
        action: 'approve'
      })
      expect(InstrumentPermissions.DOCUMENT_READ).toEqual({
        resource: 'document',
        action: 'read'
      })
    })
  })
})
