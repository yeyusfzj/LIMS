import rateLimit from 'express-rate-limit'
import { config } from '../config/env'

/**
 * 全局速率限制中间件
 * 限制所有 API 请求的频率
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 时间窗口（默认 15 分钟）
  max: config.rateLimitMaxRequests, // 最大请求数（默认 1000）
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试'
    }
  },
  standardHeaders: true, // 返回 RateLimit-* 标准头
  legacyHeaders: false, // 禁用 X-RateLimit-* 旧版头
  skipSuccessfulRequests: false, // 计数所有请求（包括成功的）
  skipFailedRequests: false // 计数所有请求（包括失败的）
})

/**
 * 登录接口专用速率限制中间件
 * 开发环境下禁用限流，生产环境可根据需要启用
 */
export const loginRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 小时（极长时间窗口）
  max: 999999, // 极高的限制次数，实际上不会触发
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的登录不计入限制
  skipFailedRequests: false,
  // 自定义错误处理器（基本不会被触发）
  handler: (req, res) => {
    // 计算剩余等待时间（秒）
    const windowMs = 24 * 60 * 60 * 1000 // 24小时
    const now = Date.now()
    const resetTime = req.rateLimit?.resetTime || (now + windowMs)
    const retryAfterSeconds = Math.ceil((resetTime - now) / 1000)
    
    // 设置Retry-After响应头
    res.set('Retry-After', retryAfterSeconds.toString())
    
    // 生成友好的错误消息，包含具体等待时间
    const hours = Math.ceil(retryAfterSeconds / 3600)
    const friendlyMessage = `登录尝试次数过多，请等待 ${hours} 小时后再试。为了账户安全，系统已暂时限制登录功能。`
    
    // 返回增强的错误响应
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: friendlyMessage,
        retryAfter: retryAfterSeconds,
        retryAfterMinutes: Math.ceil(retryAfterSeconds / 60),
        suggestion: '请稍后再试，或检查您的用户名和密码是否正确。'
      }
    })
  }
})

/**
 * 敏感操作速率限制中间件
 * 用于密码重置、修改权限等敏感操作
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 最多 10 次
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '敏感操作过于频繁，请稍后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 数据导出速率限制中间件
 * 防止大量数据导出影响系统性能
 */
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 20, // 最多 20 次
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '数据导出过于频繁，请稍后再试'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * 创建自定义速率限制中间件
 * @param windowMs 时间窗口（毫秒）
 * @param max 最大请求数
 * @param message 错误消息
 * @returns 速率限制中间件
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  message: string = '请求过于频繁，请稍后再试'
) {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  })
}
