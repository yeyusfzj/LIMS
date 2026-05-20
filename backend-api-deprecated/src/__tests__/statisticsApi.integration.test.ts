/**
 * 统计 API 端点集成测试
 */

import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import { authService } from '../services/authService'

describe('Statistics API Integration Tests', () => {
  let authToken: string
  let userId: string

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'stats_test_user',
        email: 'stats_test@example.com',
        passwordHash: await authService.hashPassword('password123'),
        fullName: 'Statistics Test User',
        status: 'ACTIVE'
      }
    })
    userId = user.id

    // 创建测试角色和权限
    const role = await prisma.role.create({
      data: {
        name: 'statistics_tester',
        description: 'Statistics tester role'
      }
    })

    // 分配权限
    await prisma.permission.createMany({
      data: [
        { resource: 'statistics', action: 'read' },
        { resource: 'statistics', action: 'export' },
        { resource: 'statistics', action: 'manage' }
      ],
      skipDuplicates: true
    })

    const permissions = await prisma.permission.findMany({
      where: {
        resource: 'statistics'
      }
    })

    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          connect: permissions.map(p => ({ id: p.id }))
        }
      }
    })

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id
      }
    })

    // 生成认证令牌
    const authResult = await authService.login('stats_test_user', 'password123')
    authToken = authResult.accessToken

    // 创建测试样品数据
    await prisma.sample.createMany({
      data: [
        {
          barcode: 'STATS-001',
          sampleNumber: 'SN-STATS-001',
          clientName: '测试客户A',
          sampleName: '测试样品1',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date('2024-01-01'),
          status: 'RELEASED',
          priority: 'NORMAL',
          createdBy: userId
        },
        {
          barcode: 'STATS-002',
          sampleNumber: 'SN-STATS-002',
          clientName: '测试客户B',
          sampleName: '测试样品2',
          sampleType: '土壤',
          sampleCategory: '环境',
          quantity: 200,
          unit: 'g',
          receivedDate: new Date('2024-01-02'),
          status: 'IN_TESTING',
          priority: 'HIGH',
          createdBy: userId
        },
        {
          barcode: 'STATS-003',
          sampleNumber: 'SN-STATS-003',
          clientName: '测试客户A',
          sampleName: '测试样品3',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 150,
          unit: 'ml',
          receivedDate: new Date('2024-01-03'),
          status: 'RELEASED',
          priority: 'NORMAL',
          createdBy: userId
        }
      ]
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sample.deleteMany({
      where: {
        barcode: {
          startsWith: 'STATS-'
        }
      }
    })

    await prisma.userRole.deleteMany({
      where: { userId }
    })

    await prisma.user.delete({
      where: { id: userId }
    })

    await prisma.role.deleteMany({
      where: {
        name: 'statistics_tester'
      }
    })

    await prisma.$disconnect()
  })

  describe('GET /api/statistics', () => {
    it('应该返回按样品类型统计的数据', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .query({
          dimensions: 'sampleType',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('summary')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('应该返回按状态统计的数据', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .query({
          dimensions: 'status',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.summary).toHaveProperty('totalCount')
    })

    it('应该支持多维度统计', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .query({
          dimensions: 'sampleType,status',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('应该支持过滤条件', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .query({
          dimensions: 'sampleType',
          sampleType: '水质',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
    })

    it('缺少维度参数时应该返回 400 错误', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('未认证时应该返回 401 错误', async () => {
      await request(app)
        .get('/api/statistics')
        .query({
          dimensions: 'sampleType'
        })
        .expect(401)
    })
  })

  describe('POST /api/statistics/export', () => {
    it('应该创建 CSV 导出任务', async () => {
      const response = await request(app)
        .post('/api/statistics/export')
        .query({
          dimensions: 'sampleType',
          format: 'csv',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('taskId')
      expect(response.body.status).toBeDefined()
    })

    it('应该创建 Excel 导出任务', async () => {
      const response = await request(app)
        .post('/api/statistics/export')
        .query({
          dimensions: 'status',
          format: 'excel',
          filename: 'test_export',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('taskId')
    })

    it('不支持的格式应该返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/statistics/export')
        .query({
          dimensions: 'sampleType',
          format: 'invalid_format'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/statistics/custom-report', () => {
    it('应该生成自定义报表', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试自定义报表',
          description: '这是一个测试报表',
          config: {
            dimensions: ['sampleType', 'status'],
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            filters: {
              sampleType: ['水质']
            }
          },
          format: 'json'
        })
        .expect(200)

      expect(response.body).toHaveProperty('name', '测试自定义报表')
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('metadata')
      expect(response.body.metadata).toHaveProperty('totalRecords')
    })

    it('应该支持分组和排序', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '分组排序报表',
          config: {
            dimensions: ['sampleType'],
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            groupBy: 'sampleType',
            orderBy: '-count'
          },
          format: 'json'
        })
        .expect(200)

      expect(response.body).toHaveProperty('data')
    })

    it('应该支持限制数量', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '限制数量报表',
          config: {
            dimensions: ['sampleType'],
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            limit: 1
          },
          format: 'json'
        })
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body.metadata.totalRecords).toBeLessThanOrEqual(1)
    })

    it('缺少报表名称应该返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          config: {
            dimensions: ['sampleType']
          }
        })
        .expect(400)

      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('缺少维度配置应该返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '无效报表',
          config: {}
        })
        .expect(400)

      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/statistics/cache', () => {
    it('应该清除所有统计缓存', async () => {
      const response = await request(app)
        .delete('/api/statistics/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })

    it('应该支持按模式清除缓存', async () => {
      const response = await request(app)
        .delete('/api/statistics/cache')
        .query({ pattern: 'stats:*' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })
  })
})
