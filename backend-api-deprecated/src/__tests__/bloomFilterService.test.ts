import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import bloomFilterService from '../services/bloomFilterService'
import redisClient from '../config/redis'
import { connectRedis, disconnectRedis } from '../config/redis'

describe('BloomFilterService', () => {
  const filterName = 'test-filter'

  beforeAll(async () => {
    // 连接 Redis
    await connectRedis()
  })

  afterAll(async () => {
    // 断开 Redis 连接
    await disconnectRedis()
  })

  beforeEach(async () => {
    // 清理测试数据
    await bloomFilterService.clear(filterName)
  })

  afterEach(async () => {
    // 清理测试数据
    await bloomFilterService.clear(filterName)
  })

  describe('基础操作', () => {
    it('应该能够添加元素到布隆过滤器', async () => {
      await bloomFilterService.add(filterName, 'test-value-1')
      
      const exists = await bloomFilterService.mightExist(filterName, 'test-value-1')
      expect(exists).toBe(true)
    })

    it('应该能够检测不存在的元素', async () => {
      await bloomFilterService.add(filterName, 'test-value-1')
      
      const exists = await bloomFilterService.mightExist(filterName, 'non-existent')
      expect(exists).toBe(false)
    })

    it('应该能够批量添加元素', async () => {
      const values = ['value1', 'value2', 'value3', 'value4', 'value5']
      await bloomFilterService.addBatch(filterName, values)

      for (const value of values) {
        const exists = await bloomFilterService.mightExist(filterName, value)
        expect(exists).toBe(true)
      }
    })

    it('应该能够清除布隆过滤器', async () => {
      await bloomFilterService.add(filterName, 'test-value')
      await bloomFilterService.clear(filterName)

      const exists = await bloomFilterService.mightExist(filterName, 'test-value')
      expect(exists).toBe(false)
    })
  })

  describe('假阳性测试', () => {
    it('不应该产生假阴性', async () => {
      // 添加大量元素
      const values = Array.from({ length: 1000 }, (_, i) => `value-${i}`)
      await bloomFilterService.addBatch(filterName, values)

      // 验证所有添加的元素都能被检测到
      for (const value of values) {
        const exists = await bloomFilterService.mightExist(filterName, value)
        expect(exists).toBe(true)
      }
    })

    it('可能产生假阳性但概率较低', async () => {
      // 添加一些元素
      const addedValues = ['value1', 'value2', 'value3']
      await bloomFilterService.addBatch(filterName, addedValues)

      // 测试未添加的元素
      const notAddedValues = Array.from({ length: 100 }, (_, i) => `not-added-${i}`)
      let falsePositives = 0

      for (const value of notAddedValues) {
        const exists = await bloomFilterService.mightExist(filterName, value)
        if (exists) {
          falsePositives++
        }
      }

      // 假阳性率应该很低（通常 < 5%）
      const falsePositiveRate = falsePositives / notAddedValues.length
      expect(falsePositiveRate).toBeLessThan(0.1) // 小于 10%
    })
  })

  describe('初始化', () => {
    it('应该能够从加载器初始化布隆过滤器', async () => {
      const loader = async () => ['id1', 'id2', 'id3', 'id4', 'id5']
      
      await bloomFilterService.initialize(filterName, loader)

      const exists1 = await bloomFilterService.mightExist(filterName, 'id1')
      const exists2 = await bloomFilterService.mightExist(filterName, 'id3')
      const exists3 = await bloomFilterService.mightExist(filterName, 'id5')
      const notExists = await bloomFilterService.mightExist(filterName, 'id999')

      expect(exists1).toBe(true)
      expect(exists2).toBe(true)
      expect(exists3).toBe(true)
      expect(notExists).toBe(false)
    })

    it('不应该重复初始化已存在的布隆过滤器', async () => {
      let loaderCallCount = 0
      const loader = async () => {
        loaderCallCount++
        return ['id1', 'id2']
      }

      await bloomFilterService.initialize(filterName, loader)
      await bloomFilterService.initialize(filterName, loader)

      // 加载器应该只被调用一次
      expect(loaderCallCount).toBe(1)
    })
  })

  describe('性能测试', () => {
    it('应该能够快速检查大量元素', async () => {
      // 添加 10000 个元素
      const values = Array.from({ length: 10000 }, (_, i) => `value-${i}`)
      await bloomFilterService.addBatch(filterName, values)

      // 测试检查性能
      const startTime = Date.now()
      
      for (let i = 0; i < 1000; i++) {
        await bloomFilterService.mightExist(filterName, `value-${i}`)
      }

      const duration = Date.now() - startTime
      
      // 1000 次检查应该在 1 秒内完成
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('边界情况', () => {
    it('应该能够处理空字符串', async () => {
      await bloomFilterService.add(filterName, '')
      
      const exists = await bloomFilterService.mightExist(filterName, '')
      expect(exists).toBe(true)
    })

    it('应该能够处理特殊字符', async () => {
      const specialValues = [
        'test@example.com',
        'user-123',
        'value_with_underscore',
        '中文字符',
        '🎉 emoji'
      ]

      await bloomFilterService.addBatch(filterName, specialValues)

      for (const value of specialValues) {
        const exists = await bloomFilterService.mightExist(filterName, value)
        expect(exists).toBe(true)
      }
    })

    it('应该能够处理空数组', async () => {
      await bloomFilterService.addBatch(filterName, [])
      
      // 不应该抛出错误
      const exists = await bloomFilterService.mightExist(filterName, 'test')
      expect(exists).toBe(false)
    })
  })
})
