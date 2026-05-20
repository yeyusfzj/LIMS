// 条码生成工具

import { PrismaClient } from '@prisma/client'
import redisClient from '../config/redis'
import logger from '../config/logger'

const prisma = new PrismaClient()

// 分布式锁配置
const LOCK_TTL = 5000 // 锁的过期时间（毫秒）
const LOCK_RETRY_DELAY = 50 // 重试延迟（毫秒）
const MAX_RETRIES = 100 // 最大重试次数

/**
 * 获取分布式锁
 * @param lockKey 锁的键名
 * @param ttl 锁的过期时间（毫秒）
 * @returns 是否成功获取锁
 */
async function acquireLock(lockKey: string, ttl: number): Promise<boolean> {
  try {
    // 检查 Redis 是否已连接
    if (!redisClient.isReady) {
      logger.warn('Redis client not ready, skipping lock', { lockKey })
      return true // 如果 Redis 不可用，允许继续执行（回退到数据库唯一约束）
    }
    
    // 使用 SET NX EX 命令获取锁
    // NX: 只在键不存在时设置
    // PX: 设置过期时间（毫秒）
    const result = await redisClient.set(lockKey, '1', {
      NX: true,
      PX: ttl
    })
    return result === 'OK'
  } catch (error) {
    logger.error('Failed to acquire lock', { error, lockKey })
    // 如果 Redis 出错，允许继续执行（回退到数据库唯一约束）
    return true
  }
}

/**
 * 释放分布式锁
 * @param lockKey 锁的键名
 */
async function releaseLock(lockKey: string): Promise<void> {
  try {
    await redisClient.del(lockKey)
  } catch (error) {
    logger.error('Failed to release lock', { error, lockKey })
  }
}

/**
 * 使用分布式锁执行函数
 * @param lockKey 锁的键名
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  retryDelay: number = LOCK_RETRY_DELAY
): Promise<T> {
  let retries = 0
  
  while (retries < maxRetries) {
    // 尝试获取锁
    const acquired = await acquireLock(lockKey, LOCK_TTL)
    
    if (acquired) {
      try {
        // 执行函数
        const result = await fn()
        return result
      } finally {
        // 释放锁
        await releaseLock(lockKey)
      }
    }
    
    // 未获取到锁，等待后重试
    retries++
    if (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  throw new Error(`Failed to acquire lock after ${maxRetries} retries: ${lockKey}`)
}

/**
 * 生成唯一的样品条码
 * 格式: SP + YYYYMMDD + 6位序列号
 * 例如: SP202401150000001
 * 
 * 使用 Redis 分布式锁防止并发竞态条件
 */
export async function generateBarcode(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  const prefix = `SP${datePrefix}`
  
  // 使用分布式锁保护条码生成过程
  const lockKey = `barcode:lock:${datePrefix}`
  
  return await withLock(lockKey, async () => {
    // 查询今天已有的最大序列号
    const lastSample = await prisma.sample.findFirst({
      where: {
        barcode: {
          startsWith: prefix
        }
      },
      orderBy: {
        barcode: 'desc'
      }
    })
    
    let sequence = 1
    if (lastSample) {
      // 提取序列号并加1
      const lastSequence = parseInt(lastSample.barcode.slice(-6))
      sequence = lastSequence + 1
    }
    
    // 生成新条码
    const barcode = `${prefix}${String(sequence).padStart(6, '0')}`
    
    logger.debug('Generated barcode', { barcode, sequence })
    
    return barcode
  })
}

/**
 * 生成唯一的样品编号
 * 格式: 年份 + 6位序列号
 * 例如: 2024000001
 * 
 * 使用 Redis 分布式锁防止并发竞态条件
 */
export async function generateSampleNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = String(year)
  
  // 使用分布式锁保护样品编号生成过程
  const lockKey = `sample_number:lock:${year}`
  
  return await withLock(lockKey, async () => {
    // 查询今年已有的最大序列号
    const lastSample = await prisma.sample.findFirst({
      where: {
        sampleNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        sampleNumber: 'desc'
      }
    })
    
    let sequence = 1
    if (lastSample) {
      // 提取序列号并加1
      const lastSequence = parseInt(lastSample.sampleNumber.slice(-6))
      sequence = lastSequence + 1
    }
    
    // 生成新编号
    const sampleNumber = `${prefix}${String(sequence).padStart(6, '0')}`
    
    logger.debug('Generated sample number', { sampleNumber, sequence })
    
    return sampleNumber
  })
}

/**
 * 验证条码格式
 */
export function validateBarcode(barcode: string): boolean {
  // 格式: SP + 8位日期 + 6位序列号
  const pattern = /^SP\d{8}\d{6}$/
  return pattern.test(barcode)
}

/**
 * 验证样品编号格式
 */
export function validateSampleNumber(sampleNumber: string): boolean {
  // 格式: 4位年份 + 6位序列号
  const pattern = /^\d{4}\d{6}$/
  return pattern.test(sampleNumber)
}
