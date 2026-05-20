import { Request, Response } from 'express'
import { queueService, JobStatus } from '../services/queueService'
import { logger } from '../config/logger'

/**
 * 获取任务状态
 */
export async function getJobStatus(req: Request, res: Response) {
  try {
    const { jobId } = req.params
    const { queueType } = req.query

    if (!queueType || !['report', 'batch', 'export'].includes(queueType as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    const jobInfo = await queueService.getJobStatus(
      jobId,
      queueType as 'report' | 'batch' | 'export'
    )

    if (!jobInfo) {
      return res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: '任务不存在',
        },
      })
    }

    res.json(jobInfo)
  } catch (error) {
    logger.error('Failed to get job status', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取任务状态失败',
      },
    })
  }
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(req: Request, res: Response) {
  try {
    const { queueType } = req.params

    if (!['report', 'batch', 'export'].includes(queueType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    const stats = await queueService.getQueueStats(
      queueType as 'report' | 'batch' | 'export'
    )

    res.json(stats)
  } catch (error) {
    logger.error('Failed to get queue stats', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取队列统计信息失败',
      },
    })
  }
}

/**
 * 获取队列中的任务列表
 */
export async function getJobs(req: Request, res: Response) {
  try {
    const { queueType } = req.params
    const { status, start = '0', end = '10' } = req.query

    if (!['report', 'batch', 'export'].includes(queueType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    if (!status || !Object.values(JobStatus).includes(status as JobStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: '无效的任务状态',
        },
      })
    }

    const jobs = await queueService.getJobs(
      queueType as 'report' | 'batch' | 'export',
      status as JobStatus,
      parseInt(start as string),
      parseInt(end as string)
    )

    res.json({
      jobs,
      total: jobs.length,
    })
  } catch (error) {
    logger.error('Failed to get jobs', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取任务列表失败',
      },
    })
  }
}

/**
 * 重试失败的任务
 */
export async function retryJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params
    const { queueType } = req.body

    if (!queueType || !['report', 'batch', 'export'].includes(queueType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    await queueService.retryJob(jobId, queueType)

    res.json({
      message: '任务已重新加入队列',
      jobId,
    })
  } catch (error) {
    logger.error('Failed to retry job', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '重试任务失败',
      },
    })
  }
}

/**
 * 删除任务
 */
export async function removeJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params
    const { queueType } = req.query

    if (!queueType || !['report', 'batch', 'export'].includes(queueType as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    await queueService.removeJob(jobId, queueType as 'report' | 'batch' | 'export')

    res.json({
      message: '任务已删除',
      jobId,
    })
  } catch (error) {
    logger.error('Failed to remove job', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除任务失败',
      },
    })
  }
}

/**
 * 清空队列
 */
export async function cleanQueue(req: Request, res: Response) {
  try {
    const { queueType } = req.params
    const { status } = req.body

    if (!['report', 'batch', 'export'].includes(queueType)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUEUE_TYPE',
          message: '无效的队列类型',
        },
      })
    }

    if (!status || !Object.values(JobStatus).includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: '无效的任务状态',
        },
      })
    }

    await queueService.cleanQueue(queueType as 'report' | 'batch' | 'export', status)

    res.json({
      message: '队列已清空',
      queueType,
      status,
    })
  } catch (error) {
    logger.error('Failed to clean queue', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '清空队列失败',
      },
    })
  }
}
