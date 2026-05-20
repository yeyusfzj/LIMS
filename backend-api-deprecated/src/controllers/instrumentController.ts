// 仪器管理控制器

import { Request, Response, NextFunction } from 'express'
import instrumentService from '../services/instrumentService'
import { instrumentExportService } from '../services/instrumentExportService'
import { CreateInstrumentDto, UpdateInstrumentDto, InstrumentQueryDto } from '../types/instrument'
import logger from '../config/logger'

export class InstrumentController {
  /**
   * 创建仪器
   * POST /api/instruments
   */
  async createInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateInstrumentDto = req.body
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
      if (!data.code || !data.name) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '仪器编码和名称为必填项'
          }
        })
        return
      }

      const instrument = await instrumentService.createInstrument(data, userId)

      res.status(201).json({
        success: true,
        data: instrument
      })
    } catch (error: any) {
      if (error.message === '仪器编码已存在') {
        res.status(409).json({
          success: false,
          error: {
            code: 'INSTRUMENT_CODE_EXISTS',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }

  /**
   * 获取仪器列表
   * GET /api/instruments
   */
  async getInstruments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: InstrumentQueryDto = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        code: req.query.code as string,
        name: req.query.name as string,
        status: req.query.status as any,
        department: req.query.department as string,
        location: req.query.location as string,
        manufacturer: req.query.manufacturer as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }

      const result = await instrumentService.getInstruments(query)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取仪器详情
   * GET /api/instruments/:id
   */
  async getInstrumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const instrument = await instrumentService.getInstrumentById(id)

      if (!instrument) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INSTRUMENT_NOT_FOUND',
            message: '仪器不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: instrument
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 通过编码获取仪器
   * GET /api/instruments/code/:code
   */
  async getInstrumentByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params

      const instrument = await instrumentService.getInstrumentByCode(code)

      if (!instrument) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INSTRUMENT_NOT_FOUND',
            message: '仪器不存在'
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: instrument
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新仪器信息
   * PUT /api/instruments/:id
   */
  async updateInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const data: UpdateInstrumentDto = req.body

      const instrument = await instrumentService.updateInstrument(id, data)

      res.status(200).json({
        success: true,
        data: instrument
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
   * 删除仪器
   * DELETE /api/instruments/:id
   */
  async deleteInstrument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await instrumentService.deleteInstrument(id)

      res.status(200).json({
        success: true,
        message: '仪器已删除'
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
      if (error.message.includes('未完成的流转记录')) {
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
   * 批量删除仪器
   * POST /api/instruments/batch-delete
   */
  async batchDeleteInstruments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ids } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请提供要删除的仪器ID列表'
          }
        })
        return
      }

      const result = await instrumentService.batchDeleteInstruments(ids)

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取仪器统计数据
   * GET /api/instruments/statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 这个方法将在统计服务中实现
      // 暂时返回空数据
      res.status(200).json({
        success: true,
        data: {
          totalCount: 0,
          statusDistribution: {},
          departmentDistribution: {},
          totalValue: 0
        }
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 导出仪器数据
   * POST /api/instruments/export
   */
  async exportInstruments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { format, filters, includeTransfers, includeMaintenance, includeCalibration } = req.body

      // 验证格式
      if (!format || !['excel', 'csv'].includes(format)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '导出格式必须是 excel 或 csv'
          }
        })
        return
      }

      // 执行导出
      const result = await instrumentExportService.exportInstruments({
        format,
        filters,
        includeTransfers: includeTransfers || false,
        includeMaintenance: includeMaintenance || false,
        includeCalibration: includeCalibration || false
      })

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Export instruments failed', { error })
      next(error)
    }
  }

  /**
   * 下载导出文件
   * GET /api/instruments/export/:fileName
   */
  async downloadExportFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileName } = req.params
      const filePath = `${process.cwd()}/exports/${fileName}`

      // 检查文件是否存在
      const fs = require('fs')
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        })
        return
      }

      // 设置响应头
      const ext = fileName.split('.').pop()
      const contentType = ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
      
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)

      // 发送文件
      res.sendFile(filePath)
    } catch (error) {
      logger.error('Download export file failed', { error })
      next(error)
    }
  }

  /**
   * 验证仪器编码唯一性
   * GET /api/instruments/validate-code/:code
   */
  async validateInstrumentCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params
      const { excludeId } = req.query

      const isValid = await instrumentService.validateInstrumentCode(code, excludeId as string)

      res.status(200).json({
        success: true,
        data: {
          isValid,
          message: isValid ? '编码可用' : '编码已存在'
        }
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新仪器状态
   * PUT /api/instruments/:id/status
   */
  async updateInstrumentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params
      const { status } = req.body

      if (!status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '状态为必填项'
          }
        })
        return
      }

      const instrument = await instrumentService.updateInstrumentStatus(id, status)

      res.status(200).json({
        success: true,
        data: instrument
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
      if (error.message.includes('状态转换')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: error.message
          }
        })
        return
      }
      next(error)
    }
  }
}

export default new InstrumentController()
