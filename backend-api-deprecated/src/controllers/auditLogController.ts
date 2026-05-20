/**
 * 审计日志控制器
 * 处理审计日志查询相关的 HTTP 请求
 */

import { Request, Response } from 'express'
import { auditLogService } from '../services/auditLogService'
import { AuditLogQuery } from '../types/auditLog'
import { logger } from '../config/logger'

export class AuditLogController {
  /**
   * 查询审计日志列表
   * GET /api/audit-logs
   */
  async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AuditLogQuery = {
        userId: req.query.userId as string,
        username: req.query.username as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        resourceId: req.query.resourceId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20
      }

      const result = await auditLogService.listAuditLogs(query)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Failed to list audit logs', { error })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '查询审计日志失败'
        }
      })
    }
  }

  /**
   * 获取审计日志详情
   * GET /api/audit-logs/:id
   */
  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const auditLog = await auditLogService.getAuditLog(id)

      if (!auditLog) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '审计日志不存在'
          }
        })
        return
      }

      res.json({
        success: true,
        data: auditLog
      })
    } catch (error) {
      logger.error('Failed to get audit log', { error, id: req.params.id })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取审计日志失败'
        }
      })
    }
  }

  /**
   * 获取资源的审计历史
   * GET /api/audit-logs/resource/:resource/:resourceId
   */
  async getResourceAuditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { resource, resourceId } = req.params

      const history = await auditLogService.getResourceAuditHistory(resource, resourceId)

      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      logger.error('Failed to get resource audit history', {
        error,
        resource: req.params.resource,
        resourceId: req.params.resourceId
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取资源审计历史失败'
        }
      })
    }
  }

  /**
   * 获取用户的操作历史
   * GET /api/audit-logs/user/:userId
   */
  async getUserAuditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100

      const history = await auditLogService.getUserAuditHistory(userId, limit)

      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      logger.error('Failed to get user audit history', {
        error,
        userId: req.params.userId
      })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取用户操作历史失败'
        }
      })
    }
  }

  /**
   * 获取审计统计
   * GET /api/audit-logs/statistics
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

      const statistics = await auditLogService.getAuditStatistics(startDate, endDate)

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Failed to get audit statistics', { error })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取审计统计失败'
        }
      })
    }
  }

  /**
   * 归档审计日志
   * POST /api/audit-logs/archive
   */
  async archiveAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { beforeDate } = req.body

      if (!beforeDate) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请提供归档日期'
          }
        })
        return
      }

      const date = new Date(beforeDate)
      if (isNaN(date.getTime())) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '无效的日期格式'
          }
        })
        return
      }

      const count = await auditLogService.archiveAuditLogs(date)

      res.json({
        success: true,
        data: {
          archivedCount: count,
          beforeDate: date
        }
      })
    } catch (error) {
      logger.error('Failed to archive audit logs', { error })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '归档审计日志失败'
        }
      })
    }
  }

  /**
   * 查询归档的审计日志
   * GET /api/audit-logs/archived
   */
  async listArchivedAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AuditLogQuery = {
        userId: req.query.userId as string,
        username: req.query.username as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        resourceId: req.query.resourceId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20
      }

      const result = await auditLogService.listArchivedAuditLogs(query)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Failed to list archived audit logs', { error })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '查询归档审计日志失败'
        }
      })
    }
  }

  /**
   * 获取归档统计信息
   * GET /api/audit-logs/archive-statistics
   */
  async getArchiveStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await auditLogService.getArchiveStatistics()

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Failed to get archive statistics', { error })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取归档统计失败'
        }
      })
    }
  }
}

// 导出控制器实例
export const auditLogController = new AuditLogController()
