import { Request, Response, NextFunction } from 'express'
import cacheService from '../services/cacheService'
import logger from '../config/logger'

/**
 * 缓存中间件选项
 */
interface CacheMiddlewareOptions {
  /** 缓存键前缀 */
  prefix?: string
  /** 过期时间（秒） */
  ttl?: number
  /** 是否缓存（可以是函数） */
  condition?: boolean | ((req: Request) => boolean)
  /** 缓存键生成函数 */
  keyGenerator?: (req: Request) => string
}

/**
 * 生成默认缓存键
 */
function generateDefaultKey(req: Request, prefix: string = 'api'): string {
  const { method, path, query } = req
  const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : ''
  return `${prefix}:${method}:${path}:${queryString}`
}

/**
 * API 响应缓存中间件
 * 缓存 GET 请求的响应结果
 * 
 * @example
 * router.get('/users', cacheMiddleware({ ttl: 300 }), userController.list)
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    prefix = 'api',
    ttl = 300,
    condition = true,
    keyGenerator
  } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    // 只缓存 GET 请求
    if (req.method !== 'GET') {
      return next()
    }

    // 检查缓存条件
    const shouldCache = typeof condition === 'function' ? condition(req) : condition
    if (!shouldCache) {
      return next()
    }

    try {
      // 生成缓存键
      const cacheKey = keyGenerator ? keyGenerator(req) : generateDefaultKey(req, prefix)

      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey)
      if (cached !== null) {
        logger.debug('API cache hit', { key: cacheKey })
        return res.json(cached)
      }

      // 缓存未命中，拦截响应
      const originalJson = res.json.bind(res)
      res.json = function (data: any) {
        // 异步写入缓存（不阻塞响应）
        cacheService.set(cacheKey, data, ttl).catch(error => {
          logger.error('Failed to cache API response', { key: cacheKey, error })
        })

        // 返回原始响应
        return originalJson(data)
      }

      next()
    } catch (error) {
      logger.error('Cache middleware error', { error })
      next()
    }
  }
}

/**
 * 缓存失效中间件
 * 在写操作后自动删除相关缓存
 * 
 * @example
 * router.post('/users', cacheEvictMiddleware({ pattern: 'api:GET:/api/users:*' }), userController.create)
 */
export function cacheEvictMiddleware(options: { pattern: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 拦截响应
    const originalJson = res.json.bind(res)
    res.json = function (data: any) {
      // 异步删除缓存（不阻塞响应）
      cacheService.delPattern(options.pattern).catch(error => {
        logger.error('Failed to evict cache', { pattern: options.pattern, error })
      })

      // 返回原始响应
      return originalJson(data)
    }

    next()
  }
}

/**
 * 条件缓存中间件
 * 根据用户权限或其他条件决定是否缓存
 */
export function conditionalCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return cacheMiddleware({
    ...options,
    condition: (req: Request) => {
      // 不缓存已认证用户的个人数据
      if (req.path.includes('/me') || req.path.includes('/profile')) {
        return false
      }

      // 不缓存包含敏感查询参数的请求
      const sensitiveParams = ['password', 'token', 'secret']
      const hasSensitiveParam = Object.keys(req.query).some(key =>
        sensitiveParams.some(param => key.toLowerCase().includes(param))
      )
      if (hasSensitiveParam) {
        return false
      }

      return true
    }
  })
}
