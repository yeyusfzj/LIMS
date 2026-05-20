/**
 * 检测结果录入属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证需求：7.2
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { PrismaClient, ResultSource } from '@prisma/client'
import { ResultService } from '../services/resultService'
import { SampleService } from '../services/sampleService'
import { CreateResultDto } from '../types/result'
import { CreateSampleDto } from '../types/sample'
import fc from 'fast-check'

const prisma = new PrismaClient()
const resultService = new ResultService()
const sampleService = new SampleService()

describe('Feature: laboratory-backend-api, Property 12: 结果录入时间戳一致性', () => {
  let testSampleId: string
  let testTestItemId: string
  const testUserId = 'property-test-user'

  // 在所有测试前创建测试样品和检测项
  beforeAll(async () => {
    // 创建测试样品
    const sampleData: CreateSampleDto = {
      clientName: 'PROP_TEST_结果录入',
      sampleName: '属性测试样品',
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
          parameters: ['pH', '浊度', '色度', '温度', '电导率']
        }
      }
    })
    testTestItemId = testItem.id
  })

  // 清理每次测试后的结果数据
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
      where: { clientName: { contains: 'PROP_TEST_结果录入' } }
    })
    await prisma.$disconnect()
  })

  /**
   * 属性 12: 结果录入时间戳一致性
   * 
   * **验证需求: 7.2**
   * 
   * 对于任何检测结果录入，系统必须记录准确的时间戳和操作人员，
   * 且时间戳不能被篡改。
   * 
   * 这个属性确保了：
   * 1. 录入时间应该在操作开始和结束之间
   * 2. 时间戳应该单调递增（对于连续录入的结果）
   * 3. 手工录入和仪器录入都应该有正确的时间戳和来源标记
   */
  it('对于任何结果录入操作，时间戳应该在操作开始和结束之间', async () => {
    // 定义结果数据生成器
    const resultDataArbitrary = fc.record({
      parameter: fc.constantFrom('pH', '浊度', '色度', '温度', '电导率'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('', 'NTU', '度', '℃', 'μS/cm'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constantFrom(ResultSource.MANUAL, ResultSource.INSTRUMENT),
      instrumentId: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
      enteredBy: fc.constant(testUserId)
    })

    await fc.assert(
      fc.asyncProperty(
        resultDataArbitrary,
        async (resultData) => {
          // 记录操作开始时间
          const beforeCreate = new Date()

          // 创建结果
          const result = await resultService.createResult({
            sampleId: testSampleId,
            testItemId: testTestItemId,
            ...resultData
          } as CreateResultDto)

          // 记录操作结束时间
          const afterCreate = new Date()

          // 属性验证：时间戳应该在操作开始和结束之间
          expect(result.enteredAt).toBeDefined()
          expect(result.enteredAt).toBeInstanceOf(Date)
          expect(result.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
          expect(result.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())

          // 属性验证：操作人员应该被正确记录
          expect(result.enteredBy).toBe(testUserId)

          // 属性验证：来源应该被正确标记
          expect(result.source).toBe(resultData.source)
          if (resultData.source === ResultSource.INSTRUMENT && resultData.instrumentId) {
            expect(result.instrumentId).toBe(resultData.instrumentId)
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 12.1: 时间戳单调递增性
   * 
   * **验证需求: 7.2**
   * 
   * 对于连续录入的多个结果，时间戳应该单调递增或相等（如果在同一毫秒内）。
   */
  it('对于连续录入的结果，时间戳应该单调递增', async () => {
    // 定义结果数据生成器
    const resultDataArbitrary = fc.record({
      parameter: fc.constantFrom('pH', '浊度', '色度', '温度', '电导率'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('', 'NTU', '度', '℃', 'μS/cm'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constantFrom(ResultSource.MANUAL, ResultSource.INSTRUMENT),
      enteredBy: fc.constant(testUserId)
    })

    await fc.assert(
      fc.asyncProperty(
        fc.array(resultDataArbitrary, { minLength: 2, maxLength: 5 }),
        async (resultDataArray) => {
          // 连续创建多个结果
          const createdResults = []

          for (const resultData of resultDataArray) {
            const result = await resultService.createResult({
              sampleId: testSampleId,
              testItemId: testTestItemId,
              ...resultData
            } as CreateResultDto)
            createdResults.push(result)

            // 添加小延迟以确保时间戳不同
            await new Promise(resolve => setTimeout(resolve, 10))
          }

          // 属性验证：时间戳应该单调递增
          for (let i = 1; i < createdResults.length; i++) {
            const prevTimestamp = createdResults[i - 1].enteredAt.getTime()
            const currTimestamp = createdResults[i].enteredAt.getTime()

            // 时间戳应该递增或相等（如果在同一毫秒内）
            expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp)
          }

          // 属性验证：所有结果都有有效的时间戳
          for (const result of createdResults) {
            expect(result.enteredAt).toBeDefined()
            expect(result.enteredAt).toBeInstanceOf(Date)
            expect(result.enteredBy).toBe(testUserId)
          }
        }
      ),
      { numRuns: 50, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 12.2: 手工录入和仪器录入的时间戳和来源标记
   * 
   * **验证需求: 7.2**
   * 
   * 对于任何结果录入，无论是手工录入还是仪器录入，
   * 都应该有正确的时间戳和来源标记。
   */
  it('手工录入和仪器录入都应该有正确的时间戳和来源标记', async () => {
    // 定义手工录入数据生成器
    const manualResultArbitrary = fc.record({
      parameter: fc.constantFrom('pH', '浊度', '色度'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('', 'NTU', '度'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constant(ResultSource.MANUAL),
      enteredBy: fc.constant(testUserId)
    })

    // 定义仪器录入数据生成器
    const instrumentResultArbitrary = fc.record({
      parameter: fc.constantFrom('温度', '电导率'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('℃', 'μS/cm'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constant(ResultSource.INSTRUMENT),
      instrumentId: fc.string({ minLength: 5, maxLength: 20 }).map(s => `INST-${s}`),
      enteredBy: fc.constant(testUserId)
    })

    await fc.assert(
      fc.asyncProperty(
        manualResultArbitrary,
        instrumentResultArbitrary,
        async (manualData, instrumentData) => {
          const beforeCreate = new Date()

          // 创建手工录入结果
          const manualResult = await resultService.createResult({
            sampleId: testSampleId,
            testItemId: testTestItemId,
            ...manualData
          } as CreateResultDto)

          // 创建仪器录入结果
          const instrumentResult = await resultService.createResult({
            sampleId: testSampleId,
            testItemId: testTestItemId,
            ...instrumentData
          } as CreateResultDto)

          const afterCreate = new Date()

          // 属性验证：手工录入结果
          expect(manualResult.source).toBe(ResultSource.MANUAL)
          expect(manualResult.instrumentId).toBeNull()
          expect(manualResult.enteredAt).toBeDefined()
          expect(manualResult.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
          expect(manualResult.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
          expect(manualResult.enteredBy).toBe(testUserId)

          // 属性验证：仪器录入结果
          expect(instrumentResult.source).toBe(ResultSource.INSTRUMENT)
          expect(instrumentResult.instrumentId).toBe(instrumentData.instrumentId)
          expect(instrumentResult.enteredAt).toBeDefined()
          expect(instrumentResult.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
          expect(instrumentResult.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
          expect(instrumentResult.enteredBy).toBe(testUserId)

          // 属性验证：两个结果的时间戳都是有效的
          expect(manualResult.enteredAt).toBeInstanceOf(Date)
          expect(instrumentResult.enteredAt).toBeInstanceOf(Date)
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 12.3: 时间戳不可篡改性
   * 
   * **验证需求: 7.2**
   * 
   * 对于任何已录入的结果，更新操作不应该改变原始的录入时间戳。
   */
  it('更新结果时不应该改变原始的录入时间戳', async () => {
    // 定义结果数据生成器
    const resultDataArbitrary = fc.record({
      parameter: fc.constantFrom('pH', '浊度', '色度'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('', 'NTU', '度'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constantFrom(ResultSource.MANUAL, ResultSource.INSTRUMENT),
      enteredBy: fc.constant(testUserId)
    })

    // 定义更新数据生成器
    const updateDataArbitrary = fc.record({
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      isAbnormal: fc.boolean(),
      abnormalReason: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined })
    })

    await fc.assert(
      fc.asyncProperty(
        resultDataArbitrary,
        updateDataArbitrary,
        async (resultData, updateData) => {
          // 创建结果
          const originalResult = await resultService.createResult({
            sampleId: testSampleId,
            testItemId: testTestItemId,
            ...resultData
          } as CreateResultDto)

          const originalTimestamp = originalResult.enteredAt
          const originalEnteredBy = originalResult.enteredBy

          // 等待一小段时间以确保时间戳不同
          await new Promise(resolve => setTimeout(resolve, 50))

          // 更新结果
          const updatedResult = await resultService.updateResult(
            originalResult.id,
            updateData
          )

          // 属性验证：录入时间戳不应该改变
          expect(updatedResult.enteredAt.getTime()).toBe(originalTimestamp.getTime())

          // 属性验证：录入人员不应该改变
          expect(updatedResult.enteredBy).toBe(originalEnteredBy)

          // 属性验证：更新的字段应该生效
          // 使用 toBeCloseTo 处理浮点数精度问题
          if (updateData.value !== undefined) {
            expect(updatedResult.value).toBeCloseTo(updateData.value, 10)
          }
          if (updateData.isAbnormal !== undefined) {
            expect(updatedResult.isAbnormal).toBe(updateData.isAbnormal)
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 12.4: 批量录入时间戳一致性
   * 
   * **验证需求: 7.2**
   * 
   * 对于批量录入的多个结果，每个结果都应该有独立的准确时间戳。
   */
  it('批量录入的结果应该都有准确的时间戳', async () => {
    // 定义结果数据生成器
    const resultDataArbitrary = fc.record({
      parameter: fc.constantFrom('pH', '浊度', '色度', '温度', '电导率'),
      value: fc.float({ min: 0, max: 100, noNaN: true }),
      unit: fc.constantFrom('', 'NTU', '度', '℃', 'μS/cm'),
      method: fc.constant('GB/T 5750.4-2006'),
      source: fc.constantFrom(ResultSource.MANUAL, ResultSource.INSTRUMENT),
      enteredBy: fc.constant(testUserId)
    })

    await fc.assert(
      fc.asyncProperty(
        fc.array(resultDataArbitrary, { minLength: 3, maxLength: 10 }),
        async (resultDataArray) => {
          const beforeBatch = new Date()

          // 批量创建结果
          const createdResults = await Promise.all(
            resultDataArray.map(resultData =>
              resultService.createResult({
                sampleId: testSampleId,
                testItemId: testTestItemId,
                ...resultData
              } as CreateResultDto)
            )
          )

          const afterBatch = new Date()

          // 属性验证：所有结果都有有效的时间戳
          for (const result of createdResults) {
            expect(result.enteredAt).toBeDefined()
            expect(result.enteredAt).toBeInstanceOf(Date)
            expect(result.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeBatch.getTime())
            expect(result.enteredAt.getTime()).toBeLessThanOrEqual(afterBatch.getTime())
            expect(result.enteredBy).toBe(testUserId)
          }

          // 属性验证：所有时间戳都是有效的日期对象
          const timestamps = createdResults.map(r => r.enteredAt.getTime())
          for (const timestamp of timestamps) {
            expect(timestamp).toBeGreaterThan(0)
            expect(Number.isFinite(timestamp)).toBe(true)
          }
        }
      ),
      { numRuns: 50, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 12.5: 不同来源的结果时间戳独立性
   * 
   * **验证需求: 7.2**
   * 
   * 对于不同来源（手工/仪器）的结果，时间戳应该独立记录，
   * 不受来源类型影响。
   */
  it('不同来源的结果应该有独立准确的时间戳', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            parameter: fc.constantFrom('pH', '浊度', '色度', '温度', '电导率'),
            value: fc.float({ min: 0, max: 100, noNaN: true }),
            unit: fc.constantFrom('', 'NTU', '度', '℃', 'μS/cm'),
            method: fc.constant('GB/T 5750.4-2006'),
            source: fc.constantFrom(ResultSource.MANUAL, ResultSource.INSTRUMENT),
            instrumentId: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
            enteredBy: fc.constant(testUserId)
          }),
          { minLength: 5, maxLength: 10 }
        ),
        async (resultDataArray) => {
          const beforeCreate = new Date()

          // 创建不同来源的结果
          const createdResults = []
          for (const resultData of resultDataArray) {
            const result = await resultService.createResult({
              sampleId: testSampleId,
              testItemId: testTestItemId,
              ...resultData
            } as CreateResultDto)
            createdResults.push(result)
          }

          const afterCreate = new Date()

          // 按来源分组
          const manualResults = createdResults.filter(r => r.source === ResultSource.MANUAL)
          const instrumentResults = createdResults.filter(r => r.source === ResultSource.INSTRUMENT)

          // 属性验证：手工录入结果的时间戳
          for (const result of manualResults) {
            expect(result.enteredAt).toBeDefined()
            expect(result.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
            expect(result.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
            expect(result.source).toBe(ResultSource.MANUAL)
          }

          // 属性验证：仪器录入结果的时间戳
          for (const result of instrumentResults) {
            expect(result.enteredAt).toBeDefined()
            expect(result.enteredAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
            expect(result.enteredAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
            expect(result.source).toBe(ResultSource.INSTRUMENT)
          }

          // 属性验证：所有结果都有正确的操作人员记录
          for (const result of createdResults) {
            expect(result.enteredBy).toBe(testUserId)
          }
        }
      ),
      { numRuns: 50, timeout: 120000 }
    )
  }, 150000)
})
