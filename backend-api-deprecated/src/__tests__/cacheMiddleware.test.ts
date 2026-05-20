import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express, { Request, Response } from 'express'
import { cacheMiddleware, cacheEvictMiddleware } from '../middleware/cacheMiddleware'
import cacheService from '../services/cacheService'
import redisClient from '../config/redis'
import { connectRedis, disconnectRedis } from '../config/redis'

describe('CacheMiddleware', () => {
  let app: express.Application

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

    // 创建测试应用
    app = express()
    app.use(express.json())
  })

  afterEach(async () => {
    // 清理测试数据
    await redisClient.flushDb()
  })

  describe('cacheMiddleware', () => {
    it('应该缓存 GET 请求的响应', async () => {
      let callCount = 0

      app.get('/test', cacheMiddleware({ ttl: 60 }), (req: Request, res: Response) => {
        callCount++
        res.json({ data: 'test', count: callCount })
      })

      // 第一次请求
      const response1 = await request(app).get('/test')
      expect(response1.status).toBe(200)
      expect(response1.body.count).toBe(1)

      // 第二次请求应该返回缓存
      const response2 = await request(app).get('/test')
      expect(response2.status).toBe(200)
      expect(response2.body.count).toBe(1) // 仍然是 1，说明使用了缓存
      expect(callCount).toBe(1) // 处理器只被调用一次
    })

    it('不应该缓存 POST 请求', async () => {
      let callCount = 0

      app.post('/test', cacheMiddleware({ ttl: 60 }), (req: Request, res: Response) => {
        callCount++
        res.json({ data: 'test', count: callCount })
      })

      // 第一次请求
      const response1 = await request(app).post('/test')
      expect(response1.status).toBe(200)
      expect(response1.body.count).toBe(1)

      // 第二次请求不应该使用缓存
      const response2 = await request(app).post('/test')
      expect(response2.status).toBe(200)
      expect(response2.body.count).toBe(2)
      expect(callCount).toBe(2)
    })

    it('应该根据查询参数区分缓存', async () => {
      let callCount = 0

      app.get('/test', cacheMiddleware({ ttl: 60 }), (req: Request, res: Response) => {
        callCount++
        res.json({ data: 'test', query: req.query, count: callCount })
      })

      // 不同的查询参数
      const response1 = await request(app).get('/test?id=1')
      expect(response1.body.count).toBe(1)

      const response2 = await request(app).get('/test?id=2')
      expect(response2.body.count).toBe(2)

      // 相同的查询参数应该使用缓存
      const response3 = await request(app).get('/test?id=1')
      expect(response3.body.count).toBe(1)

      expect(callCount).toBe(2)
    })

    it('应该支持自定义缓存键生成器', async () => {
      let callCount = 0

      app.get('/test/:id', 
        cacheMiddleware({ 
          ttl: 60,
          keyGenerator: (req) => `custom:${req.params.id}`
        }), 
        (req: Request, res: Response) => {
          callCount++
          res.json({ id: req.params.id, count: callCount })
        }
      )

      const response1 = await request(app).get('/test/123')
      expect(response1.body.count).toBe(1)

      const response2 = await request(app).get('/test/123')
      expect(response2.body.count).toBe(1)

      expect(callCount).toBe(1)
    })

    it('应该支持条件缓存', async () => {
      let callCount = 0

      app.get('/test', 
        cacheMiddleware({ 
          ttl: 60,
          condition: (req) => !req.query.nocache
        }), 
        (req: Request, res: Response) => {
          callCount++
          res.json({ count: callCount })
        }
      )

      // 正常请求应该缓存
      await request(app).get('/test')
      await request(app).get('/test')
      expect(callCount).toBe(1)

      // 带 nocache 参数的请求不应该缓存
      await request(app).get('/test?nocache=true')
      await request(app).get('/test?nocache=true')
      expect(callCount).toBe(3)
    })
  })

  describe('cacheEvictMiddleware', () => {
    it('应该在写操作后删除相关缓存', async () => {
      let getData = 0
      let postData = 0

      // GET 端点（带缓存）
      app.get('/items', cacheMiddleware({ ttl: 60 }), (req: Request, res: Response) => {
        getData++
        res.json({ items: ['item1', 'item2'], count: getData })
      })

      // POST 端点（删除缓存）
      app.post('/items', 
        cacheEvictMiddleware({ pattern: 'api:GET:/items:*' }),
        (req: Request, res: Response) => {
          postData++
          res.json({ success: true })
        }
      )

      // 第一次 GET 请求
      const response1 = await request(app).get('/items')
      expect(response1.body.count).toBe(1)

      // 第二次 GET 请求（使用缓存）
      const response2 = await request(app).get('/items')
      expect(response2.body.count).toBe(1)

      // POST 请求（删除缓存）
      await request(app).post('/items')

      // 等待缓存删除完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 第三次 GET 请求（缓存已删除，重新获取）
      const response3 = await request(app).get('/items')
      expect(response3.body.count).toBe(2)
    })
  })

  describe('错误处理', () => {
    it('应该在缓存错误时继续处理请求', async () => {
      // 模拟 Redis 错误
      const originalGet = cacheService.get
      cacheService.get = vi.fn().mockRejectedValue(new Error('Redis error'))

      let callCount = 0
      app.get('/test', cacheMiddleware({ ttl: 60 }), (req: Request, res: Response) => {
        callCount++
        res.json({ count: callCount })
      })

      const response = await request(app).get('/test')
      expect(response.status).toBe(200)
      expect(response.body.count).toBe(1)

      // 恢复原始方法
      cacheService.get = originalGet
    })
  })

  describe('TTL 配置', () => {
    it('应该使用指定的 TTL', async () => {
      app.get('/test', cacheMiddleware({ ttl: 120 }), (req: Request, res: Response) => {
        res.json({ data: 'test' })
      })

      await request(app).get('/test')

      // 检查缓存的 TTL
      const keys = await redisClient.keys('api:GET:/test:*')
      expect(keys.length).toBeGreaterThan(0)

      const ttl = await redisClient.ttl(keys[0])
      expect(ttl).toBeGreaterThan(60)
      expect(ttl).toBeLessThanOrEqual(120)
    })
  })
})
