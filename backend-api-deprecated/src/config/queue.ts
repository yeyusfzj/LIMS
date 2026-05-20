import Queue from 'bull'
import { config } from './env'
import logger from './logger'

/**
 * 队列配置
 */
const queueConfig = {
  redis: {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: 100, // 保留最近 100 个完成的任务
    removeOnFail: 200, // 保留最近 200 个失败的任务
  },
}

/**
 * 报告生成队列
 */
export const reportQueue = new Queue('report-generation', queueConfig)

/**
 * 批量操作队列
 */
export const batchQueue = new Queue('batch-operations', queueConfig)

/**
 * 数据导出队列
 */
export const exportQueue = new Queue('data-export', queueConfig)

/**
 * 初始化队列事件监听
 */
export function initializeQueueListeners() {
  // 报告生成队列事件
  reportQueue.on('completed', (job, result) => {
    logger.info('Report generation completed', {
      jobId: job.id,
      reportId: result.reportId,
      duration: Date.now() - job.timestamp,
    })
  })

  reportQueue.on('failed', (job, err) => {
    logger.error('Report generation failed', {
      jobId: job.id,
      error: err.message,
      data: job.data,
    })
  })

  // 批量操作队列事件
  batchQueue.on('completed', (job, result) => {
    logger.info('Batch operation completed', {
      jobId: job.id,
      operation: job.data.operation,
      processed: result.processed,
      duration: Date.now() - job.timestamp,
    })
  })

  batchQueue.on('failed', (job, err) => {
    logger.error('Batch operation failed', {
      jobId: job.id,
      operation: job.data.operation,
      error: err.message,
    })
  })

  // 数据导出队列事件
  exportQueue.on('completed', (job, result) => {
    logger.info('Data export completed', {
      jobId: job.id,
      format: job.data.format,
      records: result.records,
      duration: Date.now() - job.timestamp,
    })
  })

  exportQueue.on('failed', (job, err) => {
    logger.error('Data export failed', {
      jobId: job.id,
      error: err.message,
    })
  })

  logger.info('Queue listeners initialized')
}

/**
 * 关闭所有队列
 */
export async function closeQueues() {
  await Promise.all([
    reportQueue.close(),
    batchQueue.close(),
    exportQueue.close(),
  ])
  logger.info('All queues closed')
}
