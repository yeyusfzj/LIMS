import app from './app'
import { config } from './config/env'
import logger from './config/logger'
import { connectDatabase, disconnectDatabase } from './config/database'
import { connectRedis, disconnectRedis } from './config/redis'
import { closeQueues } from './config/queue'
import { startWorkers } from './workers'
import assignmentEngine from './services/assignmentEngine'
import cacheWarmupService from './services/cacheWarmupService'
import bloomFilterService from './services/bloomFilterService'
import { setupDatabasePerformanceMonitoring } from './middleware/performanceMonitorMiddleware'
import prisma from './config/database'
import { initUploadDirectories } from './utils/initUploadDirs'

// 启动服务器
async function startServer(): Promise<void> {
  try {
    // 初始化上传目录
    logger.info('Initializing upload directories...')
    initUploadDirectories()

    // 连接数据库
    logger.info('Connecting to database...')
    await connectDatabase()

    // 连接 Redis
    logger.info('Connecting to Redis...')
    await connectRedis()

    // 启动队列 workers
    logger.info('Starting queue workers...')
    startWorkers()

    // 初始化派工引擎
    logger.info('Initializing assignment engine...')
    await assignmentEngine.initialize()

    // 执行缓存预热
    logger.info('Warming up cache...')
    await cacheWarmupService.warmup()

    // 初始化布隆过滤器
    logger.info('Initializing bloom filters...')
    await bloomFilterService.initialize('samples', async () => {
      const samples = await prisma.sample.findMany({
        select: { id: true }
      })
      return samples.map(s => s.id)
    })

    await bloomFilterService.initialize('users', async () => {
      const users = await prisma.user.findMany({
        select: { id: true }
      })
      return users.map(u => u.id)
    })

    // 设置数据库性能监控
    logger.info('Setting up database performance monitoring...')
    setupDatabasePerformanceMonitoring()

    // 启动 HTTP 服务器
    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`)
      logger.info(`Environment: ${config.nodeEnv}`)
      logger.info(`Health check: http://localhost:${config.port}/health`)
      logger.info(`API Documentation: http://localhost:${config.port}/api-docs`)
    })

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`)

      server.close(async () => {
        logger.info('HTTP server closed')

        // 关闭队列
        await closeQueues()

        // 断开数据库连接
        await disconnectDatabase()

        // 断开 Redis 连接
        await disconnectRedis()

        logger.info('All connections closed, exiting process')
        process.exit(0)
      })

      // 强制关闭超时
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout')
        process.exit(1)
      }, 10000)
    }

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack })
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise })
      process.exit(1)
    })

  } catch (error) {
    logger.error('Failed to start server', { error })
    process.exit(1)
  }
}

// 启动应用
startServer()
