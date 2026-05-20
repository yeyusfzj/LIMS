/**
 * 审核API连接修复 - Bug条件探索测试
 * 
 * 这个测试验证审核组件现在正确调用真实API而不是使用模拟数据。
 * 修复后的测试应该通过，证明bug已经被修复。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock HTTP service - 必须在顶层定义
vi.mock('@/services/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn()
  }
}))

// 导入被测试的服务
import { auditService } from '@/services/auditService'
import http from '@/services/http'

describe('审核API连接Bug条件探索测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 1: Bug条件 - 审核API调用缺失验证', () => {
    it('应该验证 listAuditTasks() 现在正确调用 GET /api/audits', async () => {
      // 模拟API响应
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'AT-2024-001',
            sampleName: '水质样品-A',
            sampleBarcode: 'WQ20240001',
            level: 1,
            levelName: '分析审核',
            status: 'pending',
            auditor: 'user1',
            priority: 'normal',
            submittedAt: new Date(),
            auditedAt: null
          }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1
        }
      }
      
      vi.mocked(http.get).mockResolvedValue(mockResponse)

      // 调用审核服务
      const params = {
        level: 1,
        status: 'pending',
        page: 1,
        pageSize: 20
      }
      
      const result = await auditService.listAuditTasks(params)

      // 验证现在正确调用了真实API
      expect(http.get).toHaveBeenCalledWith('/api/audits', {
        params,
        showError: true
      })
      
      // 验证返回了正确的数据
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.length).toBe(1)
      expect(result.data[0].id).toBe('AT-2024-001')
    })

    it('应该验证 performAudit() 现在正确调用 POST /api/audits/:id/review', async () => {
      // 模拟API响应
      const mockResponse = {
        success: true,
        message: '审核通过成功'
      }
      
      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const taskId = 'AT-2024-001'
      const decision = {
        taskId,
        decision: 'approved' as const,
        comments: '快速通过审核'
      }

      // 调用审核服务
      const result = await auditService.performAudit(taskId, decision)

      // 验证现在正确调用了审核API
      expect(http.post).toHaveBeenCalledWith(
        `/api/audits/${taskId}/review`,
        decision,
        {
          showError: true
        }
      )
      
      // 验证返回了正确的结果
      expect(result.success).toBe(true)
      expect(result.message).toBe('审核通过成功')
    })

    it('应该验证 getAuditTask() 现在正确调用 GET /api/audits/:id', async () => {
      // 模拟API响应
      const mockResponse = {
        id: 'AT-2024-001',
        sampleName: '水质样品-A',
        sampleBarcode: 'WQ20240001',
        level: 1,
        levelName: '分析审核',
        status: 'pending',
        auditor: 'user1',
        priority: 'normal',
        submittedAt: new Date(),
        auditedAt: null
      }
      
      vi.mocked(http.get).mockResolvedValue(mockResponse)

      const taskId = 'AT-2024-001'

      // 调用审核服务
      const result = await auditService.getAuditTask(taskId)

      // 验证现在正确调用了API获取任务详情
      expect(http.get).toHaveBeenCalledWith(`/api/audits/${taskId}`, {
        showError: true
      })
      
      // 验证返回了正确的数据
      expect(result.id).toBe('AT-2024-001')
      expect(result.sampleName).toBe('水质样品-A')
      expect(result.levelName).toBe('分析审核')
    })

    it('应该验证 getAuditStatistics() 现在正确调用 GET /api/audits/statistics', async () => {
      // 模拟统计API响应
      const mockResponse = {
        pending: 5,
        todayCompleted: 3,
        weekCompleted: 15,
        monthCompleted: 42,
        approvalRate: 85.5,
        averageProcessingTime: 2.5
      }
      
      vi.mocked(http.get).mockResolvedValue(mockResponse)

      // 调用审核服务
      const result = await auditService.getAuditStatistics()

      // 验证现在正确调用了统计信息API
      expect(http.get).toHaveBeenCalledWith('/api/audits/statistics', {
        showError: true
      })
      
      // 验证返回了正确的统计数据
      expect(result.pending).toBe(5)
      expect(result.todayCompleted).toBe(3)
      expect(result.weekCompleted).toBe(15)
      expect(result.approvalRate).toBe(85.5)
    })

    it('应该验证批量审核操作现在正确调用 POST /api/audits/batch-review', async () => {
      // 模拟API响应
      const mockResponse = {
        success: true,
        message: '批量审核完成',
        results: [
          { id: 'AT-2024-001', success: true, message: '审核通过' },
          { id: 'AT-2024-002', success: true, message: '审核通过' }
        ]
      }
      
      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const taskIds = ['AT-2024-001', 'AT-2024-002']
      const decision = {
        decision: 'approved' as const,
        comments: '批量通过审核'
      }

      // 调用批量审核服务
      const result = await auditService.batchAudit(taskIds, decision)

      // 验证现在正确调用了批量审核API
      expect(http.post).toHaveBeenCalledWith('/api/audits/batch-review', {
        taskIds,
        ...decision
      }, {
        showError: true
      })
      
      // 验证返回了正确的结果
      expect(result.success).toBe(true)
      expect(result.message).toBe('批量审核完成')
      expect(result.results.length).toBe(2)
    })

    it('应该验证所有API调用都包含正确的错误处理', async () => {
      // 模拟API错误
      const apiError = new Error('网络连接失败')
      vi.mocked(http.get).mockRejectedValue(apiError)

      // 测试错误处理
      try {
        await auditService.listAuditTasks({})
        expect.fail('应该抛出错误')
      } catch (error) {
        expect(error).toBe(apiError)
      }

      // 验证API被调用了
      expect(http.get).toHaveBeenCalledWith('/api/audits', {
        params: {},
        showError: true
      })
    })
  })
})