/**
 * 审计日志服务
 * 负责记录和查询系统审计日志
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import {
  CreateAuditLogDto,
  AuditLogQuery,
  AuditLogResponse,
  PaginatedAuditLogsResponse
} from '../types/auditLog'

const prisma = new PrismaClient()

export class AuditLogService {
  /**
   * 创建审计日志
   * 日志创建后不可修改或删除，确保审计追踪的完整性
   */
  async createAuditLog(data: CreateAuditLogDto): Promise<AuditLogResponse> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          username: data.username,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          changes: data.changes || undefined,
          ipAddress: data.ipAddress || undefined,
          userAgent: data.userAgent || undefined
        }
      })

      logger.info('Audit log created', {
        id: auditLog.id,
        action: auditLog.action,
        resource: auditLog.resource,
        resourceId: auditLog.resourceId
      })

      return this.mapToResponse(auditLog)
    } catch (error) {
      logger.error('Failed to create audit log', { error, data })
      throw new Error('创建审计日志失败')
    }
  }

  /**
   * 批量创建审计日志
   * 用于需要记录多个操作的场景
   */
  async createAuditLogs(logs: CreateAuditLogDto[]): Promise<void> {
    try {
      await prisma.auditLog.createMany({
        data: logs.map(log => ({
          userId: log.userId,
          username: log.username,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          changes: log.changes || undefined,
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined
        }))
      })

      logger.info('Batch audit logs created', { count: logs.length })
    } catch (error) {
      logger.error('Failed to create batch audit logs', { error, count: logs.length })
      throw new Error('批量创建审计日志失败')
    }
  }

  /**
   * 查询审计日志列表
   * 支持多条件过滤和分页
   */
  async listAuditLogs(query: AuditLogQuery): Promise<PaginatedAuditLogsResponse> {
    const {
      userId,
      username,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = query

    // 构建查询条件
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (username) {
      where.username = {
        contains: username,
        mode: 'insensitive'
      }
    }

    if (action) {
      where.action = action
    }

    if (resource) {
      where.resource = resource
    }

    if (resourceId) {
      where.resourceId = resourceId
    }

    // 时间范围过滤
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = startDate
      }
      if (endDate) {
        where.timestamp.lte = endDate
      }
    }

    try {
      // 并行查询总数和数据
      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      const totalPages = Math.ceil(total / pageSize)

      return {
        items: logs.map(log => this.mapToResponse(log)),
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list audit logs', { error, query })
      throw new Error('查询审计日志失败')
    }
  }

  /**
   * 获取单个审计日志详情
   */
  async getAuditLog(id: string): Promise<AuditLogResponse | null> {
    try {
      const auditLog = await prisma.auditLog.findUnique({
        where: { id }
      })

      if (!auditLog) {
        return null
      }

      return this.mapToResponse(auditLog)
    } catch (error) {
      logger.error('Failed to get audit log', { error, id })
      throw new Error('获取审计日志失败')
    }
  }

  /**
   * 获取资源的审计历史
   * 返回特定资源的所有操作记录
   */
  async getResourceAuditHistory(
    resource: string,
    resourceId: string
  ): Promise<AuditLogResponse[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          resource,
          resourceId
        },
        orderBy: { timestamp: 'desc' }
      })

      return logs.map(log => this.mapToResponse(log))
    } catch (error) {
      logger.error('Failed to get resource audit history', { error, resource, resourceId })
      throw new Error('获取资源审计历史失败')
    }
  }

  /**
   * 获取用户的操作历史
   * 返回特定用户的所有操作记录
   */
  async getUserAuditHistory(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogResponse[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      })

      return logs.map(log => this.mapToResponse(log))
    } catch (error) {
      logger.error('Failed to get user audit history', { error, userId })
      throw new Error('获取用户操作历史失败')
    }
  }

  /**
   * 统计审计日志
   * 按操作类型、资源类型等维度统计
   */
  async getAuditStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const where: any = {}

      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) {
          where.timestamp.gte = startDate
        }
        if (endDate) {
          where.timestamp.lte = endDate
        }
      }

      // 按操作类型统计
      const actionStats = await prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: {
          action: true
        }
      })

      // 按资源类型统计
      const resourceStats = await prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: {
          resource: true
        }
      })

      // 按用户统计
      const userStats = await prisma.auditLog.groupBy({
        by: ['userId', 'username'],
        where,
        _count: {
          userId: true
        },
        orderBy: {
          _count: {
            userId: 'desc'
          }
        },
        take: 10
      })

      return {
        byAction: actionStats.map(stat => ({
          action: stat.action,
          count: stat._count.action
        })),
        byResource: resourceStats.map(stat => ({
          resource: stat.resource,
          count: stat._count.resource
        })),
        topUsers: userStats.map(stat => ({
          userId: stat.userId,
          username: stat.username,
          count: stat._count.userId
        }))
      }
    } catch (error) {
      logger.error('Failed to get audit statistics', { error })
      throw new Error('获取审计统计失败')
    }
  }

  /**
   * 归档旧的审计日志
   * 将指定日期之前的日志移动到归档表
   * @param beforeDate 归档此日期之前的日志
   * @returns 归档的日志数量
   */
  async archiveAuditLogs(beforeDate: Date): Promise<number> {
    try {
      // 查询需要归档的日志
      const logsToArchive = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            lt: beforeDate
          }
        }
      })

      if (logsToArchive.length === 0) {
        logger.info('No audit logs to archive')
        return 0
      }

      // 在事务中执行归档操作
      await prisma.$transaction(async (tx) => {
        // 1. 将日志复制到归档表
        await tx.archivedAuditLog.createMany({
          data: logsToArchive.map(log => ({
            id: log.id,
            userId: log.userId,
            username: log.username,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            changes: log.changes,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.timestamp
          }))
        })

        // 2. 从主表中删除已归档的日志
        await tx.auditLog.deleteMany({
          where: {
            timestamp: {
              lt: beforeDate
            }
          }
        })
      })

      logger.info('Audit logs archived successfully', {
        count: logsToArchive.length,
        beforeDate
      })

      return logsToArchive.length
    } catch (error) {
      logger.error('Failed to archive audit logs', { error, beforeDate })
      throw new Error('归档审计日志失败')
    }
  }

  /**
   * 查询归档的审计日志
   * 支持多条件过滤和分页
   */
  async listArchivedAuditLogs(query: AuditLogQuery): Promise<PaginatedAuditLogsResponse> {
    const {
      userId,
      username,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20
    } = query

    // 构建查询条件
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (username) {
      where.username = {
        contains: username,
        mode: 'insensitive'
      }
    }

    if (action) {
      where.action = action
    }

    if (resource) {
      where.resource = resource
    }

    if (resourceId) {
      where.resourceId = resourceId
    }

    // 时间范围过滤
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = startDate
      }
      if (endDate) {
        where.timestamp.lte = endDate
      }
    }

    try {
      // 并行查询总数和数据
      const [total, logs] = await Promise.all([
        prisma.archivedAuditLog.count({ where }),
        prisma.archivedAuditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      const totalPages = Math.ceil(total / pageSize)

      return {
        items: logs.map((log: any) => this.mapArchivedToResponse(log)),
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list archived audit logs', { error, query })
      throw new Error('查询归档审计日志失败')
    }
  }

  /**
   * 获取归档统计信息
   */
  async getArchiveStatistics(): Promise<{
    activeCount: number
    archivedCount: number
    oldestActive: Date | null
    oldestArchived: Date | null
  }> {
    try {
      const [activeCount, archivedCount, oldestActive, oldestArchived] = await Promise.all([
        prisma.auditLog.count(),
        prisma.archivedAuditLog.count(),
        prisma.auditLog.findFirst({
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true }
        }),
        prisma.archivedAuditLog.findFirst({
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true }
        })
      ])

      return {
        activeCount,
        archivedCount,
        oldestActive: oldestActive?.timestamp || null,
        oldestArchived: oldestArchived?.timestamp || null
      }
    } catch (error) {
      logger.error('Failed to get archive statistics', { error })
      throw new Error('获取归档统计失败')
    }
  }

  /**
   * 映射数据库模型到响应对象
   */
  private mapToResponse(auditLog: any): AuditLogResponse {
    return {
      id: auditLog.id,
      userId: auditLog.userId,
      username: auditLog.username,
      action: auditLog.action,
      resource: auditLog.resource,
      resourceId: auditLog.resourceId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      timestamp: auditLog.timestamp
    }
  }

  /**
   * 映射归档日志到响应对象
   */
  private mapArchivedToResponse(auditLog: any): AuditLogResponse {
    return {
      id: auditLog.id,
      userId: auditLog.userId,
      username: auditLog.username,
      action: auditLog.action,
      resource: auditLog.resource,
      resourceId: auditLog.resourceId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      timestamp: auditLog.timestamp
    }
  }
}

// 导出单例实例
export const auditLogService = new AuditLogService()
