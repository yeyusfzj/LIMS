/**
 * 样品放行功能测试
 * 测试放行前置条件验证、单个样品放行、批量放行和幂等性检查
 */

import { PrismaClient, SampleStatus, AuditStatus, AuditDecision, JudgmentResult } from '@prisma/client'
import { auditService } from '../services/auditService'

const prisma = new PrismaClient()

describe('样品放行控制', () => {
  let testSampleId: string
  let testUserId: string

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'test_release_user',
        passwordHash: 'hash',
        email: 'release@test.com',
        fullName: '测试用户'
      }
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.qualityJudgment.deleteMany({
      where: { sample: { createdBy: testUserId } }
    })
    await prisma.auditTask.deleteMany({
      where: { sample: { createdBy: testUserId } }
    })
    await prisma.sample.deleteMany({
      where: { createdBy: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: `TEST-RELEASE-${Date.now()}`,
        sampleNumber: `SN-RELEASE-${Date.now()}`,
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水质',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        status: SampleStatus.AUDIT_COMPLETE,
        createdBy: testUserId
      }
    })
    testSampleId = sample.id
  })

  afterEach(async () => {
    // 清理每个测试创建的数据
    if (testSampleId) {
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: testSampleId }
      })
      await prisma.auditTask.deleteMany({
        where: { sampleId: testSampleId }
      })
      await prisma.sample.delete({
        where: { id: testSampleId }
      })
    }
  })

  describe('放行前置条件验证', () => {
    it('应该拒绝审核未完成的样品', async () => {
      // 更新样品状态为检测中
      await prisma.sample.update({
        where: { id: testSampleId },
        data: { status: SampleStatus.IN_TESTING }
      })

      const validation = await auditService.validateReleaseConditions(testSampleId)

      expect(validation.canRelease).toBe(false)
      expect(validation.violations).toContain('样品审核未完成')
    })

    it('应该拒绝没有质量判定的样品', async () => {
      // 创建审核任务（已通过）
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      const validation = await auditService.validateReleaseConditions(testSampleId)

      expect(validation.canRelease).toBe(false)
      expect(validation.violations).toContain('样品未进行质量判定')
    })

    it('应该拒绝质量判定不合格的样品', async () => {
      // 创建审核任务（已通过）
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      // 创建质量判定（不合格）
      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.UNQUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })

      const validation = await auditService.validateReleaseConditions(testSampleId)

      expect(validation.canRelease).toBe(false)
      expect(validation.violations).toContain('样品质量判定不合格')
    })

    it('应该拒绝存在未通过审核任务的样品', async () => {
      // 创建审核任务（被拒绝）
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.REJECTED,
          decision: AuditDecision.REJECT
        }
      })

      // 创建质量判定（合格）
      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.QUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })

      const validation = await auditService.validateReleaseConditions(testSampleId)

      expect(validation.canRelease).toBe(false)
      expect(validation.violations).toContain('存在未通过的审核任务')
    })

    it('应该通过所有条件都满足的样品', async () => {
      // 创建审核任务（已通过）
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      // 创建质量判定（合格）
      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.QUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })

      const validation = await auditService.validateReleaseConditions(testSampleId)

      expect(validation.canRelease).toBe(true)
      expect(validation.violations).toHaveLength(0)
    })
  })

  describe('单个样品放行', () => {
    beforeEach(async () => {
      // 准备满足放行条件的样品
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.QUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })
    })

    it('应该成功放行满足条件的样品', async () => {
      const result = await auditService.releaseSample(testSampleId, testUserId)

      expect(result.sampleId).toBe(testSampleId)
      expect(result.releasedBy).toBe(testUserId)
      expect(result.releasedAt).toBeInstanceOf(Date)
      expect(result.message).toBe('样品放行成功')

      // 验证样品状态已更新
      const sample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      })
      expect(sample?.status).toBe(SampleStatus.RELEASED)
      expect(sample?.releasedBy).toBe(testUserId)
      expect(sample?.releasedAt).toBeTruthy()
    })

    it('应该拒绝不满足条件的样品放行', async () => {
      // 删除质量判定
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: testSampleId }
      })

      await expect(
        auditService.releaseSample(testSampleId, testUserId)
      ).rejects.toThrow('放行条件不满足')
    })
  })

  describe('放行幂等性检查', () => {
    beforeEach(async () => {
      // 准备满足放行条件的样品
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.QUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })
    })

    it('应该拒绝重复放行已放行的样品', async () => {
      // 第一次放行
      await auditService.releaseSample(testSampleId, testUserId)

      // 第二次放行应该失败
      await expect(
        auditService.releaseSample(testSampleId, testUserId)
      ).rejects.toThrow('样品已放行，不能重复放行')
    })
  })

  describe('批量样品放行', () => {
    let sampleIds: string[]

    beforeEach(async () => {
      sampleIds = []

      // 创建3个测试样品
      for (let i = 0; i < 3; i++) {
        const sample = await prisma.sample.create({
          data: {
            barcode: `TEST-BATCH-${Date.now()}-${i}`,
            sampleNumber: `SN-BATCH-${Date.now()}-${i}`,
            clientName: '测试客户',
            sampleName: `测试样品${i}`,
            sampleType: '水质',
            sampleCategory: '环境',
            quantity: 100,
            unit: 'ml',
            receivedDate: new Date(),
            status: SampleStatus.AUDIT_COMPLETE,
            createdBy: testUserId
          }
        })
        sampleIds.push(sample.id)

        // 为每个样品创建审核任务和质量判定
        await prisma.auditTask.create({
          data: {
            sampleId: sample.id,
            level: 1,
            auditorId: testUserId,
            status: AuditStatus.APPROVED,
            decision: AuditDecision.APPROVE
          }
        })

        await prisma.qualityJudgment.create({
          data: {
            sampleId: sample.id,
            result: JudgmentResult.QUALIFIED,
            basis: '{}',
            judgedBy: testUserId
          }
        })
      }
    })

    afterEach(async () => {
      // 清理批量测试数据
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: { in: sampleIds } }
      })
      await prisma.auditTask.deleteMany({
        where: { sampleId: { in: sampleIds } }
      })
      await prisma.sample.deleteMany({
        where: { id: { in: sampleIds } }
      })
    })

    it('应该成功批量放行所有满足条件的样品', async () => {
      const result = await auditService.batchReleaseSamples(sampleIds, testUserId)

      expect(result.total).toBe(3)
      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(3)

      // 验证所有样品都已放行
      const samples = await prisma.sample.findMany({
        where: { id: { in: sampleIds } }
      })
      samples.forEach(sample => {
        expect(sample.status).toBe(SampleStatus.RELEASED)
        expect(sample.releasedBy).toBe(testUserId)
      })
    })

    it('应该在事务中处理批量放行，部分失败不影响其他样品', async () => {
      // 删除第二个样品的质量判定，使其不满足放行条件
      await prisma.qualityJudgment.delete({
        where: { sampleId: sampleIds[1] }
      })

      const result = await auditService.batchReleaseSamples(sampleIds, testUserId)

      expect(result.total).toBe(3)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(1)

      // 验证成功的样品已放行
      const successfulSamples = await prisma.sample.findMany({
        where: { 
          id: { in: [sampleIds[0], sampleIds[2]] }
        }
      })
      successfulSamples.forEach(sample => {
        expect(sample.status).toBe(SampleStatus.RELEASED)
      })

      // 验证失败的样品未放行
      const failedSample = await prisma.sample.findUnique({
        where: { id: sampleIds[1] }
      })
      expect(failedSample?.status).toBe(SampleStatus.AUDIT_COMPLETE)
    })

    it('应该返回详细的批量放行结果', async () => {
      const result = await auditService.batchReleaseSamples(sampleIds, testUserId)

      result.results.forEach(r => {
        expect(r.sampleId).toBeTruthy()
        expect(r.success).toBe(true)
        expect(r.barcode).toBeTruthy()
        expect(r.sampleNumber).toBeTruthy()
        expect(r.releasedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('放行信息记录', () => {
    beforeEach(async () => {
      // 准备满足放行条件的样品
      await prisma.auditTask.create({
        data: {
          sampleId: testSampleId,
          level: 1,
          auditorId: testUserId,
          status: AuditStatus.APPROVED,
          decision: AuditDecision.APPROVE
        }
      })

      await prisma.qualityJudgment.create({
        data: {
          sampleId: testSampleId,
          result: JudgmentResult.QUALIFIED,
          basis: '{}',
          judgedBy: testUserId
        }
      })
    })

    it('应该正确记录放行时间和人员', async () => {
      const beforeRelease = new Date()
      
      await auditService.releaseSample(testSampleId, testUserId)
      
      const afterRelease = new Date()

      const sample = await prisma.sample.findUnique({
        where: { id: testSampleId }
      })

      expect(sample?.releasedBy).toBe(testUserId)
      expect(sample?.releasedAt).toBeTruthy()
      
      const releasedAt = sample?.releasedAt as Date
      expect(releasedAt.getTime()).toBeGreaterThanOrEqual(beforeRelease.getTime())
      expect(releasedAt.getTime()).toBeLessThanOrEqual(afterRelease.getTime())
    })
  })
})
