/**
 * 审计日志 API 集成测试
 * 验证审计日志 API 端点的功能
 */

import request from 'supertest'
import { app } from '../app'
import { PrismaClient } from '@prisma/client'
import { authService } from '../services/authService'

const prisma = new PrismaClient()

describe('Audit Log API Integration Tests', () => {
  let authToken: string
  let testUserId: string
  let testAuditLogId: string

  beforeAll(async () => {
    // 创建测试用户（使用 bcrypt 哈希密码）
    const bcrypt = require('bcrypt')
    const passwordHash = await bcrypt.hash('test_password_123', 10)
    
    const testUser = await prisma.user.create({
      data: {
        username: 'auditlog_test_user',
        email: 'auditlog@test.com',
        passwordHash,
        fullName: '审计日志测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = testUser.id

    // 创建测试角色和权限
    const role = await prisma.role.create({
      data: {
        name: 'audit_viewer',
        description: '审计日志查看者'
      }
    })

    const permission = await prisma.permission.create({
      data: {
        resource: 'audit-log',
        action: 'read'
      }
    })

    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          connect: { id: permission.id }
        }
      }
    })

    await prisma.userRole.create({
      data: {
        userId: testUserId,
        roleId: role.id
      }
    })

    // 生成认证令牌
    const loginResult = await authService.login({
      username: 'auditlog_test_user',
      password: 'test_password_123'
    })
    authToken = loginResult.accessToken

    // 创建测试审计日志
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: testUserId,
        username: 'auditlog_test_user',
        action: 'CREATE',
        resource: 'SAMPLE',
        resourceId: 'test-sample-id',
        changes: {
          sampleName: 'Test Sample',
          status: 'REGISTERED'
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      }
    })
    testAuditLogId = auditLog.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.auditLog.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
    await prisma.permission.deleteMany({
      where: { resource: 'audit-log' }
    })
    await prisma.role.deleteMany({
      where: { name: 'audit_viewer' }
    })
    await prisma.$disconnect()
  })

  describe('GET /api/audit-logs', () => {
    it('应该成功查询审计日志列表', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('items')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('pageSize')
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    it('应该支持按用户 ID 过滤', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.items.length).toBeGreaterThan(0)
      response.body.data.items.forEach((log: any) => {
        expect(log.userId).toBe(testUserId)
      })
    })

    it('应该支持按操作类型过滤', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .query({ action: 'CREATE' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      response.body.data.items.forEach((log: any) => {
        expect(log.action).toBe('CREATE')
      })
    })

    it('应该支持按资源类型过滤', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .query({ resource: 'SAMPLE' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      response.body.data.items.forEach((log: any) => {
        expect(log.resource).toBe('SAMPLE')
      })
    })

    it('应该支持分页', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .query({ page: 1, pageSize: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.page).toBe(1)
      expect(response.body.data.pageSize).toBe(5)
      expect(response.body.data.items.length).toBeLessThanOrEqual(5)
    })

    it('应该在未认证时返回 401', async () => {
      await request(app)
        .get('/api/audit-logs')
        .expect(401)
    })
  })

  describe('GET /api/audit-logs/:id', () => {
    it('应该成功获取审计日志详情', async () => {
      const response = await request(app)
        .get(`/api/audit-logs/${testAuditLogId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id', testAuditLogId)
      expect(response.body.data).toHaveProperty('userId')
      expect(response.body.data).toHaveProperty('username')
      expect(response.body.data).toHaveProperty('action')
      expect(response.body.data).toHaveProperty('resource')
      expect(response.body.data).toHaveProperty('resourceId')
      expect(response.body.data).toHaveProperty('timestamp')
    })

    it('应该在日志不存在时返回 404', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const response = await request(app)
        .get(`/api/audit-logs/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND')
    })

    it('应该在未认证时返回 401', async () => {
      await request(app)
        .get(`/api/audit-logs/${testAuditLogId}`)
        .expect(401)
    })
  })

  describe('GET /api/audit-logs/resource/:resource/:resourceId', () => {
    it('应该成功获取资源的审计历史', async () => {
      const response = await request(app)
        .get('/api/audit-logs/resource/SAMPLE/test-sample-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      response.body.data.forEach((log: any) => {
        expect(log.resource).toBe('SAMPLE')
        expect(log.resourceId).toBe('test-sample-id')
      })
    })
  })

  describe('GET /api/audit-logs/user/:userId', () => {
    it('应该成功获取用户的操作历史', async () => {
      const response = await request(app)
        .get(`/api/audit-logs/user/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      response.body.data.forEach((log: any) => {
        expect(log.userId).toBe(testUserId)
      })
    })

    it('应该支持限制返回数量', async () => {
      const response = await request(app)
        .get(`/api/audit-logs/user/${testUserId}`)
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('GET /api/audit-logs/statistics', () => {
    it('应该成功获取审计统计', async () => {
      const response = await request(app)
        .get('/api/audit-logs/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('byAction')
      expect(response.body.data).toHaveProperty('byResource')
      expect(response.body.data).toHaveProperty('topUsers')
      expect(Array.isArray(response.body.data.byAction)).toBe(true)
      expect(Array.isArray(response.body.data.byResource)).toBe(true)
      expect(Array.isArray(response.body.data.topUsers)).toBe(true)
    })

    it('应该支持时间范围过滤', async () => {
      const startDate = new Date('2024-01-01').toISOString()
      const endDate = new Date().toISOString()

      const response = await request(app)
        .get('/api/audit-logs/statistics')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('byAction')
    })
  })
})
