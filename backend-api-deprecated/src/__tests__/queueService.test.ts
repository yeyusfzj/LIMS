import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// 设置测试环境变量
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.REDIS_PASSWORD = ''

import { queueService, JobStatus } from '../services/queueService'
import { reportQueue, batchQueue, exportQueue } from '../config/queue'

describe('Queue Service', () => {
  beforeAll(async () => {
    // 清空队列
    await reportQueue.empty()
    await batchQueue.empty()
    await exportQueue.empty()
  })

  afterAll(async () => {
    // 清理
    await reportQueue.empty()
    await batchQueue.empty()
    await exportQueue.empty()
  })

  describe('Report Generation Queue', () => {
    it('应该能够添加报告生成任务', async () => {
      const jobId = await queueService.addReportGenerationJob({
        sampleId: 'sample-123',
        templateId: 'template-456',
        userId: 'user-789',
      })

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')

      // 验证任务已添加到队列
      const jobInfo = await queueService.getJobStatus(jobId, 'report')
      expect(jobInfo).toBeDefined()
      expect(jobInfo?.data.sampleId).toBe('sample-123')
      expect(jobInfo?.data.templateId).toBe('template-456')
    })

    it('应该能够获取队列统计信息', async () => {
      const stats = await queueService.getQueueStats('report')

      expect(stats).toBeDefined()
      expect(stats.queueType).toBe('report')
      expect(typeof stats.waiting).toBe('number')
      expect(typeof stats.active).toBe('number')
      expect(typeof stats.completed).toBe('number')
      expect(typeof stats.failed).toBe('number')
    })
  })

  describe('Batch Operations Queue', () => {
    it('应该能够添加批量导入任务', async () => {
      const jobId = await queueService.addBatchImportJob({
        operation: 'import',
        type: 'results',
        fileData: { rows: [] },
        userId: 'user-789',
      })

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')

      const jobInfo = await queueService.getJobStatus(jobId, 'batch')
      expect(jobInfo).toBeDefined()
      expect(jobInfo?.data.operation).toBe('import')
      expect(jobInfo?.data.type).toBe('results')
    })

    it('应该能够添加批量更新任务', async () => {
      const jobId = await queueService.addBatchUpdateJob({
        operation: 'update',
        type: 'samples',
        updates: [
          { id: 'sample-1', data: { status: 'COMPLETED' } },
          { id: 'sample-2', data: { status: 'COMPLETED' } },
        ],
        userId: 'user-789',
      })

      expect(jobId).toBeDefined()

      const jobInfo = await queueService.getJobStatus(jobId, 'batch')
      expect(jobInfo).toBeDefined()
      expect(jobInfo?.data.operation).toBe('update')
      expect(jobInfo?.data.updates.length).toBe(2)
    })

    it('应该能够添加批量删除任务', async () => {
      const jobId = await queueService.addBatchDeleteJob({
        operation: 'delete',
        type: 'samples',
        ids: ['sample-1', 'sample-2', 'sample-3'],
        userId: 'user-789',
      })

      expect(jobId).toBeDefined()

      const jobInfo = await queueService.getJobStatus(jobId, 'batch')
      expect(jobInfo).toBeDefined()
      expect(jobInfo?.data.operation).toBe('delete')
      expect(jobInfo?.data.ids.length).toBe(3)
    })
  })

  describe('Data Export Queue', () => {
    it('应该能够添加数据导出任务', async () => {
      const jobId = await queueService.addDataExportJob({
        type: 'samples',
        format: 'csv',
        query: { status: 'COMPLETED' },
        userId: 'user-789',
      })

      expect(jobId).toBeDefined()

      const jobInfo = await queueService.getJobStatus(jobId, 'export')
      expect(jobInfo).toBeDefined()
      expect(jobInfo?.data.type).toBe('samples')
      expect(jobInfo?.data.format).toBe('csv')
    })
  })

  describe('Job Management', () => {
    it('应该能够获取队列中的任务列表', async () => {
      // 添加一些任务
      await queueService.addReportGenerationJob({
        sampleId: 'sample-1',
        templateId: 'template-1',
        userId: 'user-1',
      })

      await queueService.addReportGenerationJob({
        sampleId: 'sample-2',
        templateId: 'template-2',
        userId: 'user-2',
      })

      // 获取等待中的任务
      const jobs = await queueService.getJobs('report', JobStatus.WAITING, 0, 10)

      expect(Array.isArray(jobs)).toBe(true)
      expect(jobs.length).toBeGreaterThan(0)
    })

    it('应该能够删除任务', async () => {
      const jobId = await queueService.addReportGenerationJob({
        sampleId: 'sample-delete',
        templateId: 'template-delete',
        userId: 'user-delete',
      })

      // 删除任务
      await queueService.removeJob(jobId, 'report')

      // 验证任务已删除
      const jobInfo = await queueService.getJobStatus(jobId, 'report')
      expect(jobInfo).toBeNull()
    })
  })

  describe('Queue Statistics', () => {
    it('应该能够获取所有队列的统计信息', async () => {
      const reportStats = await queueService.getQueueStats('report')
      const batchStats = await queueService.getQueueStats('batch')
      const exportStats = await queueService.getQueueStats('export')

      expect(reportStats.queueType).toBe('report')
      expect(batchStats.queueType).toBe('batch')
      expect(exportStats.queueType).toBe('export')

      expect(typeof reportStats.total).toBe('number')
      expect(typeof batchStats.total).toBe('number')
      expect(typeof exportStats.total).toBe('number')
    })
  })
})
