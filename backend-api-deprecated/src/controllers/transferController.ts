// 仪器流转管理控制器

import { Request, Response, NextFunction } from 'express'
import transferService from '../services/transferService'
import { CreateTransferDto, TransferQueryDto } from '../types/instrument'
import logger from '../config/logger'

export class TransferController {
  /**
   * 创建流转申请
   * POST /api/instruments/:id/transfers
   */
  async createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params
      const data: CreateTransferDto = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      // 验证必填字段
      if (!data.fromDepartment || !data.toDepartment || !data.fromResponsible || !data.toResponsible) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '源部门、目标部门、源负责人、目标负责人为必填项'
          }
        })
        return
      }

      const transfer = await transferService.createTransfer(instrumentId, data, userId)

      res.status(201).json({
        success: true,
        data: transfer
      })
    } catch (error: any) {
      if (error.message === '仪器不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'INSTRUMENT_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('不能进行流转') || error.message.includes('未完成的流转记录')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_ALLOWED',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 获取流转列表
   * GET /api/transfers
   */
  async getTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: TransferQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        instrumentId: req.query.instrumentId as string,
        status: req.query.status as any,
        fromDepartment: req.query.fromDepartment as string,
        toDepartment: req.query.toDepartment as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await transferService.getTransfers(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取仪器的流转历史
   * GET /api/instruments/:id/transfers
   */
  async getInstrumentTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params

      const transfers = await transferService.getInstrumentTransfers(instrumentId)

      res.status(200).json({
        success: true,
        data: transfers
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取流转详情
   * GET /api/transfers/:id
   */
  async getTransferById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const transfer = await transferService.getTransferById(id)

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_FOUND',
            message: '流转记录不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: transfer
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 确认流转
   * PUT /api/transfers/:id/confirm
   */
  async confirmTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const transfer = await transferService.confirmTransfer(id, userId)

      res.status(200).json({
        success: true,
        data: transfer
      })
    } catch (error: any) {
      if (error.message === '流转记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只能确认')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSFER_STATUS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 拒绝流转
   * PUT /api/transfers/:id/reject
   */
  async rejectTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { rejectionReason } = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const transfer = await transferService.rejectTransfer(id, userId, rejectionReason)

      res.status(200).json({
        success: true,
        data: transfer
      })
    } catch (error: any) {
      if (error.message === '流转记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只能拒绝')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSFER_STATUS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 完成流转（归还）
   * PUT /api/transfers/:id/complete
   */
  async completeTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const transfer = await transferService.completeTransfer(id)

      res.status(200).json({
        success: true,
        data: transfer
      })
    } catch (error: any) {
      if (error.message === '流转记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只能完成')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSFER_STATUS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 取消流转
   * PUT /api/transfers/:id/cancel
   */
  async cancelTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const transfer = await transferService.cancelTransfer(id, userId)

      res.status(200).json({
        success: true,
        data: transfer
      })
    } catch (error: any) {
      if (error.message === '流转记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TRANSFER_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只有创建人') || error.message.includes('只能取消')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }
}

export default new TransferController()
