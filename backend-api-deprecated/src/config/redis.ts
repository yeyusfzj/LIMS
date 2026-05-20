import { createClient } from 'redis'
import logger from './logger'

// 创建 Redis 客户端
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD || undefined
})

// 监听连接事件
redisClient.on('connect', () => {
  logger.info('Redis client connecting...')
})

redisClient.on('ready', () => {
  logger.info('Redis client connected successfully')
})

redisClient.on('error', (error) => {
  logger.error('Redis client error', { error: error.message })
})

redisClient.on('end', () => {
  logger.info('Redis client disconnected')
})

// 连接 Redis
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect()
  } catch (error) {
    logger.error('Failed to connect to Redis', { error })
    throw error
  }
}

// 断开 Redis 连接
export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.quit()
  } catch (error) {
    logger.error('Failed to disconnect from Redis', { error })
  }
}

export default redisClient
