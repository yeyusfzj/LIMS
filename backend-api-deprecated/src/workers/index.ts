import { startReportWorker } from './reportWorker'
import { startBatchWorker } from './batchWorker'
import { startExportWorker } from './exportWorker'
import { initializeQueueListeners } from '../config/queue'
import { logger } from '../config/logger'

/**
 * 启动所有 workers
 */
export function startWorkers() {
  // 初始化队列事件监听
  initializeQueueListeners()

  // 启动各个 worker
  startReportWorker(2) // 2 个并发处理报告生成
  startBatchWorker(2)  // 2 个并发处理批量操作
  startExportWorker(2) // 2 个并发处理数据导出

  logger.info('All workers started successfully')
}
