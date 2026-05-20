/**
 * 仪器控制器单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response } from 'express'
import instrumentController from '../controllers/instrumentController'
import instrumentService from '../services/instrumentService'
import { InstrumentStatus } from '../types/instrument'

// Mock instrumentService
vi.mock('../services/instrumentService')

describe('InstrumentController', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: any
  let responseStatus: any

  beforeEach(() => {
    responseJson = vi.fn()
    responseStatus = vi.fn().mockReturnValue({ json: responseJson })

    mockRequest = {
      user: { userId: 'test-user-id', username: 'testuser' },
      params: {},
      query: {},
      body: {}
    }

    mockResponse = {
      status: responseStatus,
      json: responseJson
    }

    vi.clearAllMocks()
  })

  describe('createInstrument', () => {
    it('应该成功创建仪器', async () => {
      const mockInstrument = {
        id: 'test-id',
        code: 'INS-001',
        name: '测试仪器',
        status: InstrumentStatus.IN_USE,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRequest.body = {
        code: 'INS-001',
        name: '测试仪器',
        status: InstrumentStatus.IN_USE
      }

      ;(instrumentService.createInstrument as any).mockResolvedValue(mockInstrument)

      await instrumentController.createInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(201)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '仪器创建成功',
        data: mockInstrument
      })
    })

    it('应该在用户未认证时返回401', async () => {
      mockRequest.user = undefined

      await instrumentController.createInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(401)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '用户未认证'
        }
      })
    })

    it('应该在缺少必填字段时返回400', async () => {
      mockRequest.body = {
        name: '测试仪器'
      }

      await instrumentController.createInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '仪器编码和名称为必填项'
        }
      })
    })

    it('应该在编码已存在时返回409', async () => {
      mockRequest.body = {
        code: 'INS-001',
        name: '测试仪器'
      }

      ;(instrumentService.createInstrument as any).mockRejectedValue(
        new Error('仪器编码已存在')
      )

      await instrumentController.createInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(409)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSTRUMENT_CODE_EXISTS',
          message: '仪器编码已存在'
        }
      })
    })
  })

  describe('getInstruments', () => {
    it('应该成功获取仪器列表', async () => {
      const mockResult = {
        items: [
          {
            id: 'test-id-1',
            code: 'INS-001',
            name: '仪器1',
            status: InstrumentStatus.IN_USE
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1
      }

      mockRequest.query = {
        page: '1',
        pageSize: '20'
      }

      ;(instrumentService.getInstruments as any).mockResolvedValue(mockResult)

      await instrumentController.getInstruments(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '查询成功',
        data: mockResult
      })
    })
  })

  describe('getInstrumentById', () => {
    it('应该成功获取仪器详情', async () => {
      const mockInstrument = {
        id: 'test-id',
        code: 'INS-001',
        name: '测试仪器',
        status: InstrumentStatus.IN_USE,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRequest.params = { id: 'test-id' }

      ;(instrumentService.getInstrumentById as any).mockResolvedValue(mockInstrument)

      await instrumentController.getInstrumentById(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '查询成功',
        data: mockInstrument
      })
    })

    it('应该在仪器不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent-id' }

      ;(instrumentService.getInstrumentById as any).mockResolvedValue(null)

      await instrumentController.getInstrumentById(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSTRUMENT_NOT_FOUND',
          message: '仪器不存在'
        }
      })
    })
  })

  describe('updateInstrument', () => {
    it('应该成功更新仪器', async () => {
      const mockInstrument = {
        id: 'test-id',
        code: 'INS-001',
        name: '更新后的仪器',
        status: InstrumentStatus.IN_USE,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRequest.params = { id: 'test-id' }
      mockRequest.body = {
        name: '更新后的仪器'
      }

      ;(instrumentService.updateInstrument as any).mockResolvedValue(mockInstrument)

      await instrumentController.updateInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '仪器更新成功',
        data: mockInstrument
      })
    })

    it('应该在仪器不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent-id' }
      mockRequest.body = { name: '更新后的仪器' }

      ;(instrumentService.updateInstrument as any).mockRejectedValue(
        new Error('仪器不存在')
      )

      await instrumentController.updateInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(404)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSTRUMENT_NOT_FOUND',
          message: '仪器不存在'
        }
      })
    })
  })

  describe('deleteInstrument', () => {
    it('应该成功删除仪器', async () => {
      mockRequest.params = { id: 'test-id' }

      ;(instrumentService.deleteInstrument as any).mockResolvedValue(undefined)

      await instrumentController.deleteInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '仪器删除成功'
      })
    })

    it('应该在仪器不存在时返回404', async () => {
      mockRequest.params = { id: 'non-existent-id' }

      ;(instrumentService.deleteInstrument as any).mockRejectedValue(
        new Error('仪器不存在')
      )

      await instrumentController.deleteInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(404)
    })

    it('应该在存在未完成流转时返回400', async () => {
      mockRequest.params = { id: 'test-id' }

      ;(instrumentService.deleteInstrument as any).mockRejectedValue(
        new Error('该仪器存在未完成的流转记录，无法删除')
      )

      await instrumentController.deleteInstrument(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DELETION_NOT_ALLOWED',
          message: '该仪器存在未完成的流转记录，无法删除'
        }
      })
    })
  })

  describe('updateInstrumentStatus', () => {
    it('应该成功更新仪器状态', async () => {
      const mockInstrument = {
        id: 'test-id',
        code: 'INS-001',
        name: '测试仪器',
        status: InstrumentStatus.MAINTENANCE,
        createdBy: 'test-user-id',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRequest.params = { id: 'test-id' }
      mockRequest.body = { status: InstrumentStatus.MAINTENANCE }

      ;(instrumentService.updateInstrumentStatus as any).mockResolvedValue(mockInstrument)

      await instrumentController.updateInstrumentStatus(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '仪器状态更新成功',
        data: mockInstrument
      })
    })

    it('应该在状态为空时返回400', async () => {
      mockRequest.params = { id: 'test-id' }
      mockRequest.body = {}

      await instrumentController.updateInstrumentStatus(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '状态不能为空'
        }
      })
    })
  })

  describe('batchDeleteInstruments', () => {
    it('应该成功批量删除仪器', async () => {
      const mockResult = {
        success: 2,
        failed: 0,
        errors: []
      }

      mockRequest.body = {
        ids: ['id-1', 'id-2']
      }

      ;(instrumentService.batchDeleteInstruments as any).mockResolvedValue(mockResult)

      await instrumentController.batchDeleteInstruments(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '批量删除完成: 成功2个, 失败0个',
        data: mockResult
      })
    })

    it('应该在ids为空时返回400', async () => {
      mockRequest.body = {}

      await instrumentController.batchDeleteInstruments(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(400)
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请提供要删除的仪器ID列表'
        }
      })
    })
  })

  describe('validateInstrumentCode', () => {
    it('应该验证编码可用', async () => {
      mockRequest.params = { code: 'INS-NEW' }
      mockRequest.query = {}

      ;(instrumentService.validateInstrumentCode as any).mockResolvedValue(true)

      await instrumentController.validateInstrumentCode(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '验证完成',
        data: {
          code: 'INS-NEW',
          isValid: true,
          message: '编码可用'
        }
      })
    })

    it('应该验证编码已存在', async () => {
      mockRequest.params = { code: 'INS-001' }
      mockRequest.query = {}

      ;(instrumentService.validateInstrumentCode as any).mockResolvedValue(false)

      await instrumentController.validateInstrumentCode(
        mockRequest as Request,
        mockResponse as Response
      )

      expect(responseStatus).toHaveBeenCalledWith(200)
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        message: '验证完成',
        data: {
          code: 'INS-001',
          isValid: false,
          message: '编码已存在'
        }
      })
    })
  })
})
