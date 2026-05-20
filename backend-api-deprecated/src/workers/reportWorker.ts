import { Job } from 'bull'
import { reportQueue } from '../config/queue'
import { reportService } from '../services/reportService'
import { logger } from '../config/logger'

/**
 * 报告生成任务数据
 */
interface ReportJobData {
  sampleId: string
  templateId: string
  userId: string
}

/**
 * 报告生成任务结果
 */
interface ReportJobResult {
  reportId: string
  reportNumber: string
  success: boolean
}

/**
 * 处理报告生成任务
 */
async function processReportGeneration(job: Job<ReportJobData>): Promise<ReportJobResult> {
  const { sampleId, templateId, userId } = job.data

  logger.info('Processing report generation job', {
    jobId: job.id,
    sampleId,
    templateId,
  })

  try {
    // 更新进度：开始生成
    await job.progress(10)

    // 生成报告
    const report = await reportService.generateReport(sampleId, templateId)

    // 更新进度：报告生成完成
    await job.progress(80)

    // 可以在这里添加其他操作，如发送通知等
    await job.progress(100)

    logger.info('Report generation completed', {
      jobId: job.id,
      reportId: report.id,
      reportNumber: report.reportNumber,
    })

    return {
      reportId: report.id,
      reportNumber: report.reportNumber,
      success: true,
    }
  } catch (error) {
    logger.error('Report generation failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      sampleId,
      templateId,
    })
    throw error
  }
}

/**
 * 启动报告生成 worker
 */
export function startReportWorker(concurrency = 2) {
  reportQueue.process(concurrency, processReportGeneration)

  logger.info('Report worker started', { concurrency })
}
