# 电子签名管理功能

## 概述

电子签名管理模块实现了报告的电子签名功能，包括签名身份验证、签名数据加密存储、报告锁定机制、签名撤销和重签等核心功能。

## 功能特性

### 1. 签名身份验证（需求 15.1）

- 验证签名人员的身份和权限
- 检查用户是否具有指定角色的签名权限
- 确保只有授权人员才能签名

### 2. 签名数据加密存储（需求 15.2）

- 使用 AES-256-GCM 算法加密签名数据
- 加密格式：`iv:authTag:encryptedData`
- 确保签名数据的安全性和不可篡改性

### 3. 报告锁定机制（需求 15.3, 15.4）

- 签名后更新报告状态
- 所有必需签名完成后自动锁定报告
- 已签名的报告不允许修改
- 已分发或已回收的报告不能签名

### 4. 签名撤销和重签（需求 15.5）

- 支持签名人本人或管理员撤销签名
- 撤销签名后报告状态回退
- 记录撤销操作的审计日志
- 撤销后可以重新签名

## API 端点

### 签名报告

```http
POST /api/reports/:reportId/sign
Content-Type: application/json
Authorization: Bearer <token>

{
  "signatureData": "base64-encoded-signature-data",
  "signerRole": "检测员"
}
```

### 验证签名

```http
GET /api/reports/:reportId/signatures/:signatureId/verify
Authorization: Bearer <token>
```

### 撤销签名

```http
DELETE /api/reports/:reportId/signatures/:signatureId
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "撤销原因"
}
```

### 获取报告的所有签名

```http
GET /api/reports/:reportId/signatures
Authorization: Bearer <token>
```

### 获取签名详情

```http
GET /api/signatures/:signatureId
Authorization: Bearer <token>
```

## 数据模型

### Signature 模型

```typescript
interface Signature {
  id: string
  reportId: string
  signerId: string
  signerName: string
  signerRole: string
  signatureData: string // 加密的签名数据
  signedAt: Date
}
```

## 加密配置

### 环境变量

```env
SIGNATURE_ENCRYPTION_KEY=your-32-character-encryption-key
```

**重要提示：** 生产环境必须配置此环境变量，密钥长度必须为 32 字节。

### 加密算法

- 算法：AES-256-GCM
- IV 长度：16 字节
- Auth Tag 长度：16 字节

## 签名流程

### 1. 签名报告流程

```
1. 验证报告是否存在
2. 验证报告状态（不能是已签名、已分发或已回收）
3. 验证签名人员身份和权限
4. 检查该角色是否已经签名
5. 加密签名数据
6. 创建签名记录
7. 更新报告状态
8. 检查是否所有必需签名都已完成
9. 如果签名完成，锁定报告
```

### 2. 撤销签名流程

```
1. 验证签名是否存在
2. 验证报告状态（不能是已分发或已回收）
3. 验证权限（只有签名人本人或管理员可以撤销）
4. 删除签名记录
5. 更新报告状态
6. 记录审计日志
```

## 签名完成条件

当前实现：需要至少 2 个签名才算完成。

实际应用中可以根据报告类型配置不同的签名要求，例如：
- 检测员签名
- 审核员签名
- 批准人签名

## 安全考虑

1. **加密存储**：所有签名数据使用 AES-256-GCM 加密存储
2. **身份验证**：严格验证签名人员的身份和权限
3. **权限控制**：只有授权人员才能签名和撤销签名
4. **审计追踪**：记录所有签名和撤销操作
5. **报告锁定**：签名完成后自动锁定报告，防止篡改

## 测试覆盖

单元测试覆盖以下场景：

- ✅ 成功签名报告
- ✅ 拒绝对不存在的报告签名
- ✅ 拒绝用户没有权限的角色签名
- ✅ 拒绝重复签名同一角色
- ✅ 成功验证有效签名
- ✅ 拒绝不存在的签名
- ✅ 拒绝签名与报告不匹配
- ✅ 成功撤销签名
- ✅ 拒绝撤销不存在的签名
- ✅ 返回报告的所有签名
- ✅ 签名后报告状态更新
- ✅ 拒绝修改已签名的报告
- ✅ 签名数据加密存储

## 使用示例

### 签名报告

```typescript
import signatureService from './services/signatureService'

// 签名报告
const signature = await signatureService.signReport(
  {
    reportId: 'report-id',
    signatureData: 'base64-signature-data',
    signerRole: '检测员'
  },
  userId
)
```

### 验证签名

```typescript
// 验证签名
const result = await signatureService.verifySignature({
  reportId: 'report-id',
  signatureId: 'signature-id'
})

if (result.valid) {
  console.log('签名有效')
} else {
  console.log('签名无效:', result.error)
}
```

### 撤销签名

```typescript
// 撤销签名
await signatureService.revokeSignature(
  {
    reportId: 'report-id',
    signatureId: 'signature-id',
    reason: '需要重新签名'
  },
  userId
)
```

## 未来改进

1. **签名配置**：支持根据报告类型配置不同的签名要求
2. **签名顺序**：支持配置签名的顺序要求
3. **签名提醒**：自动提醒相关人员进行签名
4. **签名证书**：支持数字证书签名
5. **签名验证**：增强签名验证机制，支持更多验证方式
