/**
 * 统计数据聚合服务
 */

import { PrismaClient, SampleStatus } from '@prisma/client'
import { redisClient } from '../config/redis'
import { logger } from '../config/logger'
import {
  StatisticsQuery,
  StatisticsResult,
  StatisticsDataPoint,
  StatisticsDimension,
  TimeGranularity,
  AsyncStatisticsTask,
  StatisticsCacheKey
} from '../types/statistics'
import crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * 统计服务类
 */
export class StatisticsService {
  private static readonly CACHE_TTL = 600 // 10 分钟
  private static readonly ASYNC_THRESHOLD = 10000 // 超过此数量使用异步查询
  private static asyncTasks = new Map<string, AsyncStatisticsTask>()

  /**
   * 获取统计数据
   */
  static async getStatistics(query: StatisticsQuery, userId: string): Promise<StatisticsResult | AsyncStatisticsTask> {
    try {
      // 检查是否需要异步查询
      const estimatedCount = await this.estimateDataSize(query)
      
      if (query.async || estimatedCount > this.ASYNC_THRESHOLD) {
        return await this.createAsyncTask(query, userId)
      }

      // 尝试从缓存获取
      if (query.useCache !== false) {
        const cached = await this.getFromCache(query)
        if (cached) {
          logger.info('Statistics retrieved from cache')
          return cached
        }
      }

      // 执行统计查询
      const result = await this.executeStatisticsQuery(query)

      // 缓存结果
      if (query.useCache !== false) {
        await this.saveToCache(query, result)
      }

      return result
    } catch (error) {
      logger.error('Failed to get statistics', { error, query })
      throw error
    }
  }

  /**
   * 执行统计查询
   */
  private static async executeStatisticsQuery(query: StatisticsQuery): Promise<StatisticsResult> {
    const { dimensions, startDate, endDate, timeGranularity, filters } = query

    // 构建基础查询条件
    const whereClause: any = {}
    
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) whereClause.createdAt.gte = startDate
      if (endDate) whereClause.createdAt.lte = endDate
    }

    if (filters) {
      if (filters.sampleType?.length) {
        whereClause.sampleType = { in: filters.sampleType }
      }
      if (filters.status?.length) {
        whereClause.status = { in: filters.status }
      }
      if (filters.clientName?.length) {
        whereClause.clientName = { in: filters.clientName }
      }
    }

    // 获取样品数据
    const samples = await prisma.sample.findMany({
      where: whereClause,
      include: {
        testItems: true,
        qualityJudgment: true
      }
    })

    // 根据维度聚合数据
    const dataPoints = this.aggregateData(samples, dimensions, timeGranularity)

    // 计算汇总信息
    const summary = this.calculateSummary(samples)

    return {
      query,
      data: dataPoints,
      summary,
      fromCache: false,
      generatedAt: new Date()
    }
  }

  /**
   * 聚合数据
   */
  private static aggregateData(
    samples: any[],
    dimensions: StatisticsDimension[],
    timeGranularity?: TimeGranularity
  ): StatisticsDataPoint[] {
    const groups = new Map<string, any[]>()

    // 按维度分组
    for (const sample of samples) {
      const key = this.buildGroupKey(sample, dimensions, timeGranularity)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(sample)
    }

    // 计算每组的指标
    const dataPoints: StatisticsDataPoint[] = []
    
    for (const [key, groupSamples] of groups) {
      const dimensionValues = this.parseGroupKey(key, dimensions)
      const metrics = this.calculateMetrics(groupSamples)
      
      dataPoints.push({
        dimensions: dimensionValues,
        metrics
      })
    }

    return dataPoints
  }

  /**
   * 构建分组键
   */
  private static buildGroupKey(
    sample: any,
    dimensions: StatisticsDimension[],
    timeGranularity?: TimeGranularity
  ): string {
    const parts: string[] = []

    for (const dimension of dimensions) {
      switch (dimension) {
        case StatisticsDimension.TIME:
          parts.push(this.formatTimeKey(sample.createdAt, timeGranularity))
          break
        case StatisticsDimension.SAMPLE_TYPE:
          parts.push(sample.sampleType || 'unknown')
          break
        case StatisticsDimension.STATUS:
          parts.push(sample.status || 'unknown')
          break
        case StatisticsDimension.CLIENT:
          parts.push(sample.clientName || 'unknown')
          break
        case StatisticsDimension.DEPARTMENT:
          parts.push(sample.department || 'unknown')
          break
        default:
          parts.push('unknown')
      }
    }

    return parts.join('|')
  }

  /**
   * 解析分组键
   */
  private static parseGroupKey(key: string, dimensions: StatisticsDimension[]): Record<string, string> {
    const parts = key.split('|')
    const result: Record<string, string> = {}

    dimensions.forEach((dimension, index) => {
      result[dimension] = parts[index] || 'unknown'
    })

    return result
  }

  /**
   * 格式化时间键
   */
  private static formatTimeKey(date: Date, granularity?: TimeGranularity): string {
    const d = new Date(date)
    
    switch (granularity) {
      case TimeGranularity.DAY:
        return d.toISOString().split('T')[0]
      case TimeGranularity.WEEK:
        const week = this.getWeekNumber(d)
        return `${d.getFullYear()}-W${week}`
      case TimeGranularity.MONTH:
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      case TimeGranularity.QUARTER:
        const quarter = Math.floor(d.getMonth() / 3) + 1
        return `${d.getFullYear()}-Q${quarter}`
      case TimeGranularity.YEAR:
        return String(d.getFullYear())
      default:
        return d.toISOString().split('T')[0]
    }
  }

  /**
   * 获取周数
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  /**
   * 计算指标
   */
  private static calculateMetrics(samples: any[]): any {
    const count = samples.length
    const completedSamples = samples.filter(s => 
      s.status === SampleStatus.RELEASED || s.status === SampleStatus.ARCHIVED
    )
    const completedCount = completedSamples.length

    // 计算平均耗时
    let totalDuration = 0
    let durationCount = 0
    
    for (const sample of completedSamples) {
      if (sample.releasedAt) {
        const duration = (new Date(sample.releasedAt).getTime() - new Date(sample.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        totalDuration += duration
        durationCount++
      }
    }

    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0

    // 计算合格率
    const qualifiedSamples = samples.filter(s => 
      s.qualityJudgment?.result === 'QUALIFIED'
    )
    const qualifiedRate = count > 0 ? (qualifiedSamples.length / count) * 100 : 0

    return {
      count,
      completedCount,
      avgDuration: Math.round(avgDuration * 100) / 100,
      qualifiedRate: Math.round(qualifiedRate * 100) / 100
    }
  }

  /**
   * 计算汇总信息
   */
  private static calculateSummary(samples: any[]): any {
    const metrics = this.calculateMetrics(samples)
    return {
      totalCount: metrics.count,
      totalCompleted: metrics.completedCount,
      avgDuration: metrics.avgDuration,
      qualifiedRate: metrics.qualifiedRate
    }
  }

  /**
   * 估算数据量
   */
  private static async estimateDataSize(query: StatisticsQuery): Promise<number> {
    const whereClause: any = {}
    
    if (query.startDate || query.endDate) {
      whereClause.createdAt = {}
      if (query.startDate) whereClause.createdAt.gte = query.startDate
      if (query.endDate) whereClause.createdAt.lte = query.endDate
    }

    if (query.filters) {
      if (query.filters.sampleType?.length) {
        whereClause.sampleType = { in: query.filters.sampleType }
      }
      if (query.filters.status?.length) {
        whereClause.status = { in: query.filters.status }
      }
    }

    return await prisma.sample.count({ where: whereClause })
  }

  /**
   * 创建异步任务
   */
  private static async createAsyncTask(query: StatisticsQuery, userId: string): Promise<AsyncStatisticsTask> {
    const taskId = crypto.randomUUID()
    
    const task: AsyncStatisticsTask = {
      id: taskId,
      query,
      status: 'pending',
      createdAt: new Date(),
      userId
    }

    this.asyncTasks.set(taskId, task)

    // 异步执行任务
    this.processAsyncTask(taskId).catch(error => {
      logger.error('Async task failed', { taskId, error })
    })

    return task
  }

  /**
   * 处理异步任务
   */
  private static async processAsyncTask(taskId: string): Promise<void> {
    const task = this.asyncTasks.get(taskId)
    if (!task) return

    try {
      task.status = 'processing'
      
      const result = await this.executeStatisticsQuery(task.query)
      
      task.status = 'completed'
      task.result = result
      task.completedAt = new Date()

      // 通知用户（这里可以集成通知服务）
      logger.info('Async statistics task completed', { taskId, userId: task.userId })
      
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Async task processing failed', { taskId, error })
    }
  }

  /**
   * 获取异步任务状态
   */
  static async getAsyncTaskStatus(taskId: string): Promise<AsyncStatisticsTask | null> {
    return this.asyncTasks.get(taskId) || null
  }

  /**
   * 生成缓存键
   */
  private static generateCacheKey(query: StatisticsQuery): string {
    const cacheKey: StatisticsCacheKey = {
      dimensions: query.dimensions.sort(),
      timeGranularity: query.timeGranularity,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
      filters: query.filters ? JSON.stringify(query.filters) : undefined
    }

    const keyString = JSON.stringify(cacheKey)
    return `stats:${crypto.createHash('md5').update(keyString).digest('hex')}`
  }

  /**
   * 从缓存获取
   */
  private static async getFromCache(query: StatisticsQuery): Promise<StatisticsResult | null> {
    try {
      const key = this.generateCacheKey(query)
      const cached = await redisClient.get(key)
      
      if (cached) {
        const result = JSON.parse(cached) as StatisticsResult
        result.fromCache = true
        return result
      }
      
      return null
    } catch (error) {
      logger.error('Failed to get from cache', { error })
      return null
    }
  }

  /**
   * 保存到缓存
   */
  private static async saveToCache(query: StatisticsQuery, result: StatisticsResult): Promise<void> {
    try {
      const key = this.generateCacheKey(query)
      await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(result))
      logger.debug('Statistics saved to cache', { key })
    } catch (error) {
      logger.error('Failed to save to cache', { error })
    }
  }

  /**
   * 清除缓存
   */
  static async clearCache(pattern?: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern || 'stats:*')
      if (keys.length > 0) {
        await redisClient.del(...keys)
        logger.info('Statistics cache cleared', { count: keys.length })
      }
    } catch (error) {
      logger.error('Failed to clear cache', { error })
    }
  }
}
