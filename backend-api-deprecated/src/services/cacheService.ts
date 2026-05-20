import redisClient from '../config/redis'
import logger from '../config/logger'

/**
 * 缓存服务
 * 提供统一的缓存操作接口，支持多种缓存策略
 */
class CacheService {
  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值（JSON 解析后）或 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key)
      if (!value) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Cache get error', { key, error })
      return null
    }
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认 300 秒（5 分钟）
   */
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      await redisClient.setEx(key, ttl, serialized)
    } catch (error) {
      logger.error('Cache set error', { key, error })
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键或键数组
   */
  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await redisClient.del(key)
        }
      } else {
        await redisClient.del(key)
      }
    } catch (error) {
      logger.error('Cache delete error', { key, error })
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Cache exists error', { key, error })
      return false
    }
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await redisClient.expire(key, ttl)
    } catch (error) {
      logger.error('Cache expire error', { key, error })
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param key 缓存键
   * @returns 剩余秒数，-1 表示永不过期，-2 表示不存在
   */
  async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key)
    } catch (error) {
      logger.error('Cache ttl error', { key, error })
      return -2
    }
  }

  /**
   * 批量删除匹配模式的缓存键
   * @param pattern 匹配模式（如 "user:*"）
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern)
      if (keys.length > 0) {
        await redisClient.del(keys)
      }
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error })
    }
  }

  /**
   * 缓存穿透防护：缓存空值
   * @param key 缓存键
   * @param ttl 过期时间（秒），默认 60 秒
   */
  async setNull(key: string, ttl: number = 60): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, 'null')
    } catch (error) {
      logger.error('Cache set null error', { key, error })
    }
  }

  /**
   * 检查是否为空值缓存
   * @param key 缓存键
   * @returns 是否为空值
   */
  async isNull(key: string): Promise<boolean> {
    try {
      const value = await redisClient.get(key)
      return value === 'null'
    } catch (error) {
      logger.error('Cache is null error', { key, error })
      return false
    }
  }

  /**
   * Cache-Aside 模式：获取或加载
   * @param key 缓存键
   * @param loader 数据加载函数
   * @param ttl 过期时间（秒）
   * @returns 数据
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T | null>,
    ttl: number = 300
  ): Promise<T | null> {
    try {
      // 1. 尝试从缓存获取
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // 2. 检查是否为空值缓存
      if (await this.isNull(key)) {
        return null
      }

      // 3. 缓存未命中，加载数据
      const data = await loader()

      // 4. 写入缓存
      if (data !== null) {
        await this.set(key, data, ttl)
      } else {
        // 缓存空值，防止缓存穿透
        await this.setNull(key, 60)
      }

      return data
    } catch (error) {
      logger.error('Cache get or load error', { key, error })
      // 缓存失败时直接返回加载的数据
      return await loader()
    }
  }

  /**
   * 批量获取缓存
   * @param keys 缓存键数组
   * @returns 缓存值数组
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) {
        return []
      }
      const values = await redisClient.mGet(keys)
      return values.map(value => {
        if (!value || value === 'null') {
          return null
        }
        try {
          return JSON.parse(value) as T
        } catch {
          return null
        }
      })
    } catch (error) {
      logger.error('Cache mget error', { keys, error })
      return keys.map(() => null)
    }
  }

  /**
   * 批量设置缓存
   * @param items 键值对数组
   * @param ttl 过期时间（秒）
   */
  async mset(items: Array<{ key: string; value: any }>, ttl: number = 300): Promise<void> {
    try {
      const pipeline = redisClient.multi()
      for (const item of items) {
        const serialized = JSON.stringify(item.value)
        pipeline.setEx(item.key, ttl, serialized)
      }
      await pipeline.exec()
    } catch (error) {
      logger.error('Cache mset error', { error })
    }
  }

  /**
   * 增加计数器
   * @param key 缓存键
   * @param increment 增量，默认 1
   * @returns 增加后的值
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    try {
      return await redisClient.incrBy(key, increment)
    } catch (error) {
      logger.error('Cache incr error', { key, error })
      return 0
    }
  }

  /**
   * 减少计数器
   * @param key 缓存键
   * @param decrement 减量，默认 1
   * @returns 减少后的值
   */
  async decr(key: string, decrement: number = 1): Promise<number> {
    try {
      return await redisClient.decrBy(key, decrement)
    } catch (error) {
      logger.error('Cache decr error', { key, error })
      return 0
    }
  }
}

export default new CacheService()
