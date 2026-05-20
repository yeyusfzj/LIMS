import { Job } from 'bull'
import { batchQueue } from '../config/queue'
import { importService } from '../services/importService'
import { sampleService } from '../services/sampleService'
import { resultService } from '../services/resultService'
import { logger } from '../config/logger'
import { prisma } from '../config/database'

/**
 * 批量操作任务数据
 */
interface BatchJobData {
  operation: 'import' | 'update' | 'delete'
  type: 'samples' | 'results'
  fileData?: any
  updates?: Array<{ id: string; data: any }>
  ids?: string[]
  userId: string
}

/**
 * 批量操作任务结果
 */
interface BatchJobResult {
  operation: string
  processed: number
  succeeded: number
  failed: number
  errors?: Array<{ index: number; error: string }>
  success: boolean
}

/**
 * 处理批量导入任务
 */
async function processBatchImport(
  job: Job<BatchJobData>
): Promise<BatchJobResult> {
  const { type, fileData } = job.data

  logger.info('Processing batch import job', {
    jobId: job.id,
    type,
  })

  try {
    await job.progress(10)

    let result
    if (type === 'results') {
      // 批量导入检测结果
      result = await importService.importResults(fileData)
    } else {
      // 批量导入样品（如果需要实现）
      throw new Error('Batch sample import not implemented yet')
    }

    await job.progress(100)

    logger.info('Batch import completed', {
      jobId: job.id,
      type,
      succeeded: result.successCount,
      failed: result.failureCount,
    })

    return {
      operation: 'import',
      processed: result.totalCount,
      succeeded: result.successCount,
      failed: result.failureCount,
      errors: result.errors,
      success: result.failureCount === 0,
    }
  } catch (error) {
    logger.error('Batch import failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 处理批量更新任务
 */
async function processBatchUpdate(
  job: Job<BatchJobData>
): Promise<BatchJobResult> {
  const { type, updates } = job.data

  if (!updates || updates.length === 0) {
    throw new Error('No updates provided')
  }

  logger.info('Processing batch update job', {
    jobId: job.id,
    type,
    count: updates.length,
  })

  const errors: Array<{ index: number; error: string }> = []
  let succeeded = 0

  try {
    await job.progress(10)

    // 使用事务批量更新
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i]

        try {
          if (type === 'samples') {
            await tx.sample.update({
              where: { id },
              data,
            })
          } else if (type === 'results') {
            await tx.result.update({
              where: { id },
              data,
            })
          }

          succeeded++

          // 更新进度
          const progress = 10 + Math.floor((i / updates.length) * 80)
          await job.progress(progress)
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    })

    await job.progress(100)

    logger.info('Batch update completed', {
      jobId: job.id,
      type,
      succeeded,
      failed: errors.length,
    })

    return {
      operation: 'update',
      processed: updates.length,
      succeeded,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      success: errors.length === 0,
    }
  } catch (error) {
    logger.error('Batch update failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 处理批量删除任务
 */
async function processBatchDelete(
  job: Job<BatchJobData>
): Promise<BatchJobResult> {
  const { type, ids } = job.data

  if (!ids || ids.length === 0) {
    throw new Error('No IDs provided')
  }

  logger.info('Processing batch delete job', {
    jobId: job.id,
    type,
    count: ids.length,
  })

  const errors: Array<{ index: number; error: string }> = []
  let succeeded = 0

  try {
    await job.progress(10)

    // 使用事务批量删除
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]

        try {
          if (type === 'samples') {
            await tx.sample.delete({
              where: { id },
            })
          } else if (type === 'results') {
            await tx.result.delete({
              where: { id },
            })
          }

          succeeded++

          // 更新进度
          const progress = 10 + Math.floor((i / ids.length) * 80)
          await job.progress(progress)
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    })

    await job.progress(100)

    logger.info('Batch delete completed', {
      jobId: job.id,
      type,
      succeeded,
      failed: errors.length,
    })

    return {
      operation: 'delete',
      processed: ids.length,
      succeeded,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      success: errors.length === 0,
    }
  } catch (error) {
    logger.error('Batch delete failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 处理批量操作任务
 */
async function processBatchOperation(job: Job<BatchJobData>): Promise<BatchJobResult> {
  const { operation } = job.data

  switch (operation) {
    case 'import':
      return processBatchImport(job)
    case 'update':
      return processBatchUpdate(job)
    case 'delete':
      return processBatchDelete(job)
    default:
      throw new Error(`Unknown operation: ${operation}`)
  }
}

/**
 * 启动批量操作 worker
 */
export function startBatchWorker(concurrency = 2) {
  batchQueue.process(concurrency, processBatchOperation)

  logger.info('Batch worker started', { concurrency })
}
