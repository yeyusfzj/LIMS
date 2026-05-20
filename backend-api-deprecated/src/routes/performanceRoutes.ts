import { Router } from 'express'
import performanceController from '../controllers/performanceController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

/**
 * @swagger
 * /api/performance/stats:
 *   get:
 *     summary: 获取性能统计数据
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *     responses:
 *       200:
 *         description: 性能统计数据
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权限
 */
router.get(
  '/stats',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getPerformanceStats
)

/**
 * @swagger
 * /api/performance/slow-requests:
 *   get:
 *     summary: 获取慢请求列表
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 返回数量限制
 *     responses:
 *       200:
 *         description: 慢请求列表
 */
router.get(
  '/slow-requests',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getSlowRequests
)

/**
 * @swagger
 * /api/performance/slow-queries:
 *   get:
 *     summary: 获取慢查询列表
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 返回数量限制
 *     responses:
 *       200:
 *         description: 慢查询列表
 */
router.get(
  '/slow-queries',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getSlowQueries
)

/**
 * @swagger
 * /api/performance/path-stats:
 *   get:
 *     summary: 获取路径性能统计
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 返回数量限制
 *     responses:
 *       200:
 *         description: 路径性能统计
 */
router.get(
  '/path-stats',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getPathStats
)

/**
 * @swagger
 * /api/performance/database:
 *   get:
 *     summary: 获取数据库性能概览
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 数据库性能概览
 */
router.get(
  '/database',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getDatabasePerformance
)

/**
 * @swagger
 * /api/performance/config:
 *   get:
 *     summary: 获取性能监控配置
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 性能监控配置
 */
router.get(
  '/config',
  authenticate,
  requirePermission('system', 'read'),
  performanceController.getConfig
)

/**
 * @swagger
 * /api/performance/config:
 *   put:
 *     summary: 更新性能监控配置
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slowRequestThreshold:
 *                 type: number
 *               slowQueryThreshold:
 *                 type: number
 *               enableDetailedLogging:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 配置更新成功
 */
router.put(
  '/config',
  authenticate,
  requirePermission('system', 'update'),
  performanceController.updateConfig
)

/**
 * @swagger
 * /api/performance/clear:
 *   delete:
 *     summary: 清除性能数据
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 数据清除成功
 */
router.delete(
  '/clear',
  authenticate,
  requirePermission('system', 'delete'),
  performanceController.clearData
)

export default router
