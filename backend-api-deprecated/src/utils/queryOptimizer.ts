import { Prisma } from '@prisma/client'
import logger from '../config/logger'

/**
 * 查询优化工具类
 * 提供常见的查询优化模式和最佳实践
 */
export class QueryOptimizer {
  /**
   * 构建分页查询参数（偏移分页）
   * 适用于小到中等数据量的分页查询
   * 
   * @param page 页码（从 1 开始）
   * @param pageSize 每页大小
   * @returns Prisma 分页参数
   */
  static buildOffsetPagination(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    return {
      skip,
      take: pageSize
    }
  }

  /**
   * 构建游标分页查询参数
   * 适用于大数据量的分页查询，性能更好
   * 
   * @param cursor 游标（上一页最后一条记录的 ID）
   * @param pageSize 每页大小
   * @returns Prisma 游标分页参数
   */
  static buildCursorPagination(cursor: string | undefined, pageSize: number) {
    return {
      take: pageSize + 1, // 多取一条用于判断是否有下一页
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0 // 跳过游标本身
    }
  }

  /**
   * 处理游标分页结果
   * 
   * @param items 查询结果
   * @param pageSize 每页大小
   * @returns 分页结果和下一页游标
   */
  static processCursorPaginationResult<T extends { id: string }>(
    items: T[],
    pageSize: number
  ): {
    items: T[]
    hasMore: boolean
    nextCursor: string | null
  } {
    const hasMore = items.length > pageSize
    const resultItems = hasMore ? items.slice(0, pageSize) : items
    const nextCursor = hasMore && resultItems.length > 0 
      ? resultItems[resultItems.length - 1].id 
      : null

    return {
      items: resultItems,
      hasMore,
      nextCursor
    }
  }

  /**
   * 构建字段选择参数
   * 只查询需要的字段，减少数据传输量
   * 
   * @param fields 字段名数组
   * @returns Prisma select 参数
   */
  static buildFieldSelection(fields: string[]): Record<string, boolean> | undefined {
    if (!fields || fields.length === 0) {
      return undefined
    }

    return fields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  /**
   * 构建日期范围查询条件
   * 
   * @param field 日期字段名
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns Prisma where 条件
   */
  static buildDateRangeFilter(
    field: string,
    startDate?: Date,
    endDate?: Date
  ): Record<string, any> {
    const filter: Record<string, any> = {}

    if (startDate || endDate) {
      filter[field] = {}
      if (startDate) {
        filter[field].gte = startDate
      }
      if (endDate) {
        filter[field].lte = endDate
      }
    }

    return filter
  }

  /**
   * 构建全文搜索查询条件（PostgreSQL）
   * 使用 to_tsvector 和 to_tsquery 进行全文搜索
   * 
   * @param searchTerm 搜索词
   * @param fields 搜索字段数组
   * @returns Prisma raw SQL 查询
   */
  static buildFullTextSearch(searchTerm: string, fields: string[]): Prisma.Sql {
    if (!searchTerm || fields.length === 0) {
      return Prisma.sql`TRUE`
    }

    // 清理搜索词，防止 SQL 注入
    const cleanTerm = searchTerm.replace(/[^\w\s]/g, ' ').trim()
    if (!cleanTerm) {
      return Prisma.sql`TRUE`
    }

    // 构建 COALESCE 字段连接
    const fieldConcat = fields
      .map(field => `COALESCE("${field}", '')`)
      .join(` || ' ' || `)

    return Prisma.sql`to_tsvector('simple', ${Prisma.raw(fieldConcat)}) @@ to_tsquery('simple', ${cleanTerm + ':*'})`
  }

  /**
   * 构建批量查询的 IN 条件
   * 自动分批处理大量 ID，避免 SQL 参数过多
   * 
   * @param ids ID 数组
   * @param batchSize 每批大小，默认 1000
   * @returns 分批后的 ID 数组
   */
  static splitIntoBatches<T>(items: T[], batchSize: number = 1000): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * 记录慢查询
   * 
   * @param queryName 查询名称
   * @param duration 执行时间（毫秒）
   * @param params 查询参数
   */
  static logSlowQuery(queryName: string, duration: number, params?: any): void {
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        queryName,
        duration: `${duration}ms`,
        params
      })
    }
  }

  /**
   * 执行带性能监控的查询
   * 
   * @param queryName 查询名称
   * @param queryFn 查询函数
   * @returns 查询结果
   */
  static async executeWithMonitoring<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime
      this.logSlowQuery(queryName, duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Query execution error', {
        queryName,
        duration: `${duration}ms`,
        error
      })
      throw error
    }
  }

  /**
   * 构建排序参数
   * 
   * @param sortBy 排序字段
   * @param sortOrder 排序方向
   * @returns Prisma orderBy 参数
   */
  static buildOrderBy(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Record<string, 'asc' | 'desc'> | undefined {
    if (!sortBy) {
      return undefined
    }

    return {
      [sortBy]: sortOrder
    }
  }

  /**
   * 优化 COUNT 查询
   * 对于大表，使用估算值而不是精确计数
   * 
   * @param tableName 表名
   * @param useEstimate 是否使用估算值
   * @returns COUNT 查询 SQL
   */
  static buildCountQuery(tableName: string, useEstimate: boolean = false): Prisma.Sql {
    if (useEstimate) {
      // 使用 PostgreSQL 统计信息估算行数（快速但不精确）
      return Prisma.sql`
        SELECT reltuples::bigint AS estimate
        FROM pg_class
        WHERE relname = ${tableName}
      `
    } else {
      // 精确计数（慢但准确）
      return Prisma.sql`SELECT COUNT(*) FROM ${Prisma.raw(`"${tableName}"`)}`
    }
  }

  /**
   * 构建批量更新的事务
   * 
   * @param updates 更新操作数组
   * @returns Prisma 事务数组
   */
  static buildBatchUpdateTransaction<T>(
    updates: Array<{ where: any; data: any }>,
    model: any
  ): any[] {
    return updates.map(({ where, data }) => 
      model.update({ where, data })
    )
  }

  /**
   * 优化关联查询
   * 使用 include 而不是多次单独查询
   * 
   * @param includes 关联字段数组
   * @returns Prisma include 参数
   */
  static buildInclude(includes: string[]): Record<string, boolean> | undefined {
    if (!includes || includes.length === 0) {
      return undefined
    }

    return includes.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  /**
   * 构建复合索引友好的查询条件
   * 确保查询条件的顺序与索引列顺序一致
   * 
   * @param conditions 查询条件对象
   * @param indexOrder 索引列顺序
   * @returns 重新排序的查询条件
   */
  static optimizeForCompositeIndex(
    conditions: Record<string, any>,
    indexOrder: string[]
  ): Record<string, any> {
    const optimized: Record<string, any> = {}
    
    // 按索引顺序添加条件
    for (const field of indexOrder) {
      if (conditions[field] !== undefined) {
        optimized[field] = conditions[field]
      }
    }
    
    // 添加其他条件
    for (const [key, value] of Object.entries(conditions)) {
      if (!indexOrder.includes(key)) {
        optimized[key] = value
      }
    }
    
    return optimized
  }
}

/**
 * 查询性能分析器
 * 用于分析和优化查询性能
 */
export class QueryAnalyzer {
  private static queryStats: Map<string, {
    count: number
    totalDuration: number
    maxDuration: number
    minDuration: number
  }> = new Map()

  /**
   * 记录查询统计
   * 
   * @param queryName 查询名称
   * @param duration 执行时间
   */
  static recordQuery(queryName: string, duration: number): void {
    const stats = this.queryStats.get(queryName) || {
      count: 0,
      totalDuration: 0,
      maxDuration: 0,
      minDuration: Infinity
    }

    stats.count++
    stats.totalDuration += duration
    stats.maxDuration = Math.max(stats.maxDuration, duration)
    stats.minDuration = Math.min(stats.minDuration, duration)

    this.queryStats.set(queryName, stats)
  }

  /**
   * 获取查询统计报告
   * 
   * @returns 统计报告
   */
  static getReport(): Array<{
    queryName: string
    count: number
    avgDuration: number
    maxDuration: number
    minDuration: number
  }> {
    const report: Array<any> = []

    for (const [queryName, stats] of this.queryStats.entries()) {
      report.push({
        queryName,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        maxDuration: stats.maxDuration,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration
      })
    }

    // 按平均执行时间降序排序
    return report.sort((a, b) => b.avgDuration - a.avgDuration)
  }

  /**
   * 重置统计数据
   */
  static reset(): void {
    this.queryStats.clear()
  }

  /**
   * 获取慢查询列表
   * 
   * @param threshold 慢查询阈值（毫秒）
   * @returns 慢查询列表
   */
  static getSlowQueries(threshold: number = 1000): Array<any> {
    const report = this.getReport()
    return report.filter(stat => stat.avgDuration > threshold)
  }
}

export default QueryOptimizer
