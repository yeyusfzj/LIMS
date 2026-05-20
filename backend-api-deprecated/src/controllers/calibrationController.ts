// 仪器校准管理控制器

import { Request, Response, NextFunction } from 'express'
import calibrationService from '../services/calibrationService'
import { CreateCalibrationDto, UpdateCalibrationDto, CalibrationQueryDto } from '../types/instrument'
import logger from '../config/logger'

export class CalibrationController {
  /**
   * 创建校准记录
   * POST /api/instruments/:id/calibration
   */
  async createCalibration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params
      const data: CreateCalibrationDto = req.body
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
      if (!data.calibrationDate || !data.calibrationOrg || !data.calibrationResult) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '校准日期、校准机构、校准结果为必填项'
          }
        })
        return
      }

      const calibration = await calibrationService.createCalibration(instrumentId, data, userId)

      res.status(201).json({
        success: true,
        data: calibration
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
      next(error)
    }
  }

  /**
   * 获取校准记录列表
   * GET /api/calibration
   */
  async getCalibrationRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: CalibrationQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        instrumentId: req.query.instrumentId as string,
        calibrationResult: req.query.calibrationResult as any,
        calibrationOrg: req.query.calibrationOrg as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await calibrationService.getCalibrationRecords(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取仪器的校准记录
   * GET /api/instruments/:id/calibration
   */
  async getInstrumentCalibrationRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params

      const records = await calibrationService.getInstrumentCalibrationRecords(instrumentId)

      res.status(200).json({
        success: true,
        data: records
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取校准记录详情
   * GET /api/calibration/:id
   */
  async getCalibrationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const calibration = await calibrationService.getCalibrationById(id)

      if (!calibration) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CALIBRATION_NOT_FOUND',
            message: '校准记录不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: calibration
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新校准记录
   * PUT /api/calibration/:id
   */
  async updateCalibration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateCalibrationDto = req.body

      const calibration = await calibrationService.updateCalibration(id, data)

      res.status(200).json({
        success: true,
        data: calibration
      })
    } catch (error: any) {
      if (error.message === '校准记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'CALIBRATION_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 删除校准记录
   * DELETE /api/calibration/:id
   */
  async deleteCalibration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await calibrationService.deleteCalibration(id)

      res.status(200).json({
        success: true,
        message: '校准记录已删除'
      })
    } catch (error: any) {
      if (error.message === '校准记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'CALIBRATION_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 获取即将到期的校准列表
   * GET /api/calibration/expiring
   */
  async getExpiringCalibrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30

      const calibrations = await calibrationService.getExpiringCalibrations(daysAhead)

      res.status(200).json({
        success: true,
        data: calibrations
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取过期未校准的记录
   * GET /api/calibration/overdue
   */
  async getOverdueCalibrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const calibrations = await calibrationService.getOverdueCalibrations()

      res.status(200).json({
        success: true,
        data: calibrations
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取校准统计数据
   * GET /api/calibration/statistics
   */
  async getCalibrationStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const statistics = await calibrationService.getCalibrationStatistics(startDate, endDate)

      res.status(200).json({
        success: true,
        data: statistics
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new CalibrationController()
