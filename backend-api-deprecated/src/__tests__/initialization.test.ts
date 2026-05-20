import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'
import { config } from '../config/env'

describe('项目初始化测试', () => {
  let prisma: PrismaClient
  let redisClient: ReturnType<typeof createClient>

  beforeAll(async () => {
    prisma = new PrismaClient()
    redisClient = createClient({
      socket: {
        host: config.redisHost,
        port: config.redisPort
      },
      password: config.redisPassword
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
    if (redisClient.isOpen) {
      await redisClient.quit()
    }
  })

  describe('数据库连接测试', () => {
    it('应该能够成功连接到 PostgreSQL 数据库', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow()
      
      // 执行简单查询验证连接
      const result = await prisma.$queryRaw`SELECT 1 as value`
      expect(result).toBeDefined()
    })

    it('应该能够执行基本的数据库查询', async () => {
      const result = await prisma.$queryRaw`SELECT current_database() as db_name`
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Redis 连接测试', () => {
    it('应该能够成功连接到 Redis', async () => {
      await expect(redisClient.connect()).resolves.not.toThrow()
      expect(redisClient.isOpen).toBe(true)
    })

    it('应该能够执行基本的 Redis 操作', async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect()
      }

      // 测试 SET 操作
      await expect(
        redisClient.set('test_key', 'test_value')
      ).resolves.toBe('OK')

      // 测试 GET 操作
      const value = await redisClient.get('test_key')
      expect(value).toBe('test_value')

      // 清理测试数据
      await redisClient.del('test_key')
    })

    it('应该能够使用 Redis 的过期时间功能', async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect()
      }

      // 设置带过期时间的键
      await redisClient.setEx('expire_test', 1, 'value')
      
      // 验证键存在
      const value = await redisClient.get('expire_test')
      expect(value).toBe('value')

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 1100))

      // 验证键已过期
      const expiredValue = await redisClient.get('expire_test')
      expect(expiredValue).toBeNull()
    })
  })

  describe('环境变量加载测试', () => {
    it('应该正确加载所有必需的环境变量', () => {
      expect(config.nodeEnv).toBeDefined()
      expect(config.port).toBeGreaterThan(0)
      expect(config.databaseUrl).toBeDefined()
      expect(config.jwtSecret).toBeDefined()
    })

    it('应该正确解析数字类型的环境变量', () => {
      expect(typeof config.port).toBe('number')
      expect(typeof config.redisPort).toBe('number')
      expect(typeof config.rateLimitWindowMs).toBe('number')
      expect(typeof config.rateLimitMaxRequests).toBe('number')
    })

    it('应该正确解析数组类型的环境变量', () => {
      expect(Array.isArray(config.corsOrigins)).toBe(true)
      expect(config.corsOrigins.length).toBeGreaterThan(0)
    })

    it('应该为可选的环境变量提供默认值', () => {
      expect(config.logLevel).toBeDefined()
      expect(config.jwtAccessExpiry).toBeDefined()
      expect(config.jwtRefreshExpiry).toBeDefined()
    })
  })

  describe('日志系统测试', () => {
    it('应该能够导入日志模块', async () => {
      const { default: logger } = await import('../config/logger')
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })
  })

  describe('应用启动测试', () => {
    it('应该能够导入 Express 应用', async () => {
      const { default: app } = await import('../app')
      expect(app).toBeDefined()
    })
  })
})
