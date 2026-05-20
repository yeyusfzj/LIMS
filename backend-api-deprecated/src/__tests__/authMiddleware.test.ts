import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware'
import { authService } from '../services/authService'

// Mock authService
vi.mock('../services/authService')

describe('认证中间件测试', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {}
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }
    nextFunction = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('authenticate 中间件', () => {
    it('应该在缺少 Authorization 头时返回 401', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少认证令牌'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('应该在 Authorization 头格式错误时返回 401', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123'
      }

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少认证令牌'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('应该在令牌有效时验证通过并调用 next()', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }

      vi.mocked(authService.verifyToken).mockResolvedValue(mockPayload)

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token')
      expect((mockRequest as any).user).toEqual(mockPayload)
      expect(nextFunction).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('应该在令牌无效时返回 401', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      }

      vi.mocked(authService.verifyToken).mockRejectedValue(
        new Error('令牌无效或已过期')
      )

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_FAILED',
          message: '令牌无效或已过期'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('应该在令牌过期时返回 401', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      }

      vi.mocked(authService.verifyToken).mockRejectedValue(
        new Error('令牌已过期')
      )

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_FAILED',
          message: '令牌已过期'
        }
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuthenticate 中间件', () => {
    it('应该在没有令牌时继续处理请求', async () => {
      await optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(nextFunction).toHaveBeenCalled()
      expect((mockRequest as any).user).toBeUndefined()
    })

    it('应该在有有效令牌时设置用户信息', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['user']
      }

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      }

      vi.mocked(authService.verifyToken).mockResolvedValue(mockPayload)

      await optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect((mockRequest as any).user).toEqual(mockPayload)
      expect(nextFunction).toHaveBeenCalled()
    })

    it('应该在令牌无效时仍然继续处理请求', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      }

      vi.mocked(authService.verifyToken).mockRejectedValue(
        new Error('令牌无效')
      )

      await optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      expect(nextFunction).toHaveBeenCalled()
      expect((mockRequest as any).user).toBeUndefined()
    })
  })

  describe('需求验证', () => {
    it('需求 1.3: 应该验证有效的 JWT 令牌并允许访问', async () => {
      const mockPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: ['admin']
      }

      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      }

      vi.mocked(authService.verifyToken).mockResolvedValue(mockPayload)

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      // 验证令牌被正确验证
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-jwt-token')
      // 验证用户信息被附加到请求
      expect((mockRequest as any).user).toEqual(mockPayload)
      // 验证请求被允许继续
      expect(nextFunction).toHaveBeenCalled()
    })

    it('需求 1.4: 应该拒绝过期或无效的令牌', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      }

      vi.mocked(authService.verifyToken).mockRejectedValue(
        new Error('令牌已过期')
      )

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      )

      // 验证返回 401 错误
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_FAILED',
          message: '令牌已过期'
        }
      })
      // 验证请求被阻止
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })
})
