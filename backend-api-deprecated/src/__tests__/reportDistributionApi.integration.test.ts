/**
 * 报告分发和回收 API 集成测试
 * 验证需求: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import { PrismaClient } from '@prisma/client'
import { ReportStatus, DistributionMethod, DistributionStatus } from '../types/report'

const prisma = new PrismaClient()

describe('报告分发和回收 API 集成测试', () => {
  let authToken: string
  let testUserId: string
  let testSampleId: string
  let testTemplateId: string
  let testReportId: string

  beforeAll(async () => {
    // 创建测试用户
    const bcrypt = require('bcrypt')
    const passwordHash = await bcrypt.hash('password123', 12)
    const user = await prisma.user.create({
      data: {
        username: 'test_distribution_user',
        email: 'distribution@test.com',
        passwordHash,
        fullName: '测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = user.id

    // 登录获取真实 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'test_distribution_user',
        password: 'password123'
      })
    
    authToken = loginRes.body.data.accessToken

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'TEST-DIST-001',
        sampleNumber: 'SAMPLE-DIST-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'mL',
        receivedDate: new Date(),
        status: 'REGISTERED',
        priority: 'NORMAL',
        createdBy: testUserId
      }
    })
    testSampleId = sample.id

    // 创建测试模板
    const template = await prisma.reportTemplate.create({
      data: {
        name: '测试报告模板',
        category: '检测报告',
        content: '<html><body>{{sample.sampleName}}</body></html>',
        variables: [],
        isActive: true,
        createdBy: testUserId
      }
    })
    testTemplateId = template.id

    // 创建测试报告（已签名状态）
    const report = await prisma.report.create({
      data: {
        reportNumber: 'REPORT-TEST-DIST-001',
        sampleId: testSampleId,
        templateId: testTemplateId,
        content: '<html><body>测试报告内容</body></html>',
        status: ReportStatus.SIGNED,
        generatedBy: testUserId
      }
    })
    testReportId = report.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.distribution.deleteMany({
      where: { reportId: testReportId }
    })
    await prisma.report.deleteMany({
      where: { id: testReportId }
    })
    await prisma.reportTemplate.deleteMany({
      where: { id: testTemplateId }
    })
    await prisma.sample.deleteMany({
      where: { id: testSampleId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
    await prisma.$disconnect()
  })

  describe('POST /api/reports/:id/distribute - 分发报告', () => {
    it('应该成功通过邮件分发报告', async () => {
      // 验证需求: 16.1, 16.3
      const response = await request(app)
        .post(`/api/reports/${testReportId}/distribute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          recipientEmail: 'zhangsan@example.com'
        })

      expect(response.status).toBe(201)
      expect(response.body.message).toBe('报告分发成功')
      expect(response.body.data).toBeDefined()
      expect(response.body.data.distribution).toBeDefined()
      expect(response.body.data.distribution.method).toBe(DistributionMethod.EMAIL)
      expect(response.body.data.distribution.recipient).toBe('张三')
    })

    it('应该成功生成下载链接', async () => {
      // 验证需求: 16.3
      const response = await request(app)
        .post(`/api/reports/${testReportId}/distribute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: DistributionMethod.DOWNLOAD,
          recipient: '李四'
        })

      expect(response.status).toBe(201)
      expect(response.body.data.downloadUrl).toBeDefined()
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.expiresIn).toBe(86400)
    })

    it('应该拒绝未授权的分发请求', async () => {
      const response = await request(app)
        .post(`/api/reports/${testReportId}/distribute`)
        .send({
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          recipientEmail: 'zhangsan@example.com'
        })

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    })

    it('邮件分发时缺少邮箱应该返回错误', async () => {
      // 验证需求: 16.3
      const response = await request(app)
        .post(`/api/reports/${testReportId}/distribute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: DistributionMethod.EMAIL,
          recipient: '张三'
          // 缺少 recipientEmail
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBeDefined()
    })
  })

  describe('POST /api/reports/:id/recall - 回收报告', () => {
    it('应该成功回收已分发的报告', async () => {
      // 验证需求: 16.4
      // 先分发报告
      await prisma.report.update({
        where: { id: testReportId },
        data: { status: ReportStatus.DISTRIBUTED }
      })

      const response = await request(app)
        .post(`/api/reports/${testReportId}/recall`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: '数据错误需要修正'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('报告回收成功')
      expect(response.body.data.report.status).toBe(ReportStatus.RECALLED)
      expect(response.body.data.report.recallReason).toBe('数据错误需要修正')
      expect(response.body.data.report.recalledAt).toBeDefined()
    })

    it('应该拒绝未授权的回收请求', async () => {
      const response = await request(app)
        .post(`/api/reports/${testReportId}/recall`)
        .send({
          reason: '测试回收'
        })

      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('UNAUTHORIZED')
    })

    it('回收时必须提供原因', async () => {
      // 验证需求: 16.4
      const response = await request(app)
        .post(`/api/reports/${testReportId}/recall`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // 缺少 reason
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBeDefined()
    })
  })

  describe('GET /api/reports/:id/distributions - 获取报告的分发记录', () => {
    it('应该成功获取报告的分发记录', async () => {
      // 验证需求: 16.5
      // 先创建一些分发记录
      await prisma.distribution.create({
        data: {
          reportId: testReportId,
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          recipientEmail: 'zhangsan@example.com',
          status: DistributionStatus.SENT,
          sentAt: new Date()
        }
      })

      const response = await request(app)
        .get(`/api/reports/${testReportId}/distributions`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('应该拒绝未授权的请求', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReportId}/distributions`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/distributions/history - 获取分发历史', () => {
    it('应该成功获取分发历史', async () => {
      // 验证需求: 16.5
      const response = await request(app)
        .get('/api/distributions/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          pageSize: 20
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.pagination).toBeDefined()
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0)
      expect(response.body.pagination.page).toBe(1)
      expect(response.body.pagination.pageSize).toBe(20)
    })

    it('应该支持按报告ID过滤', async () => {
      // 验证需求: 16.5
      const response = await request(app)
        .get('/api/distributions/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          reportId: testReportId,
          page: 1,
          pageSize: 20
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
    })

    it('应该支持按分发方式过滤', async () => {
      // 验证需求: 16.5
      const response = await request(app)
        .get('/api/distributions/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          method: DistributionMethod.EMAIL,
          page: 1,
          pageSize: 20
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
    })

    it('应该支持按状态过滤', async () => {
      // 验证需求: 16.5
      const response = await request(app)
        .get('/api/distributions/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: DistributionStatus.SENT,
          page: 1,
          pageSize: 20
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toBeDefined()
    })

    it('应该拒绝未授权的请求', async () => {
      const response = await request(app)
        .get('/api/distributions/history')

      expect(response.status).toBe(401)
    })
  })
})
