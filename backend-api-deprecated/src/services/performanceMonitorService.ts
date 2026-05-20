import redis from '../config/redis'
import logger from '../config/logger'
import {
  ApiPerformanceMetric,
  DatabaseQueryMetric,
  SlowRequest,
  SlowQuery,
  PerformanceStats,
  PerformanceMonitorConfig,
  PathPerformanceStats
} from '../types/performance'
import { v4 as uuidv4 } from 'uuid'

/**
 * 性能监控服务
 * 负责收集、存储和分析 API 和数据库性能数据
 */
class PerformanceMonitorService {
  private config: PerformanceMonitorConfig = {
    slowRequestThreshold: 1000, // 1 秒
    slowQueryThreshold: 1000, // 1 秒
    enableDetailedLogging: process.env.NODE_ENV === 'development',
    logRequestBody: false,
    logResponseBody: false,
    dataRetentionHours: 24 // 保留 24 小时
  }

  // Redis 键前缀
  private readonly API_METRICS_KEY = 'performance:api:metrics'
  private readonly DB_METRICS_KEY = 'performance:db:metrics'
  private readonly SLOW_REQUESTS_KEY = 'performance:slow:requests'
  private readonly SLOW_QUERIES_KEY = 'performance:slow:queries'
  private readonly PATH_STATS_KEY = 'performance:path:stats'

  /**
   * 记录 API 请求性能指标
   */
  async recordApiMetric(metric: ApiPerformanceMetric): Promise<void> {
    try {
      // 记录到 Redis（使用有序集合，按时间戳排序）
      const score = metric.timestamp.getTime()
      const value = JSON.stringify(metric)
      
      await redis.zadd(this.API_METRICS_KEY, score, value)
      
      // 如果是慢请求，单独记录
      if (metric.duration >= this.config.slowRequestThreshold) {
        await this.recordSlowRequest({
          id: uuidv4(),
          method: metric.method,
          path: metric.path,
          duration: metric.duration,
          timestamp: metric.timestamp,
          userId: metric.userId,
          statusCode: metric.statusCode
        })
        
        logger.warn('Slow API request detected', {
          method: metric.method,
          path: metric.path,
          duration: `${metric.duration}ms`,
          statusCode: metric.statusCode
        })
      }
      
      // 更新路径统计
      await this.updatePathStats(metric)
      
      // 清理过期数据
      await this.cleanupExpiredData(this.API_METRICS_KEY)
    } catch (error) {
      logger.error('Failed to record API metric', { error, metric })
    }
  }

  /**
   * 记录数据库查询性能指标
   */
  async recordDatabaseMetric(metric: DatabaseQueryMetric): Promise<void> {
    try {
      const score = metric.timestamp.getTime()
      const value = JSON.stringify(metric)
      
      await redis.zadd(this.DB_METRICS_KEY, score, value)
      
      // 如果是慢查询，单独记录
      if (metric.duration >= this.config.slowQueryThreshold) {
        await this.recordSlowQuery({
          id: uuidv4(),
          query: metric.query,
          duration: metric.duration,
          timestamp: metric.timestamp,
          params: metric.params
        })
        
        logger.warn('Slow database query detected', {
          query: metric.query.substring(0, 100), // 只记录前 100 个字符
          duration: `${metric.duration}ms`,
          model: metric.model,
          operation: metric.operation
        })
      }
      
      // 清理过期数据
      await this.cleanupExpiredData(this.DB_METRICS_KEY)
    } catch (error) {
      logger.error('Failed to record database metric', { error })
    }
  }

  /**
   * 记录慢请求
   */
  private async recordSlowRequest(slowRequest: SlowRequest): Promise<void> {
    try {
      const score = slowRequest.timestamp.getTime()
      const value = JSON.stringify(slowRequest)
      
      await redis.zadd(this.SLOW_REQUESTS_KEY, score, value)
      
      // 限制慢请求记录数量（最多保留 1000 条）
      const count = await redis.zcard(this.SLOW_REQUESTS_KEY)
      if (count > 1000) {
        await redis.zremrangebyrank(this.SLOW_REQUESTS_KEY, 0, count - 1001)
      }
    } catch (error) {
      logger.error('Failed to record slow request', { error })
    }
  }

  /**
   * 记录慢查询
   */
  private async recordSlowQuery(slowQuery: SlowQuery): Promise<void> {
    try {
      const score = slowQuery.timestamp.getTime()
      const value = JSON.stringify(slowQuery)
      
      await redis.zadd(this.SLOW_QUERIES_KEY, score, value)
      
      // 限制慢查询记录数量（最多保留 1000 条）
      const count = await redis.zcard(this.SLOW_QUERIES_KEY)
      if (count > 1000) {
        await redis.zremrangebyrank(this.SLOW_QUERIES_KEY, 0, count - 1001)
      }
    } catch (error) {
      logger.error('Failed to record slow query', { error })
    }
  }

  /**
   * 更新路径统计
   */
  private async updatePathStats(metric: ApiPerformanceMetric): Promise<void> {
    try {
      const pathKey = `${this.PATH_STATS_KEY}:${metric.method}:${metric.path}`
      
      // 使用 Redis Hash 存储路径统计
      const multi = redis.multi()
      
      multi.hincrby(pathKey, 'requestCount', 1)
      multi.hincrbyfloat(pathKey, 'totalDuration', metric.duration)
      
      if (metric.statusCode >= 400) {
        multi.hincrby(pathKey, 'errorCount', 1)
      }
      
      // 更新最小/最大持续时间
      const stats = await redis.hgetall(pathKey)
      const minDuration = stats.minDuration ? parseFloat(stats.minDuration) : Infinity
      const maxDuration = stats.maxDuration ? parseFloat(stats.maxDuration) : 0
      
      if (metric.duration < minDuration) {
        multi.hset(pathKey, 'minDuration', metric.duration.toString())
      }
      if (metric.duration > maxDuration) {
        multi.hset(pathKey, 'maxDuration', metric.duration.toString())
      }
      
      // 设置过期时间
      multi.expire(pathKey, this.config.dataRetentionHours * 3600)
      
      await multi.exec()
      
      // 记录持续时间用于百分位数计算
      const durationsKey = `${pathKey}:durations`
      await redis.zadd(durationsKey, metric.duration, `${Date.now()}:${metric.duration}`)
      await redis.expire(durationsKey, this.config.dataRetentionHours * 3600)
      
      // 限制持续时间记录数量
      const count = await redis.zcard(durationsKey)
      if (count > 1000) {
        await redis.zremrangebyrank(durationsKey, 0, count - 1001)
      }
    } catch (error) {
      logger.error('Failed to update path stats', { error })
    }
  }

  /**
   * 获取慢请求列表
   */
  async getSlowRequests(limit: number = 100): Promise<SlowRequest[]> {
    try {
      // 获取最近的慢请求（按时间倒序）
      const results = await redis.zrevrange(this.SLOW_REQUESTS_KEY, 0, limit - 1)
      
      return results.map(result => JSON.parse(result) as SlowRequest)
    } catch (error) {
      logger.error('Failed to get slow requests', { error })
      return []
    }
  }

  /**
   * 获取慢查询列表
   */
  async getSlowQueries(limit: number = 100): Promise<SlowQuery[]> {
    try {
      const results = await redis.zrevrange(this.SLOW_QUERIES_KEY, 0, limit - 1)
      
      return results.map(result => JSON.parse(result) as SlowQuery)
    } catch (error) {
      logger.error('Failed to get slow queries', { error })
      return []
    }
  }

  /**
   * 获取性能统计数据
   */
  async getPerformanceStats(
    startTime?: Date,
    endTime?: Date
  ): Promise<PerformanceStats> {
    try {
      const start = startTime || new Date(Date.now() - 3600000) // 默认最近 1 小时
      const end = endTime || new Date()
      
      // 获取 API 指标
      const apiMetrics = await this.getMetricsInRange(
        this.API_METRICS_KEY,
        start,
        end
      )
      
      // 获取数据库指标
      const dbMetrics = await this.getMetricsInRange(
        this.DB_METRICS_KEY,
        start,
        end
      )
      
      // 计算 API 统计
      const apiStats = this.calculateApiStats(apiMetrics)
      
      // 计算数据库统计
      const databaseStats = this.calculateDatabaseStats(dbMetrics)
      
      return {
        apiStats,
        databaseStats,
        timeRange: {
          start,
          end
        }
      }
    } catch (error) {
      logger.error('Failed to get performance stats', { error })
      throw error
    }
  }

  /**
   * 获取路径性能统计
   */
  async getPathStats(limit: number = 50): Promise<PathPerformanceStats[]> {
    try {
      // 获取所有路径统计键
      const pattern = `${this.PATH_STATS_KEY}:*`
      const keys = await redis.keys(pattern)
      
      const stats: PathPerformanceStats[] = []
      
      for (const key of keys) {
        // 跳过持续时间记录键
        if (key.endsWith(':durations')) continue
        
        const data = await redis.hgetall(key)
        if (!data || Object.keys(data).length === 0) continue
        
        // 解析路径和方法
        const parts = key.replace(`${this.PATH_STATS_KEY}:`, '').split(':')
        const method = parts[0]
        const path = parts.slice(1).join(':')
        
        const requestCount = parseInt(data.requestCount || '0')
        const totalDuration = parseFloat(data.totalDuration || '0')
        const errorCount = parseInt(data.errorCount || '0')
        
        // 获取持续时间用于百分位数计算
        const durationsKey = `${key}:durations`
        const durations = await redis.zrange(durationsKey, 0, -1, 'WITHSCORES')
        const durationValues: number[] = []
        
        for (let i = 1; i < durations.length; i += 2) {
          durationValues.push(parseFloat(durations[i]))
        }
        
        durationValues.sort((a, b) => a - b)
        
        stats.push({
          path,
          method,
          requestCount,
          averageDuration: requestCount > 0 ? totalDuration / requestCount : 0,
          minDuration: parseFloat(data.minDuration || '0'),
          maxDuration: parseFloat(data.maxDuration || '0'),
          p50Duration: this.calculatePercentile(durationValues, 50),
          p95Duration: this.calculatePercentile(durationValues, 95),
          p99Duration: this.calculatePercentile(durationValues, 99),
          errorCount,
          errorRate: requestCount > 0 ? errorCount / requestCount : 0
        })
      }
      
      // 按请求数量排序
      stats.sort((a, b) => b.requestCount - a.requestCount)
      
      return stats.slice(0, limit)
    } catch (error) {
      logger.error('Failed to get path stats', { error })
      return []
    }
  }

  /**
   * 获取时间范围内的指标
   */
  private async getMetricsInRange(
    key: string,
    start: Date,
    end: Date
  ): Promise<any[]> {
    try {
      const results = await redis.zrangebyscore(
        key,
        start.getTime(),
        end.getTime()
      )
      
      return results.map(result => JSON.parse(result))
    } catch (error) {
      logger.error('Failed to get metrics in range', { error })
      return []
    }
  }

  /**
   * 计算 API 统计数据
   */
  private calculateApiStats(metrics: ApiPerformanceMetric[]): PerformanceStats['apiStats'] {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        slowRequestCount: 0,
        errorRate: 0
      }
    }
    
    const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const errorCount = metrics.filter(m => m.statusCode >= 400).length
    const slowRequestCount = metrics.filter(
      m => m.duration >= this.config.slowRequestThreshold
    ).length
    
    return {
      totalRequests: metrics.length,
      averageDuration: totalDuration / metrics.length,
      p50Duration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      slowRequestCount,
      errorRate: errorCount / metrics.length
    }
  }

  /**
   * 计算数据库统计数据
   */
  private calculateDatabaseStats(
    metrics: DatabaseQueryMetric[]
  ): PerformanceStats['databaseStats'] {
    if (metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueryCount: 0
      }
    }
    
    const durations = metrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const slowQueryCount = metrics.filter(
      m => m.duration >= this.config.slowQueryThreshold
    ).length
    
    return {
      totalQueries: metrics.length,
      averageDuration: totalDuration / metrics.length,
      slowQueryCount
    }
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)]
  }

  /**
   * 清理过期数据
   */
  private async cleanupExpiredData(key: string): Promise<void> {
    try {
      const cutoffTime = Date.now() - this.config.dataRetentionHours * 3600000
      await redis.zremrangebyscore(key, '-inf', cutoffTime)
    } catch (error) {
      logger.error('Failed to cleanup expired data', { error })
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Performance monitor config updated', this.config)
  }

  /**
   * 获取当前配置
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config }
  }

  /**
   * 清除所有性能数据
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        redis.del(this.API_METRICS_KEY),
        redis.del(this.DB_METRICS_KEY),
        redis.del(this.SLOW_REQUESTS_KEY),
        redis.del(this.SLOW_QUERIES_KEY)
      ])
      
      // 清除所有路径统计
      const pathKeys = await redis.keys(`${this.PATH_STATS_KEY}:*`)
      if (pathKeys.length > 0) {
        await redis.del(...pathKeys)
      }
      
      logger.info('All performance data cleared')
    } catch (error) {
      logger.error('Failed to clear performance data', { error })
      throw error
    }
  }
}

export default new PerformanceMonitorService()
