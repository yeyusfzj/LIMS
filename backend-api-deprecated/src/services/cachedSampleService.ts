/**
 * 带缓存的样品服务示例
 * 展示如何在服务中集成缓存功能
 */

import { Sample } from '@prisma/client'
import prisma from '../config/database'
import cacheService from './cacheService'
import bloomFilterService from './bloomFilterService'
import logger from '../config/logger'

/**
 * 缓存键前缀
 */
const CACHE_PREFIX = {
  SAMPLE: 'sample',
  SAMPLE_BARCODE: 'sample:barcode',
  SAMPLE_LIST: 'sample:list'
}

/**
 * 缓存 TTL（秒）
 */
const CACHE_TTL = {
  SAMPLE: 300,        // 5 分钟
  SAMPLE_LIST: 60,    // 1 分钟
  SAMPLE_BARCODE: 300 // 5 分钟
}

export class CachedSampleService {
  /**
   * 获取样品详情（带缓存）
   */
  async getSample(id: string): Promise<Sample | null> {
    try {
      // 1. 使用布隆过滤器快速判断是否存在
      const mightExist = await bloomFilterService.mightExist('samples', id)
      if (!mightExist) {
        logger.debug('Sample does not exist (bloom filter)', { id })
        return null
      }

      // 2. 使用 Cache-Aside 模式
      const cacheKey = `${CACHE_PREFIX.SAMPLE}:${id}`
      
      return await cacheService.getOrLoad<Sample>(
        cacheKey,
        async () => {
          // 从数据库加载
          const sample = await prisma.sample.findUnique({
            where: { id },
            include: {
              testItems: true,
              results: true,
              transfers: {
                orderBy: { transferDate: 'desc' }
              },
              auditTasks: {
                orderBy: { submittedAt: 'desc' }
              },
              qualityJudgment: true,
              reports: true,
              parentSample: true,
              childSamples: true
            }
          })

          return sample
        },
        CACHE_TTL.SAMPLE
      )
    } catch (error) {
      logger.error('Failed to get sample with cache', { error, id })
      throw error
    }
  }

  /**
   * 通过条码获取样品（带缓存）
   */
  async getSampleByBarcode(barcode: string): Promise<Sample | null> {
    try {
      const cacheKey = `${CACHE_PREFIX.SAMPLE_BARCODE}:${barcode}`
      
      return await cacheService.getOrLoad<Sample>(
        cacheKey,
        async () => {
          const sample = await prisma.sample.findUnique({
            where: { barcode },
            include: {
              testItems: true,
              results: true,
              transfers: {
                orderBy: { transferDate: 'desc' }
              }
            }
          })

          return sample
        },
        CACHE_TTL.SAMPLE_BARCODE
      )
    } catch (error) {
      logger.error('Failed to get sample by barcode with cache', { error, barcode })
      throw error
    }
  }

  /**
   * 批量获取样品（带缓存）
   */
  async getSamplesBatch(ids: string[]): Promise<(Sample | null)[]> {
    try {
      // 1. 生成缓存键
      const cacheKeys = ids.map(id => `${CACHE_PREFIX.SAMPLE}:${id}`)

      // 2. 批量从缓存获取
      const cachedSamples = await cacheService.mget<Sample>(cacheKeys)

      // 3. 找出缓存未命中的 ID
      const missedIds: string[] = []
      const missedIndexes: number[] = []

      cachedSamples.forEach((sample, index) => {
        if (sample === null) {
          missedIds.push(ids[index])
          missedIndexes.push(index)
        }
      })

      // 4. 从数据库加载缓存未命中的数据
      if (missedIds.length > 0) {
        const samples = await prisma.sample.findMany({
          where: { id: { in: missedIds } },
          include: {
            testItems: true,
            results: true
          }
        })

        // 5. 写入缓存
        const cacheItems = samples.map(sample => ({
          key: `${CACHE_PREFIX.SAMPLE}:${sample.id}`,
          value: sample
        }))
        await cacheService.mset(cacheItems, CACHE_TTL.SAMPLE)

        // 6. 填充结果数组
        const sampleMap = new Map(samples.map(s => [s.id, s]))
        missedIndexes.forEach((index, i) => {
          const sample = sampleMap.get(missedIds[i])
          cachedSamples[index] = sample || null
        })
      }

      return cachedSamples
    } catch (error) {
      logger.error('Failed to get samples batch with cache', { error, ids })
      throw error
    }
  }

  /**
   * 更新样品（自动失效缓存）
   */
  async updateSample(id: string, data: any): Promise<Sample> {
    try {
      // 1. 更新数据库
      const sample = await prisma.sample.update({
        where: { id },
        data
      })

      // 2. 删除相关缓存
      await this.evictSampleCache(id, sample.barcode)

      logger.info('Sample updated and cache evicted', { id })

      return sample
    } catch (error) {
      logger.error('Failed to update sample', { error, id })
      throw error
    }
  }

  /**
   * 删除样品缓存
   */
  async evictSampleCache(id: string, barcode?: string): Promise<void> {
    try {
      const keysToDelete = [
        `${CACHE_PREFIX.SAMPLE}:${id}`
      ]

      if (barcode) {
        keysToDelete.push(`${CACHE_PREFIX.SAMPLE_BARCODE}:${barcode}`)
      }

      // 删除样品详情缓存
      await cacheService.del(keysToDelete)

      // 删除列表缓存
      await cacheService.delPattern(`${CACHE_PREFIX.SAMPLE_LIST}:*`)

      logger.debug('Sample cache evicted', { id, barcode })
    } catch (error) {
      logger.error('Failed to evict sample cache', { error, id })
    }
  }

  /**
   * 预热样品缓存
   */
  async warmupSampleCache(ids: string[]): Promise<void> {
    try {
      const samples = await prisma.sample.findMany({
        where: { id: { in: ids } },
        include: {
          testItems: true,
          results: true
        }
      })

      const cacheItems = samples.map(sample => ({
        key: `${CACHE_PREFIX.SAMPLE}:${sample.id}`,
        value: sample
      }))

      await cacheService.mset(cacheItems, CACHE_TTL.SAMPLE)

      logger.info(`Warmed up cache for ${samples.length} samples`)
    } catch (error) {
      logger.error('Failed to warmup sample cache', { error })
    }
  }
}

export default new CachedSampleService()
