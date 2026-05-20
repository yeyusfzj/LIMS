// 仪器维护管理服务

import { PrismaClient, MaintenanceRecord, MaintenanceType } from '@prisma/client'
import { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceQueryDto, PaginatedMaintenanceResult } from '../types/instrument'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class MaintenanceService {
  /**
   * 创建维护记录
   */
  async createMaintenance(instrumentId: string, data: CreateMaintenanceDto, createdBy: string): Promise<MaintenanceRecord> {
    try {
      logger.info('Creating maintenance record', { instrumentId, data })

      // 检查仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 创建维护记录
      const maintenance = await prisma.maintenanceRecord.create({
        data: {
          instrumentId,
          maintenanceDate: new Date(data.maintenanceDate),
          maintenanceType: data.maintenanceType,
          maintenanceContent: data.maintenanceContent,
          maintenancePerson: data.maintenancePerson,
          maintenanceCost: data.maintenanceCost,
          nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
          remarks: data.remarks,
          createdBy
        },
        include: {
          instrument: {
            select: {
              id: true,
              code: true,
              name: true,
              model: true
            }
          },
          documents: true
        }
      })

      logger.info('Maintenance record created successfully', { id: maintenance.id, instrumentId })

      return maintenance
    } catch (error) {
      logger.error('Failed to create maintenance record', { error, instrumentId })
      throw error
    }
  }

  /**
   * 获取维护记录列表
   */
  async getMaintenanceRecords(query: MaintenanceQueryDto): Promise<PaginatedMaintenanceResult> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (query.instrumentId) {
        where.instrumentId = query.instrumentId
      }

      if (query.maintenanceType) {
        where.maintenanceType = query.maintenanceType
      }

      if (query.maintenancePerson) {
        where.maintenancePerson = { contains: query.maintenancePerson, mode: 'insensitive' }
      }

      if (query.startDate || query.endDate) {
        where.maintenanceDate = {}
        if (query.startDate) {
          where.maintenanceDate.gte = new Date(query.startDate)
        }
        if (query.endDate) {
          where.maintenanceDate.lte = new Date(query.endDate)
        }
      }

      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.maintenanceRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { maintenanceDate: 'desc' },
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
            documents: true
          }
        }),
        prisma.maintenanceRecord.count({ where })
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
      logger.error('Failed to get maintenance records', { error, query })
      throw error
    }
  }

  /**
   * 获取维护记录详情
   */
  async getMaintenanceById(id: string): Promise<MaintenanceRecord | null> {
    try {
      const maintenance = await prisma.maintenanceRecord.findUnique({
        where: { id },
        include: {
          instrument: true,
          documents: true
        }
      })

      return maintenance
    } catch (error) {
      logger.error('Failed to get maintenance by id', { error, id })
      throw error
    }
  }

  /**
   * 获取仪器的维护记录
   */
  async getInstrumentMaintenanceRecords(instrumentId: string): Promise<MaintenanceRecord[]> {
    try {
      const records = await prisma.maintenanceRecord.findMany({
        where: { instrumentId },
        orderBy: { maintenanceDate: 'desc' },
        include: {
          documents: true
        }
      })

      return records
    } catch (error) {
      logger.error('Failed to get instrument maintenance records', { error, instrumentId })
      throw error
    }
  }

  /**
   * 更新维护记录
   */
  async updateMaintenance(id: string, data: UpdateMaintenanceDto): Promise<MaintenanceRecord> {
    try {
      logger.info('Updating maintenance record', { id, data })

      // 检查维护记录是否存在
      const existingMaintenance = await prisma.maintenanceRecord.findUnique({
        where: { id }
      })

      if (!existingMaintenance) {
        throw new Error('维护记录不存在')
      }

      // 更新维护记录
      const maintenance = await prisma.maintenanceRecord.update({
        where: { id },
        data: {
          maintenanceDate: data.maintenanceDate ? new Date(data.maintenanceDate) : undefined,
          maintenanceType: data.maintenanceType,
          maintenanceContent: data.maintenanceContent,
          maintenancePerson: data.maintenancePerson,
          maintenanceCost: data.maintenanceCost,
          nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
          remarks: data.remarks
        },
        include: {
          instrument: true,
          documents: true
        }
      })

      logger.info('Maintenance record updated successfully', { id })

      return maintenance
    } catch (error) {
      logger.error('Failed to update maintenance record', { error, id })
      throw error
    }
  }

  /**
   * 删除维护记录
   */
  async deleteMaintenance(id: string): Promise<void> {
    try {
      logger.info('Deleting maintenance record', { id })

      // 检查维护记录是否存在
      const maintenance = await prisma.maintenanceRecord.findUnique({
        where: { id }
      })

      if (!maintenance) {
        throw new Error('维护记录不存在')
      }

      // 删除维护记录（级联删除关联文档）
      await prisma.maintenanceRecord.delete({
        where: { id }
      })

      logger.info('Maintenance record deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete maintenance record', { error, id })
      throw error
    }
  }

  /**
   * 获取维护提醒列表（即将到期的维护）
   */
  async getMaintenanceReminders(daysAhead: number = 30): Promise<MaintenanceRecord[]> {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + daysAhead)

      // 查询下次维护日期在未来指定天数内的记录
      const reminders = await prisma.maintenanceRecord.findMany({
        where: {
          nextMaintenanceDate: {
            gte: today,
            lte: futureDate
          }
        },
        orderBy: { nextMaintenanceDate: 'asc' },
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
          }
        }
      })

      return reminders
    } catch (error) {
      logger.error('Failed to get maintenance reminders', { error, daysAhead })
      throw error
    }
  }

  /**
   * 获取过期未维护的记录
   */
  async getOverdueMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    try {
      const today = new Date()

      // 查询下次维护日期已过期的记录
      const overdueRecords = await prisma.maintenanceRecord.findMany({
        where: {
          nextMaintenanceDate: {
            lt: today
          }
        },
        orderBy: { nextMaintenanceDate: 'asc' },
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
          }
        }
      })

      return overdueRecords
    } catch (error) {
      logger.error('Failed to get overdue maintenance records', { error })
      throw error
    }
  }

  /**
   * 获取维护统计数据
   */
  async getMaintenanceStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const where: any = {}

      if (startDate || endDate) {
        where.maintenanceDate = {}
        if (startDate) {
          where.maintenanceDate.gte = startDate
        }
        if (endDate) {
          where.maintenanceDate.lte = endDate
        }
      }

      // 按维护类型统计
      const typeStats = await prisma.maintenanceRecord.groupBy({
        by: ['maintenanceType'],
        where,
        _count: {
          id: true
        },
        _sum: {
          maintenanceCost: true
        }
      })

      // 总维护次数和费用
      const totalStats = await prisma.maintenanceRecord.aggregate({
        where,
        _count: {
          id: true
        },
        _sum: {
          maintenanceCost: true
        },
        _avg: {
          maintenanceCost: true
        }
      })

      return {
        typeDistribution: typeStats.map(stat => ({
          type: stat.maintenanceType,
          count: stat._count.id,
          totalCost: stat._sum.maintenanceCost || 0
        })),
        totalCount: totalStats._count.id,
        totalCost: totalStats._sum.maintenanceCost || 0,
        averageCost: totalStats._avg.maintenanceCost || 0
      }
    } catch (error) {
      logger.error('Failed to get maintenance statistics', { error })
      throw error
    }
  }
}

export default new MaintenanceService()
