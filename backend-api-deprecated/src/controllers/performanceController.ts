import { Request, Response } from 'express'
import performanceMonitorService from '../services/performanceMonitorService'
import databaseMonitorService from '../services/databaseMonitorService'
import logger from '../config/logger'

/**
 * 性能监控控制器
 */
class PerformanceController {
  /**
   * 获取性能统计数据
   */
  async getPerformanceStats(req: Request, res: Response): Promise<void> {
    try {
      const { startTime, endTime } = req.query

      const start = startTime ? new Date(startTime as string) : undefined
      const end = endTime ? new Date(endTime as string) : undefined

      const stats = await performanceMonitorService.getPerformanceStats(start, end)

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      logger.error('Failed to get performance stats', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_STATS_ERROR',
          message: '获取性能统计失败'
        }
      })
    }
  }

  /**
   * 获取慢请求列表
   */
  async getSlowRequests(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100

      const slowRequests = await performanceMonitorService.getSlowRequests(limit)

      res.json({
        success: true,
        data: slowRequests,
        total: slowRequests.length
      })
    } catch (error) {
      logger.error('Failed to get slow requests', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'SLOW_REQUESTS_ERROR',
          message: '获取慢请求列表失败'
        }
      })
    }
  }

  /**
   * 获取慢查询列表
   */
  async getSlowQueries(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100

      const slowQueries = await performanceMonitorService.getSlowQueries(limit)

      res.json({
        success: true,
        data: slowQueries,
        total: slowQueries.length
      })
    } catch (error) {
      logger.error('Failed to get slow queries', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'SLOW_QUERIES_ERROR',
          message: '获取慢查询列表失败'
        }
      })
    }
  }

  /**
   * 获取路径性能统计
   */
  async getPathStats(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50

      const pathStats = await performanceMonitorService.getPathStats(limit)

      res.json({
        success: true,
        data: pathStats,
        total: pathStats.length
      })
    } catch (error) {
      logger.error('Failed to get path stats', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'PATH_STATS_ERROR',
          message: '获取路径统计失败'
        }
      })
    }
  }

  /**
   * 获取数据库性能概览
   */
  async getDatabasePerformance(req: Request, res: Response): Promise<void> {
    try {
      const overview = await databaseMonitorService.getPerformanceOverview()

      res.json({
        success: true,
        data: overview
      })
    } catch (error) {
      logger.error('Failed to get database performance', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_PERFORMANCE_ERROR',
          message: '获取数据库性能概览失败'
        }
      })
    }
  }

  /**
   * 获取性能监控配置
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = performanceMonitorService.getConfig()

      res.json({
        success: true,
        data: config
      })
    } catch (error) {
      logger.error('Failed to get performance config', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: '获取配置失败'
        }
      })
    }
  }

  /**
   * 更新性能监控配置
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body

      performanceMonitorService.updateConfig(config)

      res.json({
        success: true,
        message: '配置更新成功',
        data: performanceMonitorService.getConfig()
      })
    } catch (error) {
      logger.error('Failed to update performance config', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_UPDATE_ERROR',
          message: '更新配置失败'
        }
      })
    }
  }

  /**
   * 清除性能数据
   */
  async clearData(req: Request, res: Response): Promise<void> {
    try {
      await performanceMonitorService.clearAllData()

      res.json({
        success: true,
        message: '性能数据已清除'
      })
    } catch (error) {
      logger.error('Failed to clear performance data', { error })
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_DATA_ERROR',
          message: '清除数据失败'
        }
      })
    }
  }
}

export default new PerformanceController()
