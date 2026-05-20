// 仪器校准管理服务

import { PrismaClient, CalibrationRecord, CalibrationResult, InstrumentStatus } from '@prisma/client'
import { CreateCalibrationDto, UpdateCalibrationDto, CalibrationQueryDto, PaginatedCalibrationResult } from '../types/instrument'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class CalibrationService {
  /**
   * 创建校准记录
   */
  async createCalibration(instrumentId: string, data: CreateCalibrationDto, createdBy: string): Promise<CalibrationRecord> {
    try {
      logger.info('Creating calibration record', { instrumentId, data })

      // 检查仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 使用事务创建校准记录并更新仪器状态
      const calibration = await prisma.$transaction(async (tx) => {
        // 创建校准记录
        const record = await tx.calibrationRecord.create({
          data: {
            instrumentId,
            calibrationDate: new Date(data.calibrationDate),
            calibrationOrg: data.calibrationOrg,
            certificateNumber: data.certificateNumber,
            calibrationResult: data.calibrationResult,
            nextCalibrationDate: data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : undefined,
            remarks: data.remarks,
            certificateFileId: data.certificateFileId,
            createdBy
          },
          include: {
            instrument: {
              select: {
                id: true,
                code: true,
                name: true,
                model: true,
                status: true
              }
            },
            certificateFile: true
          }
        })

        // 如果校准结果为不合格,自动将仪器状态更新为维修中
        if (data.calibrationResult === CalibrationResult.UNQUALIFIED) {
          await tx.instrument.update({
            where: { id: instrumentId },
            data: {
              status: InstrumentStatus.MAINTENANCE
            }
          })
          logger.info('Instrument status updated to MAINTENANCE due to unqualified calibration', { instrumentId })
        }

        return record
      })

      logger.info('Calibration record created successfully', { id: calibration.id, instrumentId })

      return calibration
    } catch (error) {
      logger.error('Failed to create calibration record', { error, instrumentId })
      throw error
    }
  }

  /**
   * 获取校准记录列表
   */
  async getCalibrationRecords(query: CalibrationQueryDto): Promise<PaginatedCalibrationResult> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (query.instrumentId) {
        where.instrumentId = query.instrumentId
      }

      if (query.calibrationResult) {
        where.calibrationResult = query.calibrationResult
      }

      if (query.calibrationOrg) {
        where.calibrationOrg = { contains: query.calibrationOrg, mode: 'insensitive' }
      }

      if (query.startDate || query.endDate) {
        where.calibrationDate = {}
        if (query.startDate) {
          where.calibrationDate.gte = new Date(query.startDate)
        }
        if (query.endDate) {
          where.calibrationDate.lte = new Date(query.endDate)
        }
      }

      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.calibrationRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { calibrationDate: 'desc' },
          include: {
            instrument: {
              select: {
                id: true,
                code: true,
                name: true,
                model: true,
                status: true
              }
            },
            certificateFile: true
          }
        }),
        prisma.calibrationRecord.count({ where })
      ])

      const totalPages = Math.ceil(total / pageSize)

      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to get calibration records', { error, query })
      throw error
    }
  }

  /**
   * 获取校准记录详情
   */
  async getCalibrationById(id: string): Promise<CalibrationRecord | null> {
    try {
      const calibration = await prisma.calibrationRecord.findUnique({
        where: { id },
        include: {
          instrument: true,
          certificateFile: true
        }
      })

      return calibration
    } catch (error) {
      logger.error('Failed to get calibration by id', { error, id })
      throw error
    }
  }

  /**
   * 获取仪器的校准记录
   */
  async getInstrumentCalibrationRecords(instrumentId: string): Promise<CalibrationRecord[]> {
    try {
      const records = await prisma.calibrationRecord.findMany({
        where: { instrumentId },
        orderBy: { calibrationDate: 'desc' },
        include: {
          certificateFile: true
        }
      })

      return records
    } catch (error) {
      logger.error('Failed to get instrument calibration records', { error, instrumentId })
      throw error
    }
  }

  /**
   * 更新校准记录
   */
  async updateCalibration(id: string, data: UpdateCalibrationDto): Promise<CalibrationRecord> {
    try {
      logger.info('Updating calibration record', { id, data })

      // 检查校准记录是否存在
      const existingCalibration = await prisma.calibrationRecord.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!existingCalibration) {
        throw new Error('校准记录不存在')
      }

      // 使用事务更新校准记录和仪器状态
      const calibration = await prisma.$transaction(async (tx) => {
        // 更新校准记录
        const record = await tx.calibrationRecord.update({
          where: { id },
          data: {
            calibrationDate: data.calibrationDate ? new Date(data.calibrationDate) : undefined,
            calibrationOrg: data.calibrationOrg,
            certificateNumber: data.certificateNumber,
            calibrationResult: data.calibrationResult,
            nextCalibrationDate: data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : undefined,
            remarks: data.remarks,
            certificateFileId: data.certificateFileId
          },
          include: {
            instrument: true,
            certificateFile: true
          }
        })

        // 如果校准结果从合格改为不合格,更新仪器状态
        if (data.calibrationResult === CalibrationResult.UNQUALIFIED && 
            existingCalibration.calibrationResult !== CalibrationResult.UNQUALIFIED) {
          await tx.instrument.update({
            where: { id: existingCalibration.instrumentId },
            data: {
              status: InstrumentStatus.MAINTENANCE
            }
          })
          logger.info('Instrument status updated to MAINTENANCE due to unqualified calibration', { 
            instrumentId: existingCalibration.instrumentId 
          })
        }

        return record
      })

      logger.info('Calibration record updated successfully', { id })

      return calibration
    } catch (error) {
      logger.error('Failed to update calibration record', { error, id })
      throw error
    }
  }

  /**
   * 删除校准记录
   */
  async deleteCalibration(id: string): Promise<void> {
    try {
      logger.info('Deleting calibration record', { id })

      // 检查校准记录是否存在
      const calibration = await prisma.calibrationRecord.findUnique({
        where: { id }
      })

      if (!calibration) {
        throw new Error('校准记录不存在')
      }

      // 删除校准记录
      await prisma.calibrationRecord.delete({
        where: { id }
      })

      logger.info('Calibration record deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete calibration record', { error, id })
      throw error
    }
  }

  /**
   * 获取即将到期的校准列表
   */
  async getExpiringCalibrations(daysAhead: number = 30): Promise<CalibrationRecord[]> {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + daysAhead)

      // 查询下次校准日期在未来指定天数内的记录
      const expiringCalibrations = await prisma.calibrationRecord.findMany({
        where: {
          nextCalibrationDate: {
            gte: today,
            lte: futureDate
          }
        },
        orderBy: { nextCalibrationDate: 'asc' },
        include: {
          instrument: {
            select: {
              id: true,
              code: true,
              name: true,
              model: true,
              status: true,
              currentDepartment: true,
              currentResponsible: true
            }
          },
          certificateFile: true
        }
      })

      return expiringCalibrations
    } catch (error) {
      logger.error('Failed to get expiring calibrations', { error, daysAhead })
      throw error
    }
  }

  /**
   * 获取过期未校准的记录
   */
  async getOverdueCalibrations(): Promise<CalibrationRecord[]> {
    try {
      const today = new Date()

      // 查询下次校准日期已过期的记录
      const overdueCalibrations = await prisma.calibrationRecord.findMany({
        where: {
          nextCalibrationDate: {
            lt: today
          }
        },
        orderBy: { nextCalibrationDate: 'asc' },
        include: {
          instrument: {
            select: {
              id: true,
              code: true,
              name: true,
              model: true,
              status: true,
              currentDepartment: true,
              currentResponsible: true
            }
          },
          certificateFile: true
        }
      })

      return overdueCalibrations
    } catch (error) {
      logger.error('Failed to get overdue calibrations', { error })
      throw error
    }
  }

  /**
   * 获取校准统计数据
   */
  async getCalibrationStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const where: any = {}

      if (startDate || endDate) {
        where.calibrationDate = {}
        if (startDate) {
          where.calibrationDate.gte = startDate
        }
        if (endDate) {
          where.calibrationDate.lte = endDate
        }
      }

      // 按校准结果统计
      const resultStats = await prisma.calibrationRecord.groupBy({
        by: ['calibrationResult'],
        where,
        _count: {
          id: true
        }
      })

      // 按校准机构统计
      const orgStats = await prisma.calibrationRecord.groupBy({
        by: ['calibrationOrg'],
        where,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      })

      // 总校准次数
      const totalCount = await prisma.calibrationRecord.count({ where })

      // 即将到期数量
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + 30)
      const expiringCount = await prisma.calibrationRecord.count({
        where: {
          nextCalibrationDate: {
            gte: today,
            lte: futureDate
          }
        }
      })

      // 已过期数量
      const overdueCount = await prisma.calibrationRecord.count({
        where: {
          nextCalibrationDate: {
            lt: today
          }
        }
      })

      return {
        resultDistribution: resultStats.map(stat => ({
          result: stat.calibrationResult,
          count: stat._count.id
        })),
        topOrganizations: orgStats.map(stat => ({
          organization: stat.calibrationOrg,
          count: stat._count.id
        })),
        totalCount,
        expiringCount,
        overdueCount
      }
    } catch (error) {
      logger.error('Failed to get calibration statistics', { error })
      throw error
    }
  }
}

export default new CalibrationService()
