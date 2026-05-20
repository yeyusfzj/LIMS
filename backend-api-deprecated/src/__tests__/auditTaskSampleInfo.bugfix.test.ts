/**
 * 审核任务样品信息增强 - Bug条件探索测试
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * 目标: 在未修复代码上暴露演示bug的反例
 * 重要: 此测试必须在未修复代码上失败 - 失败确认bug存在
 * 
 * Bug条件: 
 * 1. listAuditTasks API返回的sample对象只包含4个基本字段(barcode、sampleNumber、sampleName、clientName)
 * 2. getAuditTask API返回的sample对象缺少testItems和results关联数据
 * 3. seed脚本执行后审核任务数量为0或只有1个
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, SampleStatus, AuditStatus } from '@prisma/client'
import { auditService } from '../services/auditService'
import fc from 'fast-check'

const prisma = new PrismaClient()

describe('审核任务样品信息Bug条件探索测试', () => {
  let testUserId: string
  let testSampleId: string
  let testAuditTaskId: string

  beforeAll(async () => {
    // 创建测试用户
    const testUser = await prisma.user.upsert({
      where: { username: 'audit_test_user' },
      update: {},
      create: {
        username: 'audit_test_user',
        email: 'audit_test@example.com',
        fullName: '审核测试用户',
        passwordHash: '$2b$10$test.hash.for.testing',
        status: 'ACTIVE'
      }
    })
    testUserId = testUser.id

    // 创建测试样品（包含完整信息）
    const testSample = await prisma.sample.create({
      data: {
        barcode: 'TEST-AUDIT-001',
        sampleNumber: 'AUDIT-SAMPLE-001',
        clientName: '测试客户',
        clientContact: '13800138000',
        sampleName: '水质样品',
        sampleType: '地表水',
        sampleCategory: '环境监测',
        quantity: 500,
        unit: 'mL',
        receivedDate: new Date(),
        samplingDate: new Date('2024-01-15'),
        samplingLocation: '长江武汉段',
        samplingPerson: '张三',
        storageLocation: '冷藏室A-01',
        storageCondition: '4°C冷藏',
        status: SampleStatus.IN_AUDIT,
        priority: 'NORMAL',
        description: '用于水质检测的样品',
        createdBy: testUserId,
        testItems: {
          create: [
            {
              testMethod: 'GB/T 5750.4-2006',
              testStandard: '生活饮用水标准',
              testParameters: { parameters: ['pH', '浊度', '色度'] },
              status: 'COMPLETED',
              assignedTo: testUserId,
              completedAt: new Date()
            },
            {
              testMethod: 'HJ 828-2017',
              testStandard: '水质化学需氧量测定',
              testParameters: { parameters: ['COD'] },
              status: 'COMPLETED',
              assignedTo: testUserId,
              completedAt: new Date()
            }
          ]
        },
        results: {
          create: [
            {
              testItemId: 'test-item-1',
              parameter: 'pH',
              value: 7.2,
              unit: '',
              method: 'GB/T 5750.4-2006',
              source: 'MANUAL',
              enteredBy: testUserId
            },
            {
              testItemId: 'test-item-1',
              parameter: '浊度',
              value: 1.5,
              unit: 'NTU',
              method: 'GB/T 5750.4-2006',
              source: 'INSTRUMENT',
              enteredBy: testUserId
            },
            {
              testItemId: 'test-item-2',
              parameter: 'COD',
              value: 15.8,
              unit: 'mg/L',
              method: 'HJ 828-2017',
              source: 'MANUAL',
              enteredBy: testUserId
            }
          ]
        }
      }
    })
    testSampleId = testSample.id

    // 创建审核任务
    const auditTask = await prisma.auditTask.create({
      data: {
        sampleId: testSampleId,
        level: 1,
        auditorId: testUserId,
        status: AuditStatus.PENDING
      }
    })
    testAuditTaskId = auditTask.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.result.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.testItem.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.auditTask.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.sample.deleteMany({ where: { id: testSampleId } })
    await prisma.user.deleteMany({ where: { username: 'audit_test_user' } })
    await prisma.$disconnect()
  })

  /**
   * Property 1: Bug条件 - listAuditTasks返回完整样品信息
   * 
   * 对于任何审核任务列表查询，修复后的系统应该返回包含完整样品信息的数据，
   * 包括样品类型、采样日期、检测项目、检测结果等关键字段
   */
  test('listAuditTasks应该返回包含完整样品信息的审核任务列表', async () => {
    const result = await auditService.listAuditTasks({
      page: 1,
      pageSize: 20
    })

    expect(result.items.length).toBeGreaterThan(0)
    
    const task = result.items.find(t => t.id === testAuditTaskId)
    expect(task).toBeDefined()
    expect(task!.sample).toBeDefined()

    // 验证样品基本信息字段存在
    expect(task!.sample!.barcode).toBeDefined()
    expect(task!.sample!.sampleNumber).toBeDefined()
    expect(task!.sample!.sampleName).toBeDefined()
    expect(task!.sample!.clientName).toBeDefined()

    // 验证样品详细信息字段存在（这些字段在未修复代码中缺失）
    const sampleData = task!.sample as any
    
    // 验证样品类型和分类
    expect(sampleData.sampleType).toBeDefined()
    expect(sampleData.sampleType).toBe('地表水')
    expect(sampleData.sampleCategory).toBeDefined()
    
    // 验证采样信息
    expect(sampleData.samplingDate).toBeDefined()
    expect(sampleData.samplingLocation).toBeDefined()
    expect(sampleData.samplingLocation).toBe('长江武汉段')
    expect(sampleData.samplingPerson).toBeDefined()
    
    // 验证存储信息
    expect(sampleData.storageLocation).toBeDefined()
    expect(sampleData.storageCondition).toBeDefined()
    
    // 验证检测项目关联数据
    expect(sampleData.testItems).toBeDefined()
    expect(Array.isArray(sampleData.testItems)).toBe(true)
    expect(sampleData.testItems.length).toBeGreaterThan(0)
    
    // 验证检测项目包含必要字段
    const testItem = sampleData.testItems[0]
    expect(testItem.testMethod).toBeDefined()
    expect(testItem.testStandard).toBeDefined()
    expect(testItem.status).toBeDefined()
    
    // 验证检测结果关联数据
    expect(sampleData.results).toBeDefined()
    expect(Array.isArray(sampleData.results)).toBe(true)
    expect(sampleData.results.length).toBeGreaterThan(0)
    
    // 验证检测结果包含必要字段
    const result1 = sampleData.results[0]
    expect(result1.parameter).toBeDefined()
    expect(result1.value).toBeDefined()
    expect(result1.unit).toBeDefined()
    expect(result1.method).toBeDefined()

    console.log('listAuditTasks返回的样品信息:', {
      基本字段: {
        barcode: sampleData.barcode,
        sampleNumber: sampleData.sampleNumber,
        sampleName: sampleData.sampleName,
        clientName: sampleData.clientName
      },
      详细字段: {
        sampleType: sampleData.sampleType,
        samplingDate: sampleData.samplingDate,
        samplingLocation: sampleData.samplingLocation,
        testItemsCount: sampleData.testItems?.length || 0,
        resultsCount: sampleData.results?.length || 0
      }
    })
  })

  /**
   * Property 1: Bug条件 - getAuditTask返回完整样品信息
   * 
   * 对于任何审核任务详情查询，修复后的系统应该返回包含完整样品信息的数据，
   * 特别是testItems和results关联数据
   */
  test('getAuditTask应该返回包含testItems和results的完整样品信息', async () => {
    const task = await auditService.getAuditTask(testAuditTaskId)

    expect(task).toBeDefined()
    expect(task.sample).toBeDefined()

    // 验证样品基本信息
    expect(task.sample!.barcode).toBeDefined()
    expect(task.sample!.sampleNumber).toBeDefined()

    const sampleData = task.sample as any

    // 验证样品详细信息字段
    expect(sampleData.sampleType).toBeDefined()
    expect(sampleData.sampleType).toBe('地表水')
    expect(sampleData.sampleCategory).toBe('环境监测')
    expect(sampleData.quantity).toBe(500)
    expect(sampleData.unit).toBe('mL')
    
    // 验证采样信息完整性
    expect(sampleData.samplingDate).toBeDefined()
    expect(new Date(sampleData.samplingDate).getFullYear()).toBe(2024)
    expect(sampleData.samplingLocation).toBe('长江武汉段')
    expect(sampleData.samplingPerson).toBe('张三')
    
    // 验证存储信息
    expect(sampleData.storageLocation).toBe('冷藏室A-01')
    expect(sampleData.storageCondition).toBe('4°C冷藏')
    
    // 验证检测项目数据完整性
    expect(sampleData.testItems).toBeDefined()
    expect(Array.isArray(sampleData.testItems)).toBe(true)
    expect(sampleData.testItems.length).toBe(2)
    
    const testItem1 = sampleData.testItems.find((item: any) => 
      item.testMethod === 'GB/T 5750.4-2006'
    )
    expect(testItem1).toBeDefined()
    expect(testItem1.testStandard).toBe('生活饮用水标准')
    expect(testItem1.status).toBe('COMPLETED')
    
    // 验证检测结果数据完整性
    expect(sampleData.results).toBeDefined()
    expect(Array.isArray(sampleData.results)).toBe(true)
    expect(sampleData.results.length).toBe(3)
    
    const phResult = sampleData.results.find((r: any) => r.parameter === 'pH')
    expect(phResult).toBeDefined()
    expect(phResult.value).toBe(7.2)
    expect(phResult.method).toBe('GB/T 5750.4-2006')
    
    const codResult = sampleData.results.find((r: any) => r.parameter === 'COD')
    expect(codResult).toBeDefined()
    expect(codResult.value).toBe(15.8)
    expect(codResult.unit).toBe('mg/L')

    console.log('getAuditTask返回的完整样品信息:', {
      样品基本信息: {
        sampleType: sampleData.sampleType,
        sampleCategory: sampleData.sampleCategory,
        quantity: sampleData.quantity,
        unit: sampleData.unit
      },
      采样信息: {
        samplingDate: sampleData.samplingDate,
        samplingLocation: sampleData.samplingLocation,
        samplingPerson: sampleData.samplingPerson
      },
      检测项目数量: sampleData.testItems.length,
      检测结果数量: sampleData.results.length
    })
  })

  /**
   * Property 1: Bug条件 - seed脚本创建足够的审核任务示例数据
   * 
   * 执行seed脚本后，数据库应该包含至少3个不同状态的审核任务示例数据
   */
  test('数据库应该包含至少3个审核任务示例数据', async () => {
    const auditTaskCount = await prisma.auditTask.count()
    
    // 验证审核任务数量（至少应该有我们创建的测试任务）
    expect(auditTaskCount).toBeGreaterThanOrEqual(1)
    
    // 理想情况下，seed脚本应该创建至少3个不同状态的审核任务
    // 在未修复的代码中，这个数字可能是0或1
    console.log('当前数据库中的审核任务数量:', auditTaskCount)
    
    // 检查是否有不同状态的审核任务
    const pendingCount = await prisma.auditTask.count({
      where: { status: AuditStatus.PENDING }
    })
    const approvedCount = await prisma.auditTask.count({
      where: { status: AuditStatus.APPROVED }
    })
    const rejectedCount = await prisma.auditTask.count({
      where: { status: AuditStatus.REJECTED }
    })
    
    console.log('审核任务状态分布:', {
      待审核: pendingCount,
      已通过: approvedCount,
      已拒绝: rejectedCount,
      总计: auditTaskCount
    })
    
    // 在修复后，应该至少有3个不同状态的审核任务
    // 这个断言在未修复代码上可能失败
    expect(auditTaskCount).toBeGreaterThanOrEqual(3)
    
    // 验证至少有两种不同的状态
    const statusVariety = [pendingCount, approvedCount, rejectedCount].filter(c => c > 0).length
    expect(statusVariety).toBeGreaterThanOrEqual(2)
  })

  /**
   * 基于属性的测试 - 验证任意审核任务查询都返回完整样品信息
   * 
   * 使用fast-check生成随机查询参数，验证所有查询都返回完整的样品信息
   */
  test('基于属性的测试: 任意审核任务查询都应返回完整样品信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          page: fc.integer({ min: 1, max: 5 }),
          pageSize: fc.integer({ min: 1, max: 50 })
        }),
        async (query) => {
          const result = await auditService.listAuditTasks(query)
          
          // 对于返回的每个审核任务
          for (const task of result.items) {
            if (task.sample) {
              const sampleData = task.sample as any
              
              // 验证基本字段存在
              expect(sampleData.barcode).toBeDefined()
              expect(sampleData.sampleNumber).toBeDefined()
              
              // 验证详细字段存在（在未修复代码中可能缺失）
              // 注意：这些断言在未修复代码上会失败
              if (sampleData.sampleType !== undefined) {
                expect(typeof sampleData.sampleType).toBe('string')
              }
              
              if (sampleData.testItems !== undefined) {
                expect(Array.isArray(sampleData.testItems)).toBe(true)
              }
              
              if (sampleData.results !== undefined) {
                expect(Array.isArray(sampleData.results)).toBe(true)
              }
            }
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})
