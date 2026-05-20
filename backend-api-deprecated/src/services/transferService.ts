// 仪器流转管理服务

import { PrismaClient, InstrumentTransfer, InstrumentTransferStatus, InstrumentStatus } from '@prisma/client'
import { CreateTransferDto, TransferQueryDto, PaginatedTransferResult } from '../types/instrument'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class TransferService {
  /**
   * 创建流转申请
   */
  async createTransfer(instrumentId: string, data: CreateTransferDto, createdBy: string): Promise<InstrumentTransfer> {
    try {
      logger.info('Creating transfer', { instrumentId, data })

      // 检查仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 检查仪器状态是否允许流转
      if (instrument.status === InstrumentStatus.DISPOSED) {
        throw new Error('已报废的仪器不能进行流转')
      }

      if (instrument.status === InstrumentStatus.PENDING_DISPOSAL) {
        throw new Error('待报废的仪器不能进行流转')
      }

      // 检查是否有未完成的流转记录
      const pendingTransfer = await prisma.instrumentTransfer.findFirst({
        where: {
          instrumentId,
          status: {
            in: [InstrumentTransferStatus.PENDING, InstrumentTransferStatus.CONFIRMED]
          }
        }
      })

      if (pendingTransfer) {
        throw new Error('该仪器存在未完成的流转记录')
      }

      // 创建流转记录
      const transfer = await prisma.instrumentTransfer.create({
        data: {
          instrumentId,
          fromDepartment: data.fromDepartment,
          toDepartment: data.toDepartment,
          fromResponsible: data.fromResponsible,
          toResponsible: data.toResponsible,
          transferReason: data.transferReason,
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : undefined,
          status: InstrumentTransferStatus.PENDING,
          createdBy
        },
        include: {
          instrument: true
        }
      })

      logger.info('Transfer created successfully', { id: transfer.id, instrumentId })

      return transfer
    } catch (error) {
      logger.error('Failed to create transfer', { error, instrumentId })
      throw error
    }
  }

  /**
   * 获取流转列表
   */
  async getTransfers(query: TransferQueryDto): Promise<PaginatedTransferResult> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (query.instrumentId) {
        where.instrumentId = query.instrumentId
      }

      if (query.status) {
        where.status = query.status
      }

      if (query.fromDepartment) {
        where.fromDepartment = { contains: query.fromDepartment, mode: 'insensitive' }
      }

      if (query.toDepartment) {
        where.toDepartment = { contains: query.toDepartment, mode: 'insensitive' }
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {}
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate)
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate)
        }
      }

      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.instrumentTransfer.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            instrument: {
              select: {
                id: true,
                code: true,
                name: true,
                model: true,
                status: true
              }
            }
          }
        }),
        prisma.instrumentTransfer.count({ where })
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
      logger.error('Failed to get transfers', { error, query })
      throw error
    }
  }

  /**
   * 获取流转详情
   */
  async getTransferById(id: string): Promise<InstrumentTransfer | null> {
    try {
      const transfer = await prisma.instrumentTransfer.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      return transfer
    } catch (error) {
      logger.error('Failed to get transfer by id', { error, id })
      throw error
    }
  }

  /**
   * 获取仪器的流转历史
   */
  async getInstrumentTransfers(instrumentId: string): Promise<InstrumentTransfer[]> {
    try {
      const transfers = await prisma.instrumentTransfer.findMany({
        where: { instrumentId },
        orderBy: { createdAt: 'desc' }
      })

      return transfers
    } catch (error) {
      logger.error('Failed to get instrument transfers', { error, instrumentId })
      throw error
    }
  }

  /**
   * 确认流转
   */
  async confirmTransfer(id: string, confirmedBy: string): Promise<InstrumentTransfer> {
    try {
      logger.info('Confirming transfer', { id, confirmedBy })

      // 检查流转记录是否存在
      const transfer = await prisma.instrumentTransfer.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!transfer) {
        throw new Error('流转记录不存在')
      }

      // 检查流转状态
      if (transfer.status !== InstrumentTransferStatus.PENDING) {
        throw new Error('只能确认待确认状态的流转申请')
      }

      // 使用事务更新流转状态和仪器信息
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // 更新流转状态
        const updated = await tx.instrumentTransfer.update({
          where: { id },
          data: {
            status: InstrumentTransferStatus.CONFIRMED,
            confirmedBy,
            confirmedAt: new Date()
          },
          include: {
            instrument: true
          }
        })

        // 更新仪器的当前位置和负责人
        await tx.instrument.update({
          where: { id: transfer.instrumentId },
          data: {
            currentDepartment: transfer.toDepartment,
            currentResponsible: transfer.toResponsible
          }
        })

        return updated
      })

      logger.info('Transfer confirmed successfully', { id })

      return updatedTransfer
    } catch (error) {
      logger.error('Failed to confirm transfer', { error, id })
      throw error
    }
  }

  /**
   * 拒绝流转
   */
  async rejectTransfer(id: string, rejectedBy: string, rejectionReason?: string): Promise<InstrumentTransfer> {
    try {
      logger.info('Rejecting transfer', { id, rejectedBy, rejectionReason })

      // 检查流转记录是否存在
      const transfer = await prisma.instrumentTransfer.findUnique({
        where: { id }
      })

      if (!transfer) {
        throw new Error('流转记录不存在')
      }

      // 检查流转状态
      if (transfer.status !== InstrumentTransferStatus.PENDING) {
        throw new Error('只能拒绝待确认状态的流转申请')
      }

      // 更新流转状态
      const updatedTransfer = await prisma.instrumentTransfer.update({
        where: { id },
        data: {
          status: InstrumentTransferStatus.REJECTED,
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason
        },
        include: {
          instrument: true
        }
      })

      logger.info('Transfer rejected successfully', { id })

      return updatedTransfer
    } catch (error) {
      logger.error('Failed to reject transfer', { error, id })
      throw error
    }
  }

  /**
   * 完成流转（归还）
   */
  async completeTransfer(id: string): Promise<InstrumentTransfer> {
    try {
      logger.info('Completing transfer', { id })

      // 检查流转记录是否存在
      const transfer = await prisma.instrumentTransfer.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!transfer) {
        throw new Error('流转记录不存在')
      }

      // 检查流转状态
      if (transfer.status !== InstrumentTransferStatus.CONFIRMED) {
        throw new Error('只能完成已确认状态的流转')
      }

      // 使用事务更新流转状态和仪器信息
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // 更新流转状态
        const updated = await tx.instrumentTransfer.update({
          where: { id },
          data: {
            status: InstrumentTransferStatus.COMPLETED
          },
          include: {
            instrument: true
          }
        })

        // 归还仪器到原部门
        await tx.instrument.update({
          where: { id: transfer.instrumentId },
          data: {
            currentDepartment: transfer.fromDepartment,
            currentResponsible: transfer.fromResponsible
          }
        })

        return updated
      })

      logger.info('Transfer completed successfully', { id })

      return updatedTransfer
    } catch (error) {
      logger.error('Failed to complete transfer', { error, id })
      throw error
    }
  }

  /**
   * 取消流转
   */
  async cancelTransfer(id: string, userId: string): Promise<InstrumentTransfer> {
    try {
      logger.info('Canceling transfer', { id, userId })

      // 检查流转记录是否存在
      const transfer = await prisma.instrumentTransfer.findUnique({
        where: { id }
      })

      if (!transfer) {
        throw new Error('流转记录不存在')
      }

      // 只有创建人可以取消待确认的流转
      if (transfer.createdBy !== userId) {
        throw new Error('只有创建人可以取消流转申请')
      }

      if (transfer.status !== InstrumentTransferStatus.PENDING) {
        throw new Error('只能取消待确认状态的流转申请')
      }

      // 更新流转状态
      const updatedTransfer = await prisma.instrumentTransfer.update({
        where: { id },
        data: {
          status: InstrumentTransferStatus.REJECTED,
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: '申请人取消'
        },
        include: {
          instrument: true
        }
      })

      logger.info('Transfer canceled successfully', { id })

      return updatedTransfer
    } catch (error) {
      logger.error('Failed to cancel transfer', { error, id })
      throw error
    }
  }
}

export default new TransferService()
