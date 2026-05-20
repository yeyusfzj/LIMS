/**
 * 报告生成控制器
 */

import { Request, Response, NextFunction } from 'express'
import reportService from '../services/reportService'
import logger from '../config/logger'

export class ReportController {
  /**
   * 生成报告
   */
  async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const result = await reportService.generateReport(req.body, userId)

      if (result.preview) {
        res.json({
          message: '报告预览生成成功',
          data: {
            content: result.content,
            preview: true
          }
        })
      } else {
        res.status(201).json({
          message: '报告生成成功',
          data: {
            id: result.reportId,
            reportId: result.reportId,
            reportNumber: result.reportNumber,
            content: result.content,
            preview: false
          }
        })
      }
    } catch (error: any) {
      logger.error('生成报告失败', { error, body: req.body })
      next(error)
    }
  }

  /**
   * 预览报告
   */
  async previewReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { id } = req.params
      const { sampleId, templateId } = req.query

      if (!sampleId || !templateId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '缺少必需参数: sampleId 和 templateId'
          }
        })
      }

      const result = await reportService.generateReport(
        {
          sampleId: sampleId as string,
          templateId: templateId as string,
          preview: true
        },
        userId
      )

      res.json({
        message: '报告预览生成成功',
        data: {
          content: result.content
        }
      })
    } catch (error: any) {
      logger.error('预览报告失败', { error, params: req.params, query: req.query })
      next(error)
    }
  }

  /**
   * 获取报告详情
   */
  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const report = await reportService.getReport(id)

      res.json({
        data: report
      })
    } catch (error: any) {
      logger.error('获取报告详情失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 查询报告列表
   */
  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        sampleId: req.query.sampleId as string,
        status: req.query.status as any,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : 20
      }

      const result = await reportService.listReports(query)

      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      })
    } catch (error: any) {
      logger.error('查询报告列表失败', { error, query: req.query })
      next(error)
    }
  }

  /**
   * 更新报告状态
   */
  async updateReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const { status } = req.body
      const userId = (req as any).user?.userId

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const report = await reportService.updateReportStatus(id, status, userId)

      res.json({
        message: '报告状态已更新',
        data: report
      })
    } catch (error: any) {
      logger.error('更新报告状态失败', {
        error,
        id: req.params.id,
        body: req.body
      })
      next(error)
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const userId = (req as any).user?.userId

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      await reportService.deleteReport(id, userId)

      res.json({
        message: '报告已删除'
      })
    } catch (error: any) {
      logger.error('删除报告失败', { error, id: req.params.id })
      next(error)
    }
  }

  /**
   * 分发报告
   */
  async distributeReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { id } = req.params
      const { method, recipient, recipientEmail } = req.body

      const result = await reportService.distributeReport(
        {
          reportId: id,
          method,
          recipient,
          recipientEmail
        },
        userId
      )

      res.status(201).json({
        message: '报告分发成功',
        data: result
      })
    } catch (error: any) {
      logger.error('分发报告失败', { error, params: req.params, body: req.body })
      next(error)
    }
  }

  /**
   * 回收报告
   */
  async recallReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { id } = req.params
      const { reason } = req.body

      const result = await reportService.recallReport(
        { reportId: id, reason },
        userId
      )

      res.json({
        message: '报告回收成功',
        data: result
      })
    } catch (error: any) {
      logger.error('回收报告失败', { error, id: req.params.id, body: req.body })
      next(error)
    }
  }

  /**
   * 获取分发历史
   */
  async getDistributionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        reportId: req.query.reportId as string,
        method: req.query.method as any,
        status: req.query.status as any,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : 20
      }

      const result = await reportService.getDistributionHistory(query)

      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      })
    } catch (error: any) {
      logger.error('获取分发历史失败', { error, query: req.query })
      next(error)
    }
  }

  /**
   * 获取报告的分发记录
   */
  async getReportDistributions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const distributions = await reportService.getReportDistributions(id)

      res.json({
        data: distributions
      })
    } catch (error: any) {
      logger.error('获取报告分发记录失败', { error, id: req.params.id })
      next(error)
    }
  }
}

export default new ReportController()
