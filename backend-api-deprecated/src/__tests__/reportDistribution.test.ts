/**
 * 报告分发和回收服务单元测试
 * 验证需求: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { ReportService } from '../services/reportService'
import {
  DistributionMethod,
  DistributionStatus,
  ReportStatus
} from '../types/report'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    report: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    distribution: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  }
})

describe('ReportService - 报告分发和回收', () => {
  let reportService: ReportService
  let mockPrisma: any

  beforeEach(() => {
    reportService = new ReportService()
    mockPrisma = new PrismaClient()
    vi.clearAllMocks()
  })

  describe('distributeReport - 分发报告', () => {
    const mockReport = {
      id: 'report-1',
      reportNumber: 'REPORT-20240101-0001',
      sampleId: 'sample-1',
      templateId: 'template-1',
      content: '<html>报告内容</html>',
      status: ReportStatus.SIGNED,
      signatures: [
        { id: 'sig-1', signerId: 'user-1', signedAt: new Date() }
      ],
      generatedBy: 'user-1',
      generatedAt: new Date()
    }

    const mockDistribution = {
      id: 'dist-1',
      reportId: 'report-1',
      method: DistributionMethod.EMAIL,
      recipient: '张三',
      recipientEmail: 'zhangsan@example.com',
      status: DistributionStatus.PENDING
    }

    it('应该成功通过邮件分发报告', async () => {
      // 验证需求: 16.1, 16.3
      mockPrisma.report.findUnique.mockResolvedValue(mockReport)
      mockPrisma.distribution.create.mockResolvedValue(mockDistribution)
      mockPrisma.distribution.update.mockResolvedValue({
        ...mockDistribution,
        status: DistributionStatus.SENT,
        sentAt: new Date()
      })
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.DISTRIBUTED
      })

      const result = await reportService.distributeReport(
        {
          reportId: 'report-1',
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          recipientEmail: 'zhangsan@example.com'
        },
        'user-1'
      )

      expect(result).toBeDefined()
      expect(result.distribution).toBeDefined()
      expect(result.message).toBe('报告已通过邮件发送')
      expect(mockPrisma.distribution.create).toHaveBeenCalledWith({
        data: {
          reportId: 'report-1',
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          recipientEmail: 'zhangsan@example.com',
          status: DistributionStatus.PENDING
        }
      })
      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: { status: ReportStatus.DISTRIBUTED }
      })
    })

    it('应该成功生成下载链接', async () => {
      // 验证需求: 16.3
      mockPrisma.report.findUnique.mockResolvedValue(mockReport)
      mockPrisma.distribution.create.mockResolvedValue({
        ...mockDistribution,
        method: DistributionMethod.DOWNLOAD
      })
      mockPrisma.distribution.update.mockResolvedValue({
        ...mockDistribution,
        status: DistributionStatus.SENT,
        sentAt: new Date()
      })
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.DISTRIBUTED
      })

      const result = await reportService.distributeReport(
        {
          reportId: 'report-1',
          method: DistributionMethod.DOWNLOAD,
          recipient: '李四'
        },
        'user-1'
      )

      expect(result).toBeDefined()
      expect(result.downloadUrl).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.expiresIn).toBe(86400)
      expect(result.message).toBe('下载链接已生成')
    })

    it('应该拒绝分发未签名的报告', async () => {
      // 验证需求: 16.1
      mockPrisma.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.DRAFT
      })

      await expect(
        reportService.distributeReport(
          {
            reportId: 'report-1',
            method: DistributionMethod.EMAIL,
            recipient: '张三',
            recipientEmail: 'zhangsan@example.com'
          },
          'user-1'
        )
      ).rejects.toThrow('报告未签名，无法分发')
    })

    it('应该拒绝分发已回收的报告', async () => {
      // 验证需求: 16.1
      mockPrisma.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RECALLED
      })

      await expect(
        reportService.distributeReport(
          {
            reportId: 'report-1',
            method: DistributionMethod.EMAIL,
            recipient: '张三',
            recipientEmail: 'zhangsan@example.com'
          },
          'user-1'
        )
      ).rejects.toThrow('报告已回收，无法分发')
    })

    it('邮件分发时必须提供邮箱地址', async () => {
      // 验证需求: 16.3
      mockPrisma.report.findUnique.mockResolvedValue(mockReport)

      await expect(
        reportService.distributeReport(
          {
            reportId: 'report-1',
            method: DistributionMethod.EMAIL,
            recipient: '张三'
            // 缺少 recipientEmail
          },
          'user-1'
        )
      ).rejects.toThrow('邮件分发必须提供接收人邮箱')
    })

    it('应该处理打印分发方式', async () => {
      // 验证需求: 16.2
      mockPrisma.report.findUnique.mockResolvedValue(mockReport)
      mockPrisma.distribution.create.mockResolvedValue({
        ...mockDistribution,
        method: DistributionMethod.PRINT
      })
      mockPrisma.distribution.update.mockResolvedValue({
        ...mockDistribution,
        status: DistributionStatus.SENT,
        sentAt: new Date()
      })
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.DISTRIBUTED
      })

      const result = await reportService.distributeReport(
        {
          reportId: 'report-1',
          method: DistributionMethod.PRINT,
          recipient: '王五'
        },
        'user-1'
      )

      expect(result).toBeDefined()
      expect(result.message).toBe('打印分发记录已创建')
    })
  })

  describe('recallReport - 回收报告', () => {
    const mockReport = {
      id: 'report-1',
      reportNumber: 'REPORT-20240101-0001',
      sampleId: 'sample-1',
      templateId: 'template-1',
      content: '<html>报告内容</html>',
      status: ReportStatus.DISTRIBUTED,
      distributions: [
        {
          id: 'dist-1',
          method: DistributionMethod.EMAIL,
          recipient: '张三',
          status: DistributionStatus.SENT
        }
      ],
      generatedBy: 'user-1',
      generatedAt: new Date()
    }

    it('应该成功回收已分发的报告', async () => {
      // 验证需求: 16.4
      mockPrisma.report.findUnique.mockResolvedValue(mockReport)
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RECALLED,
        recalledAt: new Date(),
        recallReason: '数据错误需要修正'
      })

      const result = await reportService.recallReport(
        {
          reportId: 'report-1',
          reason: '数据错误需要修正'
        },
        'user-1'
      )

      expect(result).toBeDefined()
      expect(result.message).toBe('报告已成功回收')
      expect(result.report.status).toBe(ReportStatus.RECALLED)
      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        data: {
          status: ReportStatus.RECALLED,
          recalledAt: expect.any(Date),
          recallReason: '数据错误需要修正'
        }
      })
    })

    it('应该成功回收已签名但未分发的报告', async () => {
      // 验证需求: 16.4
      mockPrisma.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.SIGNED,
        distributions: []
      })
      mockPrisma.report.update.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RECALLED,
        recalledAt: new Date(),
        recallReason: '客户要求撤回'
      })

      const result = await reportService.recallReport(
        {
          reportId: 'report-1',
          reason: '客户要求撤回'
        },
        'user-1'
      )

      expect(result).toBeDefined()
      expect(result.report.status).toBe(ReportStatus.RECALLED)
    })

    it('应该拒绝回收已经被回收的报告', async () => {
      // 验证需求: 16.4
      mockPrisma.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.RECALLED,
        recalledAt: new Date(),
        recallReason: '之前已回收'
      })

      await expect(
        reportService.recallReport(
          {
            reportId: 'report-1',
            reason: '再次回收'
          },
          'user-1'
        )
      ).rejects.toThrow('报告已经被回收')
    })

    it('应该拒绝回收草稿状态的报告', async () => {
      // 验证需求: 16.4
      mockPrisma.report.findUnique.mockResolvedValue({
        ...mockReport,
        status: ReportStatus.DRAFT
      })

      await expect(
        reportService.recallReport(
          {
            reportId: 'report-1',
            reason: '回收草稿'
          },
          'user-1'
        )
      ).rejects.toThrow('只能回收已签名或已分发的报告')
    })

    it('应该拒绝回收不存在的报告', async () => {
      // 验证需求: 16.4
      mockPrisma.report.findUnique.mockResolvedValue(null)

      await expect(
        reportService.recallReport(
          {
            reportId: 'non-existent',
            reason: '回收'
          },
          'user-1'
        )
      ).rejects.toThrow('报告不存在')
    })
  })

  describe('getDistributionHistory - 获取分发历史', () => {
    const mockDistributions = [
      {
        id: 'dist-1',
        reportId: 'report-1',
        method: DistributionMethod.EMAIL,
        recipient: '张三',
        recipientEmail: 'zhangsan@example.com',
        status: DistributionStatus.SENT,
        sentAt: new Date('2024-01-01'),
        report: {
          reportNumber: 'REPORT-20240101-0001',
          sampleId: 'sample-1',
          status: ReportStatus.DISTRIBUTED
        }
      },
      {
        id: 'dist-2',
        reportId: 'report-1',
        method: DistributionMethod.DOWNLOAD,
        recipient: '李四',
        status: DistributionStatus.SENT,
        sentAt: new Date('2024-01-02'),
        report: {
          reportNumber: 'REPORT-20240101-0001',
          sampleId: 'sample-1',
          status: ReportStatus.DISTRIBUTED
        }
      }
    ]

    it('应该成功获取分发历史', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.count.mockResolvedValue(2)
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      const result = await reportService.getDistributionHistory({
        page: 1,
        pageSize: 20
      })

      expect(result).toBeDefined()
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(1)
    })

    it('应该支持按报告ID过滤', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.count.mockResolvedValue(2)
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      await reportService.getDistributionHistory({
        reportId: 'report-1',
        page: 1,
        pageSize: 20
      })

      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        skip: 0,
        take: 20,
        orderBy: { sentAt: 'desc' },
        include: {
          report: {
            select: {
              reportNumber: true,
              sampleId: true,
              status: true
            }
          }
        }
      })
    })

    it('应该支持按分发方式过滤', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.count.mockResolvedValue(1)
      mockPrisma.distribution.findMany.mockResolvedValue([mockDistributions[0]])

      await reportService.getDistributionHistory({
        method: DistributionMethod.EMAIL,
        page: 1,
        pageSize: 20
      })

      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: { method: DistributionMethod.EMAIL },
        skip: 0,
        take: 20,
        orderBy: { sentAt: 'desc' },
        include: {
          report: {
            select: {
              reportNumber: true,
              sampleId: true,
              status: true
            }
          }
        }
      })
    })

    it('应该支持按状态过滤', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.count.mockResolvedValue(2)
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      await reportService.getDistributionHistory({
        status: DistributionStatus.SENT,
        page: 1,
        pageSize: 20
      })

      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: { status: DistributionStatus.SENT },
        skip: 0,
        take: 20,
        orderBy: { sentAt: 'desc' },
        include: {
          report: {
            select: {
              reportNumber: true,
              sampleId: true,
              status: true
            }
          }
        }
      })
    })

    it('应该支持按时间范围过滤', async () => {
      // 验证需求: 16.5
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      mockPrisma.distribution.count.mockResolvedValue(2)
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      await reportService.getDistributionHistory({
        startDate,
        endDate,
        page: 1,
        pageSize: 20
      })

      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: {
          sentAt: {
            gte: startDate,
            lte: endDate
          }
        },
        skip: 0,
        take: 20,
        orderBy: { sentAt: 'desc' },
        include: {
          report: {
            select: {
              reportNumber: true,
              sampleId: true,
              status: true
            }
          }
        }
      })
    })

    it('应该支持分页查询', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.count.mockResolvedValue(50)
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      const result = await reportService.getDistributionHistory({
        page: 2,
        pageSize: 10
      })

      expect(result.page).toBe(2)
      expect(result.pageSize).toBe(10)
      expect(result.totalPages).toBe(5)
      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { sentAt: 'desc' },
        include: {
          report: {
            select: {
              reportNumber: true,
              sampleId: true,
              status: true
            }
          }
        }
      })
    })
  })

  describe('getReportDistributions - 获取报告的分发记录', () => {
    const mockDistributions = [
      {
        id: 'dist-1',
        reportId: 'report-1',
        method: DistributionMethod.EMAIL,
        recipient: '张三',
        recipientEmail: 'zhangsan@example.com',
        status: DistributionStatus.SENT,
        sentAt: new Date('2024-01-01')
      },
      {
        id: 'dist-2',
        reportId: 'report-1',
        method: DistributionMethod.DOWNLOAD,
        recipient: '李四',
        status: DistributionStatus.SENT,
        sentAt: new Date('2024-01-02')
      }
    ]

    it('应该成功获取指定报告的所有分发记录', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.findMany.mockResolvedValue(mockDistributions)

      const result = await reportService.getReportDistributions('report-1')

      expect(result).toBeDefined()
      expect(result).toHaveLength(2)
      expect(result[0].reportId).toBe('report-1')
      expect(result[1].reportId).toBe('report-1')
      expect(mockPrisma.distribution.findMany).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
        orderBy: { sentAt: 'desc' }
      })
    })

    it('应该返回空数组如果报告没有分发记录', async () => {
      // 验证需求: 16.5
      mockPrisma.distribution.findMany.mockResolvedValue([])

      const result = await reportService.getReportDistributions('report-2')

      expect(result).toBeDefined()
      expect(result).toHaveLength(0)
    })
  })

  describe('updateDistributionStatus - 更新分发状态', () => {
    it('应该成功更新分发状态', async () => {
      // 验证需求: 16.5
      const mockDistribution = {
        id: 'dist-1',
        reportId: 'report-1',
        method: DistributionMethod.EMAIL,
        recipient: '张三',
        status: DistributionStatus.RECEIVED,
        receivedAt: new Date()
      }

      mockPrisma.distribution.update.mockResolvedValue(mockDistribution)

      const result = await reportService.updateDistributionStatus(
        'dist-1',
        DistributionStatus.RECEIVED
      )

      expect(result).toBeDefined()
      expect(result.status).toBe(DistributionStatus.RECEIVED)
      expect(result.receivedAt).toBeDefined()
      expect(mockPrisma.distribution.update).toHaveBeenCalledWith({
        where: { id: 'dist-1' },
        data: {
          status: DistributionStatus.RECEIVED,
          receivedAt: expect.any(Date)
        }
      })
    })

    it('应该支持自定义接收时间', async () => {
      // 验证需求: 16.5
      const customReceivedAt = new Date('2024-01-15')
      const mockDistribution = {
        id: 'dist-1',
        reportId: 'report-1',
        method: DistributionMethod.EMAIL,
        recipient: '张三',
        status: DistributionStatus.RECEIVED,
        receivedAt: customReceivedAt
      }

      mockPrisma.distribution.update.mockResolvedValue(mockDistribution)

      const result = await reportService.updateDistributionStatus(
        'dist-1',
        DistributionStatus.RECEIVED,
        customReceivedAt
      )

      expect(result.receivedAt).toEqual(customReceivedAt)
      expect(mockPrisma.distribution.update).toHaveBeenCalledWith({
        where: { id: 'dist-1' },
        data: {
          status: DistributionStatus.RECEIVED,
          receivedAt: customReceivedAt
        }
      })
    })
  })
})
