/**
 * 报告管理 API 集成测试
 * 验证任务 13.9: 实现报告管理 API 端点
 * 
 * 测试所有报告管理相关的 API 端点:
 * - POST /api/report-templates - 创建模板
 * - GET /api/report-templates - 查询模板列表
 * - PUT /api/report-templates/:id - 更新模板
 * - POST /api/reports - 生成报告
 * - GET /api/reports/:id/preview - 预览报告
 * - POST /api/reports/:id/sign - 签名报告
 * - POST /api/reports/:id/distribute - 分发报告
 * - POST /api/reports/:id/recall - 回收报告
 */

import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import app from '../app'
import { ReportStatus } from '../types/report'

const prisma = new PrismaClient()

describe('报告管理 API 集成测试', () => {
  let authToken: string
  let userId: string
  let roleId: string
  let sampleId: string
  let templateId: string
  let reportId: string

  beforeAll(async () => {
    // 清理测试数据
    await prisma.distribution.deleteMany({
      where: { report: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } } }
    })
    await prisma.signature.deleteMany({
      where: { report: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } } }
    })
    await prisma.report.deleteMany({
      where: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } }
    })
    await prisma.reportTemplate.deleteMany({
      where: { name: { startsWith: 'API测试模板' } }
    })
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'REPORT-API-TEST' } }
    })
    await prisma.userRole.deleteMany({
      where: { user: { username: 'report_api_test_user' } }
    })
    await prisma.user.deleteMany({
      where: { username: 'report_api_test_user' }
    })
    await prisma.role.deleteMany({
      where: { name: 'report_api_tester' }
    })

    // 创建测试角色
    const role = await prisma.role.create({
      data: {
        name: 'report_api_tester',
        description: '报告API测试角色'
      }
    })
    roleId = role.id

    // 创建测试用户
    const bcrypt = require('bcrypt')
    const passwordHash = await bcrypt.hash('password123', 12)
    const user = await prisma.user.create({
      data: {
        username: 'report_api_test_user',
        passwordHash,
        email: 'report_api_test@example.com',
        fullName: '报告API测试用户',
        status: 'ACTIVE'
      }
    })
    userId = user.id

    // 分配角色
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id
      }
    })

    // 创建权限
    const permissions = [
      { resource: 'report', action: 'create' },
      { resource: 'report', action: 'read' },
      { resource: 'report', action: 'update' },
      { resource: 'report', action: 'delete' },
      { resource: 'report', action: 'sign' },
      { resource: 'report', action: 'distribute' }
    ]

    for (const perm of permissions) {
      const permission = await prisma.permission.findFirst({
        where: perm
      })

      if (permission) {
        await prisma.$executeRaw`
          INSERT INTO "_PermissionToRole" ("A", "B")
          VALUES (${permission.id}, ${role.id})
          ON CONFLICT DO NOTHING
        `
      } else {
        const newPerm = await prisma.permission.create({
          data: perm
        })
        await prisma.$executeRaw`
          INSERT INTO "_PermissionToRole" ("A", "B")
          VALUES (${newPerm.id}, ${role.id})
        `
      }
    }

    // 登录获取 token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'report_api_test_user',
        password: 'password123'
      })

    authToken = loginRes.body.data.accessToken

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'REPORT-API-TEST-001',
        sampleNumber: 'SAMPLE-API-001',
        clientName: 'API测试客户',
        sampleName: 'API测试样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 1000,
        unit: 'mL',
        receivedDate: new Date(),
        status: 'TESTING_COMPLETE',
        priority: 'NORMAL',
        createdBy: userId
      }
    })
    sampleId = sample.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.distribution.deleteMany({
      where: { report: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } } }
    })
    await prisma.signature.deleteMany({
      where: { report: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } } }
    })
    await prisma.report.deleteMany({
      where: { sample: { barcode: { startsWith: 'REPORT-API-TEST' } } }
    })
    await prisma.reportTemplate.deleteMany({
      where: { name: { startsWith: 'API测试模板' } }
    })
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'REPORT-API-TEST' } }
    })
    await prisma.userRole.deleteMany({
      where: { user: { username: 'report_api_test_user' } }
    })
    await prisma.user.deleteMany({
      where: { username: 'report_api_test_user' }
    })
    await prisma.role.deleteMany({
      where: { name: 'report_api_tester' }
    })

    await prisma.$disconnect()
  })

  describe('报告模板管理 API', () => {
    it('POST /api/report-templates - 应该成功创建报告模板', async () => {
      const res = await request(app)
        .post('/api/report-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'API测试模板-001',
          description: '用于API测试的报告模板',
          category: '水质检测',
          content: '<html><body><h1>{{sampleName}}</h1><p>{{result}}</p></body></html>',
          variables: {
            sampleName: '样品名称',
            result: '检测结果'
          }
        })

      expect(res.status).toBe(201)
      expect(res.body.data).toHaveProperty('id')
      expect(res.body.data.name).toBe('API测试模板-001')
      expect(res.body.data.isActive).toBe(true)
      
      templateId = res.body.data.id
    })

    it('GET /api/report-templates - 应该成功查询模板列表', async () => {
      const res = await request(app)
        .get('/api/report-templates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: '水质检测' })

      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.pagination).toBeDefined()
    })

    it('PUT /api/report-templates/:id - 应该成功更新模板', async () => {
      const res = await request(app)
        .put(`/api/report-templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '更新后的模板描述'
        })

      expect(res.status).toBe(200)
      expect(res.body.data.description).toBe('更新后的模板描述')
    })
  })

  describe('报告生成 API', () => {
    it('POST /api/reports - 应该成功生成报告', async () => {
      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sampleId,
          templateId,
          preview: false
        })

      expect(res.status).toBe(201)
      expect(res.body.data).toHaveProperty('reportId')
      expect(res.body.data).toHaveProperty('reportNumber')
      expect(res.body.data).toHaveProperty('content')
      
      reportId = res.body.data.reportId
    })

    it('GET /api/reports/:id/preview - 应该成功预览报告', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportId}/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sampleId,
          templateId
        })

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty('content')
    })

    it('GET /api/reports/:id - 应该成功获取报告详情', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(reportId)
      expect(res.body.data).toHaveProperty('reportNumber')
      expect(res.body.data).toHaveProperty('status')
    })
  })

  describe('电子签名 API', () => {
    it('POST /api/reports/:id/sign - 应该成功签名报告', async () => {
      const res = await request(app)
        .post(`/api/reports/${reportId}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureData: 'base64-encoded-signature-data',
          signerRole: 'report_api_tester'
        })

      expect(res.status).toBe(201)
      expect(res.body.message).toBe('报告签名成功')
      expect(res.body.data).toHaveProperty('id')
      expect(res.body.data.signerId).toBe(userId)
    })

    it('GET /api/reports/:id/signatures - 应该成功获取报告的所有签名', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportId}/signatures`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('报告分发 API', () => {
    it('POST /api/reports/:id/distribute - 应该成功分发报告', async () => {
      // 先添加第二个签名以完成签名流程
      await request(app)
        .post(`/api/reports/${reportId}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          signatureData: 'base64-encoded-signature-data-2',
          signerRole: 'report_api_tester'
        })

      const res = await request(app)
        .post(`/api/reports/${reportId}/distribute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          method: 'EMAIL',
          recipient: 'test@example.com',
          recipientEmail: 'test@example.com'
        })

      expect(res.status).toBe(201)
      expect(res.body.message).toBe('报告分发成功')
      expect(res.body.data).toHaveProperty('id')
    })

    it('GET /api/reports/:id/distributions - 应该成功获取分发记录', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportId}/distributions`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toBeInstanceOf(Array)
      expect(res.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('报告回收 API', () => {
    it('POST /api/reports/:id/recall - 应该成功回收报告', async () => {
      const res = await request(app)
        .post(`/api/reports/${reportId}/recall`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'API测试回收'
        })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('报告回收成功')
      expect(res.body.data.status).toBe(ReportStatus.RECALLED)
    })
  })

  describe('API 端点完整性验证', () => {
    it('应该验证所有必需的 API 端点都已实现', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/report-templates' },
        { method: 'GET', path: '/api/report-templates' },
        { method: 'PUT', path: `/api/report-templates/${templateId}` },
        { method: 'POST', path: '/api/reports' },
        { method: 'GET', path: `/api/reports/${reportId}/preview` },
        { method: 'POST', path: `/api/reports/${reportId}/sign` },
        { method: 'POST', path: `/api/reports/${reportId}/distribute` },
        { method: 'POST', path: `/api/reports/${reportId}/recall` }
      ]

      for (const endpoint of endpoints) {
        let res
        if (endpoint.method === 'GET') {
          res = await request(app)
            .get(endpoint.path)
            .set('Authorization', `Bearer ${authToken}`)
        } else if (endpoint.method === 'POST') {
          res = await request(app)
            .post(endpoint.path)
            .set('Authorization', `Bearer ${authToken}`)
            .send({})
        } else if (endpoint.method === 'PUT') {
          res = await request(app)
            .put(endpoint.path)
            .set('Authorization', `Bearer ${authToken}`)
            .send({})
        }

        // 验证端点存在（不是 404）
        expect(res?.status).not.toBe(404)
      }
    })
  })
})
