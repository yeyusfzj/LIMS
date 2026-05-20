// 仪器报废管理控制器

import { Request, Response, NextFunction } from 'express'
import disposalService from '../services/disposalService'
import { CreateDisposalDto, DisposalQueryDto } from '../types/instrument'
import logger from '../config/logger'

export class DisposalController {
  /**
   * 创建报废申请
   * POST /api/instruments/:id/disposal
   */
  async createDisposal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params
      const data: CreateDisposalDto = req.body
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
      if (!data.disposalReason) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '报废原因为必填项'
          }
        })
        return
      }

      const disposal = await disposalService.createDisposal(instrumentId, data, userId)

      res.status(201).json({
        success: true,
        data: disposal
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
      if (error.message.includes('已有报废记录') || error.message.includes('未完成的流转记录') || error.message.includes('已报废')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DISPOSAL_NOT_ALLOWED',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 获取报废申请列表
   * GET /api/disposals
   */
  async getDisposals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: DisposalQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        status: req.query.status as any,
        instrumentId: req.query.instrumentId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await disposalService.getDisposals(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取报废申请详情
   * GET /api/disposals/:id
   */
  async getDisposalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const disposal = await disposalService.getDisposalById(id)

      if (!disposal) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DISPOSAL_NOT_FOUND',
            message: '报废记录不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: disposal
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 批准报废申请
   * PUT /api/disposals/:id/approve
   */
  async approveDisposal(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const disposal = await disposalService.approveDisposal(id, userId)

      res.status(200).json({
        success: true,
        data: disposal
      })
    } catch (error: any) {
      if (error.message === '报废记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DISPOSAL_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只能批准')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DISPOSAL_STATUS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 拒绝报废申请
   * PUT /api/disposals/:id/reject
   */
  async rejectDisposal(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const disposal = await disposalService.rejectDisposal(id, userId, rejectionReason)

      res.status(200).json({
        success: true,
        data: disposal
      })
    } catch (error: any) {
      if (error.message === '报废记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DISPOSAL_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      if (error.message.includes('只能拒绝')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DISPOSAL_STATUS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 取消报废申请
   * PUT /api/disposals/:id/cancel
   */
  async cancelDisposal(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const disposal = await disposalService.cancelDisposal(id, userId)

      res.status(200).json({
        success: true,
        data: disposal
      })
    } catch (error: any) {
      if (error.message === '报废记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'DISPOSAL_NOT_FOUND',
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

  /**
   * 获取报废统计数据
   * GET /api/disposals/statistics
   */
  async getDisposalStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const statistics = await disposalService.getDisposalStatistics(startDate, endDate)

      res.status(200).json({
        success: true,
        data: statistics
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new DisposalController()
