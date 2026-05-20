import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../config/database'
import databaseMonitorService from '../services/databaseMonitorService'
import QueryOptimizer, { QueryAnalyzer } from '../utils/queryOptimizer'

describe('Database Optimization', () => {
  beforeAll(async () => {
    // 确保数据库连接
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Connection Pool', () => {
    it('should get connection pool status', async () => {
      const status = await databaseMonitorService.getConnectionPoolStatus()

      expect(status).toHaveProperty('activeConnections')
      expect(status).toHaveProperty('idleConnections')
      expect(status).toHaveProperty('totalConnections')
      expect(status).toHaveProperty('waitingRequests')

      expect(typeof status.activeConnections).toBe('number')
      expect(typeof status.idleConnections).toBe('number')
      expect(typeof status.totalConnections).toBe('number')
      expect(status.totalConnections).toBeGreaterThanOrEqual(0)
    })

    it('should have reasonable connection pool size', async () => {
      const status = await databaseMonitorService.getConnectionPoolStatus()
      
      // 连接池总数应该在合理范围内（1-50）
      expect(status.totalConnections).toBeGreaterThan(0)
      expect(status.totalConnections).toBeLessThanOrEqual(50)
    })
  })

  describe('Cache Hit Ratio', () => {
    it('should get cache hit ratio', async () => {
      const ratio = await databaseMonitorService.getCacheHitRatio()

      expect(ratio).toHaveProperty('heapHitRatio')
      expect(ratio).toHaveProperty('indexHitRatio')

      expect(typeof ratio.heapHitRatio).toBe('number')
      expect(typeof ratio.indexHitRatio).toBe('number')

      // 缓存命中率应该在 0-100 之间
      expect(ratio.heapHitRatio).toBeGreaterThanOrEqual(0)
      expect(ratio.heapHitRatio).toBeLessThanOrEqual(100)
      expect(ratio.indexHitRatio).toBeGreaterThanOrEqual(0)
      expect(ratio.indexHitRatio).toBeLessThanOrEqual(100)
    })

    it('should have good cache hit ratio in production', async () => {
      // 仅在生产环境检查
      if (process.env.NODE_ENV === 'production') {
        const ratio = await databaseMonitorService.getCacheHitRatio()

        // 生产环境缓存命中率应该 > 90%
        expect(ratio.heapHitRatio).toBeGreaterThan(90)
        expect(ratio.indexHitRatio).toBeGreaterThan(90)
      }
    })
  })

  describe('Table Sizes', () => {
    it('should get table sizes', async () => {
      const sizes = await databaseMonitorService.getTableSizes()

      expect(Array.isArray(sizes)).toBe(true)

      if (sizes.length > 0) {
        const firstTable = sizes[0]
        expect(firstTable).toHaveProperty('tableName')
        expect(firstTable).toHaveProperty('rowCount')
        expect(firstTable).toHaveProperty('totalSize')
        expect(firstTable).toHaveProperty('indexSize')

        expect(typeof firstTable.tableName).toBe('string')
        expect(typeof firstTable.rowCount).toBe('number')
        expect(typeof firstTable.totalSize).toBe('string')
        expect(typeof firstTable.indexSize).toBe('string')
      }
    })
  })

  describe('Index Usage', () => {
    it('should get index usage stats', async () => {
      const stats = await databaseMonitorService.getIndexUsageStats()

      expect(Array.isArray(stats)).toBe(true)

      if (stats.length > 0) {
        const firstIndex = stats[0]
        expect(firstIndex).toHaveProperty('tableName')
        expect(firstIndex).toHaveProperty('indexName')
        expect(firstIndex).toHaveProperty('indexScans')
        expect(firstIndex).toHaveProperty('indexSize')
        expect(firstIndex).toHaveProperty('indexUsagePercent')

        expect(typeof firstIndex.indexScans).toBe('number')
        expect(firstIndex.indexScans).toBeGreaterThanOrEqual(0)
      }
    })

    it('should get unused indexes', async () => {
      const unusedIndexes = await databaseMonitorService.getUnusedIndexes()

      expect(Array.isArray(unusedIndexes)).toBe(true)

      if (unusedIndexes.length > 0) {
        const firstIndex = unusedIndexes[0]
        expect(firstIndex).toHaveProperty('tableName')
        expect(firstIndex).toHaveProperty('indexName')
        expect(firstIndex).toHaveProperty('indexSize')
      }
    })
  })

  describe('Database Health', () => {
    it('should check database health', async () => {
      const health = await databaseMonitorService.checkHealth()

      expect(health).toHaveProperty('isHealthy')
      expect(health).toHaveProperty('issues')
      expect(health).toHaveProperty('warnings')

      expect(typeof health.isHealthy).toBe('boolean')
      expect(Array.isArray(health.issues)).toBe(true)
      expect(Array.isArray(health.warnings)).toBe(true)
    })

    it('should be healthy in test environment', async () => {
      const health = await databaseMonitorService.checkHealth()

      // 测试环境应该是健康的
      expect(health.isHealthy).toBe(true)
      expect(health.issues.length).toBe(0)
    })
  })

  describe('Performance Overview', () => {
    it('should get performance overview', async () => {
      const overview = await databaseMonitorService.getPerformanceOverview()

      expect(overview).toHaveProperty('connectionPool')
      expect(overview).toHaveProperty('cacheHitRatio')
      expect(overview).toHaveProperty('topSlowQueries')
      expect(overview).toHaveProperty('largestTables')
      expect(overview).toHaveProperty('unusedIndexes')

      expect(Array.isArray(overview.topSlowQueries)).toBe(true)
      expect(Array.isArray(overview.largestTables)).toBe(true)
      expect(Array.isArray(overview.unusedIndexes)).toBe(true)
    })
  })

  describe('Query Optimizer', () => {
    describe('Pagination', () => {
      it('should build offset pagination', () => {
        const pagination = QueryOptimizer.buildOffsetPagination(2, 20)

        expect(pagination).toHaveProperty('skip')
        expect(pagination).toHaveProperty('take')
        expect(pagination.skip).toBe(20) // (2-1) * 20
        expect(pagination.take).toBe(20)
      })

      it('should build cursor pagination', () => {
        const cursor = 'test-cursor-id'
        const pagination = QueryOptimizer.buildCursorPagination(cursor, 20)

        expect(pagination).toHaveProperty('take')
        expect(pagination).toHaveProperty('cursor')
        expect(pagination).toHaveProperty('skip')
        expect(pagination.take).toBe(21) // pageSize + 1
        expect(pagination.cursor).toEqual({ id: cursor })
        expect(pagination.skip).toBe(1)
      })

      it('should process cursor pagination result', () => {
        const items = Array.from({ length: 21 }, (_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`
        }))

        const result = QueryOptimizer.processCursorPaginationResult(items, 20)

        expect(result).toHaveProperty('items')
        expect(result).toHaveProperty('hasMore')
        expect(result).toHaveProperty('nextCursor')

        expect(result.items.length).toBe(20)
        expect(result.hasMore).toBe(true)
        expect(result.nextCursor).toBe('item-19')
      })
    })

    describe('Field Selection', () => {
      it('should build field selection', () => {
        const fields = ['id', 'name', 'status']
        const selection = QueryOptimizer.buildFieldSelection(fields)

        expect(selection).toEqual({
          id: true,
          name: true,
          status: true
        })
      })

      it('should return undefined for empty fields', () => {
        const selection = QueryOptimizer.buildFieldSelection([])
        expect(selection).toBeUndefined()
      })
    })

    describe('Date Range Filter', () => {
      it('should build date range filter with both dates', () => {
        const startDate = new Date('2024-01-01')
        const endDate = new Date('2024-12-31')

        const filter = QueryOptimizer.buildDateRangeFilter(
          'createdAt',
          startDate,
          endDate
        )

        expect(filter).toHaveProperty('createdAt')
        expect(filter.createdAt).toHaveProperty('gte')
        expect(filter.createdAt).toHaveProperty('lte')
        expect(filter.createdAt.gte).toBe(startDate)
        expect(filter.createdAt.lte).toBe(endDate)
      })

      it('should build date range filter with only start date', () => {
        const startDate = new Date('2024-01-01')

        const filter = QueryOptimizer.buildDateRangeFilter(
          'createdAt',
          startDate
        )

        expect(filter).toHaveProperty('createdAt')
        expect(filter.createdAt).toHaveProperty('gte')
        expect(filter.createdAt).not.toHaveProperty('lte')
      })

      it('should return empty filter for no dates', () => {
        const filter = QueryOptimizer.buildDateRangeFilter('createdAt')
        expect(filter).toEqual({})
      })
    })

    describe('Batch Operations', () => {
      it('should split items into batches', () => {
        const items = Array.from({ length: 2500 }, (_, i) => i)
        const batches = QueryOptimizer.splitIntoBatches(items, 1000)

        expect(batches.length).toBe(3)
        expect(batches[0].length).toBe(1000)
        expect(batches[1].length).toBe(1000)
        expect(batches[2].length).toBe(500)
      })

      it('should handle small arrays', () => {
        const items = [1, 2, 3]
        const batches = QueryOptimizer.splitIntoBatches(items, 1000)

        expect(batches.length).toBe(1)
        expect(batches[0].length).toBe(3)
      })
    })

    describe('Order By', () => {
      it('should build order by', () => {
        const orderBy = QueryOptimizer.buildOrderBy('createdAt', 'desc')

        expect(orderBy).toEqual({
          createdAt: 'desc'
        })
      })

      it('should return undefined for no sort field', () => {
        const orderBy = QueryOptimizer.buildOrderBy()
        expect(orderBy).toBeUndefined()
      })
    })

    describe('Include', () => {
      it('should build include', () => {
        const includes = ['user', 'role', 'permissions']
        const include = QueryOptimizer.buildInclude(includes)

        expect(include).toEqual({
          user: true,
          role: true,
          permissions: true
        })
      })

      it('should return undefined for empty includes', () => {
        const include = QueryOptimizer.buildInclude([])
        expect(include).toBeUndefined()
      })
    })

    describe('Composite Index Optimization', () => {
      it('should optimize conditions for composite index', () => {
        const conditions = {
          name: 'test',
          status: 'active',
          createdAt: new Date()
        }
        const indexOrder = ['status', 'createdAt', 'name']

        const optimized = QueryOptimizer.optimizeForCompositeIndex(
          conditions,
          indexOrder
        )

        const keys = Object.keys(optimized)
        expect(keys[0]).toBe('status')
        expect(keys[1]).toBe('createdAt')
        expect(keys[2]).toBe('name')
      })
    })
  })

  describe('Query Analyzer', () => {
    beforeEach(() => {
      QueryAnalyzer.reset()
    })

    it('should record query statistics', () => {
      QueryAnalyzer.recordQuery('testQuery', 100)
      QueryAnalyzer.recordQuery('testQuery', 200)
      QueryAnalyzer.recordQuery('testQuery', 150)

      const report = QueryAnalyzer.getReport()

      expect(report.length).toBe(1)
      expect(report[0].queryName).toBe('testQuery')
      expect(report[0].count).toBe(3)
      expect(report[0].avgDuration).toBe(150)
      expect(report[0].maxDuration).toBe(200)
      expect(report[0].minDuration).toBe(100)
    })

    it('should get slow queries', () => {
      QueryAnalyzer.recordQuery('fastQuery', 50)
      QueryAnalyzer.recordQuery('slowQuery', 1500)
      QueryAnalyzer.recordQuery('mediumQuery', 500)

      const slowQueries = QueryAnalyzer.getSlowQueries(1000)

      expect(slowQueries.length).toBe(1)
      expect(slowQueries[0].queryName).toBe('slowQuery')
    })

    it('should reset statistics', () => {
      QueryAnalyzer.recordQuery('testQuery', 100)
      QueryAnalyzer.reset()

      const report = QueryAnalyzer.getReport()
      expect(report.length).toBe(0)
    })
  })

  describe('Index Verification', () => {
    it('should have performance indexes created', async () => {
      // 查询所有索引
      const indexes = await prisma.$queryRaw<Array<{
        indexname: string
        tablename: string
      }>>`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      `

      // 验证关键索引存在
      const indexNames = indexes.map(idx => idx.indexname)

      // 样品表索引
      expect(indexNames).toContain('idx_samples_status_created')
      expect(indexNames).toContain('idx_samples_client_status')
      expect(indexNames).toContain('idx_samples_priority_status')
      expect(indexNames).toContain('idx_samples_received_date')

      // 审计日志索引
      expect(indexNames).toContain('idx_audit_logs_timestamp_desc')
      expect(indexNames).toContain('idx_audit_logs_user_timestamp')

      // 任务表索引
      expect(indexNames).toContain('idx_tasks_assigned_status')
      expect(indexNames).toContain('idx_tasks_created_at')
      expect(indexNames).toContain('idx_tasks_priority_status')

      // 检测结果表索引
      expect(indexNames).toContain('idx_results_sample_entered')
      expect(indexNames).toContain('idx_results_abnormal')
      expect(indexNames).toContain('idx_results_retest')
    })

    it('should have full-text search indexes', async () => {
      const indexes = await prisma.$queryRaw<Array<{
        indexname: string
        indexdef: string
      }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE '%fulltext%'
      `

      expect(indexes.length).toBeGreaterThan(0)

      // 验证全文搜索索引使用 GIN
      const sampleSearchIndex = indexes.find(
        idx => idx.indexname === 'idx_samples_fulltext_search'
      )
      expect(sampleSearchIndex).toBeDefined()
      expect(sampleSearchIndex?.indexdef).toContain('gin')
    })
  })
})
