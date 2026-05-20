/**
 * 统计服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StatisticsService } from '../services/statisticsService'
import { PrismaClient, SampleStatus } from '@prisma/client'
import { redisClient } from '../config/redis'
import { StatisticsDimension, TimeGranularity } from '../types/statistics'

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    sample: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    SampleStatus: {
      REGISTERED: 'REGISTERED',
      IN_TESTING: 'IN_TESTING',
      TESTING_COMPLETE: 'TESTING_COMPLETE',
      IN_AUDIT: 'IN_AUDIT',
      AUDIT_COMPLETE: 'AUDIT_COMPLETE',
      RELEASED: 'RELEASED',
      ARCHIVED: 'ARCHIVED'
    }
  }
})

// Mock Redis
vi.mock('../config/redis', () => ({
  redisClient: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn()
  }
}))

// Mock Logger
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}))

describe('StatisticsService', () => {
  let prisma: any

  beforeEach(() => {
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('getStatistics', () => {
    it('应该返回按样品类型统计的数据', async () => {
      // 准备测试数据
      const mockSamples = [
        {
          id: '1',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-01'),
          releasedAt: new Date('2024-01-05'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '2',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-02'),
          releasedAt: new Date('2024-01-06'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '3',
          sampleType: '土壤',
          status: SampleStatus.IN_TESTING,
          createdAt: new Date('2024-01-03'),
          qualityJudgment: null,
          testItems: []
        }
      ]

      prisma.sample.findMany.mockResolvedValue(mockSamples)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: false
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('summary')
      expect((result as any).data).toHaveLength(2) // 水质和土壤两组
      expect((result as any).fromCache).toBe(false)
    })

    it('应该从缓存返回数据', async () => {
      const cachedResult = {
        query: { dimensions: [StatisticsDimension.SAMPLE_TYPE] },
        data: [],
        summary: { totalCount: 0, totalCompleted: 0, avgDuration: 0, qualifiedRate: 0 },
        fromCache: false,
        generatedAt: new Date()
      }

      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedResult))

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: true
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      expect((result as any).fromCache).toBe(true)
      expect(prisma.sample.findMany).not.toHaveBeenCalled()
    })

    it('应该按时间维度统计数据', async () => {
      const mockSamples = [
        {
          id: '1',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-01'),
          releasedAt: new Date('2024-01-05'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '2',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-15'),
          releasedAt: new Date('2024-01-20'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '3',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-02-01'),
          releasedAt: new Date('2024-02-05'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        }
      ]

      prisma.sample.findMany.mockResolvedValue(mockSamples)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const query = {
        dimensions: [StatisticsDimension.TIME],
        timeGranularity: TimeGranularity.MONTH,
        useCache: false
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      expect((result as any).data).toHaveLength(2) // 2024-01 和 2024-02 两个月
    })

    it('应该正确计算统计指标', async () => {
      const mockSamples = [
        {
          id: '1',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-01'),
          releasedAt: new Date('2024-01-05'), // 4天
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '2',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-02'),
          releasedAt: new Date('2024-01-08'), // 6天
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '3',
          sampleType: '水质',
          status: SampleStatus.IN_TESTING,
          createdAt: new Date('2024-01-03'),
          qualityJudgment: null,
          testItems: []
        }
      ]

      prisma.sample.findMany.mockResolvedValue(mockSamples)
      prisma.sample.count.mockResolvedValue(3) // 确保不会触发异步任务
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: false
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      // 确保返回的是统计结果而不是异步任务
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('summary')
      
      // 类型断言为 StatisticsResult
      const statsResult = result as any
      expect(statsResult.summary).toBeDefined()
      expect(statsResult.summary.totalCount).toBe(3)
      expect(statsResult.summary.totalCompleted).toBe(2)
      expect(statsResult.summary.avgDuration).toBeCloseTo(5, 1) // 平均5天
      expect(statsResult.summary.qualifiedRate).toBeCloseTo(66.67, 1) // 2/3 = 66.67%
    })

    it('应该支持多维度统计', async () => {
      const mockSamples = [
        {
          id: '1',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-01'),
          releasedAt: new Date('2024-01-05'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        },
        {
          id: '2',
          sampleType: '水质',
          status: SampleStatus.IN_TESTING,
          createdAt: new Date('2024-01-02'),
          qualityJudgment: null,
          testItems: []
        },
        {
          id: '3',
          sampleType: '土壤',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-03'),
          releasedAt: new Date('2024-01-08'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        }
      ]

      prisma.sample.findMany.mockResolvedValue(mockSamples)
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE, StatisticsDimension.STATUS],
        useCache: false
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      // 应该有3组：水质-RELEASED, 水质-IN_TESTING, 土壤-RELEASED
      expect((result as any).data).toHaveLength(3)
    })

    it('应该支持过滤条件', async () => {
      prisma.sample.findMany.mockResolvedValue([])
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        filters: {
          sampleType: ['水质', '土壤'],
          status: [SampleStatus.RELEASED]
        },
        useCache: false
      }

      await StatisticsService.getStatistics(query, 'user-1')

      expect(prisma.sample.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sampleType: { in: ['水质', '土壤'] },
            status: { in: [SampleStatus.RELEASED] }
          })
        })
      )
    })

    it('应该支持时间范围过滤', async () => {
      prisma.sample.findMany.mockResolvedValue([])
      vi.mocked(redisClient.get).mockResolvedValue(null)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        startDate,
        endDate,
        useCache: false
      }

      await StatisticsService.getStatistics(query, 'user-1')

      expect(prisma.sample.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          })
        })
      )
    })

    it('应该在数据量大时创建异步任务', async () => {
      prisma.sample.count.mockResolvedValue(15000) // 超过阈值

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: false
      }

      const result = await StatisticsService.getStatistics(query, 'user-1')

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('status')
      // 异步任务可能立即开始处理，所以状态可能是 pending 或 processing
      expect(['pending', 'processing']).toContain((result as any).status)
    })
  })

  describe('getAsyncTaskStatus', () => {
    it('应该返回异步任务状态', async () => {
      // 先创建一个异步任务
      prisma.sample.count.mockResolvedValue(15000)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: false
      }

      const task = await StatisticsService.getStatistics(query, 'user-1')
      const taskId = (task as any).id

      // 获取任务状态
      const status = await StatisticsService.getAsyncTaskStatus(taskId)

      expect(status).not.toBeNull()
      expect(status?.id).toBe(taskId)
    })

    it('应该在任务不存在时返回 null', async () => {
      const status = await StatisticsService.getAsyncTaskStatus('non-existent-id')

      expect(status).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('应该清除所有统计缓存', async () => {
      const mockKeys = ['stats:key1', 'stats:key2', 'stats:key3']
      vi.mocked(redisClient.keys).mockResolvedValue(mockKeys)
      vi.mocked(redisClient.del).mockResolvedValue(3)

      await StatisticsService.clearCache()

      expect(redisClient.keys).toHaveBeenCalledWith('stats:*')
      expect(redisClient.del).toHaveBeenCalledWith(...mockKeys)
    })

    it('应该支持按模式清除缓存', async () => {
      const mockKeys = ['stats:type:water']
      vi.mocked(redisClient.keys).mockResolvedValue(mockKeys)
      vi.mocked(redisClient.del).mockResolvedValue(1)

      await StatisticsService.clearCache('stats:type:*')

      expect(redisClient.keys).toHaveBeenCalledWith('stats:type:*')
      expect(redisClient.del).toHaveBeenCalledWith(...mockKeys)
    })

    it('应该在没有缓存时不执行删除', async () => {
      vi.mocked(redisClient.keys).mockResolvedValue([])

      await StatisticsService.clearCache()

      expect(redisClient.del).not.toHaveBeenCalled()
    })
  })

  describe('缓存机制', () => {
    it('应该将统计结果保存到缓存', async () => {
      const mockSamples = [
        {
          id: '1',
          sampleType: '水质',
          status: SampleStatus.RELEASED,
          createdAt: new Date('2024-01-01'),
          releasedAt: new Date('2024-01-05'),
          qualityJudgment: { result: 'QUALIFIED' },
          testItems: []
        }
      ]

      prisma.sample.findMany.mockResolvedValue(mockSamples)
      prisma.sample.count.mockResolvedValue(1) // 确保不会触发异步任务
      vi.mocked(redisClient.get).mockResolvedValue(null)
      vi.mocked(redisClient.setex).mockResolvedValue('OK')

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: true
      }

      await StatisticsService.getStatistics(query, 'user-1')

      expect(redisClient.setex).toHaveBeenCalled()
      const setexCall = vi.mocked(redisClient.setex).mock.calls[0]
      expect(setexCall[0]).toMatch(/^stats:/) // 缓存键以 stats: 开头
      expect(setexCall[1]).toBe(600) // TTL 为 600 秒
    })

    it('应该在 useCache 为 false 时跳过缓存', async () => {
      const mockSamples = []
      prisma.sample.findMany.mockResolvedValue(mockSamples)

      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        useCache: false
      }

      await StatisticsService.getStatistics(query, 'user-1')

      expect(redisClient.get).not.toHaveBeenCalled()
      expect(redisClient.setex).not.toHaveBeenCalled()
    })
  })
})
