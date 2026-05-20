// 仪器维护管理控制器

import { Request, Response, NextFunction } from 'express'
import maintenanceService from '../services/maintenanceService'
import { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceQueryDto } from '../types/instrument'
import logger from '../config/logger'

export class MaintenanceController {
  /**
   * 创建维护记录
   * POST /api/instruments/:id/maintenance
   */
  async createMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params
      const data: CreateMaintenanceDto = req.body
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
      if (!data.maintenanceDate || !data.maintenanceType || !data.maintenanceContent || !data.maintenancePerson) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '维护日期、维护类型、维护内容、维护人员为必填项'
          }
        })
        return
      }

      const maintenance = await maintenanceService.createMaintenance(instrumentId, data, userId)

      res.status(201).json({
        success: true,
        data: maintenance
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
   * 获取维护记录列表
   * GET /api/maintenance
   */
  async getMaintenanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: MaintenanceQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        instrumentId: req.query.instrumentId as string,
        maintenanceType: req.query.maintenanceType as any,
        maintenancePerson: req.query.maintenancePerson as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await maintenanceService.getMaintenanceRecords(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取仪器的维护记录
   * GET /api/instruments/:id/maintenance
   */
  async getInstrumentMaintenanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params

      const records = await maintenanceService.getInstrumentMaintenanceRecords(instrumentId)

      res.status(200).json({
        success: true,
        data: records
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取维护记录详情
   * GET /api/maintenance/:id
   */
  async getMaintenanceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const maintenance = await maintenanceService.getMaintenanceById(id)

      if (!maintenance) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MAINTENANCE_NOT_FOUND',
            message: '维护记录不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: maintenance
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新维护记录
   * PUT /api/maintenance/:id
   */
  async updateMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateMaintenanceDto = req.body

      const maintenance = await maintenanceService.updateMaintenance(id, data)

      res.status(200).json({
        success: true,
        data: maintenance
      })
    } catch (error: any) {
      if (error.message === '维护记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'MAINTENANCE_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 删除维护记录
   * DELETE /api/maintenance/:id
   */
  async deleteMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await maintenanceService.deleteMaintenance(id)

      res.status(200).json({
        success: true,
        message: '维护记录已删除'
      })
    } catch (error: any) {
      if (error.message === '维护记录不存在') {
        res.status(404).json({
          success: false,
          error: {
            code: 'MAINTENANCE_NOT_FOUND',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 获取维护提醒列表
   * GET /api/maintenance/reminders
   */
  async getMaintenanceReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30

      const reminders = await maintenanceService.getMaintenanceReminders(daysAhead)

      res.status(200).json({
        success: true,
        data: reminders
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取过期未维护的记录
   * GET /api/maintenance/overdue
   */
  async getOverdueMaintenanceRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overdueRecords = await maintenanceService.getOverdueMaintenanceRecords()

      res.status(200).json({
        success: true,
        data: overdueRecords
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取维护统计数据
   * GET /api/maintenance/statistics
   */
  async getMaintenanceStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const statistics = await maintenanceService.getMaintenanceStatistics(startDate, endDate)

      res.status(200).json({
        success: true,
        data: statistics
      })
    } catch (error) {
      next(error)
    }
  }
}

export default new MaintenanceController()
