/**
 * 数据加密工具模块
 * 提供密码哈希、数据加密/解密、敏感字段加密等功能
 * 验证需求: 15.2, 24.4
 */

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import logger from '../config/logger'

/**
 * 加密配置
 */
export const ENCRYPTION_CONFIG = {
  // AES-256-GCM 算法配置
  ALGORITHM: 'aes-256-gcm' as const,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  KEY_LENGTH: 32,
  
  // bcrypt 配置
  BCRYPT_ROUNDS: 12,
  
  // 环境变量键名
  ENCRYPTION_KEY_ENV: 'ENCRYPTION_KEY',
  SIGNATURE_KEY_ENV: 'SIGNATURE_ENCRYPTION_KEY'
}

/**
 * 加密结果接口
 */
export interface EncryptedData {
  iv: string
  authTag: string
  encrypted: string
}

/**
 * 加密工具类
 */
export class EncryptionUtils {
  /**
   * 获取加密密钥
   * 优先从环境变量获取，如果不存在则使用默认值（仅用于开发环境）
   */
  private static getEncryptionKey(envKey: string = ENCRYPTION_CONFIG.ENCRYPTION_KEY_ENV): Buffer {
    const key = process.env[envKey]
    
    if (!key) {
      logger.warn(`未配置 ${envKey}，使用默认密钥（仅用于开发环境）`)
      // 默认密钥（32字节）- 生产环境必须配置环境变量
      return Buffer.from('12345678901234567890123456789012')
    }
    
    // 确保密钥长度为32字节
    return Buffer.from(key.padEnd(ENCRYPTION_CONFIG.KEY_LENGTH, '0').slice(0, ENCRYPTION_CONFIG.KEY_LENGTH))
  }

  /**
   * 使用 AES-256-GCM 加密数据
   * @param data 要加密的数据
   * @param envKey 环境变量键名（可选）
   * @returns 加密后的数据，格式: iv:authTag:encryptedData
   */
  static encrypt(data: string, envKey?: string): string {
    try {
      const key = this.getEncryptionKey(envKey)
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH)
      const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv)

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      const authTag = cipher.getAuthTag()

      // 返回格式: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    } catch (error: any) {
      logger.error('加密数据失败', { error: error.message })
      throw new Error('加密数据失败')
    }
  }

  /**
   * 使用 AES-256-GCM 解密数据
   * @param encryptedData 加密的数据，格式: iv:authTag:encryptedData
   * @param envKey 环境变量键名（可选）
   * @returns 解密后的数据
   */
  static decrypt(encryptedData: string, envKey?: string): string {
    try {
      const key = this.getEncryptionKey(envKey)
      const parts = encryptedData.split(':')

      if (parts.length !== 3) {
        throw new Error('加密数据格式错误')
      }

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]

      const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error: any) {
      logger.error('解密数据失败', { error: error.message })
      throw new Error('解密数据失败')
    }
  }

  /**
   * 解析加密数据为结构化对象
   * @param encryptedData 加密的数据
   * @returns 解析后的加密数据对象
   */
  static parseEncryptedData(encryptedData: string): EncryptedData {
    const parts = encryptedData.split(':')
    
    if (parts.length !== 3) {
      throw new Error('加密数据格式错误')
    }

    return {
      iv: parts[0],
      authTag: parts[1],
      encrypted: parts[2]
    }
  }

  /**
   * 使用 bcrypt 哈希密码
   * @param password 明文密码
   * @param rounds 成本因子（可选，默认12）
   * @returns 哈希后的密码
   */
  static async hashPassword(password: string, rounds: number = ENCRYPTION_CONFIG.BCRYPT_ROUNDS): Promise<string> {
    try {
      return await bcrypt.hash(password, rounds)
    } catch (error: any) {
      logger.error('密码哈希失败', { error: error.message })
      throw new Error('密码哈希失败')
    }
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hash 哈希后的密码
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error: any) {
      logger.error('密码验证失败', { error: error.message })
      throw new Error('密码验证失败')
    }
  }

  /**
   * 加密敏感字段
   * 用于加密数据库中的敏感字段（如身份证号、手机号等）
   * @param value 要加密的值
   * @returns 加密后的值，如果输入为空则返回空
   */
  static encryptSensitiveField(value: string | null | undefined): string | null {
    if (!value) {
      return null
    }
    
    try {
      return this.encrypt(value)
    } catch (error: any) {
      logger.error('敏感字段加密失败', { error: error.message })
      throw new Error('敏感字段加密失败')
    }
  }

  /**
   * 解密敏感字段
   * @param encryptedValue 加密的值
   * @returns 解密后的值，如果输入为空则返回空
   */
  static decryptSensitiveField(encryptedValue: string | null | undefined): string | null {
    if (!encryptedValue) {
      return null
    }
    
    try {
      return this.decrypt(encryptedValue)
    } catch (error: any) {
      logger.error('敏感字段解密失败', { error: error.message })
      throw new Error('敏感字段解密失败')
    }
  }

  /**
   * 批量加密敏感字段
   * @param fields 要加密的字段对象
   * @returns 加密后的字段对象
   */
  static encryptSensitiveFields<T extends Record<string, any>>(
    fields: T,
    sensitiveKeys: (keyof T)[]
  ): T {
    const result = { ...fields }
    
    for (const key of sensitiveKeys) {
      if (result[key] && typeof result[key] === 'string') {
        result[key] = this.encryptSensitiveField(result[key] as string) as any
      }
    }
    
    return result
  }

  /**
   * 批量解密敏感字段
   * @param fields 加密的字段对象
   * @param sensitiveKeys 需要解密的字段键名数组
   * @returns 解密后的字段对象
   */
  static decryptSensitiveFields<T extends Record<string, any>>(
    fields: T,
    sensitiveKeys: (keyof T)[]
  ): T {
    const result = { ...fields }
    
    for (const key of sensitiveKeys) {
      if (result[key] && typeof result[key] === 'string') {
        result[key] = this.decryptSensitiveField(result[key] as string) as any
      }
    }
    
    return result
  }

  /**
   * 生成随机密钥
   * @param length 密钥长度（字节）
   * @returns 十六进制格式的密钥
   */
  static generateKey(length: number = ENCRYPTION_CONFIG.KEY_LENGTH): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * 生成随机 IV
   * @returns 十六进制格式的 IV
   */
  static generateIV(): string {
    return crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH).toString('hex')
  }

  /**
   * 计算数据的哈希值（用于完整性校验）
   * @param data 要计算哈希的数据
   * @param algorithm 哈希算法（默认 sha256）
   * @returns 十六进制格式的哈希值
   */
  static hash(data: string | Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }

  /**
   * 验证数据完整性
   * @param data 原始数据
   * @param hash 哈希值
   * @param algorithm 哈希算法（默认 sha256）
   * @returns 是否匹配
   */
  static verifyHash(data: string | Buffer, hash: string, algorithm: string = 'sha256'): boolean {
    const calculatedHash = this.hash(data, algorithm)
    return calculatedHash === hash
  }
}

/**
 * 签名数据加密工具
 * 专门用于电子签名数据的加密，使用独立的环境变量配置
 */
export class SignatureEncryption {
  /**
   * 加密签名数据
   * @param data 签名数据
   * @returns 加密后的签名数据
   */
  static encrypt(data: string): string {
    return EncryptionUtils.encrypt(data, ENCRYPTION_CONFIG.SIGNATURE_KEY_ENV)
  }

  /**
   * 解密签名数据
   * @param encryptedData 加密的签名数据
   * @returns 解密后的签名数据
   */
  static decrypt(encryptedData: string): string {
    return EncryptionUtils.decrypt(encryptedData, ENCRYPTION_CONFIG.SIGNATURE_KEY_ENV)
  }
}

// 导出默认实例
export default EncryptionUtils
