// 仪器报废管理服务

import { PrismaClient, DisposalRecord, DisposalStatus, InstrumentStatus, InstrumentTransferStatus } from '@prisma/client'
import { CreateDisposalDto, DisposalQueryDto, PaginatedDisposalResult } from '../types/instrument'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class DisposalService {
  /**
   * 创建报废申请
   */
  async createDisposal(instrumentId: string, data: CreateDisposalDto, createdBy: string): Promise<DisposalRecord> {
    try {
      logger.info('Creating disposal request', { instrumentId, data })

      // 检查仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
        include: {
          transfers: {
            where: {
              status: {
                in: [InstrumentTransferStatus.PENDING, InstrumentTransferStatus.CONFIRMED]
              }
            }
          },
          disposalRecord: true
        }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 检查仪器是否已经有报废记录
      if (instrument.disposalRecord) {
        throw new Error('该仪器已有报废记录')
      }

      // 检查是否有未完成的流转记录
      if (instrument.transfers && instrument.transfers.length > 0) {
        throw new Error('该仪器存在未完成的流转记录，无法申请报废')
      }

      // 检查仪器状态
      if (instrument.status === InstrumentStatus.DISPOSED) {
        throw new Error('该仪器已报废')
      }

      // 使用事务创建报废记录并更新仪器状态
      const disposal = await prisma.$transaction(async (tx) => {
        // 创建报废记录
        const record = await tx.disposalRecord.create({
          data: {
            instrumentId,
            disposalReason: data.disposalReason,
            status: DisposalStatus.PENDING,
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
            documents: true
          }
        })

        // 更新仪器状态为待报废
        await tx.instrument.update({
          where: { id: instrumentId },
          data: {
            status: InstrumentStatus.PENDING_DISPOSAL
          }
        })

        return record
      })

      logger.info('Disposal request created successfully', { id: disposal.id, instrumentId })

      return disposal
    } catch (error) {
      logger.error('Failed to create disposal request', { error, instrumentId })
      throw error
    }
  }

  /**
   * 获取报废申请列表
   */
  async getDisposals(query: DisposalQueryDto): Promise<PaginatedDisposalResult> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (query.status) {
        where.status = query.status
      }

      if (query.instrumentId) {
        where.instrumentId = query.instrumentId
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
        prisma.disposalRecord.findMany({
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
                status: true,
                currentDepartment: true
              }
            },
            documents: true
          }
        }),
        prisma.disposalRecord.count({ where })
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
      logger.error('Failed to get disposals', { error, query })
      throw error
    }
  }

  /**
   * 获取报废申请详情
   */
  async getDisposalById(id: string): Promise<DisposalRecord | null> {
    try {
      const disposal = await prisma.disposalRecord.findUnique({
        where: { id },
        include: {
          instrument: true,
          documents: true
        }
      })

      return disposal
    } catch (error) {
      logger.error('Failed to get disposal by id', { error, id })
      throw error
    }
  }

  /**
   * 批准报废申请
   */
  async approveDisposal(id: string, approvedBy: string): Promise<DisposalRecord> {
    try {
      logger.info('Approving disposal request', { id, approvedBy })

      // 检查报废记录是否存在
      const disposal = await prisma.disposalRecord.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!disposal) {
        throw new Error('报废记录不存在')
      }

      // 检查报废状态
      if (disposal.status !== DisposalStatus.PENDING) {
        throw new Error('只能批准待审批状态的报废申请')
      }

      // 使用事务更新报废状态和仪器状态
      const updatedDisposal = await prisma.$transaction(async (tx) => {
        // 更新报废状态
        const updated = await tx.disposalRecord.update({
          where: { id },
          data: {
            status: DisposalStatus.APPROVED,
            approvedBy,
            approvedAt: new Date(),
            disposalDate: new Date()
          },
          include: {
            instrument: true,
            documents: true
          }
        })

        // 更新仪器状态为已报废
        await tx.instrument.update({
          where: { id: disposal.instrumentId },
          data: {
            status: InstrumentStatus.DISPOSED
          }
        })

        return updated
      })

      logger.info('Disposal request approved successfully', { id })

      return updatedDisposal
    } catch (error) {
      logger.error('Failed to approve disposal request', { error, id })
      throw error
    }
  }

  /**
   * 拒绝报废申请
   */
  async rejectDisposal(id: string, rejectedBy: string, rejectionReason?: string): Promise<DisposalRecord> {
    try {
      logger.info('Rejecting disposal request', { id, rejectedBy, rejectionReason })

      // 检查报废记录是否存在
      const disposal = await prisma.disposalRecord.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!disposal) {
        throw new Error('报废记录不存在')
      }

      // 检查报废状态
      if (disposal.status !== DisposalStatus.PENDING) {
        throw new Error('只能拒绝待审批状态的报废申请')
      }

      // 使用事务更新报废状态和仪器状态
      const updatedDisposal = await prisma.$transaction(async (tx) => {
        // 更新报废状态
        const updated = await tx.disposalRecord.update({
          where: { id },
          data: {
            status: DisposalStatus.REJECTED,
            rejectedBy,
            rejectedAt: new Date(),
            rejectionReason
          },
          include: {
            instrument: true,
            documents: true
          }
        })

        // 恢复仪器状态为在用
        await tx.instrument.update({
          where: { id: disposal.instrumentId },
          data: {
            status: InstrumentStatus.IN_USE
          }
        })

        return updated
      })

      logger.info('Disposal request rejected successfully', { id })

      return updatedDisposal
    } catch (error) {
      logger.error('Failed to reject disposal request', { error, id })
      throw error
    }
  }

  /**
   * 取消报废申请
   */
  async cancelDisposal(id: string, userId: string): Promise<DisposalRecord> {
    try {
      logger.info('Canceling disposal request', { id, userId })

      // 检查报废记录是否存在
      const disposal = await prisma.disposalRecord.findUnique({
        where: { id },
        include: {
          instrument: true
        }
      })

      if (!disposal) {
        throw new Error('报废记录不存在')
      }

      // 只有创建人可以取消待审批的报废申请
      if (disposal.createdBy !== userId) {
        throw new Error('只有创建人可以取消报废申请')
      }

      if (disposal.status !== DisposalStatus.PENDING) {
        throw new Error('只能取消待审批状态的报废申请')
      }

      // 使用事务更新报废状态和仪器状态
      const updatedDisposal = await prisma.$transaction(async (tx) => {
        // 更新报废状态
        const updated = await tx.disposalRecord.update({
          where: { id },
          data: {
            status: DisposalStatus.REJECTED,
            rejectedBy: userId,
            rejectedAt: new Date(),
            rejectionReason: '申请人取消'
          },
          include: {
            instrument: true,
            documents: true
          }
        })

        // 恢复仪器状态为在用
        await tx.instrument.update({
          where: { id: disposal.instrumentId },
          data: {
            status: InstrumentStatus.IN_USE
          }
        })

        return updated
      })

      logger.info('Disposal request canceled successfully', { id })

      return updatedDisposal
    } catch (error) {
      logger.error('Failed to cancel disposal request', { error, id })
      throw error
    }
  }

  /**
   * 获取报废统计数据
   */
  async getDisposalStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const where: any = {}

      if (startDate || endDate) {
        where.disposalDate = {}
        if (startDate) {
          where.disposalDate.gte = startDate
        }
        if (endDate) {
          where.disposalDate.lte = endDate
        }
      }

      // 按状态统计
      const statusStats = await prisma.disposalRecord.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })

      // 总报废数量
      const totalCount = await prisma.disposalRecord.count()

      // 待审批数量
      const pendingCount = await prisma.disposalRecord.count({
        where: { status: DisposalStatus.PENDING }
      })

      // 已批准数量
      const approvedCount = await prisma.disposalRecord.count({
        where: { status: DisposalStatus.APPROVED }
      })

      return {
        statusDistribution: statusStats.map(stat => ({
          status: stat.status,
          count: stat._count.id
        })),
        totalCount,
        pendingCount,
        approvedCount
      }
    } catch (error) {
      logger.error('Failed to get disposal statistics', { error })
      throw error
    }
  }
}

export default new DisposalService()
