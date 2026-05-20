# 数据加密使用指南

本指南介绍实验室管理系统后端 API 中的数据加密功能，包括密码哈希、数据加密/解密和敏感字段加密。

## 概述

系统提供了完整的数据加密解决方案，确保敏感数据的安全存储和传输：

- **密码哈希**：使用 bcrypt 算法（成本因子 12）
- **数据加密**：使用 AES-256-GCM 算法
- **签名数据加密**：使用独立密钥的 AES-256-GCM 加密
- **敏感字段加密**：支持单个和批量字段加密

## 环境配置

### 必需的环境变量

在生产环境中，必须配置以下环境变量：

```env
# 通用数据加密密钥（32字节）
ENCRYPTION_KEY=your-32-byte-encryption-key-here

# 签名数据专用加密密钥（32字节）
SIGNATURE_ENCRYPTION_KEY=your-signature-encryption-key
```

### 生成安全密钥

使用以下方法生成安全的加密密钥：

```typescript
import { EncryptionUtils } from './utils/encryption'

// 生成 32 字节密钥
const key = EncryptionUtils.generateKey(32)
console.log('ENCRYPTION_KEY=' + key)

// 生成签名密钥
const signatureKey = EncryptionUtils.generateKey(32)
console.log('SIGNATURE_ENCRYPTION_KEY=' + signatureKey)
```

或使用命令行：

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 功能使用

### 1. 密码哈希

#### 哈希密码

```typescript
import { EncryptionUtils } from './utils/encryption'

// 使用默认成本因子（12）
const password = 'UserPassword@123'
const hash = await EncryptionUtils.hashPassword(password)

// 使用自定义成本因子
const hash = await EncryptionUtils.hashPassword(password, 10)
```

#### 验证密码

```typescript
const password = 'UserPassword@123'
const hash = '...' // 从数据库获取的哈希值

const isValid = await EncryptionUtils.verifyPassword(password, hash)
if (isValid) {
  console.log('密码正确')
} else {
  console.log('密码错误')
}
```

### 2. 数据加密和解密

#### 加密数据

```typescript
import { EncryptionUtils } from './utils/encryption'

const sensitiveData = '这是需要加密的敏感数据'
const encrypted = EncryptionUtils.encrypt(sensitiveData)

// 加密后的格式: iv:authTag:encryptedData
console.log(encrypted)
// 输出示例: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
```

#### 解密数据

```typescript
const encrypted = 'iv:authTag:encryptedData'
const decrypted = EncryptionUtils.decrypt(encrypted)

console.log(decrypted) // 输出原始数据
```

### 3. 敏感字段加密

#### 单个字段加密

```typescript
import { EncryptionUtils } from './utils/encryption'

// 加密身份证号
const idCard = '123456789012345678'
const encryptedIdCard = EncryptionUtils.encryptSensitiveField(idCard)

// 解密身份证号
const decryptedIdCard = EncryptionUtils.decryptSensitiveField(encryptedIdCard)
```

#### 批量字段加密

```typescript
// 定义包含敏感字段的对象
const userData = {
  name: '张三',
  idCard: '123456789012345678',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  address: '北京市朝阳区'
}

// 加密指定字段
const encryptedData = EncryptionUtils.encryptSensitiveFields(
  userData,
  ['idCard', 'phone', 'address']
)

// 结果：
// {
//   name: '张三',
//   idCard: 'iv:authTag:encrypted...',
//   phone: 'iv:authTag:encrypted...',
//   email: 'zhangsan@example.com',
//   address: 'iv:authTag:encrypted...'
// }

// 解密指定字段
const decryptedData = EncryptionUtils.decryptSensitiveFields(
  encryptedData,
  ['idCard', 'phone', 'address']
)
```

### 4. 签名数据加密

签名数据使用独立的加密密钥，确保更高的安全性：

```typescript
import { SignatureEncryption } from './utils/encryption'

// 加密签名数据
const signatureData = 'digital signature content'
const encrypted = SignatureEncryption.encrypt(signatureData)

// 解密签名数据
const decrypted = SignatureEncryption.decrypt(encrypted)
```

### 5. 数据完整性校验

#### 计算哈希值

```typescript
import { EncryptionUtils } from './utils/encryption'

const data = 'important data'
const hash = EncryptionUtils.hash(data)

// 使用不同的哈希算法
const sha512Hash = EncryptionUtils.hash(data, 'sha512')
```

#### 验证数据完整性

```typescript
const data = 'important data'
const hash = EncryptionUtils.hash(data)

// 验证数据是否被篡改
const isValid = EncryptionUtils.verifyHash(data, hash)
if (isValid) {
  console.log('数据完整，未被篡改')
} else {
  console.log('数据已被篡改')
}
```

## 在服务中使用

### 示例：用户服务中的密码处理

```typescript
import { EncryptionUtils } from '../utils/encryption'
import prisma from '../config/database'

export class UserService {
  // 创建用户
  async createUser(data: CreateUserDto) {
    // 哈希密码
    const passwordHash = await EncryptionUtils.hashPassword(data.password)
    
    // 加密敏感字段
    const encryptedData = EncryptionUtils.encryptSensitiveFields(data, [
      'idCard',
      'phone'
    ])
    
    const user = await prisma.user.create({
      data: {
        ...encryptedData,
        passwordHash
      }
    })
    
    return user
  }
  
  // 验证用户登录
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username }
    })
    
    if (!user) {
      throw new Error('用户不存在')
    }
    
    // 验证密码
    const isValid = await EncryptionUtils.verifyPassword(
      password,
      user.passwordHash
    )
    
    if (!isValid) {
      throw new Error('密码错误')
    }
    
    return user
  }
  
  // 获取用户详情（解密敏感字段）
  async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      throw new Error('用户不存在')
    }
    
    // 解密敏感字段
    const decryptedUser = EncryptionUtils.decryptSensitiveFields(user, [
      'idCard',
      'phone'
    ])
    
    return decryptedUser
  }
}
```

### 示例：样品服务中的敏感信息加密

```typescript
import { EncryptionUtils } from '../utils/encryption'
import prisma from '../config/database'

export class SampleService {
  // 创建样品（加密客户联系方式）
  async createSample(data: CreateSampleDto) {
    const encryptedData = EncryptionUtils.encryptSensitiveFields(data, [
      'clientContact',
      'samplingPerson'
    ])
    
    const sample = await prisma.sample.create({
      data: encryptedData
    })
    
    return sample
  }
  
  // 获取样品详情（解密敏感信息）
  async getSampleDetail(sampleId: string) {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId }
    })
    
    if (!sample) {
      throw new Error('样品不存在')
    }
    
    // 解密敏感字段
    const decryptedSample = EncryptionUtils.decryptSensitiveFields(sample, [
      'clientContact',
      'samplingPerson'
    ])
    
    return decryptedSample
  }
}
```

## 安全最佳实践

### 1. 密钥管理

- ✅ **生产环境必须使用环境变量配置密钥**
- ✅ **定期轮换加密密钥**
- ✅ **使用密钥管理服务（如 AWS KMS、Azure Key Vault）**
- ❌ **不要将密钥硬编码在代码中**
- ❌ **不要将密钥提交到版本控制系统**

### 2. 密码策略

- ✅ **使用 bcrypt 成本因子 12 或更高**
- ✅ **强制密码复杂度要求**
- ✅ **实施密码历史策略**
- ✅ **限制登录失败次数**

### 3. 数据加密

- ✅ **对所有敏感数据进行加密**
- ✅ **使用 AES-256-GCM 提供认证加密**
- ✅ **每次加密使用新的 IV（初始化向量）**
- ✅ **验证解密后的认证标签**

### 4. 传输安全

- ✅ **强制使用 HTTPS/TLS 1.3**
- ✅ **配置安全的 CORS 策略**
- ✅ **实施 API 速率限制**
- ✅ **记录所有安全事件**

## 性能考虑

### bcrypt 性能

bcrypt 是计算密集型算法，成本因子越高，计算时间越长：

- 成本因子 10：约 100ms
- 成本因子 12：约 400ms（推荐）
- 成本因子 14：约 1600ms

建议：
- 在用户注册和密码修改时使用成本因子 12
- 在测试环境可以使用较低的成本因子（10）以加快测试速度

### AES-256-GCM 性能

AES-256-GCM 是硬件加速的对称加密算法，性能优秀：

- 加密/解密速度：约 1-2ms（1KB 数据）
- 适合加密大量数据
- 支持流式加密

建议：
- 对频繁访问的加密数据使用缓存
- 批量操作时使用批量加密/解密方法
- 考虑在数据库层面使用透明数据加密（TDE）

## 故障排查

### 常见错误

#### 1. "未配置 ENCRYPTION_KEY"

**原因**：环境变量未配置

**解决方案**：
```bash
# 在 .env 文件中添加
ENCRYPTION_KEY=your-32-byte-key-here
```

#### 2. "加密数据格式错误"

**原因**：尝试解密格式不正确的数据

**解决方案**：
- 确保加密数据格式为 `iv:authTag:encryptedData`
- 检查数据是否在存储或传输过程中被截断

#### 3. "解密数据失败"

**原因**：
- 使用了错误的密钥
- 数据被篡改
- 数据损坏

**解决方案**：
- 确认使用正确的环境变量
- 检查数据完整性
- 查看日志获取详细错误信息

#### 4. "密码验证失败"

**原因**：
- 密码不正确
- 哈希值损坏
- bcrypt 版本不兼容

**解决方案**：
- 确认密码输入正确
- 检查数据库中的哈希值完整性
- 确保 bcrypt 库版本一致

## 测试

运行加密功能测试：

```bash
# 运行所有加密测试
npm test -- encryption.test.ts

# 运行特定测试
npm test -- encryption.test.ts -t "密码哈希"
```

## 相关文档

- [安全设计文档](../design.md#安全设计)
- [API 安全指南](./API_SECURITY.md)
- [环境配置指南](./ENVIRONMENT_CONFIG.md)

## 参考资料

- [bcrypt 算法](https://en.wikipedia.org/wiki/Bcrypt)
- [AES-GCM 加密模式](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [OWASP 密码存储备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP 加密存储备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
