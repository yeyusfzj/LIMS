import { Request, Response, NextFunction } from 'express'
import { instrumentStatisticsService } from '../services/instrumentStatisticsService'
import logger from '../config/logger'

/**
 * 仪器统计控制器
 * 处理仪器统计分析相关的HTTP请求
 */
export class InstrumentStatisticsController {
  /**
   * 获取仪器状态统计
   */
  async getStatusStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await instrumentStatisticsService.getStatusStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get status statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取仪器价值统计
   */
  async getValueStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await instrumentStatisticsService.getValueStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get value statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取使用年限分布
   */
  async getUsageYearsDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distribution = await instrumentStatisticsService.getUsageYearsDistribution()

      res.json({
        success: true,
        data: distribution
      })
    } catch (error) {
      logger.error('Get usage years distribution failed', { error })
      next(error)
    }
  }

  /**
   * 获取校准到期统计
   */
  async getCalibrationExpiryStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await instrumentStatisticsService.getCalibrationExpiryStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get calibration expiry statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取维护频率统计
   */
  async getMaintenanceFrequencyStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
      const statistics = await instrumentStatisticsService.getMaintenanceFrequencyStatistics(limit)

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get maintenance frequency statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取综合统计数据
   */
  async getOverallStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await instrumentStatisticsService.getOverallStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get overall statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取部门仪器统计
   */
  async getDepartmentStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statistics = await instrumentStatisticsService.getDepartmentStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Get department statistics failed', { error })
      next(error)
    }
  }

  /**
   * 获取即将到期的校准列表
   */
  async getExpiringCalibrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30
      const calibrations = await instrumentStatisticsService.getExpiringCalibrations(days)

      res.json({
        success: true,
        data: calibrations
      })
    } catch (error) {
      logger.error('Get expiring calibrations failed', { error })
      next(error)
    }
  }
}

export const instrumentStatisticsController = new InstrumentStatisticsController()
