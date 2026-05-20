import { Job } from 'bull'
import { exportQueue } from '../config/queue'
import { exportService } from '../services/exportService'
import { logger } from '../config/logger'

/**
 * 数据导出任务数据
 */
interface ExportJobData {
  type: 'samples' | 'results' | 'reports' | 'statistics'
  format: 'csv' | 'excel'
  query: any
  userId: string
}

/**
 * 数据导出任务结果
 */
interface ExportJobResult {
  type: string
  format: string
  records: number
  fileUrl?: string
  fileName?: string
  success: boolean
}

/**
 * 处理数据导出任务
 */
async function processDataExport(job: Job<ExportJobData>): Promise<ExportJobResult> {
  const { type, format, query } = job.data

  logger.info('Processing data export job', {
    jobId: job.id,
    type,
    format,
  })

  try {
    await job.progress(10)

    let result
    let records = 0

    // 根据类型导出数据
    switch (type) {
      case 'samples':
        result = await exportService.exportSamples(query, format)
        records = result.records
        break
      case 'results':
        result = await exportService.exportResults(query, format)
        records = result.records
        break
      case 'reports':
        result = await exportService.exportReports(query, format)
        records = result.records
        break
      case 'statistics':
        result = await exportService.exportStatistics(query, format)
        records = result.records
        break
      default:
        throw new Error(`Unknown export type: ${type}`)
    }

    await job.progress(100)

    logger.info('Data export completed', {
      jobId: job.id,
      type,
      format,
      records,
    })

    return {
      type,
      format,
      records,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      success: true,
    }
  } catch (error) {
    logger.error('Data export failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      type,
      format,
    })
    throw error
  }
}

/**
 * 启动数据导出 worker
 */
export function startExportWorker(concurrency = 2) {
  exportQueue.process(concurrency, processDataExport)

  logger.info('Export worker started', { concurrency })
}
