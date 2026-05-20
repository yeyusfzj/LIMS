// 增强的样品控制器 - 支持游标分页和字段选择

import { Request, Response } from 'express'
import enhancedSampleService, { EnhancedSampleQuery } from '../services/enhancedSampleService'
import logger from '../config/logger'

class EnhancedSampleController {
  /**
   * 查询样品列表（偏移分页）
   * GET /api/samples?page=1&pageSize=20&fields=id,barcode,sampleName&sortBy=createdAt&sortOrder=desc
   */
  async listSamplesOffset(req: Request, res: Response): Promise<void> {
    try {
      const query: EnhancedSampleQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        fields: req.query.fields as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        barcode: req.query.barcode as string,
        sampleNumber: req.query.sampleNumber as string,
        clientName: req.query.clientName as string,
        sampleType: req.query.sampleType as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }

      const result = await enhancedSampleService.listSamplesWithOffset(query)

      res.status(200).json({
        message: '查询成功',
        data: result,
        pagination: {
          type: 'offset',
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage
        }
      })
    } catch (error: any) {
      logger.error('Error listing samples with offset pagination', { error: error.message })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '查询样品列表失败',
          details: error.message
        }
      })
    }
  }

  /**
   * 查询样品列表（游标分页）
   * GET /api/samples/cursor?limit=20&cursor=xxx&fields=id,barcode,sampleName
   */
  async listSamplesCursor(req: Request, res: Response): Promise<void> {
    try {
      const query: EnhancedSampleQuery = {
        cursor: req.query.cursor as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        fields: req.query.fields as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        barcode: req.query.barcode as string,
        sampleNumber: req.query.sampleNumber as string,
        clientName: req.query.clientName as string,
        sampleType: req.query.sampleType as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }

      const result = await enhancedSampleService.listSamplesWithCursor(query)

      res.status(200).json({
        message: '查询成功',
        data: result,
        pagination: {
          type: 'cursor',
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          total: result.total
        }
      })
    } catch (error: any) {
      logger.error('Error listing samples with cursor pagination', { error: error.message })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '查询样品列表失败',
          details: error.message
        }
      })
    }
  }

  /**
   * 获取样品详情（支持字段选择）
   * GET /api/samples/:id?fields=id,barcode,sampleName,status
   */
  async getSampleWithFields(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const fields = req.query.fields as string

      const sample = await enhancedSampleService.getSampleWithFields(id, fields)

      if (!sample) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '样品不存在'
          }
        })
        return
      }

      res.status(200).json({
        message: '查询成功',
        data: sample
      })
    } catch (error: any) {
      logger.error('Error getting sample with fields', { error: error.message })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取样品详情失败',
          details: error.message
        }
      })
    }
  }

  /**
   * 批量获取样品（支持字段选择）
   * POST /api/samples/batch
   * Body: { ids: ["id1", "id2"], fields: "id,barcode,sampleName" }
   */
  async getSamplesByIds(req: Request, res: Response): Promise<void> {
    try {
      const { ids, fields } = req.body

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ids 必须是非空数组'
          }
        })
        return
      }

      if (ids.length > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '一次最多查询 100 个样品'
          }
        })
        return
      }

      const samples = await enhancedSampleService.getSamplesByIds(ids, fields)

      res.status(200).json({
        message: '查询成功',
        data: samples,
        count: samples.length
      })
    } catch (error: any) {
      logger.error('Error getting samples by IDs', { error: error.message })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '批量获取样品失败',
          details: error.message
        }
      })
    }
  }
}

export default new EnhancedSampleController()
