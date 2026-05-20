import dotenv from 'dotenv'
import { join } from 'path'

// 加载环境变量
dotenv.config({ path: join(__dirname, '../../.env') })

// 环境变量配置接口
interface EnvConfig {
  nodeEnv: string
  port: number
  databaseUrl: string
  redisHost: string
  redisPort: number
  redisPassword?: string
  jwtSecret: string
  jwtAccessExpiry: string
  jwtRefreshExpiry: string
  logLevel: string
  corsOrigins: string[]
  rateLimitWindowMs: number
  rateLimitMaxRequests: number
}

// 验证必需的环境变量
function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// 验证环境变量
validateEnv()

// 导出配置
export const config: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL!,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
  redisPassword: process.env.REDIS_PASSWORD,
  jwtSecret: process.env.JWT_SECRET!,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000')
}

export default config
