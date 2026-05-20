# 安全中间件使用指南

本文档介绍实验室管理系统后端 API 的安全中间件配置和使用方法。

## 概述

系统实现了多层安全防护机制，包括：

1. **Helmet 安全头** - 设置 HTTP 安全头防止常见 Web 漏洞
2. **CORS 配置** - 控制跨域资源共享
3. **速率限制** - 防止 API 滥用和暴力破解
4. **请求验证** - 验证和清洗输入数据
5. **文件上传安全** - 验证文件类型和大小

## 1. Helmet 安全头

### 配置位置

`src/config/security.ts` 中的 `helmetConfig`

### 主要安全头

- **Content-Security-Policy (CSP)** - 防止 XSS 攻击
- **X-Frame-Options** - 防止点击劫持
- **Strict-Transport-Security (HSTS)** - 强制使用 HTTPS
- **X-Content-Type-Options** - 防止 MIME 类型嗅探
- **Referrer-Policy** - 控制 Referer 头信息泄露

### 使用示例

```typescript
import helmet from 'helmet'
import { helmetConfig } from './config/security'

app.use(helmet(helmetConfig))
```

## 2. CORS 配置

### 配置位置

`src/config/security.ts` 中的 `corsConfig`

### 主要特性

- 动态源验证
- 支持凭证（cookies）
- 预检请求缓存
- 自定义暴露的响应头

### 环境变量配置

```env
# 允许的跨域源（逗号分隔）
CORS_ORIGINS=http://localhost:5173,https://app.example.com
```

### 使用示例

```typescript
import cors from 'cors'
import { corsConfig } from './config/security'

app.use(cors(corsConfig))
```

## 3. 速率限制

### 配置位置

`src/middleware/rateLimitMiddleware.ts`

### 预定义限制器

#### 全局速率限制

```typescript
import { globalRateLimiter } from './middleware/rateLimitMiddleware'

app.use(globalRateLimiter)
```

- 时间窗口：15 分钟
- 最大请求数：1000

#### 登录接口限制

```typescript
import { loginRateLimiter } from './middleware/rateLimitMiddleware'

app.post('/api/auth/login', loginRateLimiter, authController.login)
```

- 时间窗口：15 分钟
- 最大请求数：5

#### 敏感操作限制

```typescript
import { sensitiveOperationLimiter } from './middleware/rateLimitMiddleware'

app.post('/api/users/:id/reset-password', 
  sensitiveOperationLimiter, 
  userController.resetPassword
)
```

- 时间窗口：1 小时
- 最大请求数：10

#### 数据导出限制

```typescript
import { exportRateLimiter } from './middleware/rateLimitMiddleware'

app.post('/api/statistics/export', 
  exportRateLimiter, 
  statisticsController.exportData
)
```

- 时间窗口：1 小时
- 最大请求数：20

### 自定义速率限制

```typescript
import { createRateLimiter } from './middleware/rateLimitMiddleware'

const customLimiter = createRateLimiter(
  60 * 1000,  // 1 分钟
  10,         // 最多 10 次
  '自定义错误消息'
)

app.post('/api/custom-endpoint', customLimiter, controller.handler)
```

## 4. 请求验证

### 配置位置

`src/middleware/validationMiddleware.ts`

### 基本使用

#### 验证请求体

```typescript
import { validate } from './middleware/validationMiddleware'
import Joi from 'joi'

const createUserSchema = Joi.object({
  username: Joi.string().required().min(3).max(50),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(8)
})

app.post('/api/users', 
  validate(createUserSchema, 'body'),
  userController.create
)
```

#### 验证查询参数

```typescript
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20)
})

app.get('/api/users', 
  validate(querySchema, 'query'),
  userController.list
)
```

#### 验证路径参数

```typescript
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
})

app.get('/api/users/:id', 
  validate(idParamSchema, 'params'),
  userController.getById
)
```

### 验证多个位置

```typescript
import { validateMultiple } from './middleware/validationMiddleware'

app.put('/api/users/:id',
  validateMultiple({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }),
    body: Joi.object({
      username: Joi.string().min(3).max(50),
      email: Joi.string().email()
    })
  }),
  userController.update
)
```

### 通用验证规则

```typescript
import { commonSchemas } from './middleware/validationMiddleware'

// UUID 验证
app.get('/api/samples/:id',
  validate(commonSchemas.idParam, 'params'),
  sampleController.getById
)

// 分页验证
app.get('/api/samples',
  validate(commonSchemas.pagination, 'query'),
  sampleController.list
)

// 日期范围验证
app.get('/api/reports',
  validate(commonSchemas.dateRange, 'query'),
  reportController.list
)
```

## 5. 输入清洗

### 自动清洗

系统自动清洗所有请求数据，防止 XSS 攻击：

```typescript
import { sanitizeMiddleware } from './middleware/validationMiddleware'

app.use(sanitizeMiddleware)
```

### 清洗规则

- 移除 `<script>` 标签
- 移除所有 HTML 标签
- 去除首尾空格

### 手动清洗

```typescript
import { sanitizeInput } from './middleware/validationMiddleware'

const cleanData = sanitizeInput(userInput)
```

## 6. 文件上传安全

### 配置位置

`src/middleware/fileUploadMiddleware.ts`

### 单文件上传（磁盘存储）

```typescript
import { uploadSingleFile } from './middleware/fileUploadMiddleware'

app.post('/api/upload',
  uploadSingleFile('file'),
  uploadController.handleUpload
)
```

### 多文件上传（磁盘存储）

```typescript
import { uploadMultipleFiles } from './middleware/fileUploadMiddleware'

app.post('/api/upload-multiple',
  uploadMultipleFiles('files', 5),  // 最多 5 个文件
  uploadController.handleMultipleUpload
)
```

### 单文件上传（内存存储）

用于临时处理文件（如数据导入）：

```typescript
import { uploadSingleFileToMemory } from './middleware/fileUploadMiddleware'

app.post('/api/results/import',
  uploadSingleFileToMemory('file'),
  resultController.importData
)
```

### 文件类型限制

系统只允许以下文件类型：

- **数据文件**: CSV, Excel (.xls, .xlsx), XML
- **文档**: PDF
- **图片**: JPEG, PNG, GIF

### 文件大小限制

- 默认最大文件大小：50MB
- 可在 `src/config/security.ts` 中的 `bodySizeConfig.fileUpload` 修改

### 文件验证

```typescript
import { validateFileType } from './config/security'

if (!validateFileType(file.mimetype, file.originalname)) {
  throw new Error('不支持的文件类型')
}
```

## 7. 密码安全

### 密码复杂度要求

- 最小长度：8 个字符
- 必须包含大写字母
- 必须包含小写字母
- 必须包含数字
- 必须包含特殊字符

### 验证密码复杂度

```typescript
import { validatePasswordComplexity } from './config/security'

const result = validatePasswordComplexity(password)
if (!result.valid) {
  return res.status(400).json({
    error: {
      code: 'WEAK_PASSWORD',
      message: '密码不符合复杂度要求',
      details: { errors: result.errors }
    }
  })
}
```

### 密码哈希

```typescript
import bcrypt from 'bcrypt'

const passwordHash = await bcrypt.hash(password, 12)
```

## 8. 错误响应格式

所有验证错误使用统一的响应格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "邮箱格式不正确"
        },
        {
          "field": "age",
          "message": "年龄必须大于 0"
        }
      ]
    },
    "timestamp": "2024-03-10T10:00:00.000Z",
    "path": "/api/users"
  }
}
```

## 9. 环境变量配置

### 必需的环境变量

```env
# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/lims

# JWT 密钥
JWT_SECRET=your-secret-key-here

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 可选的环境变量

```env
# 环境
NODE_ENV=production

# 端口
PORT=3000

# JWT 过期时间
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# 日志级别
LOG_LEVEL=info

# CORS 源
CORS_ORIGINS=https://app.example.com,https://admin.example.com

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## 10. 安全最佳实践

### 生产环境配置

1. **使用强密钥**
   ```env
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **启用 HTTPS**
   - 配置 SSL/TLS 证书
   - 强制重定向 HTTP 到 HTTPS

3. **限制 CORS 源**
   ```env
   CORS_ORIGINS=https://app.example.com
   ```

4. **配置适当的速率限制**
   - 根据实际流量调整限制值
   - 为不同端点设置不同的限制

5. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

### 开发环境配置

1. **使用宽松的 CORS 配置**
   ```env
   CORS_ORIGINS=http://localhost:5173
   ```

2. **降低速率限制**
   ```env
   RATE_LIMIT_MAX_REQUESTS=10000
   ```

3. **启用详细日志**
   ```env
   LOG_LEVEL=debug
   ```

## 11. 测试

运行安全中间件测试：

```bash
npm run test:run -- src/__tests__/securityMiddleware.test.ts
```

测试覆盖：
- Helmet 安全头设置
- CORS 配置
- 请求验证
- 输入清洗
- 密码复杂度验证
- 文件类型验证

## 12. 故障排除

### CORS 错误

**问题**: 浏览器报告 CORS 错误

**解决方案**:
1. 检查 `CORS_ORIGINS` 环境变量是否包含前端域名
2. 确保前端请求包含正确的 `Origin` 头
3. 检查是否需要 `credentials: true`

### 速率限制触发

**问题**: 正常请求被速率限制拦截

**解决方案**:
1. 增加 `RATE_LIMIT_MAX_REQUESTS` 值
2. 为特定端点使用自定义速率限制
3. 考虑使用基于 IP 的白名单

### 文件上传失败

**问题**: 文件上传被拒绝

**解决方案**:
1. 检查文件类型是否在允许列表中
2. 检查文件大小是否超过限制
3. 确保文件扩展名与 MIME 类型匹配

### 验证错误

**问题**: 请求数据验证失败

**解决方案**:
1. 检查验证规则是否正确
2. 查看错误响应中的详细信息
3. 确保前端发送的数据格式正确

## 总结

本系统实现了全面的安全防护机制，包括：

✅ HTTP 安全头配置（Helmet）
✅ 跨域资源共享控制（CORS）
✅ 多级速率限制
✅ 请求数据验证和清洗
✅ 文件上传安全验证
✅ 密码复杂度要求
✅ 统一的错误响应格式

通过正确配置和使用这些安全中间件，可以有效防止常见的 Web 安全漏洞，保护系统和用户数据安全。
