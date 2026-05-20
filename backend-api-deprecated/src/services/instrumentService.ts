// 仪器管理服务

import { PrismaClient, Instrument, InstrumentStatus } from '@prisma/client'
import {
  CreateInstrumentDto,
  UpdateInstrumentDto,
  InstrumentQueryDto,
  PaginatedInstrumentResult
} from '../types/instrument'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class InstrumentService {
  /**
   * 创建仪器
   */
  async createInstrument(data: CreateInstrumentDto, createdBy: string): Promise<Instrument> {
    try {
      logger.info('Creating instrument', { code: data.code, name: data.name })

      // 验证仪器编码唯一性
      const existingInstrument = await prisma.instrument.findUnique({
        where: { code: data.code }
      })

      if (existingInstrument) {
        throw new Error('仪器编码已存在')
      }

      // 创建仪器记录
      const instrument = await prisma.instrument.create({
        data: {
          code: data.code,
          name: data.name,
          model: data.model,
          manufacturer: data.manufacturer,
          serialNumber: data.serialNumber,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          purchasePrice: data.purchasePrice,
          technicalParams: data.technicalParams || undefined,
          status: data.status || InstrumentStatus.IN_USE,
          currentLocation: data.currentLocation,
          currentDepartment: data.currentDepartment,
          currentResponsible: data.currentResponsible,
          usageYears: data.usageYears,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
          description: data.description,
          remarks: data.remarks,
          createdBy
        }
      })

      logger.info('Instrument created successfully', { id: instrument.id, code: instrument.code })

      return instrument
    } catch (error) {
      logger.error('Failed to create instrument', { error })
      throw error
    }
  }

  /**
   * 获取仪器列表（分页、筛选）
   */
  async getInstruments(query: InstrumentQueryDto): Promise<PaginatedInstrumentResult> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      // 编码精确搜索
      if (query.code) {
        where.code = { contains: query.code, mode: 'insensitive' }
      }

      // 名称模糊搜索
      if (query.name) {
        where.name = { contains: query.name, mode: 'insensitive' }
      }

      // 状态筛选
      if (query.status) {
        where.status = query.status
      }

      // 部门筛选
      if (query.department) {
        where.currentDepartment = query.department
      }

      // 位置筛选
      if (query.location) {
        where.currentLocation = { contains: query.location, mode: 'insensitive' }
      }

      // 制造商筛选
      if (query.manufacturer) {
        where.manufacturer = { contains: query.manufacturer, mode: 'insensitive' }
      }

      // 模糊搜索（编码、名称、型号）
      if (query.search) {
        where.OR = [
          { code: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { model: { contains: query.search, mode: 'insensitive' } }
        ]
      }

      // 购置日期范围
      if (query.startDate || query.endDate) {
        where.purchaseDate = {}
        if (query.startDate) {
          where.purchaseDate.gte = new Date(query.startDate)
        }
        if (query.endDate) {
          where.purchaseDate.lte = new Date(query.endDate)
        }
      }

      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.instrument.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                transfers: true,
                maintenanceRecords: true,
                calibrationRecords: true,
                documents: true
              }
            }
          }
        }),
        prisma.instrument.count({ where })
      ])

      const totalPages = Math.ceil(total / pageSize)

      // 转换为响应格式，添加统计信息
      const itemsWithStats = items.map(item => ({
        ...item,
        transferCount: item._count.transfers,
        maintenanceCount: item._count.maintenanceRecords,
        calibrationCount: item._count.calibrationRecords,
        documentCount: item._count.documents
      }))

      return {
        items: itemsWithStats as any,
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to get instruments', { error, query })
      throw error
    }
  }

  /**
   * 通过ID获取仪器详情
   */
  async getInstrumentById(id: string): Promise<Instrument | null> {
    try {
      const instrument = await prisma.instrument.findUnique({
        where: { id },
        include: {
          transfers: {
            orderBy: { createdAt: 'desc' }
          },
          maintenanceRecords: {
            orderBy: { maintenanceDate: 'desc' },
            include: {
              documents: true
            }
          },
          calibrationRecords: {
            orderBy: { calibrationDate: 'desc' },
            include: {
              certificateFile: true
            }
          },
          documents: {
            orderBy: { uploadedAt: 'desc' }
          },
          disposalRecord: {
            include: {
              documents: true
            }
          }
        }
      })

      return instrument
    } catch (error) {
      logger.error('Failed to get instrument by id', { error, id })
      throw error
    }
  }

  /**
   * 通过编码获取仪器
   */
  async getInstrumentByCode(code: string): Promise<Instrument | null> {
    try {
      const instrument = await prisma.instrument.findUnique({
        where: { code },
        include: {
          transfers: {
            orderBy: { createdAt: 'desc' }
          },
          maintenanceRecords: {
            orderBy: { maintenanceDate: 'desc' }
          },
          calibrationRecords: {
            orderBy: { calibrationDate: 'desc' }
          },
          documents: true
        }
      })

      return instrument
    } catch (error) {
      logger.error('Failed to get instrument by code', { error, code })
      throw error
    }
  }

  /**
   * 更新仪器信息
   */
  async updateInstrument(id: string, data: UpdateInstrumentDto): Promise<Instrument> {
    try {
      logger.info('Updating instrument', { id, data })

      // 检查仪器是否存在
      const existingInstrument = await prisma.instrument.findUnique({
        where: { id }
      })

      if (!existingInstrument) {
        throw new Error('仪器不存在')
      }

      // 更新仪器信息
      const instrument = await prisma.instrument.update({
        where: { id },
        data: {
          name: data.name,
          model: data.model,
          manufacturer: data.manufacturer,
          serialNumber: data.serialNumber,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          purchasePrice: data.purchasePrice,
          technicalParams: data.technicalParams !== undefined ? data.technicalParams : undefined,
          status: data.status,
          currentLocation: data.currentLocation,
          currentDepartment: data.currentDepartment,
          currentResponsible: data.currentResponsible,
          usageYears: data.usageYears,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
          description: data.description,
          remarks: data.remarks
        }
      })

      logger.info('Instrument updated successfully', { id: instrument.id })

      return instrument
    } catch (error) {
      logger.error('Failed to update instrument', { error, id })
      throw error
    }
  }

  /**
   * 删除仪器（软删除：更新状态为已报废）
   */
  async deleteInstrument(id: string): Promise<void> {
    try {
      logger.info('Deleting instrument', { id })

      // 检查仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id },
        include: {
          transfers: {
            where: {
              status: {
                in: ['PENDING', 'CONFIRMED']
              }
            }
          }
        }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 检查是否有未完成的流转记录
      if (instrument.transfers && instrument.transfers.length > 0) {
        throw new Error('该仪器存在未完成的流转记录，无法删除')
      }

      // 软删除：更新状态为已报废
      await prisma.instrument.update({
        where: { id },
        data: {
          status: InstrumentStatus.DISPOSED
        }
      })

      logger.info('Instrument deleted (marked as disposed)', { id })
    } catch (error) {
      logger.error('Failed to delete instrument', { error, id })
      throw error
    }
  }

  /**
   * 验证仪器编码唯一性
   */
  async validateInstrumentCode(code: string, excludeId?: string): Promise<boolean> {
    try {
      const where: any = { code }

      // 如果提供了excludeId，排除该ID（用于更新时验证）
      if (excludeId) {
        where.id = { not: excludeId }
      }

      const count = await prisma.instrument.count({ where })

      return count === 0
    } catch (error) {
      logger.error('Failed to validate instrument code', { error, code })
      throw error
    }
  }

  /**
   * 更新仪器状态
   */
  async updateInstrumentStatus(id: string, status: InstrumentStatus): Promise<Instrument> {
    try {
      logger.info('Updating instrument status', { id, status })

      // 检查仪器是否存在
      const existingInstrument = await prisma.instrument.findUnique({
        where: { id }
      })

      if (!existingInstrument) {
        throw new Error('仪器不存在')
      }

      // 验证状态转换的合法性
      this.validateStatusTransition(existingInstrument.status, status)

      // 更新状态
      const instrument = await prisma.instrument.update({
        where: { id },
        data: { status }
      })

      logger.info('Instrument status updated successfully', { id, status })

      return instrument
    } catch (error) {
      logger.error('Failed to update instrument status', { error, id, status })
      throw error
    }
  }

  /**
   * 验证状态转换的合法性
   */
  private validateStatusTransition(currentStatus: InstrumentStatus, newStatus: InstrumentStatus): void {
    // 已报废的仪器不能转换到其他状态
    if (currentStatus === InstrumentStatus.DISPOSED && newStatus !== InstrumentStatus.DISPOSED) {
      throw new Error('已报废的仪器不能恢复到其他状态')
    }

    // 可以添加更多状态转换规则
  }

  /**
   * 批量删除仪器
   */
  async batchDeleteInstruments(ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const id of ids) {
      try {
        await this.deleteInstrument(id)
        result.success++
      } catch (error: any) {
        result.failed++
        result.errors.push(`仪器 ${id}: ${error.message}`)
      }
    }

    logger.info('Batch delete completed', result)
    return result
  }
}

export default new InstrumentService()
