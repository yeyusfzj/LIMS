/**
 * 检测结果服务单元测试
 * 
 * 验证需求：7.1, 7.2
 */

import { PrismaClient, ResultSource } from '@prisma/client'
import { ResultService } from '../services/resultService'
import { SampleService } from '../services/sampleService'
import { CreateResultDto } from '../types/result'
import { CreateSampleDto } from '../types/sample'

const prisma = new PrismaClient()
const resultService = new ResultService()
const sampleService = new SampleService()

describe('ResultService', () => {
  let testSampleId: string
  let testTestItemId: string
  const testUserId = 'test-user-id'

  // 在所有测试前创建测试样品和检测项
  beforeAll(async () => {
    // 创建测试样品
    const sampleData: CreateSampleDto = {
      clientName: 'TEST_结果测试客户',
      sampleName: '结果测试样品',
      sampleType: '水质',
      sampleCategory: '地表水',
      quantity: 500,
      unit: 'ml',
      receivedDate: new Date(),
      createdBy: testUserId
    }

    const sample = await sampleService.createSample(sampleData)
    testSampleId = sample.id

    // 创建测试检测项
    const testItem = await prisma.testItem.create({
      data: {
        sampleId: testSampleId,
        testMethod: 'GB/T 5750.4-2006',
        testStandard: '生活饮用水标准检验方法',
        testParameters: {
          parameters: ['pH', '浊度', '色度']
        }
      }
    })
    testTestItemId = testItem.id
  })

  // 清理测试数据
  afterEach(async () => {
    await prisma.result.deleteMany({
      where: {
        sampleId: testSampleId
      }
    })
  })

  afterAll(async () => {
    // 清理测试检测项和样品
    await prisma.testItem.deleteMany({
      where: { sampleId: testSampleId }
    })
    await prisma.sample.deleteMany({
      where: { clientName: { contains: 'TEST_结果测试' } }
    })
    await prisma.$disconnect()
  })

  describe('createResult - 需求 7.1, 7.2', () => {
    it('应该成功创建手工录入的数值结果', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.2,
        unit: '',
        method: 'GB/T 5750.4-2006',
        source: ResultSource.MANUAL,
        enteredBy: testUserId
      }

      const result = await resultService.createResult(data)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.sampleId).toBe(testSampleId)
      expect(result.testItemId).toBe(testTestItemId)
      expect(result.parameter).toBe('pH')
      expect(result.value).toBe(7.2)
      expect(result.method).toBe('GB/T 5750.4-2006')
      expect(result.source).toBe(ResultSource.MANUAL)
      expect(result.enteredBy).toBe(testUserId)
      expect(result.enteredAt).toBeDefined()
      expect(result.enteredAt).toBeInstanceOf(Date)
    })

    it('应该成功创建仪器导入的结果', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: '浊度',
        value: 0.5,
        unit: 'NTU',
        method: 'GB/T 5750.4-2006',
        source: ResultSource.INSTRUMENT,
        instrumentId: 'instrument-001',
        enteredBy: testUserId
      }

      const result = await resultService.createResult(data)

      expect(result.source).toBe(ResultSource.INSTRUMENT)
      expect(result.instrumentId).toBe('instrument-001')
      expect(result.enteredAt).toBeDefined()
    })

    it('应该成功创建文本型结果', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: '色度',
        textValue: '无色透明',
        method: 'GB/T 5750.4-2006',
        source: ResultSource.MANUAL,
        enteredBy: testUserId
      }

      const result = await resultService.createResult(data)

      expect(result.textValue).toBe('无色透明')
      expect(result.value).toBeNull()
    })

    it('应该记录准确的时间戳（需求 7.2）', async () => {
      const beforeCreate = new Date()

      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.5,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      const result = await resultService.createResult(data)

      const afterCreate = new Date()

      expect(result.enteredAt).toBeDefined()
      expect(result.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(result.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('应该正确标记结果来源（需求 7.2）', async () => {
      // 测试手工录入
      const manualData: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH-1',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        source: ResultSource.MANUAL,
        enteredBy: testUserId
      }

      const manualResult = await resultService.createResult(manualData)
      expect(manualResult.source).toBe(ResultSource.MANUAL)

      // 测试仪器导入
      const instrumentData: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH-2',
        value: 7.1,
        method: 'GB/T 5750.4-2006',
        source: ResultSource.INSTRUMENT,
        instrumentId: 'instrument-002',
        enteredBy: testUserId
      }

      const instrumentResult = await resultService.createResult(instrumentData)
      expect(instrumentResult.source).toBe(ResultSource.INSTRUMENT)
      expect(instrumentResult.instrumentId).toBe('instrument-002')
    })

    it('应该在样品不存在时抛出错误', async () => {
      const data: CreateResultDto = {
        sampleId: 'non-existent-sample-id',
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      await expect(resultService.createResult(data)).rejects.toThrow('样品不存在')
    })

    it('应该在检测项不存在时抛出错误', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: 'non-existent-test-item-id',
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      await expect(resultService.createResult(data)).rejects.toThrow(
        '检测项不存在或不属于该样品'
      )
    })

    it('应该在检测项不属于该样品时抛出错误', async () => {
      // 创建另一个样品
      const anotherSample = await sampleService.createSample({
        clientName: 'TEST_另一个样品',
        sampleName: '另一个样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: testUserId
      })

      const data: CreateResultDto = {
        sampleId: anotherSample.id,
        testItemId: testTestItemId, // 这个检测项属于 testSampleId
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      await expect(resultService.createResult(data)).rejects.toThrow(
        '检测项不存在或不属于该样品'
      )

      // 清理
      await prisma.sample.delete({ where: { id: anotherSample.id } })
    })
  })

  describe('getResultById', () => {
    it('应该成功获取结果详情', async () => {
      // 先创建一个结果
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.3,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      const created = await resultService.createResult(data)

      // 获取结果
      const result = await resultService.getResultById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.parameter).toBe('pH')
      expect(result?.value).toBe(7.3)
    })

    it('应该在结果不存在时返回 null', async () => {
      const result = await resultService.getResultById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('listResults', () => {
    beforeEach(async () => {
      // 创建多个测试结果
      const results = [
        {
          parameter: 'pH',
          value: 7.0,
          source: ResultSource.MANUAL
        },
        {
          parameter: '浊度',
          value: 0.5,
          source: ResultSource.INSTRUMENT,
          instrumentId: 'instrument-001'
        },
        {
          parameter: '色度',
          textValue: '无色',
          source: ResultSource.MANUAL
        }
      ]

      for (const r of results) {
        await resultService.createResult({
          sampleId: testSampleId,
          testItemId: testTestItemId,
          parameter: r.parameter,
          value: r.value,
          textValue: (r as any).textValue,
          method: 'GB/T 5750.4-2006',
          source: r.source,
          instrumentId: (r as any).instrumentId,
          enteredBy: testUserId
        })
      }
    })

    it('应该成功查询所有结果', async () => {
      const results = await resultService.listResults({})

      expect(results.items.length).toBeGreaterThanOrEqual(3)
      expect(results.total).toBeGreaterThanOrEqual(3)
    })

    it('应该支持按样品 ID 过滤', async () => {
      const results = await resultService.listResults({
        sampleId: testSampleId
      })

      expect(results.items.length).toBe(3)
      results.items.forEach(r => {
        expect(r.sampleId).toBe(testSampleId)
      })
    })

    it('应该支持按结果来源过滤', async () => {
      const results = await resultService.listResults({
        sampleId: testSampleId,
        source: ResultSource.MANUAL
      })

      expect(results.items.length).toBe(2)
      results.items.forEach(r => {
        expect(r.source).toBe(ResultSource.MANUAL)
      })
    })

    it('应该支持分页', async () => {
      const page1 = await resultService.listResults({
        sampleId: testSampleId,
        page: 1,
        pageSize: 2
      })

      expect(page1.items.length).toBe(2)
      expect(page1.page).toBe(1)
      expect(page1.pageSize).toBe(2)
      expect(page1.total).toBe(3)
      expect(page1.totalPages).toBe(2)

      const page2 = await resultService.listResults({
        sampleId: testSampleId,
        page: 2,
        pageSize: 2
      })

      expect(page2.items.length).toBe(1)
      expect(page2.page).toBe(2)
    })
  })

  describe('updateResult', () => {
    it('应该成功更新结果', async () => {
      // 创建结果
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      const created = await resultService.createResult(data)

      // 更新结果
      const updated = await resultService.updateResult(created.id, {
        value: 7.5,
        isAbnormal: true,
        abnormalReason: '超出正常范围'
      })

      expect(updated.value).toBe(7.5)
      expect(updated.isAbnormal).toBe(true)
      expect(updated.abnormalReason).toBe('超出正常范围')
    })

    it('应该在审核时记录审核人和时间', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      const created = await resultService.createResult(data)

      const reviewerId = 'reviewer-id'
      const updated = await resultService.updateResult(created.id, {
        reviewedBy: reviewerId
      })

      expect(updated.reviewedBy).toBe(reviewerId)
      expect(updated.reviewedAt).toBeDefined()
      expect(updated.reviewedAt).toBeInstanceOf(Date)
    })

    it('应该在结果不存在时抛出错误', async () => {
      await expect(
        resultService.updateResult('non-existent-id', { value: 7.5 })
      ).rejects.toThrow('结果不存在')
    })
  })

  describe('deleteResult', () => {
    it('应该成功删除结果', async () => {
      const data: CreateResultDto = {
        sampleId: testSampleId,
        testItemId: testTestItemId,
        parameter: 'pH',
        value: 7.0,
        method: 'GB/T 5750.4-2006',
        enteredBy: testUserId
      }

      const created = await resultService.createResult(data)

      await resultService.deleteResult(created.id)

      const result = await resultService.getResultById(created.id)
      expect(result).toBeNull()
    })
  })

  describe('getResultsBySampleId', () => {
    it('应该获取样品的所有结果', async () => {
      // 创建多个结果
      const parameters = ['pH', '浊度', '色度']
      for (const param of parameters) {
        await resultService.createResult({
          sampleId: testSampleId,
          testItemId: testTestItemId,
          parameter: param,
          value: 7.0,
          method: 'GB/T 5750.4-2006',
          enteredBy: testUserId
        })
      }

      const results = await resultService.getResultsBySampleId(testSampleId)

      expect(results.length).toBe(3)
      expect(results.map(r => r.parameter).sort()).toEqual(['pH', '浊度', '色度'].sort())
    })

    it('应该在样品没有结果时返回空数组', async () => {
      // 创建一个新样品
      const newSample = await sampleService.createSample({
        clientName: 'TEST_无结果样品',
        sampleName: '无结果样品',
        sampleType: '水质',
        sampleCategory: '地表水',
        quantity: 500,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: testUserId
      })

      const results = await resultService.getResultsBySampleId(newSample.id)

      expect(results).toEqual([])

      // 清理
      await prisma.sample.delete({ where: { id: newSample.id } })
    })
  })
})
