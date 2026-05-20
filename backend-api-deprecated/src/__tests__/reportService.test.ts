/**
 * 报告生成服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { ReportService } from '../services/reportService'
import { ReportStatus } from '../types/report'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    reportTemplate: {
      findUnique: vi.fn()
    },
    sample: {
      findUnique: vi.fn()
    },
    report: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  }
})

describe('ReportService', () => {
  let reportService: ReportService
  let prisma: any

  beforeEach(() => {
    reportService = new ReportService()
    prisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('generateReport', () => {
    const mockTemplate = {
      id: 'template-1',
      name: '检测报告模板',
      content: '<h1>检测报告</h1><p>样品编号: {{sample.sampleNumber}}</p><p>样品名称: {{sample.sampleName}}</p>',
      variables: [
        { name: 'sample', type: 'object', required: true },
        { name: 'reportNumber', type: 'string', required: false }
      ],
      isActive: true,
      category: 'standard',
      version: 1,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const mockSample = {
      id: 'sample-1',
      barcode: 'BC001',
      sampleNumber: 'S2024001',
      sampleName: '水样',
      clientName: '测试客户',
      clientContact: '13800138000',
      sampleType: '水质',
      sampleCategory: '环境',
      quantity: 1,
      unit: '瓶',
      receivedDate: new Date('2024-01-01'),
      status: 'TESTING_COMPLETE',
      priority: 'NORMAL',
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      testItems: [],
      results: [],
      auditTasks: [],
      qualityJudgment: null
    }

    it('应该成功生成报告预览', async () => {
      prisma.reportTemplate.findUnique.mockResolvedValue(mockTemplate)
      prisma.sample.findUnique.mockResolvedValue(mockSample)

      const result = await reportService.generateReport(
        {
          sampleId: 'sample-1',
          templateId: 'template-1',
          preview: true
        },
        'user-1'
      )

      expect(result.preview).toBe(true)
      expect(result.content).toContain('S2024001')
      expect(result.content).toContain('水样')
      expect(result.reportId).toBeUndefined()
      expect(result.reportNumber).toBeUndefined()
    })

    it('应该成功生成正式报告', async () => {
      prisma.reportTemplate.findUnique.mockResolvedValue(mockTemplate)
      prisma.sample.findUnique.mockResolvedValue(mockSample)
      prisma.report.count.mockResolvedValue(0)
      prisma.report.findUnique.mockResolvedValue(null)
      prisma.report.create.mockResolvedValue({
        id: 'report-1',
        reportNumber: 'REPORT-20240101-0001',
        sampleId: 'sample-1',
        templateId: 'template-1',
        content: '<h1>检测报告</h1><p>样品编号: S2024001</p>',
        status: ReportStatus.DRAFT,
        generatedBy: 'user-1',
        generatedAt: new Date()
      })

      const result = await reportService.generateReport(
        {
          sampleId: 'sample-1',
          templateId: 'template-1',
          preview: false
        },
        'user-1'
      )

      expect(result.preview).toBe(false)
      expect(result.reportId).toBe('report-1')
      expect(result.reportNumber).toMatch(/^REPORT-\d{8}-\d{4}$/)
      expect(prisma.report.create).toHaveBeenCalled()
    })

    it('应该在模板不存在时抛出错误', async () => {
      prisma.reportTemplate.findUnique.mockResolvedValue(null)

      await expect(
        reportService.generateReport(
          {
            sampleId: 'sample-1',
            templateId: 'invalid-template',
            preview: false
          },
          'user-1'
        )
      ).rejects.toThrow('报告模板不存在')
    })

    it('应该在模板未激活时抛出错误', async () => {
      prisma.reportTemplate.findUnique.mockResolvedValue({
        ...mockTemplate,
        isActive: false
      })

      await expect(
        reportService.generateReport(
          {
            sampleId: 'sample-1',
            templateId: 'template-1',
            preview: false
          },
          'user-1'
        )
      ).rejects.toThrow('报告模板未激活')
    })

    it('应该在样品不存在时抛出错误', async () => {
      prisma.reportTemplate.findUnique.mockResolvedValue(mockTemplate)
      prisma.sample.findUnique.mockResolvedValue(null)

      await expect(
        reportService.generateReport(
          {
            sampleId: 'invalid-sample',
            templateId: 'template-1',
            preview: false
          },
          'user-1'
        )
      ).rejects.toThrow('样品不存在')
    })
  })

  describe('generateReportNumber', () => {
    it('应该生成正确格式的报告编号', async () => {
      prisma.report.count.mockResolvedValue(5)
      prisma.report.findUnique.mockResolvedValue(null)

      const reportNumber = await (reportService as any).generateReportNumber(
        'sample-1'
      )

      expect(reportNumber).toMatch(/^REPORT-\d{8}-\d{4}$/)
      const parts = reportNumber.split('-')
      expect(parts[0]).toBe('REPORT')
      expect(parts[1]).toHaveLength(8) // YYYYMMDD
      expect(parts[2]).toBe('0006') // count + 1 = 6
    })

    it('应该在编号冲突时重新生成', async () => {
      prisma.report.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6)
      prisma.report.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // 第一次冲突
        .mockResolvedValueOnce(null) // 第二次成功

      const reportNumber = await (reportService as any).generateReportNumber(
        'sample-1'
      )

      expect(reportNumber).toMatch(/^REPORT-\d{8}-\d{4}$/)
      expect(prisma.report.count).toHaveBeenCalledTimes(2)
    })
  })

  describe('fillReportTemplate', () => {
    it('应该正确替换模板变量', () => {
      const template = '样品编号: {{sample.sampleNumber}}, 样品名称: {{sample.sampleName}}'
      const variables = [
        { name: 'sample', type: 'object' as const, required: true }
      ]
      const reportData = {
        sample: {
          id: 'sample-1',
          barcode: 'BC001',
          sampleNumber: 'S2024001',
          sampleName: '水样',
          clientName: '测试客户',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 1,
          unit: '瓶',
          receivedDate: new Date(),
          status: 'REGISTERED',
          priority: 'NORMAL'
        },
        testItems: [],
        results: [],
        auditTasks: [],
        generatedAt: new Date(),
        generatedBy: 'user-1'
      }

      const result = (reportService as any).fillReportTemplate(
        template,
        variables,
        reportData,
        'REPORT-001'
      )

      expect(result).toBe('样品编号: S2024001, 样品名称: 水样')
    })

    it('应该对未定义的变量返回空字符串', () => {
      const template = '描述: {{sample.description}}'
      const variables = [
        {
          name: 'sample',
          type: 'object' as const,
          required: false
        }
      ]
      const reportData = {
        sample: {
          id: 'sample-1',
          barcode: 'BC001',
          sampleNumber: 'S2024001',
          sampleName: '水样',
          clientName: '测试客户',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 1,
          unit: '瓶',
          receivedDate: new Date(),
          status: 'REGISTERED',
          priority: 'NORMAL'
        },
        testItems: [],
        results: [],
        auditTasks: [],
        generatedAt: new Date(),
        generatedBy: 'user-1'
      }

      const result = (reportService as any).fillReportTemplate(
        template,
        variables,
        reportData
      )

      expect(result).toBe('描述: ')
    })

    it('应该正确格式化日期', () => {
      const template = '日期: {{sample.receivedDate}}'
      const variables = [
        {
          name: 'sample',
          type: 'object' as const,
          required: true
        }
      ]
      const reportData = {
        sample: {
          id: 'sample-1',
          barcode: 'BC001',
          sampleNumber: 'S2024001',
          sampleName: '水样',
          clientName: '测试客户',
          sampleType: '水质',
          sampleCategory: '环境',
          quantity: 1,
          unit: '瓶',
          receivedDate: new Date('2024-01-15T10:30:00'),
          status: 'REGISTERED',
          priority: 'NORMAL'
        },
        testItems: [],
        results: [],
        auditTasks: [],
        generatedAt: new Date(),
        generatedBy: 'user-1'
      }

      const result = (reportService as any).fillReportTemplate(
        template,
        variables,
        reportData
      )

      expect(result).toContain('2024')
    })
  })

  describe('getReport', () => {
    it('应该成功获取报告详情', async () => {
      const mockReport = {
        id: 'report-1',
        reportNumber: 'REPORT-20240101-0001',
        sampleId: 'sample-1',
        templateId: 'template-1',
        content: '<h1>报告内容</h1>',
        status: ReportStatus.DRAFT,
        generatedBy: 'user-1',
        generatedAt: new Date(),
        sample: {},
        template: {},
        signatures: [],
        distributions: []
      }

      prisma.report.findUnique.mockResolvedValue(mockReport)

      const result = await reportService.getReport('report-1')

      expect(result).toEqual(mockReport)
      expect(prisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        include: {
          sample: true,
          template: true,
          signatures: true,
          distributions: true
        }
      })
    })

    it('应该在报告不存在时抛出错误', async () => {
      prisma.report.findUnique.mockResolvedValue(null)

      await expect(reportService.getReport('invalid-id')).rejects.toThrow(
        '报告不存在'
      )
    })
  })

  describe('listReports', () => {
    it('应该成功查询报告列表', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reportNumber: 'REPORT-20240101-0001',
          status: ReportStatus.DRAFT,
          sample: { sampleNumber: 'S001', sampleName: '样品1', clientName: '客户1' },
          template: { name: '模板1' }
        },
        {
          id: 'report-2',
          reportNumber: 'REPORT-20240101-0002',
          status: ReportStatus.SIGNED,
          sample: { sampleNumber: 'S002', sampleName: '样品2', clientName: '客户2' },
          template: { name: '模板2' }
        }
      ]

      prisma.report.count.mockResolvedValue(2)
      prisma.report.findMany.mockResolvedValue(mockReports)

      const result = await reportService.listReports({
        page: 1,
        pageSize: 20
      })

      expect(result.items).toEqual(mockReports)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(1)
    })

    it('应该支持按样品ID过滤', async () => {
      prisma.report.count.mockResolvedValue(1)
      prisma.report.findMany.mockResolvedValue([])

      await reportService.listReports({
        sampleId: 'sample-1',
        page: 1,
        pageSize: 20
      })

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sampleId: 'sample-1'
          })
        })
      )
    })

    it('应该支持按状态过滤', async () => {
      prisma.report.count.mockResolvedValue(1)
      prisma.report.findMany.mockResolvedValue([])

      await reportService.listReports({
        status: ReportStatus.SIGNED,
        page: 1,
        pageSize: 20
      })

      expect(prisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReportStatus.SIGNED
          })
        })
      )
    })
  })

  describe('updateReportStatus', () => {
    it('应该成功更新报告状态', async () => {
      const mockReport = {
        id: 'report-1',
        status: ReportStatus.SIGNED
      }

      prisma.report.update.mockResolvedValue(mockReport)

      const result = await reportService.updateReportStatus(
        'report-1',
        ReportStatus.SIGNED,
        'user-1'
      )

      expect(result.status).toBe(ReportStatus.SIGNED)
      expect(prisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: ReportStatus.SIGNED }
      })
    })
  })

  describe('deleteReport', () => {
    it('应该成功删除草稿状态的报告', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'report-1',
        status: ReportStatus.DRAFT
      })
      prisma.report.delete.mockResolvedValue({})

      await reportService.deleteReport('report-1', 'user-1')

      expect(prisma.report.delete).toHaveBeenCalledWith({
        where: { id: 'report-1' }
      })
    })

    it('应该拒绝删除非草稿状态的报告', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'report-1',
        status: ReportStatus.SIGNED
      })

      await expect(
        reportService.deleteReport('report-1', 'user-1')
      ).rejects.toThrow('只能删除草稿状态的报告')

      expect(prisma.report.delete).not.toHaveBeenCalled()
    })

    it('应该在报告不存在时抛出错误', async () => {
      prisma.report.findUnique.mockResolvedValue(null)

      await expect(
        reportService.deleteReport('invalid-id', 'user-1')
      ).rejects.toThrow('报告不存在')
    })
  })
})
