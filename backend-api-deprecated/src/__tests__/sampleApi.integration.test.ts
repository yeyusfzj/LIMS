// 样品 API 集成测试

import request from 'supertest'
import app from '../app'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { config } from '../config/env'

const prisma = new PrismaClient()

describe('Sample API Integration Tests', () => {
  let authToken: string
  let testUserId: string
  let testSampleId: string
  let testTransferId: string

  beforeAll(async () => {
    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        username: 'sample_test_user',
        passwordHash: 'test_hash',
        email: 'sample_test@example.com',
        fullName: '样品测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = testUser.id

    // 创建测试角色和权限
    const testRole = await prisma.role.create({
      data: {
        name: 'sample_tester',
        description: '样品测试角色'
      }
    })

    // 使用 createMany 配合 skipDuplicates 避免唯一约束冲突
    const permissionData = [
      { resource: 'sample', action: 'create' },
      { resource: 'sample', action: 'read' },
      { resource: 'sample', action: 'update' },
      { resource: 'sample', action: 'delete' }
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
        userId: testUser.id,
        roleId: testRole.id
      }
    })

    // 生成认证令牌
    authToken = jwt.sign(
      {
        userId: testUser.id,
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
    await prisma.transfer.deleteMany({
      where: {
        sample: {
          createdBy: testUserId
        }
      }
    })

    await prisma.sample.deleteMany({
      where: { createdBy: testUserId }
    })

    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })

    const testRole = await prisma.role.findUnique({
      where: { name: 'sample_tester' }
    })

    if (testRole) {
      await prisma.role.delete({
        where: { id: testRole.id }
      })
    }

    // 不删除权限,因为可能被其他测试使用

    await prisma.user.delete({
      where: { id: testUserId }
    })

    await prisma.$disconnect()
  })

  describe('POST /api/samples - 创建样品', () => {
    it('应该成功创建样品', async () => {
      const response = await request(app)
        .post('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientName: '测试客户',
          clientContact: '13800138000',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境样品',
          quantity: 500,
          unit: 'ml',
          receivedDate: new Date().toISOString(),
          storageLocation: '冷藏室A',
          priority: 'NORMAL'
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('样品创建成功')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('barcode')
      expect(response.body.data).toHaveProperty('sampleNumber')
      expect(response.body.data.sampleName).toBe('测试样品')

      testSampleId = response.body.data.id
    })

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .post('/api/samples')
        .send({
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境样品',
          quantity: 500,
          unit: 'ml',
          receivedDate: new Date().toISOString()
        })

      expect(response.status).toBe(401)
    })

    it('应该拒绝缺少必填字段的请求', async () => {
      const response = await request(app)
        .post('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientName: '测试客户'
          // 缺少其他必填字段
        })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/samples - 查询样品列表', () => {
    it('应该返回样品列表', async () => {
      const response = await request(app)
        .get('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, pageSize: 10 })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('查询成功')
      expect(response.body.data).toHaveProperty('items')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('pageSize')
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    it('应该支持按客户名称过滤', async () => {
      const response = await request(app)
        .get('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ clientName: '测试客户' })

      expect(response.status).toBe(200)
      expect(response.body.data.items.length).toBeGreaterThan(0)
      expect(response.body.data.items[0].clientName).toContain('测试客户')
    })
  })

  describe('GET /api/samples/:id - 获取样品详情', () => {
    it('应该返回样品详情', async () => {
      const response = await request(app)
        .get(`/api/samples/${testSampleId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('查询成功')
      expect(response.body.data.id).toBe(testSampleId)
      expect(response.body.data).toHaveProperty('barcode')
      expect(response.body.data).toHaveProperty('sampleNumber')
    })

    it('应该返回404当样品不存在', async () => {
      const response = await request(app)
        .get('/api/samples/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PUT /api/samples/:id - 更新样品', () => {
    it('应该成功更新样品', async () => {
      const response = await request(app)
        .put(`/api/samples/${testSampleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          remarks: '已更新的备注'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('样品更新成功')
      expect(response.body.data.remarks).toBe('已更新的备注')
    })
  })

  describe('POST /api/samples/:id/transfer - 样品流转', () => {
    it('应该成功创建流转记录', async () => {
      const response = await request(app)
        .post(`/api/samples/${testSampleId}/transfer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromLocation: '冷藏室A',
          toLocation: '实验室B',
          fromPerson: '张三',
          toPerson: '李四',
          remarks: '常规流转'
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('样品流转成功')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.fromLocation).toBe('冷藏室A')
      expect(response.body.data.toLocation).toBe('实验室B')
      expect(response.body.data.status).toBe('PENDING')

      testTransferId = response.body.data.id
    })
  })

  describe('POST /api/samples/transfers/:transferId/confirm - 确认流转', () => {
    it('应该成功进行发送方确认', async () => {
      const response = await request(app)
        .post(`/api/samples/transfers/${testTransferId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmationType: 'sender'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('流转确认成功')
      expect(response.body.data.senderConfirmed).toBe(true)
      expect(response.body.data.status).toBe('IN_TRANSIT')
    })

    it('应该成功进行接收方确认', async () => {
      const response = await request(app)
        .post(`/api/samples/transfers/${testTransferId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmationType: 'receiver'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('流转确认成功')
      expect(response.body.data.receiverConfirmed).toBe(true)
      expect(response.body.data.status).toBe('RECEIVED')
    })
  })

  describe('GET /api/samples/:id/custody - 获取监管链', () => {
    it('应该返回完整的流转历史', async () => {
      const response = await request(app)
        .get(`/api/samples/${testSampleId}/custody`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('查询成功')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data[0]).toHaveProperty('fromLocation')
      expect(response.body.data[0]).toHaveProperty('toLocation')
    })
  })

  describe('POST /api/samples/:id/split - 分样', () => {
    it('应该成功分样', async () => {
      const response = await request(app)
        .post(`/api/samples/${testSampleId}/split`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          childSamples: [
            {
              sampleName: '子样品1',
              quantity: 100,
              unit: 'ml',
              storageLocation: '冷藏室A-1'
            },
            {
              sampleName: '子样品2',
              quantity: 100,
              unit: 'ml',
              storageLocation: '冷藏室A-2'
            }
          ]
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('分样成功')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBe(2)
      expect(response.body.data[0].parentSampleId).toBe(testSampleId)
      expect(response.body.data[0]).toHaveProperty('barcode')
    })
  })

  describe('POST /api/samples/merge - 合样', () => {
    it('应该成功合样', async () => {
      // 先创建两个样品用于合样
      const sample1 = await request(app)
        .post('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientName: '测试客户',
          sampleName: '合样源1',
          sampleType: '水样',
          sampleCategory: '环境样品',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date().toISOString()
        })

      const sample2 = await request(app)
        .post('/api/samples')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientName: '测试客户',
          sampleName: '合样源2',
          sampleType: '水样',
          sampleCategory: '环境样品',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date().toISOString()
        })

      const response = await request(app)
        .post('/api/samples/merge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceSampleIds: [sample1.body.data.id, sample2.body.data.id],
          mergedSample: {
            sampleName: '合并样品',
            sampleType: '水样',
            sampleCategory: '环境样品',
            quantity: 200,
            unit: 'ml',
            storageLocation: '冷藏室B'
          }
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('合样成功')
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.sampleName).toBe('合并样品')
      expect(response.body.data.mergedFromIds).toContain(sample1.body.data.id)
      expect(response.body.data.mergedFromIds).toContain(sample2.body.data.id)
    })
  })

  describe('权限控制测试', () => {
    it('应该拒绝无权限的用户访问', async () => {
      // 创建一个没有权限的用户
      const timestamp = Date.now()
      const noPermUser = await prisma.user.create({
        data: {
          username: `no_perm_user_${timestamp}`,
          passwordHash: 'test_hash',
          email: `noperm_${timestamp}@example.com`,
          fullName: '无权限用户',
          status: 'ACTIVE'
        }
      })

      const noPermToken = jwt.sign(
        {
          userId: noPermUser.id,
          username: noPermUser.username,
          roles: [],
          jti: Math.random().toString(36).substring(2)
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .get('/api/samples')
        .set('Authorization', `Bearer ${noPermToken}`)

      expect(response.status).toBe(403)

      // 清理
      await prisma.user.delete({
        where: { id: noPermUser.id }
      })
    })
  })

  describe('错误处理测试', () => {
    it('应该正确处理无效的UUID', async () => {
      const response = await request(app)
        .get('/api/samples/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(400)
    })

    it('应该正确处理不存在的样品流转', async () => {
      const response = await request(app)
        .post('/api/samples/00000000-0000-0000-0000-000000000000/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromLocation: '位置A',
          toLocation: '位置B',
          fromPerson: '张三',
          toPerson: '李四'
        })

      expect(response.status).toBe(404)
    })
  })
})
