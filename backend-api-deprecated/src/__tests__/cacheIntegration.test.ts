import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import cacheService from '../services/cacheService'
import bloomFilterService from '../services/bloomFilterService'
import cacheWarmupService from '../services/cacheWarmupService'
import cachedSampleService from '../services/cachedSampleService'
import prisma from '../config/database'
import redisClient from '../config/redis'
import { connectRedis, disconnectRedis } from '../config/redis'
import { connectDatabase, disconnectDatabase } from '../config/database'

describe('缓存系统集成测试', () => {
  beforeAll(async () => {
    // 连接数据库和 Redis
    await connectDatabase()
    await connectRedis()
  })

  afterAll(async () => {
    // 断开连接
    await disconnectDatabase()
    await disconnectRedis()
  })

  beforeEach(async () => {
    // 清理测试数据
    await redisClient.flushDb()
  })

  describe('缓存服务与数据库集成', () => {
    it('应该能够缓存数据库查询结果', async () => {
      // 创建测试用户
      const user = await prisma.user.create({
        data: {
          username: 'cache-test-user',
          passwordHash: 'hash',
          email: 'cache@test.com',
          fullName: 'Cache Test User'
        }
      })

      // 第一次查询（缓存未命中）
      const cacheKey = `user:${user.id}`
      const result1 = await cacheService.getOrLoad(
        cacheKey,
        async () => {
          return await prisma.user.findUnique({ where: { id: user.id } })
        },
        60
      )

      expect(result1).toBeTruthy()
      expect(result1?.username).toBe('cache-test-user')

      // 第二次查询（缓存命中）
      const result2 = await cacheService.get(cacheKey)
      expect(result2).toBeTruthy()
      expect(result2?.username).toBe('cache-test-user')

      // 清理
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('应该在数据更新后失效缓存', async () => {
      // 创建测试用户
      const user = await prisma.user.create({
        data: {
          username: 'update-test-user',
          passwordHash: 'hash',
          email: 'update@test.com',
          fullName: 'Update Test User'
        }
      })

      // 缓存用户数据
      const cacheKey = `user:${user.id}`
      await cacheService.set(cacheKey, user, 60)

      // 更新用户
      await prisma.user.update({
        where: { id: user.id },
        data: { fullName: 'Updated Name' }
      })

      // 删除缓存
      await cacheService.del(cacheKey)

      // 重新加载
      const updatedUser = await cacheService.getOrLoad(
        cacheKey,
        async () => {
          return await prisma.user.findUnique({ where: { id: user.id } })
        },
        60
      )

      expect(updatedUser?.fullName).toBe('Updated Name')

      // 清理
      await prisma.user.delete({ where: { id: user.id } })
    })
  })

  describe('布隆过滤器与数据库集成', () => {
    it('应该能够从数据库初始化布隆过滤器', async () => {
      // 创建测试用户
      const users = await Promise.all([
        prisma.user.create({
          data: {
            username: 'bloom-user-1',
            passwordHash: 'hash',
            email: 'bloom1@test.com',
            fullName: 'Bloom User 1'
          }
        }),
        prisma.user.create({
          data: {
            username: 'bloom-user-2',
            passwordHash: 'hash',
            email: 'bloom2@test.com',
            fullName: 'Bloom User 2'
          }
        })
      ])

      // 初始化布隆过滤器
      await bloomFilterService.initialize('test-users', async () => {
        const allUsers = await prisma.user.findMany({
          where: {
            username: { startsWith: 'bloom-user' }
          },
          select: { id: true }
        })
        return allUsers.map(u => u.id)
      })

      // 验证存在的用户
      const exists1 = await bloomFilterService.mightExist('test-users', users[0].id)
      const exists2 = await bloomFilterService.mightExist('test-users', users[1].id)
      expect(exists1).toBe(true)
      expect(exists2).toBe(true)

      // 验证不存在的用户
      const notExists = await bloomFilterService.mightExist('test-users', 'non-existent-id')
      expect(notExists).toBe(false)

      // 清理
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'bloom-user' } }
      })
      await bloomFilterService.clear('test-users')
    })
  })

  describe('缓存预热服务', () => {
    it('应该能够预热系统配置', async () => {
      await cacheWarmupService.warmup()

      // 验证系统配置已被缓存
      const maxUploadSize = await cacheService.get('system:max_upload_size')
      const sessionTimeout = await cacheService.get('system:session_timeout')

      expect(maxUploadSize).toBeTruthy()
      expect(sessionTimeout).toBeTruthy()
    })

    it('应该能够清除特定模块的缓存', async () => {
      // 设置一些测试缓存
      await cacheService.set('user:1', { id: '1' }, 60)
      await cacheService.set('user:2', { id: '2' }, 60)
      await cacheService.set('sample:1', { id: '1' }, 60)

      // 清除 user 模块缓存
      await cacheWarmupService.clearModule('user')

      // 验证 user 缓存已被清除
      const user1 = await cacheService.get('user:1')
      const user2 = await cacheService.get('user:2')
      expect(user1).toBeNull()
      expect(user2).toBeNull()

      // 验证其他模块缓存仍然存在
      const sample1 = await cacheService.get('sample:1')
      expect(sample1).toBeTruthy()
    })
  })

  describe('带缓存的样品服务', () => {
    it('应该能够使用缓存获取样品', async () => {
      // 创建测试样品
      const sample = await prisma.sample.create({
        data: {
          barcode: 'CACHE-TEST-001',
          sampleNumber: 'SN-CACHE-001',
          clientName: 'Cache Test Client',
          sampleName: 'Cache Test Sample',
          sampleType: 'Test',
          sampleCategory: 'Test',
          quantity: 100,
          unit: 'g',
          receivedDate: new Date(),
          status: 'REGISTERED',
          createdBy: 'test-user'
        }
      })

      // 添加到布隆过滤器
      await bloomFilterService.add('samples', sample.id)

      // 第一次获取（缓存未命中）
      const result1 = await cachedSampleService.getSample(sample.id)
      expect(result1).toBeTruthy()
      expect(result1?.barcode).toBe('CACHE-TEST-001')

      // 第二次获取（缓存命中）
      const result2 = await cachedSampleService.getSample(sample.id)
      expect(result2).toBeTruthy()
      expect(result2?.barcode).toBe('CACHE-TEST-001')

      // 验证缓存存在
      const cached = await cacheService.get(`sample:${sample.id}`)
      expect(cached).toBeTruthy()

      // 清理
      await prisma.sample.delete({ where: { id: sample.id } })
    })

    it('应该能够批量获取样品', async () => {
      // 创建多个测试样品
      const samples = await Promise.all([
        prisma.sample.create({
          data: {
            barcode: 'BATCH-001',
            sampleNumber: 'SN-BATCH-001',
            clientName: 'Batch Client',
            sampleName: 'Batch Sample 1',
            sampleType: 'Test',
            sampleCategory: 'Test',
            quantity: 100,
            unit: 'g',
            receivedDate: new Date(),
            status: 'REGISTERED',
            createdBy: 'test-user'
          }
        }),
        prisma.sample.create({
          data: {
            barcode: 'BATCH-002',
            sampleNumber: 'SN-BATCH-002',
            clientName: 'Batch Client',
            sampleName: 'Batch Sample 2',
            sampleType: 'Test',
            sampleCategory: 'Test',
            quantity: 100,
            unit: 'g',
            receivedDate: new Date(),
            status: 'REGISTERED',
            createdBy: 'test-user'
          }
        })
      ])

      const ids = samples.map(s => s.id)

      // 批量获取
      const results = await cachedSampleService.getSamplesBatch(ids)

      expect(results).toHaveLength(2)
      expect(results[0]?.barcode).toBe('BATCH-001')
      expect(results[1]?.barcode).toBe('BATCH-002')

      // 验证缓存已创建
      const cached1 = await cacheService.get(`sample:${ids[0]}`)
      const cached2 = await cacheService.get(`sample:${ids[1]}`)
      expect(cached1).toBeTruthy()
      expect(cached2).toBeTruthy()

      // 清理
      await prisma.sample.deleteMany({
        where: { barcode: { startsWith: 'BATCH-' } }
      })
    })

    it('应该在更新样品后失效缓存', async () => {
      // 创建测试样品
      const sample = await prisma.sample.create({
        data: {
          barcode: 'UPDATE-TEST-001',
          sampleNumber: 'SN-UPDATE-001',
          clientName: 'Update Client',
          sampleName: 'Update Sample',
          sampleType: 'Test',
          sampleCategory: 'Test',
          quantity: 100,
          unit: 'g',
          receivedDate: new Date(),
          status: 'REGISTERED',
          createdBy: 'test-user'
        }
      })

      // 缓存样品
      await cachedSampleService.getSample(sample.id)

      // 更新样品
      await cachedSampleService.updateSample(sample.id, {
        clientName: 'Updated Client'
      })

      // 验证缓存已被删除
      const cached = await cacheService.get(`sample:${sample.id}`)
      expect(cached).toBeNull()

      // 清理
      await prisma.sample.delete({ where: { id: sample.id } })
    })
  })

  describe('缓存穿透防护', () => {
    it('应该使用布隆过滤器防止缓存穿透', async () => {
      // 初始化布隆过滤器
      await bloomFilterService.initialize('samples', async () => {
        const samples = await prisma.sample.findMany({
          select: { id: true }
        })
        return samples.map(s => s.id)
      })

      // 查询不存在的样品
      const nonExistentId = 'non-existent-sample-id'
      const mightExist = await bloomFilterService.mightExist('samples', nonExistentId)

      // 布隆过滤器应该返回 false
      expect(mightExist).toBe(false)

      // 不应该查询数据库
      const result = await cachedSampleService.getSample(nonExistentId)
      expect(result).toBeNull()
    })

    it('应该缓存空值防止缓存穿透', async () => {
      const nonExistentId = 'non-existent-id'
      const cacheKey = `sample:${nonExistentId}`

      // 第一次查询（缓存未命中，返回 null）
      const result1 = await cacheService.getOrLoad(
        cacheKey,
        async () => null,
        60
      )
      expect(result1).toBeNull()

      // 验证空值已被缓存
      const isNull = await cacheService.isNull(cacheKey)
      expect(isNull).toBe(true)

      // 第二次查询应该直接返回 null，不查询数据库
      const result2 = await cacheService.getOrLoad(
        cacheKey,
        async () => {
          throw new Error('Should not be called')
        },
        60
      )
      expect(result2).toBeNull()
    })
  })
})
