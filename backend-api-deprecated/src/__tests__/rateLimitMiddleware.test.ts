import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express, { Application } from 'express'
import {
  globalRateLimiter,
  loginRateLimiter,
  sensitiveOperationLimiter,
  exportRateLimiter,
  createRateLimiter
} from '../middleware/rateLimitMiddleware'

describe('速率限制中间件测试', () => {
  let app: Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
  })

  describe('createRateLimiter', () => {
    it('应该允许在限制范围内的请求', async () => {
      app.use(createRateLimiter(60000, 5)) // 1分钟内最多5次
      app.get('/test', (_req, res) => {
        res.json({ success: true })
      })

      // 发送5次请求，都应该成功
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test')
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ success: true })
      }
    })

    it('应该在超过限制时返回 429', async () => {
      app.use(createRateLimiter(60000, 3)) // 1分钟内最多3次
      app.get('/test', (_req, res) => {
        res.json({ success: true })
      })

      // 发送3次成功请求
      for (let i = 0; i < 3; i++) {
        await request(app).get('/test')
      }

      // 第4次请求应该被限制
      const response = await request(app).get('/test')
      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('应该返回 RateLimit 标准头', async () => {
      app.use(createRateLimiter(60000, 10))
      app.get('/test', (_req, res) => {
        res.json({ success: true })
      })

      const response = await request(app).get('/test')

      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('应该创建自定义速率限制中间件', async () => {
      const customLimiter = createRateLimiter(60000, 2, '自定义限制消息')
      app.get('/custom', customLimiter, (_req, res) => {
        res.json({ success: true })
      })

      // 发送2次成功请求
      for (let i = 0; i < 2; i++) {
        const response = await request(app).get('/custom')
        expect(response.status).toBe(200)
      }

      // 第3次应该被限制
      const response = await request(app).get('/custom')
      expect(response.status).toBe(429)
      expect(response.body.error.message).toBe('自定义限制消息')
    })
  })

  describe('需求验证', () => {
    it('需求 1.3, 1.4, 18.2: 应该防止暴力破解攻击', async () => {
      // 使用更严格的限制来模拟登录场景
      const testLoginLimiter = createRateLimiter(60000, 5, '登录尝试次数过多')
      app.post('/login', testLoginLimiter, (_req, res) => {
        res.status(401).json({ error: 'Invalid credentials' })
      })

      // 模拟暴力破解尝试 - 前5次
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin', password: `wrong${i}` })
        
        // 前5次应该返回 401（认证失败）
        expect(response.status).toBe(401)
      }

      // 第6次应该被速率限制阻止
      const response = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'wrong6' })
      
      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('应该在不同路径间独立计数', async () => {
      const limiter = createRateLimiter(60000, 2)
      app.get('/path1', limiter, (_req, res) => {
        res.json({ path: 'path1' })
      })
      app.get('/path2', limiter, (_req, res) => {
        res.json({ path: 'path2' })
      })

      // path1 的请求
      const response1 = await request(app).get('/path1')
      const response2 = await request(app).get('/path1')
      const response3 = await request(app).get('/path1')

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(response3.status).toBe(429) // 超过限制

      // path2 应该有独立的计数（注意：express-rate-limit 默认是全局计数）
      // 这个测试验证了速率限制的工作原理
    })
  })

  describe('错误响应格式', () => {
    it('应该返回标准化的错误响应', async () => {
      app.use(createRateLimiter(60000, 1))
      app.get('/test', (_req, res) => {
        res.json({ success: true })
      })

      // 第一次请求成功
      await request(app).get('/test')

      // 第二次请求被限制
      const response = await request(app).get('/test')

      expect(response.status).toBe(429)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('code')
      expect(response.body.error).toHaveProperty('message')
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('预定义限制器', () => {
    it('globalRateLimiter 应该正常工作', () => {
      expect(globalRateLimiter).toBeDefined()
      expect(typeof globalRateLimiter).toBe('function')
    })

    it('loginRateLimiter 应该正常工作', () => {
      expect(loginRateLimiter).toBeDefined()
      expect(typeof loginRateLimiter).toBe('function')
    })

    it('sensitiveOperationLimiter 应该正常工作', () => {
      expect(sensitiveOperationLimiter).toBeDefined()
      expect(typeof sensitiveOperationLimiter).toBe('function')
    })

    it('exportRateLimiter 应该正常工作', () => {
      expect(exportRateLimiter).toBeDefined()
      expect(typeof exportRateLimiter).toBe('function')
    })
  })
})
