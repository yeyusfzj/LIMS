import { Router } from 'express'
import { healthCheck, readinessCheck } from '../controllers/healthCheckController'

const router = Router()

/**
 * 健康检查路由
 * 这些端点不需要认证，用于监控和负载均衡器
 */

// GET /health - 基本健康检查
router.get('/health', healthCheck)

// GET /ready - 就绪检查（包含依赖服务检查）
router.get('/ready', readinessCheck)

export default router
