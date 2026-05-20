import { Router } from 'express'
import * as queueController from '../controllers/queueController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有队列管理接口都需要认证和管理员权限
router.use(authenticate)
router.use(requirePermission('queue', 'manage'))

/**
 * 获取任务状态
 * GET /api/queue/jobs/:jobId
 */
router.get('/jobs/:jobId', queueController.getJobStatus)

/**
 * 获取队列统计信息
 * GET /api/queue/:queueType/stats
 */
router.get('/:queueType/stats', queueController.getQueueStats)

/**
 * 获取队列中的任务列表
 * GET /api/queue/:queueType/jobs
 */
router.get('/:queueType/jobs', queueController.getJobs)

/**
 * 重试失败的任务
 * POST /api/queue/jobs/:jobId/retry
 */
router.post('/jobs/:jobId/retry', queueController.retryJob)

/**
 * 删除任务
 * DELETE /api/queue/jobs/:jobId
 */
router.delete('/jobs/:jobId', queueController.removeJob)

/**
 * 清空队列
 * POST /api/queue/:queueType/clean
 */
router.post('/:queueType/clean', queueController.cleanQueue)

export default router
