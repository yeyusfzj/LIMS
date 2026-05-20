import { Request, Response } from 'express'
import {
  getHealthStatus,
  getReadinessStatus
} from '../services/healthCheckService'
import logger from '../config/logger'

/**
 * 健康检查控制器
 * 提供健康检查和就绪检查端点
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 健康检查
 *     description: 返回服务的基本健康状态，不检查依赖服务
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 服务健康
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 uptime:
 *                   type: number
 *                   description: 服务运行时间（秒）
 *                   example: 3600
 *                 environment:
 *                   type: string
 *                   example: production
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                       description: 常驻集大小（字节）
 *                     heapTotal:
 *                       type: number
 *                       description: 堆总大小（字节）
 *                     heapUsed:
 *                       type: number
 *                       description: 已使用堆大小（字节）
 *                     external:
 *                       type: number
 *                       description: 外部内存使用（字节）
 */
export async function healthCheck(req: Request, res: Response): Promise<void> {
  try {
    const healthStatus = await getHealthStatus()
    res.status(200).json(healthStatus)
  } catch (error) {
    logger.error('Health check failed', { error })
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: 就绪检查
 *     description: 检查服务及其所有依赖服务（数据库、Redis）是否就绪
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 服务就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ready]
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ok, error]
 *                           example: ok
 *                         responseTime:
 *                           type: number
 *                           description: 响应时间（毫秒）
 *                           example: 15
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ok, error]
 *                           example: ok
 *                         responseTime:
 *                           type: number
 *                           description: 响应时间（毫秒）
 *                           example: 5
 *       503:
 *         description: 服务未就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [not_ready]
 *                   example: not_ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ok, error]
 *                         message:
 *                           type: string
 *                           description: 错误消息（如果有）
 *                         responseTime:
 *                           type: number
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [ok, error]
 *                         message:
 *                           type: string
 *                           description: 错误消息（如果有）
 *                         responseTime:
 *                           type: number
 */
export async function readinessCheck(req: Request, res: Response): Promise<void> {
  try {
    const readinessStatus = await getReadinessStatus()
    
    // 如果服务未就绪，返回 503 状态码
    const statusCode = readinessStatus.status === 'ready' ? 200 : 503
    
    res.status(statusCode).json(readinessStatus)
  } catch (error) {
    logger.error('Readiness check failed', { error })
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
