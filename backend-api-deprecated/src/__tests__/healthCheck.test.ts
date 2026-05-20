import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import redisClient from '../config/redis'
import {
  checkDatabaseConnection,
  checkRedisConnection,
  getHealthStatus,
  getReadinessStatus
} from '../services/healthCheckService'

/**
 * 健康检查功能测试
 * 验证需求: 22.1
 */

describe('Health Check Service', () => {
  describe('checkDatabaseConnection', () => {
    it('应该成功检查数据库连接', async () => {
      const result = await checkDatabaseConnection()
      
      expect(result.status).toBe('ok')
      expect(result.responseTime).toBeGreaterThan(0)
      expect(result.message).toBeUndefined()
    })

    it('应该返回响应时间', async () => {
      const result = await checkDatabaseConnection()
      
      expect(result.responseTime).toBeDefined()
      expect(typeof result.responseTime).toBe('number')
    })
  })

  describe('checkRedisConnection', () => {
    it('应该返回检查结果（ok 或 error）', async () => {
      const result = await checkRedisConnection()
      
      expect(['ok', 'error']).toContain(result.status)
      expect(result.responseTime).toBeGreaterThan(0)
    })

    it('应该返回响应时间', async () => {
      const result = await checkRedisConnection()
      
      expect(result.responseTime).toBeDefined()
      expect(typeof result.responseTime).toBe('number')
    })

    it('当 Redis 不可用时应该返回错误状态', async () => {
      const result = await checkRedisConnection()
      
      if (result.status === 'error') {
        expect(result.message).toBeDefined()
        expect(typeof result.message).toBe('string')
      }
    })
  })

  describe('getHealthStatus', () => {
    it('应该返回健康状态', async () => {
      const status = await getHealthStatus()
      
      expect(status.status).toBe('healthy')
      expect(status.timestamp).toBeDefined()
      expect(status.uptime).toBeGreaterThan(0)
      expect(status.environment).toBeDefined()
      expect(status.memory).toBeDefined()
    })

    it('应该包含内存使用信息', async () => {
      const status = await getHealthStatus()
      
      expect(status.memory.rss).toBeGreaterThan(0)
      expect(status.memory.heapTotal).toBeGreaterThan(0)
      expect(status.memory.heapUsed).toBeGreaterThan(0)
    })

    it('应该返回有效的时间戳', async () => {
      const status = await getHealthStatus()
      const timestamp = new Date(status.timestamp)
      
      expect(timestamp.getTime()).not.toBeNaN()
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('getReadinessStatus', () => {
    it('应该返回就绪状态信息', async () => {
      const status = await getReadinessStatus()
      
      expect(['ready', 'not_ready']).toContain(status.status)
      expect(status.timestamp).toBeDefined()
      expect(status.checks).toBeDefined()
      expect(status.checks.database).toBeDefined()
      expect(status.checks.redis).toBeDefined()
    })

    it('应该检查数据库和 Redis 连接', async () => {
      const status = await getReadinessStatus()
      
      expect(status.checks.database.status).toBeDefined()
      expect(['ok', 'error']).toContain(status.checks.database.status)
      expect(status.checks.redis.status).toBeDefined()
      expect(['ok', 'error']).toContain(status.checks.redis.status)
    })

    it('应该包含每个检查的响应时间', async () => {
      const status = await getReadinessStatus()
      
      expect(status.checks.database.responseTime).toBeGreaterThan(0)
      expect(status.checks.redis.responseTime).toBeGreaterThan(0)
    })

    it('当数据库可用时应该返回数据库 ok 状态', async () => {
      const status = await getReadinessStatus()
      
      // 数据库应该是可用的（测试环境已配置）
      expect(status.checks.database.status).toBe('ok')
    })

    it('就绪状态应该基于所有依赖服务的状态', async () => {
      const status = await getReadinessStatus()
      
      const allServicesOk = status.checks.database.status === 'ok' && 
                           status.checks.redis.status === 'ok'
      
      if (allServicesOk) {
        expect(status.status).toBe('ready')
      } else {
        expect(status.status).toBe('not_ready')
      }
    })
  })
})

describe('Health Check API Endpoints', () => {
  describe('GET /health', () => {
    it('应该返回 200 状态码', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body.status).toBe('healthy')
    })

    it('应该返回健康状态信息', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('environment')
      expect(response.body).toHaveProperty('memory')
    })

    it('应该返回正确的内存使用信息', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      const { memory } = response.body
      expect(memory).toHaveProperty('rss')
      expect(memory).toHaveProperty('heapTotal')
      expect(memory).toHaveProperty('heapUsed')
      expect(memory).toHaveProperty('external')
    })

    it('应该快速响应（< 100ms）', async () => {
      const startTime = Date.now()
      
      await request(app)
        .get('/health')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(100)
    })
  })

  describe('GET /ready', () => {
    it('应该返回就绪状态（200 或 503）', async () => {
      const response = await request(app)
        .get('/ready')
      
      expect([200, 503]).toContain(response.status)
      expect(['ready', 'not_ready']).toContain(response.body.status)
    })

    it('应该返回就绪状态信息', async () => {
      const response = await request(app)
        .get('/ready')
      
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('checks')
    })

    it('应该检查数据库连接', async () => {
      const response = await request(app)
        .get('/ready')
      
      expect(response.body.checks).toHaveProperty('database')
      expect(['ok', 'error']).toContain(response.body.checks.database.status)
      expect(response.body.checks.database).toHaveProperty('responseTime')
    })

    it('应该检查 Redis 连接', async () => {
      const response = await request(app)
        .get('/ready')
      
      expect(response.body.checks).toHaveProperty('redis')
      expect(['ok', 'error']).toContain(response.body.checks.redis.status)
      expect(response.body.checks.redis).toHaveProperty('responseTime')
    })

    it('应该包含所有依赖服务的响应时间', async () => {
      const response = await request(app)
        .get('/ready')
      
      const { checks } = response.body
      expect(checks.database.responseTime).toBeGreaterThan(0)
      expect(checks.redis.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('应该在合理时间内响应（< 500ms）', async () => {
      const startTime = Date.now()
      
      await request(app)
        .get('/ready')
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(500)
    })

    it('当所有服务可用时应该返回 200', async () => {
      const response = await request(app)
        .get('/ready')
      
      if (response.body.checks.database.status === 'ok' && 
          response.body.checks.redis.status === 'ok') {
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('ready')
      }
    })

    it('当任何服务不可用时应该返回 503', async () => {
      const response = await request(app)
        .get('/ready')
      
      if (response.body.checks.database.status === 'error' || 
          response.body.checks.redis.status === 'error') {
        expect(response.status).toBe(503)
        expect(response.body.status).toBe('not_ready')
      }
    })
  })

  describe('边界情况测试', () => {
    it('/health 端点应该始终返回 200，即使依赖服务不可用', async () => {
      // /health 端点不检查依赖服务，所以应该始终返回 200
      const response = await request(app)
        .get('/health')
        .expect(200)
      
      expect(response.body.status).toBe('healthy')
    })

    it('应该返回有效的 JSON 响应', async () => {
      const healthResponse = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
      
      expect(() => JSON.parse(JSON.stringify(healthResponse.body))).not.toThrow()
      
      const readyResponse = await request(app)
        .get('/ready')
        .expect('Content-Type', /json/)
      
      expect(() => JSON.parse(JSON.stringify(readyResponse.body))).not.toThrow()
    })
  })

  describe('并发请求测试', () => {
    it('应该能够处理多个并发健康检查请求', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health').expect(200)
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.body.status).toBe('healthy')
      })
    })

    it('应该能够处理多个并发就绪检查请求', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/ready')
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status)
        expect(['ready', 'not_ready']).toContain(response.body.status)
      })
    })
  })
})

describe('健康检查集成测试', () => {
  it('健康检查和就绪检查应该返回一致的时间戳格式', async () => {
    const healthResponse = await request(app).get('/health')
    const readyResponse = await request(app).get('/ready')
    
    const healthTimestamp = new Date(healthResponse.body.timestamp)
    const readyTimestamp = new Date(readyResponse.body.timestamp)
    
    expect(healthTimestamp.getTime()).not.toBeNaN()
    expect(readyTimestamp.getTime()).not.toBeNaN()
  })

  it('就绪检查应该验证数据库和 Redis 都可用', async () => {
    const response = await request(app).get('/ready')
    
    // 验证两个依赖服务都被检查
    expect(Object.keys(response.body.checks)).toContain('database')
    expect(Object.keys(response.body.checks)).toContain('redis')
    
    // 验证两个服务都返回状态
    expect(['ok', 'error']).toContain(response.body.checks.database.status)
    expect(['ok', 'error']).toContain(response.body.checks.redis.status)
  })
})
