import prisma from '../config/database'
import logger from '../config/logger'
import { Prisma } from '@prisma/client'

/**
 * 数据库性能监控服务
 * 提供数据库连接池、查询性能等监控功能
 */
class DatabaseMonitorService {
  /**
   * 获取数据库连接池状态
   * 
   * @returns 连接池状态信息
   */
  async getConnectionPoolStatus(): Promise<{
    activeConnections: number
    idleConnections: number
    totalConnections: number
    waitingRequests: number
  }> {
    try {
      // 查询 PostgreSQL 连接状态
      const result = await prisma.$queryRaw<Array<{
        state: string
        count: bigint
      }>>`
        SELECT 
          state,
          COUNT(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `

      let activeConnections = 0
      let idleConnections = 0

      for (const row of result) {
        const count = Number(row.count)
        if (row.state === 'active') {
          activeConnections = count
        } else if (row.state === 'idle') {
          idleConnections = count
        }
      }

      const totalConnections = activeConnections + idleConnections

      return {
        activeConnections,
        idleConnections,
        totalConnections,
        waitingRequests: 0 // Prisma 不直接暴露等待队列信息
      }
    } catch (error) {
      logger.error('Failed to get connection pool status', { error })
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        waitingRequests: 0
      }
    }
  }

  /**
   * 获取慢查询列表
   * 
   * @param limit 返回数量限制
   * @returns 慢查询列表
   */
  async getSlowQueries(limit: number = 10): Promise<Array<{
    query: string
    calls: number
    totalTime: number
    meanTime: number
    maxTime: number
  }>> {
    try {
      // 需要启用 pg_stat_statements 扩展
      const result = await prisma.$queryRaw<Array<{
        query: string
        calls: bigint
        total_time: number
        mean_time: number
        max_time: number
      }>>`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          max_time
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_time DESC
        LIMIT ${limit}
      `

      return result.map(row => ({
        query: row.query,
        calls: Number(row.calls),
        totalTime: row.total_time,
        meanTime: row.mean_time,
        maxTime: row.max_time
      }))
    } catch (error) {
      logger.warn('pg_stat_statements extension not available or query failed', { error })
      return []
    }
  }

  /**
   * 获取表大小统计
   * 
   * @returns 表大小统计信息
   */
  async getTableSizes(): Promise<Array<{
    tableName: string
    rowCount: number
    totalSize: string
    indexSize: string
  }>> {
    try {
      const result = await prisma.$queryRaw<Array<{
        table_name: string
        row_count: bigint
        total_size: string
        index_size: string
      }>>`
        SELECT 
          schemaname || '.' || tablename AS table_name,
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `

      return result.map(row => ({
        tableName: row.table_name,
        rowCount: Number(row.row_count),
        totalSize: row.total_size,
        indexSize: row.index_size
      }))
    } catch (error) {
      logger.error('Failed to get table sizes', { error })
      return []
    }
  }

  /**
   * 获取索引使用统计
   * 
   * @returns 索引使用统计
   */
  async getIndexUsageStats(): Promise<Array<{
    tableName: string
    indexName: string
    indexScans: number
    indexSize: string
    indexUsagePercent: number
  }>> {
    try {
      const result = await prisma.$queryRaw<Array<{
        table_name: string
        index_name: string
        index_scans: bigint
        index_size: string
        index_usage_percent: number
      }>>`
        SELECT 
          schemaname || '.' || tablename AS table_name,
          indexname AS index_name,
          idx_scan AS index_scans,
          pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
          CASE 
            WHEN idx_scan = 0 THEN 0
            ELSE ROUND((idx_scan::numeric / NULLIF(seq_scan + idx_scan, 0)) * 100, 2)
          END AS index_usage_percent
        FROM pg_stat_user_indexes
        JOIN pg_stat_user_tables USING (schemaname, tablename)
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 30
      `

      return result.map(row => ({
        tableName: row.table_name,
        indexName: row.index_name,
        indexScans: Number(row.index_scans),
        indexSize: row.index_size,
        indexUsagePercent: row.index_usage_percent
      }))
    } catch (error) {
      logger.error('Failed to get index usage stats', { error })
      return []
    }
  }

  /**
   * 获取未使用的索引
   * 
   * @returns 未使用的索引列表
   */
  async getUnusedIndexes(): Promise<Array<{
    tableName: string
    indexName: string
    indexSize: string
  }>> {
    try {
      const result = await prisma.$queryRaw<Array<{
        table_name: string
        index_name: string
        index_size: string
      }>>`
        SELECT 
          schemaname || '.' || tablename AS table_name,
          indexname AS index_name,
          pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC
      `

      return result.map(row => ({
        tableName: row.table_name,
        indexName: row.index_name,
        indexSize: row.index_size
      }))
    } catch (error) {
      logger.error('Failed to get unused indexes', { error })
      return []
    }
  }

  /**
   * 获取缓存命中率
   * 
   * @returns 缓存命中率统计
   */
  async getCacheHitRatio(): Promise<{
    heapHitRatio: number
    indexHitRatio: number
  }> {
    try {
      const result = await prisma.$queryRaw<Array<{
        heap_hit_ratio: number
        index_hit_ratio: number
      }>>`
        SELECT 
          ROUND(
            (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100,
            2
          ) AS heap_hit_ratio,
          ROUND(
            (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0)) * 100,
            2
          ) AS index_hit_ratio
        FROM pg_statio_user_tables
      `

      if (result.length > 0) {
        return {
          heapHitRatio: result[0].heap_hit_ratio || 0,
          indexHitRatio: result[0].index_hit_ratio || 0
        }
      }

      return {
        heapHitRatio: 0,
        indexHitRatio: 0
      }
    } catch (error) {
      logger.error('Failed to get cache hit ratio', { error })
      return {
        heapHitRatio: 0,
        indexHitRatio: 0
      }
    }
  }

  /**
   * 分析表并更新统计信息
   * 
   * @param tableName 表名（可选，不指定则分析所有表）
   */
  async analyzeTable(tableName?: string): Promise<void> {
    try {
      if (tableName) {
        await prisma.$executeRawUnsafe(`ANALYZE "${tableName}"`)
        logger.info(`Analyzed table: ${tableName}`)
      } else {
        await prisma.$executeRaw`ANALYZE`
        logger.info('Analyzed all tables')
      }
    } catch (error) {
      logger.error('Failed to analyze table', { tableName, error })
      throw error
    }
  }

  /**
   * 清理表碎片（VACUUM）
   * 
   * @param tableName 表名（可选，不指定则清理所有表）
   * @param full 是否执行完全清理（会锁表）
   */
  async vacuumTable(tableName?: string, full: boolean = false): Promise<void> {
    try {
      const vacuumType = full ? 'VACUUM FULL' : 'VACUUM'
      
      if (tableName) {
        await prisma.$executeRawUnsafe(`${vacuumType} "${tableName}"`)
        logger.info(`Vacuumed table: ${tableName} (full: ${full})`)
      } else {
        await prisma.$executeRawUnsafe(vacuumType)
        logger.info(`Vacuumed all tables (full: ${full})`)
      }
    } catch (error) {
      logger.error('Failed to vacuum table', { tableName, full, error })
      throw error
    }
  }

  /**
   * 获取数据库性能概览
   * 
   * @returns 性能概览信息
   */
  async getPerformanceOverview(): Promise<{
    connectionPool: any
    cacheHitRatio: any
    topSlowQueries: any[]
    largestTables: any[]
    unusedIndexes: any[]
  }> {
    try {
      const [
        connectionPool,
        cacheHitRatio,
        topSlowQueries,
        largestTables,
        unusedIndexes
      ] = await Promise.all([
        this.getConnectionPoolStatus(),
        this.getCacheHitRatio(),
        this.getSlowQueries(5),
        this.getTableSizes().then(tables => tables.slice(0, 5)),
        this.getUnusedIndexes()
      ])

      return {
        connectionPool,
        cacheHitRatio,
        topSlowQueries,
        largestTables,
        unusedIndexes
      }
    } catch (error) {
      logger.error('Failed to get performance overview', { error })
      throw error
    }
  }

  /**
   * 检查数据库健康状态
   * 
   * @returns 健康状态信息
   */
  async checkHealth(): Promise<{
    isHealthy: boolean
    issues: string[]
    warnings: string[]
  }> {
    const issues: string[] = []
    const warnings: string[] = []

    try {
      // 检查连接池
      const poolStatus = await this.getConnectionPoolStatus()
      const poolUsage = poolStatus.activeConnections / poolStatus.totalConnections
      
      if (poolUsage > 0.9) {
        issues.push(`Connection pool usage is high: ${(poolUsage * 100).toFixed(1)}%`)
      } else if (poolUsage > 0.7) {
        warnings.push(`Connection pool usage is moderate: ${(poolUsage * 100).toFixed(1)}%`)
      }

      // 检查缓存命中率
      const cacheHitRatio = await this.getCacheHitRatio()
      
      if (cacheHitRatio.heapHitRatio < 90) {
        warnings.push(`Heap cache hit ratio is low: ${cacheHitRatio.heapHitRatio}%`)
      }
      
      if (cacheHitRatio.indexHitRatio < 90) {
        warnings.push(`Index cache hit ratio is low: ${cacheHitRatio.indexHitRatio}%`)
      }

      // 检查慢查询
      const slowQueries = await this.getSlowQueries(5)
      if (slowQueries.length > 0) {
        const slowestQuery = slowQueries[0]
        if (slowestQuery.meanTime > 5000) {
          issues.push(`Very slow query detected: ${slowestQuery.meanTime.toFixed(2)}ms average`)
        } else if (slowestQuery.meanTime > 1000) {
          warnings.push(`Slow query detected: ${slowestQuery.meanTime.toFixed(2)}ms average`)
        }
      }

      // 检查未使用的索引
      const unusedIndexes = await this.getUnusedIndexes()
      if (unusedIndexes.length > 5) {
        warnings.push(`${unusedIndexes.length} unused indexes found, consider removing them`)
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        warnings
      }
    } catch (error) {
      logger.error('Failed to check database health', { error })
      return {
        isHealthy: false,
        issues: ['Failed to perform health check'],
        warnings: []
      }
    }
  }
}

export default new DatabaseMonitorService()
