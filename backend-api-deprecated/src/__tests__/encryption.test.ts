/**
 * 加密工具测试
 * 测试密码哈希、数据加密/解密、敏感字段加密等功能
 */

import { EncryptionUtils, SignatureEncryption, ENCRYPTION_CONFIG } from '../utils/encryption'

describe('EncryptionUtils - 加密工具测试', () => {
  describe('密码哈希功能', () => {
    it('应该成功哈希密码', async () => {
      const password = 'TestPassword@123'
      const hash = await EncryptionUtils.hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('相同密码应该生成不同的哈希值（因为盐值不同）', async () => {
      const password = 'TestPassword@123'
      const hash1 = await EncryptionUtils.hashPassword(password)
      const hash2 = await EncryptionUtils.hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('应该成功验证正确的密码', async () => {
      const password = 'TestPassword@123'
      const hash = await EncryptionUtils.hashPassword(password)
      const isValid = await EncryptionUtils.verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('应该拒绝错误的密码', async () => {
      const password = 'TestPassword@123'
      const wrongPassword = 'WrongPassword@123'
      const hash = await EncryptionUtils.hashPassword(password)
      const isValid = await EncryptionUtils.verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })

    it('应该支持自定义成本因子', async () => {
      const password = 'TestPassword@123'
      const rounds = 10
      const hash = await EncryptionUtils.hashPassword(password, rounds)

      expect(hash).toBeDefined()
      const isValid = await EncryptionUtils.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })
  })

  describe('AES-256-GCM 数据加密功能', () => {
    it('应该成功加密数据', () => {
      const data = 'sensitive data 敏感数据'
      const encrypted = EncryptionUtils.encrypt(data)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(data)
      expect(encrypted.split(':').length).toBe(3) // iv:authTag:encryptedData
    })

    it('应该成功解密数据', () => {
      const data = 'sensitive data 敏感数据'
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('加密相同数据应该产生不同的密文（因为 IV 不同）', () => {
      const data = 'sensitive data'
      const encrypted1 = EncryptionUtils.encrypt(data)
      const encrypted2 = EncryptionUtils.encrypt(data)

      expect(encrypted1).not.toBe(encrypted2)
      
      // 但解密后应该相同
      expect(EncryptionUtils.decrypt(encrypted1)).toBe(data)
      expect(EncryptionUtils.decrypt(encrypted2)).toBe(data)
    })

    it('应该能够加密和解密空字符串', () => {
      const data = ''
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('应该能够加密和解密包含特殊字符的数据', () => {
      const data = '特殊字符: !@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('应该能够加密和解密长文本', () => {
      const data = 'A'.repeat(10000)
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('解密格式错误的数据应该抛出错误', () => {
      const invalidData = 'invalid:data'
      
      expect(() => {
        EncryptionUtils.decrypt(invalidData)
      }).toThrow('解密数据失败')
    })

    it('解密被篡改的数据应该抛出错误', () => {
      const data = 'sensitive data'
      const encrypted = EncryptionUtils.encrypt(data)
      
      // 篡改密文
      const parts = encrypted.split(':')
      parts[2] = parts[2].slice(0, -2) + 'ff'
      const tampered = parts.join(':')
      
      expect(() => {
        EncryptionUtils.decrypt(tampered)
      }).toThrow()
    })
  })

  describe('敏感字段加密功能', () => {
    it('应该成功加密敏感字段', () => {
      const value = '身份证号: 123456789012345678'
      const encrypted = EncryptionUtils.encryptSensitiveField(value)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(value)
    })

    it('应该成功解密敏感字段', () => {
      const value = '手机号: 13800138000'
      const encrypted = EncryptionUtils.encryptSensitiveField(value)
      const decrypted = EncryptionUtils.decryptSensitiveField(encrypted)

      expect(decrypted).toBe(value)
    })

    it('空值应该返回 null', () => {
      expect(EncryptionUtils.encryptSensitiveField(null)).toBeNull()
      expect(EncryptionUtils.encryptSensitiveField(undefined)).toBeNull()
      expect(EncryptionUtils.encryptSensitiveField('')).toBeNull()
      
      expect(EncryptionUtils.decryptSensitiveField(null)).toBeNull()
      expect(EncryptionUtils.decryptSensitiveField(undefined)).toBeNull()
      expect(EncryptionUtils.decryptSensitiveField('')).toBeNull()
    })

    it('应该批量加密敏感字段', () => {
      const data = {
        name: '张三',
        idCard: '123456789012345678',
        phone: '13800138000',
        email: 'test@example.com'
      }

      const encrypted = EncryptionUtils.encryptSensitiveFields(data, ['idCard', 'phone'])

      expect(encrypted.name).toBe(data.name)
      expect(encrypted.email).toBe(data.email)
      expect(encrypted.idCard).not.toBe(data.idCard)
      expect(encrypted.phone).not.toBe(data.phone)
    })

    it('应该批量解密敏感字段', () => {
      const data = {
        name: '张三',
        idCard: '123456789012345678',
        phone: '13800138000',
        email: 'test@example.com'
      }

      const encrypted = EncryptionUtils.encryptSensitiveFields(data, ['idCard', 'phone'])
      const decrypted = EncryptionUtils.decryptSensitiveFields(encrypted, ['idCard', 'phone'])

      expect(decrypted).toEqual(data)
    })
  })

  describe('签名数据加密功能', () => {
    it('应该成功加密签名数据', () => {
      const signatureData = 'digital signature data'
      const encrypted = SignatureEncryption.encrypt(signatureData)

      expect(encrypted).toBeDefined()
      expect(encrypted).not.toBe(signatureData)
      expect(encrypted.split(':').length).toBe(3)
    })

    it('应该成功解密签名数据', () => {
      const signatureData = 'digital signature data'
      const encrypted = SignatureEncryption.encrypt(signatureData)
      const decrypted = SignatureEncryption.decrypt(encrypted)

      expect(decrypted).toBe(signatureData)
    })
  })

  describe('工具函数', () => {
    it('应该生成随机密钥', () => {
      const key1 = EncryptionUtils.generateKey()
      const key2 = EncryptionUtils.generateKey()

      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
      expect(key1).not.toBe(key2)
      expect(key1.length).toBe(ENCRYPTION_CONFIG.KEY_LENGTH * 2) // 十六进制
    })

    it('应该生成随机 IV', () => {
      const iv1 = EncryptionUtils.generateIV()
      const iv2 = EncryptionUtils.generateIV()

      expect(iv1).toBeDefined()
      expect(iv2).toBeDefined()
      expect(iv1).not.toBe(iv2)
      expect(iv1.length).toBe(ENCRYPTION_CONFIG.IV_LENGTH * 2) // 十六进制
    })

    it('应该计算数据哈希', () => {
      const data = 'test data'
      const hash = EncryptionUtils.hash(data)

      expect(hash).toBeDefined()
      expect(hash.length).toBe(64) // SHA-256 产生 64 个十六进制字符
    })

    it('相同数据应该产生相同的哈希', () => {
      const data = 'test data'
      const hash1 = EncryptionUtils.hash(data)
      const hash2 = EncryptionUtils.hash(data)

      expect(hash1).toBe(hash2)
    })

    it('应该验证数据完整性', () => {
      const data = 'test data'
      const hash = EncryptionUtils.hash(data)
      const isValid = EncryptionUtils.verifyHash(data, hash)

      expect(isValid).toBe(true)
    })

    it('篡改数据应该验证失败', () => {
      const data = 'test data'
      const hash = EncryptionUtils.hash(data)
      const tamperedData = 'tampered data'
      const isValid = EncryptionUtils.verifyHash(tamperedData, hash)

      expect(isValid).toBe(false)
    })

    it('应该解析加密数据结构', () => {
      const data = 'test data'
      const encrypted = EncryptionUtils.encrypt(data)
      const parsed = EncryptionUtils.parseEncryptedData(encrypted)

      expect(parsed).toHaveProperty('iv')
      expect(parsed).toHaveProperty('authTag')
      expect(parsed).toHaveProperty('encrypted')
      expect(parsed.iv).toBeDefined()
      expect(parsed.authTag).toBeDefined()
      expect(parsed.encrypted).toBeDefined()
    })
  })

  describe('边界情况和错误处理', () => {
    it('加密非常长的数据', () => {
      const data = 'A'.repeat(100000)
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('加密包含 Unicode 字符的数据', () => {
      const data = '中文 日本語 한국어 العربية עברית 🎉🎊'
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)

      expect(decrypted).toBe(data)
    })

    it('加密 JSON 数据', () => {
      const data = JSON.stringify({
        name: '张三',
        age: 30,
        hobbies: ['reading', 'coding'],
        address: {
          city: '北京',
          street: '长安街'
        }
      })
      
      const encrypted = EncryptionUtils.encrypt(data)
      const decrypted = EncryptionUtils.decrypt(encrypted)
      const parsed = JSON.parse(decrypted)

      expect(parsed.name).toBe('张三')
      expect(parsed.age).toBe(30)
      expect(parsed.hobbies).toEqual(['reading', 'coding'])
    })
  })
})
