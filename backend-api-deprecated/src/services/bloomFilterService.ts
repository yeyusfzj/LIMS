import redisClient from '../config/redis'
import logger from '../config/logger'

/**
 * 布隆过滤器服务
 * 用于缓存穿透防护，快速判断数据是否可能存在
 * 
 * 注意：布隆过滤器可能产生假阳性（说存在但实际不存在），但不会产生假阴性
 */
class BloomFilterService {
  private readonly hashFunctions = 3 // 哈希函数数量
  private readonly bitSize = 1000000 // 位数组大小（约 122KB）

  /**
   * 添加元素到布隆过滤器
   * @param filterName 过滤器名称
   * @param value 要添加的值
   */
  async add(filterName: string, value: string): Promise<void> {
    try {
      const key = `bloom:${filterName}`
      const positions = this.getPositions(value)

      const pipeline = redisClient.multi()
      for (const pos of positions) {
        pipeline.setBit(key, pos, 1)
      }
      await pipeline.exec()
    } catch (error) {
      logger.error('Bloom filter add error', { filterName, error })
    }
  }

  /**
   * 批量添加元素
   * @param filterName 过滤器名称
   * @param values 要添加的值数组
   */
  async addBatch(filterName: string, values: string[]): Promise<void> {
    try {
      const key = `bloom:${filterName}`
      const pipeline = redisClient.multi()

      for (const value of values) {
        const positions = this.getPositions(value)
        for (const pos of positions) {
          pipeline.setBit(key, pos, 1)
        }
      }

      await pipeline.exec()
      logger.info(`Added ${values.length} items to bloom filter: ${filterName}`)
    } catch (error) {
      logger.error('Bloom filter batch add error', { filterName, error })
    }
  }

  /**
   * 检查元素是否可能存在
   * @param filterName 过滤器名称
   * @param value 要检查的值
   * @returns true 表示可能存在，false 表示一定不存在
   */
  async mightExist(filterName: string, value: string): Promise<boolean> {
    try {
      const key = `bloom:${filterName}`
      const positions = this.getPositions(value)

      // 检查所有位
      const results = await Promise.all(
        positions.map(pos => redisClient.getBit(key, pos))
      )

      // 所有位都为 1 才表示可能存在
      return results.every(bit => bit === 1)
    } catch (error) {
      logger.error('Bloom filter check error', { filterName, error })
      // 出错时返回 true，避免误判导致缓存穿透
      return true
    }
  }

  /**
   * 清除布隆过滤器
   * @param filterName 过滤器名称
   */
  async clear(filterName: string): Promise<void> {
    try {
      const key = `bloom:${filterName}`
      await redisClient.del(key)
      logger.info(`Cleared bloom filter: ${filterName}`)
    } catch (error) {
      logger.error('Bloom filter clear error', { filterName, error })
    }
  }

  /**
   * 计算元素的位位置
   * @param value 元素值
   * @returns 位位置数组
   */
  private getPositions(value: string): number[] {
    const positions: number[] = []

    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.hash(value, i)
      const position = hash % this.bitSize
      positions.push(position)
    }

    return positions
  }

  /**
   * 简单的哈希函数
   * @param value 要哈希的值
   * @param seed 种子值
   * @returns 哈希值
   */
  private hash(value: string, seed: number): number {
    let hash = seed

    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) & 0x7fffffff
    }

    return hash
  }

  /**
   * 初始化布隆过滤器
   * 从数据库加载现有数据
   */
  async initialize(filterName: string, loader: () => Promise<string[]>): Promise<void> {
    try {
      logger.info(`Initializing bloom filter: ${filterName}`)

      // 检查是否已经初始化
      const key = `bloom:${filterName}`
      const exists = await redisClient.exists(key)

      if (exists) {
        logger.info(`Bloom filter already initialized: ${filterName}`)
        return
      }

      // 加载数据
      const values = await loader()

      // 批量添加
      await this.addBatch(filterName, values)

      logger.info(`Bloom filter initialized with ${values.length} items: ${filterName}`)
    } catch (error) {
      logger.error('Bloom filter initialization error', { filterName, error })
    }
  }
}

export default new BloomFilterService()
