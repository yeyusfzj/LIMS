import { PrismaClient } from '@prisma/client'
import logger from './logger'

// 数据库连接池配置
const connectionPoolConfig = {
  // 连接池大小配置
  connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
  pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '30'),
  
  // 连接超时配置（秒）
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
  
  // 语句超时配置（毫秒）
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000')
}

// 构建数据库 URL（包含连接池参数）
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || ''
  const params = new URLSearchParams({
    connection_limit: connectionPoolConfig.connection_limit.toString(),
    pool_timeout: connectionPoolConfig.pool_timeout.toString(),
    connect_timeout: connectionPoolConfig.connect_timeout.toString(),
    statement_timeout: connectionPoolConfig.statement_timeout.toString()
  })
  
  // 如果 URL 已包含参数，追加新参数；否则添加参数
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${params.toString()}`
}

// 创建 Prisma 客户端实例
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: buildDatabaseUrl()
    }
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
})

// 监听查询事件，记录慢查询
prisma.$on('query', (e: any) => {
  if (e.duration > 1000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params
    })
  }
})

// 监听错误事件
prisma.$on('error', (e: any) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target
  })
})

// 监听警告事件
prisma.$on('warn', (e: any) => {
  logger.warn('Database warning', {
    message: e.message
  })
})

// 测试数据库连接
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Failed to connect to database', { error })
    throw error
  }
}

// 断开数据库连接
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('Database disconnected')
  } catch (error) {
    logger.error('Failed to disconnect from database', { error })
  }
}

export default prisma
