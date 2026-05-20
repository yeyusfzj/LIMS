// 增强的样品服务 - 支持游标分页和字段选择

import { PrismaClient, Sample, Prisma } from '@prisma/client'
import {
  parseOffsetPagination,
  parseCursorPagination,
  buildOffsetPaginationResult,
  buildCursorPaginationResult,
  parseFieldSelection,
  parseSortParams,
  OffsetPaginationResult,
  CursorPaginationResult
} from '../utils/paginationHelper'
import logger from '../config/logger'

const prisma = new PrismaClient()

/**
 * 样品查询参数（增强版）
 */
export interface EnhancedSampleQuery {
  // 偏移分页
  page?: number
  pageSize?: number
  
  // 游标分页
  cursor?: string
  limit?: number
  
  // 字段选择
  fields?: string
  
  // 排序
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  
  // 过滤条件
  barcode?: string
  sampleNumber?: string
  clientName?: string
  sampleType?: string
  status?: string
  priority?: string
  startDate?: Date
  endDate?: Date
}

/**
 * 允许选择的样品字段（白名单）
 */
const ALLOWED_SAMPLE_FIELDS = [
  'id',
  'barcode',
  'sampleNumber',
  'clientName',
  'clientContact',
  'sampleName',
  'sampleType',
  'sampleCategory',
  'quantity',
  'unit',
  'receivedDate',
  'samplingDate',
  'samplingLocation',
  'samplingPerson',
  'storageLocation',
  'storageCondition',
  'status',
  'priority',
  'description',
  'remarks',
  'createdAt',
  'updatedAt',
  'createdBy'
]

/**
 * 允许排序的字段（白名单）
 */
const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'receivedDate',
  'barcode',
  'sampleNumber',
  'clientName',
  'status',
  'priority'
]

export class EnhancedSampleService {
  /**
   * 构建查询条件
   */
  private buildWhereClause(query: EnhancedSampleQuery): Prisma.SampleWhereInput {
    const where: Prisma.SampleWhereInput = {}

    // 默认排除已归档的样品(软删除)
    // 除非明确指定要查询ARCHIVED状态
    if (query.status) {
      where.status = query.status as any
    } else {
      where.status = { not: 'ARCHIVED' as any }
    }

    if (query.barcode) {
      where.barcode = { contains: query.barcode, mode: 'insensitive' }
    }

    if (query.sampleNumber) {
      where.sampleNumber = { contains: query.sampleNumber, mode: 'insensitive' }
    }

    if (query.clientName) {
      where.clientName = { contains: query.clientName, mode: 'insensitive' }
    }

    if (query.sampleType) {
      where.sampleType = query.sampleType
    }

    if (query.priority) {
      where.priority = query.priority as any
    }

    if (query.startDate || query.endDate) {
      where.receivedDate = {}
      if (query.startDate) {
        where.receivedDate.gte = query.startDate
      }
      if (query.endDate) {
        where.receivedDate.lte = query.endDate
      }
    }

    return where
  }

  /**
   * 使用偏移分页查询样品列表
   * 适合小数据量和需要跳转到特定页的场景
   */
  async listSamplesWithOffset(
    query: EnhancedSampleQuery
  ): Promise<OffsetPaginationResult<Sample>> {
    try {
      const { page, pageSize, skip, take } = parseOffsetPagination({
        page: query.page,
        pageSize: query.pageSize
      })

      const where = this.buildWhereClause(query)
      const orderBy = parseSortParams(
        { sortBy: query.sortBy, sortOrder: query.sortOrder },
        ALLOWED_SORT_FIELDS,
        'createdAt'
      )

      // 解析字段选择
      const select = parseFieldSelection(query.fields, ALLOWED_SAMPLE_FIELDS)

      logger.info('Listing samples with offset pagination', {
        page,
        pageSize,
        hasFieldSelection: !!select
      })

      // 并行查询数据和总数
      const [items, total] = await Promise.all([
        prisma.sample.findMany({
          where,
          skip,
          take,
          orderBy,
          select: select as any
        }),
        prisma.sample.count({ where })
      ])

      return buildOffsetPaginationResult(items as Sample[], total, page, pageSize)
    } catch (error) {
      logger.error('Failed to list samples with offset pagination', { error, query })
      throw error
    }
  }

  /**
   * 使用游标分页查询样品列表
   * 适合大数据量和无限滚动的场景，性能更好
   */
  async listSamplesWithCursor(
    query: EnhancedSampleQuery
  ): Promise<CursorPaginationResult<Sample>> {
    try {
      const { cursor, limit, take } = parseCursorPagination({
        cursor: query.cursor,
        limit: query.limit
      })

      const where = this.buildWhereClause(query)
      const orderBy = parseSortParams(
        { sortBy: query.sortBy, sortOrder: query.sortOrder },
        ALLOWED_SORT_FIELDS,
        'createdAt'
      )

      // 解析字段选择
      const select = parseFieldSelection(query.fields, ALLOWED_SAMPLE_FIELDS)

      logger.info('Listing samples with cursor pagination', {
        cursor,
        limit,
        hasFieldSelection: !!select
      })

      // 查询数据（多取一条用于判断是否有下一页）
      const items = await prisma.sample.findMany({
        where,
        take,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0, // 跳过游标本身
        orderBy,
        select: select as any
      })

      // 可选：同时返回总数（会增加查询开销）
      // const total = await prisma.sample.count({ where })

      return buildCursorPaginationResult(
        items as Sample[],
        limit,
        (item) => item.id
        // total // 如果需要总数，取消注释
      )
    } catch (error) {
      logger.error('Failed to list samples with cursor pagination', { error, query })
      throw error
    }
  }

  /**
   * 获取样品详情（支持字段选择）
   */
  async getSampleWithFields(
    id: string,
    fields?: string
  ): Promise<Sample | null> {
    try {
      const select = parseFieldSelection(fields, ALLOWED_SAMPLE_FIELDS)

      logger.info('Getting sample with field selection', {
        id,
        hasFieldSelection: !!select
      })

      const sample = await prisma.sample.findUnique({
        where: { id },
        select: select as any,
        // 如果没有字段选择，包含关联数据
        include: select ? undefined : {
          testItems: true,
          results: true,
          transfers: {
            orderBy: { transferDate: 'desc' }
          },
          auditTasks: {
            orderBy: { submittedAt: 'desc' }
          },
          qualityJudgment: true,
          reports: true,
          parentSample: true,
          childSamples: true
        }
      })

      return sample as Sample | null
    } catch (error) {
      logger.error('Failed to get sample with fields', { error, id })
      throw error
    }
  }

  /**
   * 批量获取样品（支持字段选择）
   */
  async getSamplesByIds(
    ids: string[],
    fields?: string
  ): Promise<Sample[]> {
    try {
      const select = parseFieldSelection(fields, ALLOWED_SAMPLE_FIELDS)

      logger.info('Getting samples by IDs with field selection', {
        count: ids.length,
        hasFieldSelection: !!select
      })

      const samples = await prisma.sample.findMany({
        where: {
          id: { in: ids }
        },
        select: select as any
      })

      return samples as Sample[]
    } catch (error) {
      logger.error('Failed to get samples by IDs', { error, ids })
      throw error
    }
  }
}

export default new EnhancedSampleService()
