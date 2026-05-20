import cacheService from '../services/cacheService'
import logger from '../config/logger'

/**
 * 缓存装饰器选项
 */
interface CacheOptions {
  /** 缓存键前缀 */
  prefix?: string
  /** 过期时间（秒） */
  ttl?: number
  /** 缓存键生成函数 */
  keyGenerator?: (...args: any[]) => string
}

/**
 * 缓存装饰器
 * 自动为方法添加缓存功能
 * 
 * @example
 * class UserService {
 *   @Cacheable({ prefix: 'user', ttl: 300 })
 *   async getUser(id: string) {
 *     return await prisma.user.findUnique({ where: { id } })
 *   }
 * }
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const prefix = options.prefix || target.constructor.name
    const ttl = options.ttl || 300

    descriptor.value = async function (...args: any[]) {
      try {
        // 生成缓存键
        const cacheKey = options.keyGenerator
          ? `${prefix}:${options.keyGenerator(...args)}`
          : `${prefix}:${propertyKey}:${JSON.stringify(args)}`

        // 尝试从缓存获取
        const cached = await cacheService.get(cacheKey)
        if (cached !== null) {
          logger.debug('Cache hit', { key: cacheKey })
          return cached
        }

        // 检查空值缓存
        if (await cacheService.isNull(cacheKey)) {
          logger.debug('Cache hit (null)', { key: cacheKey })
          return null
        }

        // 缓存未命中，执行原方法
        logger.debug('Cache miss', { key: cacheKey })
        const result = await originalMethod.apply(this, args)

        // 写入缓存
        if (result !== null && result !== undefined) {
          await cacheService.set(cacheKey, result, ttl)
        } else {
          // 缓存空值，防止缓存穿透
          await cacheService.setNull(cacheKey, 60)
        }

        return result
      } catch (error) {
        logger.error('Cache decorator error', { error })
        // 缓存失败时直接执行原方法
        return await originalMethod.apply(this, args)
      }
    }

    return descriptor
  }
}

/**
 * 缓存失效装饰器
 * 方法执行后自动删除相关缓存
 * 
 * @example
 * class UserService {
 *   @CacheEvict({ prefix: 'user', keyGenerator: (id) => id })
 *   async updateUser(id: string, data: any) {
 *     return await prisma.user.update({ where: { id }, data })
 *   }
 * }
 */
export function CacheEvict(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const prefix = options.prefix || target.constructor.name

    descriptor.value = async function (...args: any[]) {
      try {
        // 执行原方法
        const result = await originalMethod.apply(this, args)

        // 删除缓存
        if (options.keyGenerator) {
          const cacheKey = `${prefix}:${options.keyGenerator(...args)}`
          await cacheService.del(cacheKey)
          logger.debug('Cache evicted', { key: cacheKey })
        } else {
          // 删除所有匹配前缀的缓存
          await cacheService.delPattern(`${prefix}:*`)
          logger.debug('Cache pattern evicted', { pattern: `${prefix}:*` })
        }

        return result
      } catch (error) {
        logger.error('Cache evict decorator error', { error })
        throw error
      }
    }

    return descriptor
  }
}

/**
 * 缓存预热装饰器
 * 在方法执行后将结果写入缓存
 * 
 * @example
 * class ConfigService {
 *   @CachePut({ prefix: 'config', ttl: 3600 })
 *   async loadConfig() {
 *     return await loadConfigFromFile()
 *   }
 * }
 */
export function CachePut(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const prefix = options.prefix || target.constructor.name
    const ttl = options.ttl || 300

    descriptor.value = async function (...args: any[]) {
      try {
        // 执行原方法
        const result = await originalMethod.apply(this, args)

        // 写入缓存
        const cacheKey = options.keyGenerator
          ? `${prefix}:${options.keyGenerator(...args)}`
          : `${prefix}:${propertyKey}:${JSON.stringify(args)}`

        if (result !== null && result !== undefined) {
          await cacheService.set(cacheKey, result, ttl)
          logger.debug('Cache put', { key: cacheKey })
        }

        return result
      } catch (error) {
        logger.error('Cache put decorator error', { error })
        throw error
      }
    }

    return descriptor
  }
}
