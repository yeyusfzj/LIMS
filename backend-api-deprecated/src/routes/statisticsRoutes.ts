/**
 * 统计数据路由
 */

import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import * as statisticsController from '../controllers/statisticsController'
import { auditStatisticsController } from '../controllers/auditStatisticsController'

const router = Router()

/**
 * 获取统计数据
 * GET /api/statistics
 * 
 * 查询参数:
 * - dimensions: 统计维度（逗号分隔），如 "time,sampleType"
 * - timeGranularity: 时间粒度（day/week/month/quarter/year）
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - sampleType: 样品类型过滤（逗号分隔）
 * - status: 状态过滤（逗号分隔）
 * - clientName: 客户名称过滤（逗号分隔）
 * - department: 部门过滤（逗号分隔）
 * - useCache: 是否使用缓存（默认 true）
 * - async: 是否异步查询（默认 false）
 */
router.get(
  '/',
  authenticate,
  requirePermission('statistics', 'read'),
  statisticsController.getStatistics
)

/**
 * 获取异步任务状态
 * GET /api/statistics/tasks/:taskId
 */
router.get(
  '/tasks/:taskId',
  authenticate,
  requirePermission('statistics', 'read'),
  statisticsController.getAsyncTaskStatus
)

/**
 * 清除统计缓存
 * DELETE /api/statistics/cache
 * 
 * 查询参数:
 * - pattern: 缓存键模式（可选）
 */
router.delete(
  '/cache',
  authenticate,
  requirePermission('statistics', 'manage'),
  statisticsController.clearCache
)

/**
 * 导出统计数据
 * POST /api/statistics/export
 * 
 * 查询参数:
 * - dimensions: 统计维度（逗号分隔），如 "time,sampleType"
 * - timeGranularity: 时间粒度（day/week/month/quarter/year）
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - format: 导出格式（csv/excel/json）
 * - filename: 文件名（可选）
 * - sampleType: 样品类型过滤（逗号分隔）
 * - status: 状态过滤（逗号分隔）
 * - clientName: 客户名称过滤（逗号分隔）
 * - department: 部门过滤（逗号分隔）
 * - useCache: 是否使用缓存（默认 true）
 */
router.post(
  '/export',
  authenticate,
  requirePermission('statistics', 'export'),
  statisticsController.exportData
)

/**
 * 获取导出任务状态
 * GET /api/statistics/export/tasks/:taskId
 */
router.get(
  '/export/tasks/:taskId',
  authenticate,
  requirePermission('statistics', 'read'),
  statisticsController.getExportTaskStatus
)

/**
 * 下载导出文件
 * GET /api/statistics/export/download/:filename
 */
router.get(
  '/export/download/:filename',
  authenticate,
  requirePermission('statistics', 'read'),
  statisticsController.downloadExportFile
)

/**
 * 生成自定义报表
 * POST /api/statistics/custom-report
 * 
 * 请求体:
 * - name: 报表名称
 * - description: 报表描述（可选）
 * - config: 报表配置
 *   - dimensions: 统计维度数组
 *   - timeGranularity: 时间粒度（可选）
 *   - startDate: 开始日期（可选）
 *   - endDate: 结束日期（可选）
 *   - filters: 过滤条件（可选）
 *   - groupBy: 分组字段（可选）
 *   - orderBy: 排序字段（可选）
 *   - limit: 限制数量（可选）
 * - format: 输出格式（json/csv/excel）
 * - saveTemplate: 是否保存为模板（可选）
 */
router.post(
  '/custom-report',
  authenticate,
  requirePermission('statistics', 'manage'),
  statisticsController.generateCustomReport
)

/**
 * ============================================
 * 审核统计专用路由
 * ============================================
 */

/**
 * 获取审核工作量统计
 * GET /api/statistics/audit/workload
 * 
 * 查询参数:
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - auditorId: 审核人员ID（可选）
 * - level: 审核级别 1-3（可选）
 * - sampleType: 样品类型（可选）
 * - status: 审核状态 approved/rejected/pending（可选）
 * - granularity: 时间粒度 day/week/month/quarter/year（可选，默认day）
 */
router.get(
  '/audit/workload',
  authenticate,
  requirePermission('statistics', 'read'),
  (req, res) => auditStatisticsController.getWorkload(req, res)
)

/**
 * 获取审核通过率统计
 * GET /api/statistics/audit/pass-rate
 * 
 * 查询参数:
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - level: 审核级别 1-3（可选）
 * - sampleType: 样品类型（可选）
 */
router.get(
  '/audit/pass-rate',
  authenticate,
  requirePermission('statistics', 'read'),
  (req, res) => auditStatisticsController.getPassRate(req, res)
)

/**
 * 获取审核时效性统计
 * GET /api/statistics/audit/duration
 * 
 * 查询参数:
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - auditorId: 审核人员ID（可选）
 * - level: 审核级别 1-3（可选）
 */
router.get(
  '/audit/duration',
  authenticate,
  requirePermission('statistics', 'read'),
  (req, res) => auditStatisticsController.getDuration(req, res)
)

/**
 * 获取审核问题分类统计
 * GET /api/statistics/audit/issues
 * 
 * 查询参数:
 * - startDate: 开始日期（ISO 8601 格式）
 * - endDate: 结束日期（ISO 8601 格式）
 * - sampleType: 样品类型（可选）
 */
router.get(
  '/audit/issues',
  authenticate,
  requirePermission('statistics', 'read'),
  (req, res) => auditStatisticsController.getIssues(req, res)
)

/**
 * 导出审核统计数据
 * POST /api/statistics/audit/export
 * 
 * 请求体:
 * - type: 导出类型 workload/passRate/duration/issues
 * - filters: 筛选条件
 *   - startDate: 开始日期（ISO 8601 格式）
 *   - endDate: 结束日期（ISO 8601 格式）
 *   - auditorId: 审核人员ID（可选）
 *   - level: 审核级别 1-3（可选）
 *   - sampleType: 样品类型（可选）
 *   - status: 审核状态（可选）
 */
router.post(
  '/audit/export',
  authenticate,
  requirePermission('statistics', 'export'),
  (req, res) => auditStatisticsController.exportStatistics(req, res)
)

export default router
