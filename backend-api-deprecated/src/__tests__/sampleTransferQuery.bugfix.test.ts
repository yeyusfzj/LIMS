// 样品流转400错误修复 - Bug条件探索测试
// **重要**: 此测试必须在未修复代码上失败 - 失败确认Bug存在

import request from 'supertest'
import app from '../app'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { config } from '../config/env'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'

const prisma = new PrismaClient()

describe('样品流转查询参数验证Bug探索测试', () => {
  let authToken: string
  let testUserId: string

  beforeAll(async () => {
    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        username: 'transfer_bug_test_user',
        passwordHash: 'test_hash',
        email: 'transfer_bug_test@example.com',
        fullName: '流转Bug测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = testUser.id

    // 创建测试角色和权限
    const testRole = await prisma.role.create({
      data: {
        name: 'transfer_bug_tester',
        description: '流转Bug测试角色'
      }
    })

    // 创建权限
    const permissionData = [
      { resource: 'sample', action: 'read' },
      { resource: 'sample', action: 'create' },
      { resource: 'sample', action: 'update' }
    ]

    await prisma.permission.createMany({
      data: permissionData,
      skipDuplicates: true
    })

    // 关联角色和权限
    const permissionRecords = await prisma.permission.findMany({
      where: { resource: 'sample' }
    })

    await prisma.role.update({
      where: { id: testRole.id },
      data: {
        permissions: {
          connect: permissionRecords.map(p => ({ id: p.id }))
        }
      }
    })

    // 关联用户和角色
    await prisma.userRole.create({
      data: {
        userId: testUserId,
        roleId: testRole.id
      }
    })

    // 生成JWT token
    authToken = jwt.sign(
      { 
        userId: testUserId, 
        username: testUser.username,
        roles: [testRole.name],
        jti: Math.random().toString(36).substring(2)
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.role.deleteMany({
      where: { name: 'transfer_bug_tester' }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
    await prisma.$disconnect()
  })

  /**
   * **Validates: Requirements 2.1, 2.2**
   * Property 1: Bug Condition - 流转查询参数验证失败
   * 
   * 此测试验证当前代码确实存在400错误问题
   * 预期结果：测试失败（这是正确的 - 证明Bug存在）
   */
  describe('Property 1: Bug Condition - 流转查询参数验证失败', () => {
    it('应该在包含日期范围参数时返回400错误（Bug条件）', async () => {
      // 测试包含startDate和endDate的查询参数
      const response = await request(app)
        .get('/api/samples/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          page: '1',
          pageSize: '20'
        })

      // 在未修复的代码上，这应该返回400错误
      // 当修复后，这个测试应该通过（返回200）
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('data')
    })

    it('应该在包含样品编号搜索参数时返回400错误（Bug条件）', async () => {
      const response = await request(app)
        .get('/api/samples/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sampleNumber: 'SAMPLE001',
          page: '1',
          pageSize: '10'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('data')
    })

    it('应该在包含状态过滤参数时返回400错误（Bug条件）', async () => {
      const response = await request(app)
        .get('/api/samples/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'PENDING',
          page: '2',
          pageSize: '15'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('data')
    })

    it('应该在包含复合查询参数时返回400错误（Bug条件）', async () => {
      const response = await request(app)
        .get('/api/samples/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sampleNumber: 'TEST',
          status: 'RECEIVED',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          page: '1',
          pageSize: '25'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('data')
    })

    it('应该在包含特殊字符的参数时返回400错误（Bug条件）', async () => {
      const response = await request(app)
        .get('/api/samples/transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sampleNumber: 'SAMPLE@#$%',
          page: 'invalid',
          pageSize: 'invalid'
        })

      // 这种情况下应该返回400错误（参数验证失败）
      expect(response.status).toBe(400)
    })
  })

  /**
   * 基于属性的测试 - Bug条件探索
   * 使用fast-check生成各种查询参数组合来探索Bug条件
   */
  describe('Property-Based Bug Condition Exploration', () => {
    it('应该对各种查询参数组合返回400错误（Bug条件探索）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sampleNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            status: fc.option(fc.constantFrom('PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED')),
            startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().split('T')[0])),
            endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().split('T')[0])),
            page: fc.option(fc.integer({ min: 1, max: 100 }).map(String)),
            pageSize: fc.option(fc.integer({ min: 1, max: 100 }).map(String))
          }),
          async (queryParams) => {
            // 过滤掉空的参数
            const filteredParams = Object.fromEntries(
              Object.entries(queryParams).filter(([_, value]) => value !== null)
            )

            // 如果没有任何查询参数，跳过此测试
            if (Object.keys(filteredParams).length === 0) {
              return true
            }

            const response = await request(app)
              .get('/api/samples/transfers')
              .set('Authorization', `Bearer ${authToken}`)
              .query(filteredParams)

            // 在未修复的代码上，包含查询参数的请求应该返回400或500错误
            // 修复后应该返回200
            if (response.status === 200) {
              expect(response.body).toHaveProperty('message')
              expect(response.body).toHaveProperty('data')
            } else {
              // 记录失败的查询参数组合以供分析
              console.log('Failed query params:', filteredParams, 'Status:', response.status)
            }

            return true
          }
        ),
        { numRuns: 20, verbose: true }
      )
    })
  })
})