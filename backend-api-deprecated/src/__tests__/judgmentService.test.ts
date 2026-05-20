/**
 * 质量判定服务单元测试
 */

import { PrismaClient, JudgmentResult, SampleStatus } from '@prisma/client'
import { judgmentService } from '../services/judgmentService'
import { JudgmentRuleType } from '../types/judgment'

const prisma = new PrismaClient()

describe('JudgmentService', () => {
  let testSampleId: string
  let testRuleId: string
  let testUserId: string

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'judgment_tester',
        passwordHash: 'hash',
        email: 'judgment@test.com',
        fullName: '判定测试员'
      }
    })
    testUserId = user.id

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'JDG-TEST-001',
        sampleNumber: 'JDG-2024-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水质',
        sampleCategory: '环境',
        quantity: 1,
        unit: 'L',
        receivedDate: new Date(),
        status: SampleStatus.AUDIT_COMPLETE,
        createdBy: user.id
      }
    })
    testSampleId = sample.id

    // 创建测试项
    await prisma.testItem.create({
      data: {
        sampleId: sample.id,
        testMethod: 'pH测定',
        testParameters: {},
        status: 'COMPLETED'
      }
    })

    // 创建检测结果
    await prisma.result.create({
      data: {
        sampleId: sample.id,
        testItemId: 'test-item-1',
        parameter: 'pH',
        value: 7.2,
        unit: '',
        method: 'pH测定',
        enteredBy: user.id
      }
    })

    await prisma.result.create({
      data: {
        sampleId: sample.id,
        testItemId: 'test-item-2',
        parameter: 'temperature',
        value: 25,
        unit: '℃',
        method: 'pH测定',
        enteredBy: user.id
      }
    })
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.judgmentHistory.deleteMany({})
    await prisma.qualityJudgment.deleteMany({})
    await prisma.judgmentRule.deleteMany({})
    await prisma.result.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.testItem.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.sample.delete({ where: { id: testSampleId } })
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.$disconnect()
  })

  describe('判定规则管理', () => {
    it('应该成功创建范围判定规则', async () => {
      const rule = await judgmentService.createJudgmentRule(
        {
          name: 'pH范围判定',
          description: 'pH值应在6.5-8.5之间',
          testItemType: 'pH测定',
          conditions: [
            {
              type: JudgmentRuleType.RANGE,
              parameter: 'pH',
              minValue: 6.5,
              maxValue: 8.5
            }
          ],
          priority: 1
        },
        testUserId
      )

      expect(rule).toBeDefined()
      expect(rule.name).toBe('pH范围判定')
      expect(rule.testItemType).toBe('pH测定')
      expect(rule.conditions).toHaveLength(1)
      expect(rule.isActive).toBe(true)

      testRuleId = rule.id
    })

    it('应该成功创建公式判定规则', async () => {
      const rule = await judgmentService.createJudgmentRule(
        {
          name: '温度pH综合判定',
          description: '温度和pH的综合判定',
          testItemType: 'pH测定',
          conditions: [
            {
              type: JudgmentRuleType.FORMULA,
              formula: '(pH - 6) * (30 - temperature)' // 当pH在6-8.5且温度在0-30时结果为正
            }
          ],
          priority: 2
        },
        testUserId
      )

      expect(rule).toBeDefined()
      expect(rule.name).toBe('温度pH综合判定')
      expect(rule.conditions[0].type).toBe(JudgmentRuleType.FORMULA)
    })

    it('应该成功创建逻辑判定规则', async () => {
      const rule = await judgmentService.createJudgmentRule(
        {
          name: '逻辑判定',
          description: 'pH大于7且温度小于30',
          testItemType: 'pH测定',
          conditions: [
            {
              type: JudgmentRuleType.LOGIC,
              logicExpression: 'pH > 7 and temperature < 30'
            }
          ],
          priority: 3
        },
        testUserId
      )

      expect(rule).toBeDefined()
      expect(rule.conditions[0].type).toBe(JudgmentRuleType.LOGIC)
    })

    it('应该拒绝创建无效的判定规则', async () => {
      await expect(
        judgmentService.createJudgmentRule(
          {
            name: '无效规则',
            testItemType: 'pH测定',
            conditions: []
          },
          testUserId
        )
      ).rejects.toThrow('判定条件不能为空')
    })

    it('应该成功查询判定规则列表', async () => {
      const result = await judgmentService.listJudgmentRules({
        testItemType: 'pH测定',
        isActive: true,
        page: 1,
        pageSize: 10
      })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.total).toBeGreaterThan(0)
    })

    it('应该成功更新判定规则', async () => {
      const updated = await judgmentService.updateJudgmentRule(testRuleId, {
        name: 'pH范围判定（已更新）',
        priority: 10
      })

      expect(updated.name).toBe('pH范围判定（已更新）')
      expect(updated.priority).toBe(10)
    })

    it('应该成功停用判定规则', async () => {
      const updated = await judgmentService.updateJudgmentRule(testRuleId, {
        isActive: false
      })

      expect(updated.isActive).toBe(false)
    })
  })

  describe('质量判定执行', () => {
    beforeEach(async () => {
      // 确保规则是激活状态
      await prisma.judgmentRule.updateMany({
        where: { testItemType: 'pH测定' },
        data: { isActive: true }
      })

      // 清理之前的判定结果
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: testSampleId }
      })
    })

    it('应该成功执行自动质量判定（合格）', async () => {
      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      expect(judgment).toBeDefined()
      expect(judgment.sampleId).toBe(testSampleId)
      expect(judgment.result).toBe(JudgmentResult.QUALIFIED)
      expect(judgment.isAutomatic).toBe(true)
      expect(judgment.basisDetails).toBeDefined()
      expect(judgment.basisDetails.length).toBeGreaterThan(0)
    })

    it('应该成功执行自动质量判定（不合格）', async () => {
      // 修改检测结果使其不合格
      await prisma.result.updateMany({
        where: {
          sampleId: testSampleId,
          parameter: 'pH'
        },
        data: { value: 9.5 } // 超出范围
      })

      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      expect(judgment.result).toBe(JudgmentResult.UNQUALIFIED)
      expect(judgment.basisDetails.some(d => !d.evaluationResult)).toBe(true)

      // 恢复数据
      await prisma.result.updateMany({
        where: {
          sampleId: testSampleId,
          parameter: 'pH'
        },
        data: { value: 7.2 }
      })
    })

    it('应该拒绝对非审核完成状态的样品进行判定', async () => {
      // 修改样品状态
      await prisma.sample.update({
        where: { id: testSampleId },
        data: { status: SampleStatus.IN_TESTING }
      })

      await expect(
        judgmentService.performQualityJudgment({
          sampleId: testSampleId,
          performedBy: testUserId
        })
      ).rejects.toThrow('只有审核完成的样品才能进行质量判定')

      // 恢复状态
      await prisma.sample.update({
        where: { id: testSampleId },
        data: { status: SampleStatus.AUDIT_COMPLETE }
      })
    })

    it('应该拒绝重复判定', async () => {
      // 第一次判定
      await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      // 第二次判定应该失败
      await expect(
        judgmentService.performQualityJudgment({
          sampleId: testSampleId,
          performedBy: testUserId
        })
      ).rejects.toThrow('该样品已有判定结果')
    })
  })

  describe('人工复核', () => {
    let judgmentId: string

    beforeEach(async () => {
      // 清理并创建新的判定结果
      await prisma.judgmentHistory.deleteMany({})
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: testSampleId }
      })

      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })
      judgmentId = judgment.id
    })

    it('应该成功进行人工复核并覆盖判定结果', async () => {
      const reviewed = await judgmentService.reviewJudgment({
        judgmentId,
        newResult: JudgmentResult.UNQUALIFIED,
        reason: '人工复核发现问题',
        reviewedBy: testUserId
      })

      expect(reviewed.result).toBe(JudgmentResult.UNQUALIFIED)
      expect(reviewed.reviewedBy).toBe(testUserId)
      expect(reviewed.reviewedAt).toBeDefined()
    })

    it('应该记录判定历史', async () => {
      // 执行复核
      await judgmentService.reviewJudgment({
        judgmentId,
        newResult: JudgmentResult.UNQUALIFIED,
        reason: '人工复核发现问题',
        reviewedBy: testUserId
      })

      // 查询历史
      const history = await judgmentService.listJudgmentHistory({
        judgmentId,
        page: 1,
        pageSize: 10
      })

      expect(history.items.length).toBe(1)
      expect(history.items[0].judgmentId).toBe(judgmentId)
      expect(history.items[0].previousResult).toBe(JudgmentResult.QUALIFIED)
      expect(history.items[0].newResult).toBe(JudgmentResult.UNQUALIFIED)
      expect(history.items[0].changeReason).toBe('人工复核发现问题')
    })

    it('应该支持多次复核', async () => {
      // 第一次复核
      await judgmentService.reviewJudgment({
        judgmentId,
        newResult: JudgmentResult.UNQUALIFIED,
        reason: '第一次复核',
        reviewedBy: testUserId
      })

      // 第二次复核
      await judgmentService.reviewJudgment({
        judgmentId,
        newResult: JudgmentResult.QUALIFIED,
        reason: '第二次复核，恢复合格',
        reviewedBy: testUserId
      })

      // 查询历史
      const history = await judgmentService.listJudgmentHistory({
        judgmentId,
        page: 1,
        pageSize: 10
      })

      expect(history.items.length).toBe(2)
    })
  })

  describe('判定依据详情', () => {
    beforeEach(async () => {
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: testSampleId }
      })
    })

    it('应该包含详细的范围判定依据', async () => {
      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      const rangeBasis = judgment.basisDetails.find(
        d => d.conditionType === JudgmentRuleType.RANGE
      )

      expect(rangeBasis).toBeDefined()
      expect(rangeBasis?.parameter).toBe('pH')
      expect(rangeBasis?.actualValue).toBe(7.2)
      expect(rangeBasis?.expectedRange).toBeDefined()
      expect(rangeBasis?.evaluationResult).toBe(true)
      expect(rangeBasis?.message).toContain('在合格范围内')
    })

    it('应该包含详细的公式判定依据', async () => {
      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      const formulaBasis = judgment.basisDetails.find(
        d => d.conditionType === JudgmentRuleType.FORMULA
      )

      expect(formulaBasis).toBeDefined()
      expect(formulaBasis?.formula).toBeDefined()
      expect(formulaBasis?.calculatedValue).toBeDefined()
      expect(formulaBasis?.message).toContain('计算结果')
    })

    it('应该包含详细的逻辑判定依据', async () => {
      const judgment = await judgmentService.performQualityJudgment({
        sampleId: testSampleId,
        performedBy: testUserId
      })

      const logicBasis = judgment.basisDetails.find(
        d => d.conditionType === JudgmentRuleType.LOGIC
      )

      expect(logicBasis).toBeDefined()
      expect(logicBasis?.logicExpression).toBeDefined()
      expect(logicBasis?.message).toContain('评估结果')
    })
  })

  describe('批量判定', () => {
    let sampleIds: string[]

    beforeAll(async () => {
      // 创建多个测试样品
      sampleIds = []
      for (let i = 0; i < 3; i++) {
        const sample = await prisma.sample.create({
          data: {
            barcode: `BATCH-${i}`,
            sampleNumber: `BATCH-2024-${i}`,
            clientName: '批量测试客户',
            sampleName: `批量测试样品${i}`,
            sampleType: '水质',
            sampleCategory: '环境',
            quantity: 1,
            unit: 'L',
            receivedDate: new Date(),
            status: SampleStatus.AUDIT_COMPLETE,
            createdBy: testUserId
          }
        })
        sampleIds.push(sample.id)

        // 创建检测项
        await prisma.testItem.create({
          data: {
            sampleId: sample.id,
            testMethod: 'pH测定',
            testParameters: {},
            status: 'COMPLETED'
          }
        })

        // 创建检测结果
        await prisma.result.create({
          data: {
            sampleId: sample.id,
            testItemId: `batch-test-${i}`,
            parameter: 'pH',
            value: 7.0 + i * 0.1,
            unit: '',
            method: 'pH测定',
            enteredBy: testUserId
          }
        })

        // 添加温度结果
        await prisma.result.create({
          data: {
            sampleId: sample.id,
            testItemId: `batch-test-temp-${i}`,
            parameter: 'temperature',
            value: 25,
            unit: '℃',
            method: 'pH测定',
            enteredBy: testUserId
          }
        })
      }
    })

    afterAll(async () => {
      // 清理批量测试数据
      await prisma.qualityJudgment.deleteMany({
        where: { sampleId: { in: sampleIds } }
      })
      await prisma.result.deleteMany({
        where: { sampleId: { in: sampleIds } }
      })
      await prisma.testItem.deleteMany({
        where: { sampleId: { in: sampleIds } }
      })
      await prisma.sample.deleteMany({
        where: { id: { in: sampleIds } }
      })
    })

    it('应该成功执行批量判定', async () => {
      const result = await judgmentService.batchJudgment({
        sampleIds,
        performedBy: testUserId
      })

      expect(result.total).toBe(3)
      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(3)
      expect(result.results.every(r => r.success)).toBe(true)
    })
  })
})
