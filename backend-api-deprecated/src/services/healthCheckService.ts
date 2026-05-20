import prisma from '../config/database'
import redisClient from '../config/redis'
import logger from '../config/logger'

/**
 * 健康检查服务
 * 提供系统健康状态和就绪状态检查
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  environment: string
  memory: NodeJS.MemoryUsage
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready'
  timestamp: string
  checks: {
    database: CheckResult
    redis: CheckResult
  }
}

export interface CheckResult {
  status: 'ok' | 'error'
  message?: string
  responseTime?: number
}

/**
 * 检查数据库连接
 */
export async function checkDatabaseConnection(): Promise<CheckResult> {
  const startTime = Date.now()
  
  try {
    // 执行简单查询测试连接
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'ok',
      responseTime
    }
  } catch (error) {
    logger.error('Database health check failed', { error })
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * 检查 Redis 连接
 */
export async function checkRedisConnection(): Promise<CheckResult> {
  const startTime = Date.now()
  
  try {
    // 执行 PING 命令测试连接
    const response = await redisClient.ping()
    
    const responseTime = Date.now() - startTime
    
    if (response === 'PONG') {
      return {
        status: 'ok',
        responseTime
      }
    } else {
      return {
        status: 'error',
        message: 'Unexpected ping response',
        responseTime
      }
    }
  } catch (error) {
    logger.error('Redis health check failed', { error })
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * 获取系统健康状态
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage()
  }
}

/**
 * 获取系统就绪状态
 * 检查所有依赖服务是否可用
 */
export async function getReadinessStatus(): Promise<ReadinessStatus> {
  // 并行检查所有依赖服务
  const [databaseCheck, redisCheck] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection()
  ])
  
  // 判断整体就绪状态
  const isReady = databaseCheck.status === 'ok' && redisCheck.status === 'ok'
  
  return {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseCheck,
      redis: redisCheck
    }
  }
}
