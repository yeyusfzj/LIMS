/**
 * 审计日志归档定时任务
 * 自动归档超过指定天数的审计日志
 */

import { auditLogService } from '../services/auditLogService'
import { logger } from '../config/logger'

// 默认归档超过 90 天的日志
const DEFAULT_ARCHIVE_DAYS = 90

/**
 * 执行审计日志归档
 * @param archiveDays 归档超过多少天的日志，默认 90 天
 */
export async function archiveOldAuditLogs(archiveDays: number = DEFAULT_ARCHIVE_DAYS): Promise<void> {
  try {
    logger.info('Starting audit log archiving job', { archiveDays })

    // 计算归档日期
    const beforeDate = new Date()
    beforeDate.setDate(beforeDate.getDate() - archiveDays)

    // 执行归档
    const count = await auditLogService.archiveAuditLogs(beforeDate)

    logger.info('Audit log archiving job completed', {
      archivedCount: count,
      beforeDate,
      archiveDays
    })
  } catch (error) {
    logger.error('Audit log archiving job failed', { error, archiveDays })
    throw error
  }
}

/**
 * 获取归档配置
 * 从环境变量读取归档天数配置
 */
export function getArchiveConfig(): { archiveDays: number } {
  const archiveDays = process.env.AUDIT_LOG_ARCHIVE_DAYS
    ? parseInt(process.env.AUDIT_LOG_ARCHIVE_DAYS)
    : DEFAULT_ARCHIVE_DAYS

  return { archiveDays }
}

// 如果直接运行此脚本，执行归档任务
if (require.main === module) {
  const { archiveDays } = getArchiveConfig()
  
  archiveOldAuditLogs(archiveDays)
    .then(() => {
      logger.info('Audit log archiving completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Audit log archiving failed', { error })
      process.exit(1)
    })
}
