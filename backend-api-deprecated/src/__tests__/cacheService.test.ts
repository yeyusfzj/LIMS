import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import cacheService from '../services/cacheService'
import redisClient from '../config/redis'
import { connectRedis, disconnectRedis } from '../config/redis'

describe('CacheService', () => {
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
    await redisClient.flushDb()
  })

  afterEach(async () => {
    // 清理测试数据
    await redisClient.flushDb()
  })

  describe('基础操作', () => {
    it('应该能够设置和获取缓存', async () => {
      const key = 'test:key'
      const value = { id: '1', name: 'Test' }

      await cacheService.set(key, value, 60)
      const result = await cacheService.get(key)

      expect(result).toEqual(value)
    })

    it('应该在缓存不存在时返回 null', async () => {
      const result = await cacheService.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('应该能够删除缓存', async () => {
      const key = 'test:key'
      await cacheService.set(key, { data: 'test' }, 60)

      await cacheService.del(key)
      const result = await cacheService.get(key)

      expect(result).toBeNull()
    })

    it('应该能够检查缓存是否存在', async () => {
      const key = 'test:key'
      await cacheService.set(key, { data: 'test' }, 60)

      const exists = await cacheService.exists(key)
      expect(exists).toBe(true)

      const notExists = await cacheService.exists('non-existent')
      expect(notExists).toBe(false)
    })

    it('应该能够设置缓存过期时间', async () => {
      const key = 'test:key'
      await cacheService.set(key, { data: 'test' }, 60)

      await cacheService.expire(key, 120)
      const ttl = await cacheService.ttl(key)

      expect(ttl).toBeGreaterThan(60)
      expect(ttl).toBeLessThanOrEqual(120)
    })
  })

  describe('批量操作', () => {
    it('应该能够批量获取缓存', async () => {
      await cacheService.set('key1', { id: '1' }, 60)
      await cacheService.set('key2', { id: '2' }, 60)
      await cacheService.set('key3', { id: '3' }, 60)

      const results = await cacheService.mget(['key1', 'key2', 'key3', 'key4'])

      expect(results).toHaveLength(4)
      expect(results[0]).toEqual({ id: '1' })
      expect(results[1]).toEqual({ id: '2' })
      expect(results[2]).toEqual({ id: '3' })
      expect(results[3]).toBeNull()
    })

    it('应该能够批量设置缓存', async () => {
      const items = [
        { key: 'key1', value: { id: '1' } },
        { key: 'key2', value: { id: '2' } },
        { key: 'key3', value: { id: '3' } }
      ]

      await cacheService.mset(items, 60)

      const result1 = await cacheService.get('key1')
      const result2 = await cacheService.get('key2')
      const result3 = await cacheService.get('key3')

      expect(result1).toEqual({ id: '1' })
      expect(result2).toEqual({ id: '2' })
      expect(result3).toEqual({ id: '3' })
    })

    it('应该能够批量删除缓存', async () => {
      await cacheService.set('key1', { id: '1' }, 60)
      await cacheService.set('key2', { id: '2' }, 60)
      await cacheService.set('key3', { id: '3' }, 60)

      await cacheService.del(['key1', 'key2'])

      const result1 = await cacheService.get('key1')
      const result2 = await cacheService.get('key2')
      const result3 = await cacheService.get('key3')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
      expect(result3).toEqual({ id: '3' })
    })
  })

  describe('模式匹配删除', () => {
    it('应该能够删除匹配模式的所有缓存', async () => {
      await cacheService.set('user:1', { id: '1' }, 60)
      await cacheService.set('user:2', { id: '2' }, 60)
      await cacheService.set('sample:1', { id: '1' }, 60)

      await cacheService.delPattern('user:*')

      const user1 = await cacheService.get('user:1')
      const user2 = await cacheService.get('user:2')
      const sample1 = await cacheService.get('sample:1')

      expect(user1).toBeNull()
      expect(user2).toBeNull()
      expect(sample1).toEqual({ id: '1' })
    })
  })

  describe('空值缓存（缓存穿透防护）', () => {
    it('应该能够设置和检测空值缓存', async () => {
      const key = 'test:null'
      await cacheService.setNull(key, 60)

      const isNull = await cacheService.isNull(key)
      expect(isNull).toBe(true)

      const value = await cacheService.get(key)
      expect(value).toBeNull()
    })

    it('非空值缓存不应该被识别为空值', async () => {
      const key = 'test:value'
      await cacheService.set(key, { data: 'test' }, 60)

      const isNull = await cacheService.isNull(key)
      expect(isNull).toBe(false)
    })
  })

  describe('Cache-Aside 模式', () => {
    it('应该在缓存命中时返回缓存数据', async () => {
      const key = 'test:key'
      const cachedValue = { id: '1', name: 'Cached' }
      await cacheService.set(key, cachedValue, 60)

      const loader = vi.fn().mockResolvedValue({ id: '1', name: 'Fresh' })
      const result = await cacheService.getOrLoad(key, loader, 60)

      expect(result).toEqual(cachedValue)
      expect(loader).not.toHaveBeenCalled()
    })

    it('应该在缓存未命中时调用加载器', async () => {
      const key = 'test:key'
      const freshValue = { id: '1', name: 'Fresh' }
      const loader = vi.fn().mockResolvedValue(freshValue)

      const result = await cacheService.getOrLoad(key, loader, 60)

      expect(result).toEqual(freshValue)
      expect(loader).toHaveBeenCalledTimes(1)

      // 验证数据已被缓存
      const cached = await cacheService.get(key)
      expect(cached).toEqual(freshValue)
    })

    it('应该在加载器返回 null 时缓存空值', async () => {
      const key = 'test:key'
      const loader = vi.fn().mockResolvedValue(null)

      const result = await cacheService.getOrLoad(key, loader, 60)

      expect(result).toBeNull()
      expect(loader).toHaveBeenCalledTimes(1)

      // 验证空值已被缓存
      const isNull = await cacheService.isNull(key)
      expect(isNull).toBe(true)

      // 再次调用不应该触发加载器
      await cacheService.getOrLoad(key, loader, 60)
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  describe('计数器操作', () => {
    it('应该能够增加计数器', async () => {
      const key = 'counter:test'

      const result1 = await cacheService.incr(key, 1)
      expect(result1).toBe(1)

      const result2 = await cacheService.incr(key, 5)
      expect(result2).toBe(6)
    })

    it('应该能够减少计数器', async () => {
      const key = 'counter:test'

      await cacheService.incr(key, 10)
      const result1 = await cacheService.decr(key, 3)
      expect(result1).toBe(7)

      const result2 = await cacheService.decr(key, 2)
      expect(result2).toBe(5)
    })
  })

  describe('错误处理', () => {
    it('应该在 Redis 错误时优雅降级', async () => {
      // 模拟 Redis 错误
      const originalGet = redisClient.get
      redisClient.get = vi.fn().mockRejectedValue(new Error('Redis error'))

      const result = await cacheService.get('test:key')
      expect(result).toBeNull()

      // 恢复原始方法
      redisClient.get = originalGet
    })
  })
})
