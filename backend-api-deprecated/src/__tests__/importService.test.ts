/**
 * 批量导入服务测试
 * 
 * 测试批量导入功能的核心逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { importService } from '../services/importService'
import { fileParser } from '../utils/fileParser'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    sample: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    testItem: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    result: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }

  return {
    PrismaClient: vi.fn(() => mockPrisma),
    ResultSource: {
      MANUAL: 'MANUAL',
      INSTRUMENT: 'INSTRUMENT',
      CALCULATED: 'CALCULATED'
    }
  }
})

// Mock file parser
vi.mock('../utils/fileParser', () => ({
  fileParser: {
    parseFile: vi.fn()
  }
}))

// Mock logger
vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

describe('ImportService', () => {
  let prisma: any

  beforeEach(() => {
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('importResults', () => {
    it('应该成功导入有效的 CSV 数据', async () => {
      // 准备测试数据
      const mockData = [
        {
          sampleId: 'sample-1',
          testItemId: 'test-1',
          parameter: 'pH',
          value: 7.2,
          unit: '',
          method: 'GB/T 5750.4-2006'
        },
        {
          sampleId: 'sample-2',
          testItemId: 'test-2',
          parameter: '浊度',
          value: 0.5,
          unit: 'NTU',
          method: 'GB/T 5750.4-2006'
        }
      ]

      const mockSamples = [
        { id: 'sample-1' },
        { id: 'sample-2' }
      ]

      const mockTestItems = [
        { id: 'test-1', sampleId: 'sample-1' },
        { id: 'test-2', sampleId: 'sample-2' }
      ]

      const mockResults = mockData.map((data, index) => ({
        id: `result-${index + 1}`,
        ...data,
        source: 'INSTRUMENT',
        enteredBy: 'user-1',
        enteredAt: new Date(),
        isCalculated: false,
        isAbnormal: false,
        isRetest: false
      }))

      // 设置 mock 返回值
      vi.mocked(fileParser.parseFile).mockReturnValue(mockData)
      vi.mocked(prisma.sample.findMany).mockResolvedValue(mockSamples)
      vi.mocked(prisma.testItem.findMany).mockResolvedValue(mockTestItems)
      vi.mocked(prisma.$transaction).mockResolvedValue(mockResults)

      // 执行导入
      const buffer = Buffer.from('test data')
      const filename = 'test.csv'
      const mapping = {
        parameter: 'parameter',
        method: 'method'
      }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.totalRecords).toBe(2)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.importedResults).toHaveLength(2)

      // 验证调用
      expect(fileParser.parseFile).toHaveBeenCalledWith(buffer, filename, mapping)
      expect(prisma.sample.findMany).toHaveBeenCalled()
      expect(prisma.testItem.findMany).toHaveBeenCalled()
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('应该返回空文件错误', async () => {
      // 设置 mock 返回空数组
      vi.mocked(fileParser.parseFile).mockReturnValue([])

      const buffer = Buffer.from('')
      const filename = 'empty.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      expect(result.success).toBe(false)
      expect(result.totalRecords).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('没有有效数据')
    })

    it('应该验证必填字段', async () => {
      // 准备缺少必填字段的数据
      const mockData = [
        {
          sampleId: 'sample-1',
          testItemId: '',  // 缺少 testItemId
          parameter: 'pH',
          value: 7.2,
          method: 'GB/T 5750.4-2006'
        },
        {
          sampleId: '',  // 缺少 sampleId
          testItemId: 'test-2',
          parameter: '',  // 缺少 parameter
          value: 0.5,
          method: ''  // 缺少 method
        }
      ]

      vi.mocked(fileParser.parseFile).mockReturnValue(mockData)
      vi.mocked(prisma.sample.findMany).mockResolvedValue([{ id: 'sample-1' }])
      vi.mocked(prisma.testItem.findMany).mockResolvedValue([])

      const buffer = Buffer.from('test data')
      const filename = 'invalid.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      expect(result.success).toBe(false)
      expect(result.failureCount).toBe(2)
      expect(result.errors.length).toBeGreaterThan(0)
      
      // 验证错误消息
      const errorMessages = result.errors.map(e => e.message)
      expect(errorMessages.some(msg => msg.includes('检测项 ID 不能为空'))).toBe(true)
      expect(errorMessages.some(msg => msg.includes('样品 ID 不能为空'))).toBe(true)
      expect(errorMessages.some(msg => msg.includes('检测参数不能为空'))).toBe(true)
      expect(errorMessages.some(msg => msg.includes('检测方法不能为空'))).toBe(true)
    })

    it('应该验证样品和检测项是否存在', async () => {
      const mockData = [
        {
          sampleId: 'non-existent-sample',
          testItemId: 'non-existent-test',
          parameter: 'pH',
          value: 7.2,
          method: 'GB/T 5750.4-2006'
        }
      ]

      vi.mocked(fileParser.parseFile).mockReturnValue(mockData)
      vi.mocked(prisma.sample.findMany).mockResolvedValue([])  // 样品不存在
      vi.mocked(prisma.testItem.findMany).mockResolvedValue([])  // 检测项不存在

      const buffer = Buffer.from('test data')
      const filename = 'invalid.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      expect(result.success).toBe(false)
      expect(result.failureCount).toBe(1)
      
      const errorMessages = result.errors.map(e => e.message)
      expect(errorMessages.some(msg => msg.includes('样品不存在'))).toBe(true)
      expect(errorMessages.some(msg => msg.includes('检测项不存在'))).toBe(true)
    })

    it('应该验证检测项是否属于样品', async () => {
      const mockData = [
        {
          sampleId: 'sample-1',
          testItemId: 'test-1',
          parameter: 'pH',
          value: 7.2,
          method: 'GB/T 5750.4-2006'
        }
      ]

      vi.mocked(fileParser.parseFile).mockReturnValue(mockData)
      vi.mocked(prisma.sample.findMany).mockResolvedValue([{ id: 'sample-1' }])
      // 检测项属于不同的样品
      vi.mocked(prisma.testItem.findMany).mockResolvedValue([
        { id: 'test-1', sampleId: 'sample-2' }
      ])

      const buffer = Buffer.from('test data')
      const filename = 'invalid.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.message.includes('检测项不属于该样品'))).toBe(true)
    })

    it('应该在事务中批量插入数据', async () => {
      const mockData = [
        {
          sampleId: 'sample-1',
          testItemId: 'test-1',
          parameter: 'pH',
          value: 7.2,
          method: 'GB/T 5750.4-2006'
        }
      ]

      const mockResults = [{
        id: 'result-1',
        ...mockData[0],
        source: 'INSTRUMENT',
        enteredBy: 'user-1',
        enteredAt: new Date(),
        isCalculated: false,
        isAbnormal: false,
        isRetest: false
      }]

      vi.mocked(fileParser.parseFile).mockReturnValue(mockData)
      vi.mocked(prisma.sample.findMany).mockResolvedValue([{ id: 'sample-1' }])
      vi.mocked(prisma.testItem.findMany).mockResolvedValue([
        { id: 'test-1', sampleId: 'sample-1' }
      ])
      vi.mocked(prisma.$transaction).mockResolvedValue(mockResults)

      const buffer = Buffer.from('test data')
      const filename = 'test.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      await importService.importResults(buffer, filename, mapping, enteredBy)

      // 验证使用了事务
      expect(prisma.$transaction).toHaveBeenCalled()
      
      // 获取传递给事务的操作数组
      const transactionCalls = vi.mocked(prisma.$transaction).mock.calls[0][0]
      expect(Array.isArray(transactionCalls)).toBe(true)
      expect(transactionCalls).toHaveLength(1)
    })

    it('应该处理文件解析错误', async () => {
      vi.mocked(fileParser.parseFile).mockImplementation(() => {
        throw new Error('文件格式错误')
      })

      const buffer = Buffer.from('invalid data')
      const filename = 'invalid.csv'
      const mapping = { parameter: 'parameter', method: 'method' }
      const enteredBy = 'user-1'

      const result = await importService.importResults(
        buffer,
        filename,
        mapping,
        enteredBy
      )

      expect(result.success).toBe(false)
      expect(result.errors[0].message).toContain('导入失败')
    })
  })
})
