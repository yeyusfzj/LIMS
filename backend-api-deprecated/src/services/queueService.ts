import { Job } from 'bull'
import { reportQueue, batchQueue, exportQueue } from '../config/queue'
import { logger } from '../config/logger'

/**
 * 任务状态
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

/**
 * 任务信息
 */
export interface JobInfo {
  id: string
  type: string
  status: JobStatus
  progress: number
  data: any
  result?: any
  error?: string
  createdAt: Date
  processedAt?: Date
  finishedAt?: Date
  attempts: number
  maxAttempts: number
}

/**
 * 队列服务
 */
export class QueueService {
  /**
   * 添加报告生成任务
   */
  async addReportGenerationJob(data: {
    sampleId: string
    templateId: string
    userId: string
  }): Promise<string> {
    const job = await reportQueue.add(data, {
      priority: 1,
    })

    logger.info('Report generation job added', {
      jobId: job.id,
      sampleId: data.sampleId,
      templateId: data.templateId,
    })

    return job.id.toString()
  }

  /**
   * 添加批量导入任务
   */
  async addBatchImportJob(data: {
    operation: 'import'
    type: 'results' | 'samples'
    fileData: any
    userId: string
  }): Promise<string> {
    const job = await batchQueue.add(data, {
      priority: 2,
    })

    logger.info('Batch import job added', {
      jobId: job.id,
      operation: data.operation,
      type: data.type,
    })

    return job.id.toString()
  }

  /**
   * 添加批量更新任务
   */
  async addBatchUpdateJob(data: {
    operation: 'update'
    type: 'samples' | 'results'
    updates: Array<{ id: string; data: any }>
    userId: string
  }): Promise<string> {
    const job = await batchQueue.add(data, {
      priority: 2,
    })

    logger.info('Batch update job added', {
      jobId: job.id,
      operation: data.operation,
      type: data.type,
      count: data.updates.length,
    })

    return job.id.toString()
  }

  /**
   * 添加批量删除任务
   */
  async addBatchDeleteJob(data: {
    operation: 'delete'
    type: 'samples' | 'results'
    ids: string[]
    userId: string
  }): Promise<string> {
    const job = await batchQueue.add(data, {
      priority: 3,
    })

    logger.info('Batch delete job added', {
      jobId: job.id,
      operation: data.operation,
      type: data.type,
      count: data.ids.length,
    })

    return job.id.toString()
  }

  /**
   * 添加数据导出任务
   */
  async addDataExportJob(data: {
    type: 'samples' | 'results' | 'reports' | 'statistics'
    format: 'csv' | 'excel'
    query: any
    userId: string
  }): Promise<string> {
    const job = await exportQueue.add(data, {
      priority: 2,
    })

    logger.info('Data export job added', {
      jobId: job.id,
      type: data.type,
      format: data.format,
    })

    return job.id.toString()
  }

  /**
   * 获取任务状态
   */
  async getJobStatus(jobId: string, queueType: 'report' | 'batch' | 'export'): Promise<JobInfo | null> {
    const queue = this.getQueue(queueType)
    const job = await queue.getJob(jobId)

    if (!job) {
      return null
    }

    const state = await job.getState()
    const progress = await job.progress()

    return {
      id: job.id.toString(),
      type: queueType,
      status: state as JobStatus,
      progress: typeof progress === 'number' ? progress : 0,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts || 3,
    }
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(queueType: 'report' | 'batch' | 'export') {
    const queue = this.getQueue(queueType)

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return {
      queueType,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    }
  }

  /**
   * 获取队列中的任务列表
   */
  async getJobs(
    queueType: 'report' | 'batch' | 'export',
    status: JobStatus,
    start = 0,
    end = 10
  ): Promise<JobInfo[]> {
    const queue = this.getQueue(queueType)
    let jobs: Job[] = []

    switch (status) {
      case JobStatus.WAITING:
        jobs = await queue.getWaiting(start, end)
        break
      case JobStatus.ACTIVE:
        jobs = await queue.getActive(start, end)
        break
      case JobStatus.COMPLETED:
        jobs = await queue.getCompleted(start, end)
        break
      case JobStatus.FAILED:
        jobs = await queue.getFailed(start, end)
        break
      case JobStatus.DELAYED:
        jobs = await queue.getDelayed(start, end)
        break
    }

    return Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState()
        const progress = await job.progress()

        return {
          id: job.id.toString(),
          type: queueType,
          status: state as JobStatus,
          progress: typeof progress === 'number' ? progress : 0,
          data: job.data,
          result: job.returnvalue,
          error: job.failedReason,
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts || 3,
        }
      })
    )
  }

  /**
   * 重试失败的任务
   */
  async retryJob(jobId: string, queueType: 'report' | 'batch' | 'export'): Promise<void> {
    const queue = this.getQueue(queueType)
    const job = await queue.getJob(jobId)

    if (!job) {
      throw new Error('Job not found')
    }

    await job.retry()
    logger.info('Job retried', { jobId, queueType })
  }

  /**
   * 删除任务
   */
  async removeJob(jobId: string, queueType: 'report' | 'batch' | 'export'): Promise<void> {
    const queue = this.getQueue(queueType)
    const job = await queue.getJob(jobId)

    if (!job) {
      throw new Error('Job not found')
    }

    await job.remove()
    logger.info('Job removed', { jobId, queueType })
  }

  /**
   * 清空队列
   */
  async cleanQueue(queueType: 'report' | 'batch' | 'export', status: JobStatus): Promise<void> {
    const queue = this.getQueue(queueType)

    switch (status) {
      case JobStatus.COMPLETED:
        await queue.clean(0, 'completed')
        break
      case JobStatus.FAILED:
        await queue.clean(0, 'failed')
        break
      case JobStatus.WAITING:
        await queue.clean(0, 'wait')
        break
      case JobStatus.DELAYED:
        await queue.clean(0, 'delayed')
        break
    }

    logger.info('Queue cleaned', { queueType, status })
  }

  /**
   * 获取队列实例
   */
  private getQueue(queueType: 'report' | 'batch' | 'export') {
    switch (queueType) {
      case 'report':
        return reportQueue
      case 'batch':
        return batchQueue
      case 'export':
        return exportQueue
      default:
        throw new Error(`Unknown queue type: ${queueType}`)
    }
  }
}

export const queueService = new QueueService()
