// 样品服务属性测试
// 使用 fast-check 进行基于属性的测试

import { PrismaClient } from '@prisma/client'
import { SampleService } from '../services/sampleService'
import { CreateSampleDto } from '../types/sample'
import fc from 'fast-check'

const prisma = new PrismaClient()
const sampleService = new SampleService()

describe('Feature: laboratory-backend-api, Property 2: 样品条码唯一性', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.sample.deleteMany({
      where: {
        clientName: { contains: 'PROP_TEST_' }
      }
    })
  })
  
  afterAll(async () => {
    await prisma.$disconnect()
  })
  
  /**
   * 属性 2: 样品条码唯一性
   * 
   * **验证需求: 2.1, 2.5**
   * 
   * 对于任何样品创建操作，生成的条码在整个系统中必须是唯一的，
   * 不会与现有样品条码冲突。
   */
  it('对于任何样品创建操作，生成的条码必须是唯一的', async () => {
    // 定义样品数据生成器
    const sampleDataArbitrary = fc.record({
      clientName: fc.string({ minLength: 1, maxLength: 50 }).map(s => `PROP_TEST_${s}`),
      clientContact: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      sampleName: fc.string({ minLength: 1, maxLength: 100 }),
      sampleType: fc.constantFrom('水质', '土壤', '空气', '食品', '其他'),
      sampleCategory: fc.string({ minLength: 1, maxLength: 50 }),
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(10000), noNaN: true }),
      unit: fc.constantFrom('ml', 'L', 'g', 'kg', 'mg', '个'),
      receivedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      samplingDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
      samplingLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      samplingPerson: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      storageLocation: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      storageCondition: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      priority: fc.option(fc.constantFrom('LOW', 'NORMAL', 'HIGH', 'URGENT'), { nil: undefined }),
      description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
      remarks: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
      createdBy: fc.constant('property-test-user')
    })
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(sampleDataArbitrary, { minLength: 2, maxLength: 10 }),
        async (sampleDataArray) => {
          // 创建多个样品
          const createdSamples = []
          
          for (const sampleData of sampleDataArray) {
            const sample = await sampleService.createSample(sampleData as CreateSampleDto)
            createdSamples.push(sample)
          }
          
          // 验证所有条码都是唯一的
          const barcodes = createdSamples.map(s => s.barcode)
          const uniqueBarcodes = new Set(barcodes)
          
          // 断言：条码集合的大小应该等于样品数量（即没有重复）
          expect(uniqueBarcodes.size).toBe(createdSamples.length)
          
          // 验证每个条码都符合格式要求
          for (const barcode of barcodes) {
            expect(barcode).toMatch(/^SP\d{14}$/)
          }
          
          // 验证数据库中的条码也是唯一的
          for (const barcode of barcodes) {
            const count = await prisma.sample.count({
              where: { barcode }
            })
            expect(count).toBe(1)
          }
        }
      ),
      { numRuns: 100 } // 运行 100 次测试
    )
  }, 60000) // 设置超时时间为 60 秒
  
  it('并发创建样品时条码仍然保持唯一', async () => {
    // 定义样品数据生成器
    const sampleDataArbitrary = fc.record({
      clientName: fc.string({ minLength: 1, maxLength: 50 }).map(s => `PROP_TEST_CONCURRENT_${s}`),
      sampleName: fc.string({ minLength: 1, maxLength: 100 }),
      sampleType: fc.constantFrom('水质', '土壤', '空气', '食品', '其他'),
      sampleCategory: fc.string({ minLength: 1, maxLength: 50 }),
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(10000), noNaN: true }),
      unit: fc.constantFrom('ml', 'L', 'g', 'kg', 'mg', '个'),
      receivedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      createdBy: fc.constant('property-test-user')
    })
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(sampleDataArbitrary, { minLength: 3, maxLength: 5 }),
        async (sampleDataArray) => {
          // 并发创建多个样品
          const createPromises = sampleDataArray.map(sampleData => 
            sampleService.createSample(sampleData as CreateSampleDto)
          )
          
          const createdSamples = await Promise.all(createPromises)
          
          // 验证所有条码都是唯一的
          const barcodes = createdSamples.map(s => s.barcode)
          const uniqueBarcodes = new Set(barcodes)
          
          // 断言：条码集合的大小应该等于样品数量（即没有重复）
          expect(uniqueBarcodes.size).toBe(createdSamples.length)
          
          // 验证每个条码都符合格式要求
          for (const barcode of barcodes) {
            expect(barcode).toMatch(/^SP\d{14}$/)
          }
          
          // 验证数据库中的条码也是唯一的
          for (const barcode of barcodes) {
            const count = await prisma.sample.count({
              where: { barcode }
            })
            expect(count).toBe(1)
          }
        }
      ),
      { numRuns: 100 } // 运行 100 次测试
    )
  }, 60000) // 设置超时时间为 60 秒
  
  it('样品编号也必须保持唯一性', async () => {
    // 定义样品数据生成器
    const sampleDataArbitrary = fc.record({
      clientName: fc.string({ minLength: 1, maxLength: 50 }).map(s => `PROP_TEST_NUMBER_${s}`),
      sampleName: fc.string({ minLength: 1, maxLength: 100 }),
      sampleType: fc.constantFrom('水质', '土壤', '空气', '食品', '其他'),
      sampleCategory: fc.string({ minLength: 1, maxLength: 50 }),
      quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(10000), noNaN: true }),
      unit: fc.constantFrom('ml', 'L', 'g', 'kg', 'mg', '个'),
      receivedDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      createdBy: fc.constant('property-test-user')
    })
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(sampleDataArbitrary, { minLength: 2, maxLength: 10 }),
        async (sampleDataArray) => {
          // 创建多个样品
          const createdSamples = []
          
          for (const sampleData of sampleDataArray) {
            const sample = await sampleService.createSample(sampleData as CreateSampleDto)
            createdSamples.push(sample)
          }
          
          // 验证所有样品编号都是唯一的
          const sampleNumbers = createdSamples.map(s => s.sampleNumber)
          const uniqueSampleNumbers = new Set(sampleNumbers)
          
          // 断言：样品编号集合的大小应该等于样品数量（即没有重复）
          expect(uniqueSampleNumbers.size).toBe(createdSamples.length)
          
          // 验证每个样品编号都符合格式要求
          for (const sampleNumber of sampleNumbers) {
            expect(sampleNumber).toMatch(/^\d{10}$/)
          }
          
          // 验证数据库中的样品编号也是唯一的
          for (const sampleNumber of sampleNumbers) {
            const count = await prisma.sample.count({
              where: { sampleNumber }
            })
            expect(count).toBe(1)
          }
        }
      ),
      { numRuns: 100 } // 运行 100 次测试
    )
  }, 60000) // 设置超时时间为 60 秒
})
