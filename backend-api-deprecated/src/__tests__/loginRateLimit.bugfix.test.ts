/**
 * 登录429错误修复 - Bug条件探索测试
 * 
 * 目标: 在未修复代码上暴露演示bug的反例
 * 重要: 此测试必须在未修复代码上失败 - 失败确认bug存在
 * 
 * Bug条件: 当用户在5分钟内登录尝试超过20次时触发限流，
 * 但响应缺少Retry-After头信息和友好的错误消息
 */

import request from 'supertest'
import { app } from '../app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('登录限流Bug条件探索测试', () => {
  beforeAll(async () => {
    // 确保测试用户存在
    await prisma.user.upsert({
      where: { username: 'testuser' },
      update: {},
      create: {
        username: 'testuser',
        email: 'test@example.com',
        fullName: '测试用户',
        passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
        status: 'ACTIVE'
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  /**
   * Property 1: Bug条件 - 友好的429错误响应
   * 
   * 对于任何触发登录限流的请求（isBugCondition返回true），
   * 修复后的系统应该返回包含Retry-After头和详细等待时间信息的429响应
   */
  test('应该在触发限流时返回包含Retry-After头和详细错误信息的429响应', async () => {
    // 快速发送21次登录请求以触发限流
    const loginData = {
      username: 'testuser',
      password: 'wrongpassword'
    }

    // 发送20次请求（达到限制）
    for (let i = 0; i < 20; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401) // 预期密码错误返回401
    }

    // 第21次请求应该触发429限流
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429)

    // 验证响应头包含Retry-After信息
    expect(response.headers['retry-after']).toBeDefined()
    expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0)

    // 验证响应体包含详细的错误信息
    expect(response.body.error).toBeDefined()
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    
    // 验证包含友好的中文错误消息
    expect(response.body.error.message).toContain('登录尝试次数过多')
    expect(response.body.error.message).toContain('分钟')
    
    // 验证包含retryAfter字段（秒数）
    expect(response.body.error.retryAfter).toBeDefined()
    expect(typeof response.body.error.retryAfter).toBe('number')
    expect(response.body.error.retryAfter).toBeGreaterThan(0)
    
    // 验证包含retryAfterMinutes字段
    expect(response.body.error.retryAfterMinutes).toBeDefined()
    expect(typeof response.body.error.retryAfterMinutes).toBe('number')
    
    // 验证包含建议信息
    expect(response.body.error.suggestion).toBeDefined()
    expect(response.body.error.suggestion).toContain('稍后再试')

    console.log('429响应详情:', {
      headers: response.headers,
      body: response.body,
      retryAfter: response.headers['retry-after'],
      errorMessage: response.body.error?.message
    })
  }, 30000) // 30秒超时

  test('应该在限流窗口内正确计算剩余等待时间', async () => {
    const loginData = {
      username: 'testuser2',
      password: 'wrongpassword'
    }

    // 创建测试用户
    await prisma.user.upsert({
      where: { username: 'testuser2' },
      update: {},
      create: {
        username: 'testuser2',
        email: 'test2@example.com',
        fullName: '测试用户2',
        passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
        status: 'ACTIVE'
      }
    })

    // 触发限流
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
    }

    // 获取第一次429响应
    const firstResponse = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429)

    const firstRetryAfter = parseInt(firstResponse.headers['retry-after'])
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 获取第二次429响应
    const secondResponse = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429)

    const secondRetryAfter = parseInt(secondResponse.headers['retry-after'])
    
    // 验证等待时间递减
    expect(secondRetryAfter).toBeLessThanOrEqual(firstRetryAfter)
    expect(firstRetryAfter - secondRetryAfter).toBeGreaterThanOrEqual(0)
    expect(firstRetryAfter - secondRetryAfter).toBeLessThanOrEqual(2) // 允许1-2秒的误差
  }, 30000)

  test('应该在不同IP地址间独立计算限流', async () => {
    const loginData = {
      username: 'testuser3',
      password: 'wrongpassword'
    }

    // 创建测试用户
    await prisma.user.upsert({
      where: { username: 'testuser3' },
      update: {},
      create: {
        username: 'testuser3',
        email: 'test3@example.com',
        fullName: '测试用户3',
        passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
        status: 'ACTIVE'
      }
    })

    // 从第一个IP触发限流
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .set('X-Forwarded-For', '192.168.1.1')
    }

    // 验证第一个IP被限流
    await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .set('X-Forwarded-For', '192.168.1.1')
      .expect(429)

    // 验证第二个IP不受影响（应该返回401而不是429）
    await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .set('X-Forwarded-For', '192.168.1.2')
      .expect(401) // 密码错误，但不是限流
  }, 30000)
})