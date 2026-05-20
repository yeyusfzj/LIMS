import performanceMonitorService from '../services/performanceMonitorService'
import redis from '../config/redis'
import { ApiPerformanceMetric, DatabaseQueryMetric } from '../types/performance'

describe('Performance Monitor Service', () => {
  beforeAll(async () => {
    // 确保 Redis 连接已建立
    if (!redis.isOpen) {
      await redis.connect()
    }
  })

  beforeEach(async () => {
    // 清除测试数据
    try {
      await performanceMonitorService.clearAllData()
    } catch (error) {
      // 如果清除失败，可能是 Redis 未连接，尝试重新连接
      if (!redis.isOpen) {
        await redis.connect()
      }
      await performanceMonitorService.clearAllData()
    }
  })

  afterAll(async () => {
    // 清理测试数据
    try {
      await performanceMonitorService.clearAllData()
    } catch (error) {
      // 忽略清理错误
    }
    
    // 断开 Redis 连接
    if (redis.isOpen) {
      await redis.quit()
    }
  })

  describe('API Performance Monitoring', () => {
    it('应该记录 API 请求性能指标', async () => {
      const metric: ApiPerformanceMetric = {
        method: 'GET',
        path: '/api/samples',
        statusCode: 200,
        duration: 150,
        timestamp: new Date(),
        userId: 'user-123',
        ip: '127.0.0.1'
      }

      await performanceMonitorService.recordApiMetric(metric)

      // 验证指标已记录
      const stats = await performanceMonitorService.getPerformanceStats()
      expect(stats.apiStats.totalRequests).toBe(1)
      expect(stats.apiStats.averageDuration).toBe(150)
    })

    it('应该识别并记录慢请求', async () => {
      const slowMetric: ApiPerformanceMetric = {
        method: 'POST',
        path: '/api/reports',
        statusCode: 200,
        duration: 2000, // 超过默认阈值 1000ms
        timestamp: new Date(),
        userId: 'user-123'
      }

      await performanceMonitorService.recordApiMetric(slowMetric)

      // 验证慢请求已记录
      const slowRequests = await performanceMonitorService.getSlowRequests()
      expect(slowRequests.length).toBe(1)
      expect(slowRequests[0].duration).toBe(2000)
      expect(slowRequests[0].path).toBe('/api/reports')
    })

    it('应该正确计算性能统计数据', async () => {
      // 记录多个请求
      const metrics: ApiPerformanceMetric[] = [
        { method: 'GET', path: '/api/samples', statusCode: 200, duration: 100, timestamp: new Date() },
        { method: 'GET', path: '/api/samples', statusCode: 200, duration: 200, timestamp: new Date() },
        { method: 'GET', path: '/api/samples', statusCode: 200, duration: 300, timestamp: new Date() },
        { method: 'GET', path: '/api/samples', statusCode: 500, duration: 400, timestamp: new Date() }
      ]

      for (const metric of metrics) {
        await performanceMonitorService.recordApiMetric(metric)
      }

      // 等待数据写入
      await new Promise(resolve => setTimeout(resolve, 100))

      const stats = await performanceMonitorService.getPerformanceStats()
      
      expect(stats.apiStats.totalRequests).toBe(4)
      expect(stats.apiStats.averageDuration).toBe(250) // (100+200+300+400)/4
      expect(stats.apiStats.errorRate).toBe(0.25) // 1/4
    })

    it('应该正确计算百分位数', async () => {
      // 记录多个不同持续时间的请求
      const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
      
      for (const duration of durations) {
        await performanceMonitorService.recordApiMetric({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration,
          timestamp: new Date()
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const stats = await performanceMonitorService.getPerformanceStats()
      
      expect(stats.apiStats.p50Duration).toBeGreaterThanOrEqual(500)
      expect(stats.apiStats.p95Duration).toBeGreaterThanOrEqual(900)
      expect(stats.apiStats.p99Duration).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('Database Performance Monitoring', () => {
    it('应该记录数据库查询性能指标', async () => {
      const metric: DatabaseQueryMetric = {
        query: 'SELECT * FROM samples WHERE id = $1',
        duration: 50,
        timestamp: new Date(),
        params: ['sample-123'],
        model: 'Sample',
        operation: 'findUnique'
      }

      await performanceMonitorService.recordDatabaseMetric(metric)

      const stats = await performanceMonitorService.getPerformanceStats()
      expect(stats.databaseStats.totalQueries).toBe(1)
      expect(stats.databaseStats.averageDuration).toBe(50)
    })

    it('应该识别并记录慢查询', async () => {
      const slowQuery: DatabaseQueryMetric = {
        query: 'SELECT * FROM samples JOIN results ON samples.id = results.sample_id',
        duration: 1500, // 超过默认阈值 1000ms
        timestamp: new Date(),
        model: 'Sample',
        operation: 'findMany'
      }

      await performanceMonitorService.recordDatabaseMetric(slowQuery)

      const slowQueries = await performanceMonitorService.getSlowQueries()
      expect(slowQueries.length).toBe(1)
      expect(slowQueries[0].duration).toBe(1500)
    })
  })

  describe('Path Statistics', () => {
    it('应该为每个路径维护统计信息', async () => {
      // 记录同一路径的多个请求
      const path = '/api/samples'
      const method = 'GET'

      for (let i = 0; i < 5; i++) {
        await performanceMonitorService.recordApiMetric({
          method,
          path,
          statusCode: 200,
          duration: (i + 1) * 100,
          timestamp: new Date()
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const pathStats = await performanceMonitorService.getPathStats()
      const stat = pathStats.find(s => s.path === path && s.method === method)

      expect(stat).toBeDefined()
      expect(stat!.requestCount).toBe(5)
      expect(stat!.averageDuration).toBe(300) // (100+200+300+400+500)/5
      expect(stat!.minDuration).toBe(100)
      expect(stat!.maxDuration).toBe(500)
    })

    it('应该正确计算错误率', async () => {
      const path = '/api/test'
      const method = 'POST'

      // 3 个成功请求，2 个失败请求
      for (let i = 0; i < 3; i++) {
        await performanceMonitorService.recordApiMetric({
          method,
          path,
          statusCode: 200,
          duration: 100,
          timestamp: new Date()
        })
      }

      for (let i = 0; i < 2; i++) {
        await performanceMonitorService.recordApiMetric({
          method,
          path,
          statusCode: 500,
          duration: 100,
          timestamp: new Date()
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const pathStats = await performanceMonitorService.getPathStats()
      const stat = pathStats.find(s => s.path === path && s.method === method)

      expect(stat).toBeDefined()
      expect(stat!.requestCount).toBe(5)
      expect(stat!.errorCount).toBe(2)
      expect(stat!.errorRate).toBe(0.4) // 2/5
    })
  })

  describe('Configuration Management', () => {
    it('应该允许更新配置', () => {
      const newConfig = {
        slowRequestThreshold: 2000,
        slowQueryThreshold: 1500
      }

      performanceMonitorService.updateConfig(newConfig)

      const config = performanceMonitorService.getConfig()
      expect(config.slowRequestThreshold).toBe(2000)
      expect(config.slowQueryThreshold).toBe(1500)
    })

    it('应该根据新阈值识别慢请求', async () => {
      // 设置更高的阈值
      performanceMonitorService.updateConfig({
        slowRequestThreshold: 3000
      })

      // 记录一个 2000ms 的请求（低于新阈值）
      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 2000,
        timestamp: new Date()
      })

      // 不应该被记录为慢请求
      const slowRequests = await performanceMonitorService.getSlowRequests()
      expect(slowRequests.length).toBe(0)

      // 记录一个 3500ms 的请求（超过新阈值）
      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 3500,
        timestamp: new Date()
      })

      // 应该被记录为慢请求
      const slowRequests2 = await performanceMonitorService.getSlowRequests()
      expect(slowRequests2.length).toBe(1)
    })
  })

  describe('Data Retention', () => {
    it('应该能够清除所有性能数据', async () => {
      // 记录一些数据
      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 100,
        timestamp: new Date()
      })

      await performanceMonitorService.recordDatabaseMetric({
        query: 'SELECT 1',
        duration: 10,
        timestamp: new Date()
      })

      // 清除数据
      await performanceMonitorService.clearAllData()

      // 验证数据已清除
      const stats = await performanceMonitorService.getPerformanceStats()
      expect(stats.apiStats.totalRequests).toBe(0)
      expect(stats.databaseStats.totalQueries).toBe(0)

      const slowRequests = await performanceMonitorService.getSlowRequests()
      expect(slowRequests.length).toBe(0)
    })
  })

  describe('Time Range Queries', () => {
    it('应该能够查询特定时间范围的统计数据', async () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 3600000)
      const twoHoursAgo = new Date(now.getTime() - 7200000)

      // 记录不同时间的请求
      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 100,
        timestamp: twoHoursAgo
      })

      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 200,
        timestamp: oneHourAgo
      })

      await performanceMonitorService.recordApiMetric({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 300,
        timestamp: now
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // 查询最近 1 小时的数据
      const stats = await performanceMonitorService.getPerformanceStats(
        oneHourAgo,
        now
      )

      // 应该只包含最近 1 小时的 2 个请求
      expect(stats.apiStats.totalRequests).toBe(2)
    })
  })

  describe('Slow Request Limits', () => {
    it('应该限制慢请求记录数量', async () => {
      // 记录超过 1000 个慢请求
      for (let i = 0; i < 1100; i++) {
        await performanceMonitorService.recordApiMetric({
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          duration: 2000, // 慢请求
          timestamp: new Date()
        })
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      // 应该只保留最近的 1000 个
      const slowRequests = await performanceMonitorService.getSlowRequests(2000)
      expect(slowRequests.length).toBeLessThanOrEqual(1000)
    })
  })
})
