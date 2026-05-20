# 后端分层架构详解

## 概述

实验室管理系统后端采用**经典的分层架构模式**,实现了清晰的关注点分离和高度的可维护性。本文档详细说明了各层的职责、实现和交互方式。

## 整体架构图

```
┌─────────────────────────────────────────┐
│         API Gateway / Load Balancer     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Controller Layer (路由层)        │
│  - 请求验证                              │
│  - 参数解析                              │
│  - 响应格式化                            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Service Layer (业务逻辑层)       │
│  - 业务规则实现                          │
│  - 工作流引擎                            │
│  - 事务管理                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository Layer (数据访问层)       │
│  - 数据库操作                            │
│  - 缓存管理                              │
│  - 查询优化                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Layer (数据层)              │
│  PostgreSQL  │  Redis  │  File Storage  │
└─────────────────────────────────────────┘
```

## 详细分层说明

### 1. 入口层 (Entry Layer)

**目录**: `src/main.ts`, `src/app.ts`

**职责**:
- 应用启动和初始化
- 服务器配置和监听
- 全局中间件注册
- 路由挂载
- Swagger API 文档配置

**关键代码**:
```typescript
// main.ts - 应用启动
const app = express()
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})

// app.ts - 中间件和路由配置
app.use(helmet(helmetConfig))
app.use(cors(corsConfig))
app.use('/api', apiRoutes)
```

---

### 2. 中间件层 (Middleware Layer)

**目录**: `src/middleware/`

#### 核心中间件分类

##### 安全中间件
- **helmet** - 设置安全 HTTP 头
- **cors** - 跨域资源共享控制
- **sanitizeMiddleware** - XSS 防护和输入清洗
- **fileUploadMiddleware** - 文件上传安全控制

##### 认证授权
- **authMiddleware.ts** - JWT 令牌验证
- **permissionMiddleware.ts** - 基于角色的访问控制 (RBAC)

##### 限流保护
- **rateLimitMiddleware.ts** - API 速率限制,防止滥用

##### 审计监控
- **auditLogMiddleware.ts** - 记录关键操作日志
- **performanceMonitorMiddleware.ts** - 请求性能追踪
- **requestLogger.ts** - 请求日志记录

##### 并发控制
- **concurrencyMiddleware.ts** - 处理并发冲突
- **cacheMiddleware.ts** - 响应缓存

##### 错误处理
- **errorHandler.ts** - 统一错误处理和响应格式化
- **validationMiddleware.ts** - 请求参数验证

#### 中间件执行顺序

```
请求 
  → 安全中间件 (Helmet, CORS, 压缩)
  → 全局限流
  → 请求日志
  → 性能监控
  → 审计日志
  → 路由匹配
  → 认证中间件 (JWT验证)
  → 权限中间件 (RBAC检查)
  → 参数验证
  → 控制器
  → 响应
  → 错误处理
```

---

### 3. 路由层 (Route Layer)

**目录**: `src/routes/`

**职责**:
- 定义 RESTful API 端点
- 路由参数解析
- 调用验证器
- 调用控制器方法
- 应用路由级中间件

**示例**:
```typescript
// sampleRoutes.ts
router.post('/', 
  authenticate,                           // 认证
  requirePermission('sample', 'create'),  // 权限
  validate(createSampleSchema),           // 验证
  sampleController.createSample           // 控制器
)
```

**路由模块**:
- `authRoutes.ts` - 认证相关
- `sampleRoutes.ts` - 样品管理
- `workflowRoutes.ts` - 工作流管理
- `taskRoutes.ts` - 任务管理
- `resultRoutes.ts` - 检测结果
- `auditRoutes.ts` - 审核管理
- `reportRoutes.ts` - 报告管理
- `statisticsRoutes.ts` - 统计分析
- `userRoutes.ts` - 用户管理
- `roleRoutes.ts` - 角色管理
- `permissionRoutes.ts` - 权限管理
- `auditLogRoutes.ts` - 审计日志
- `backupRoutes.ts` - 数据备份
- `queueRoutes.ts` - 队列管理
- `performanceRoutes.ts` - 性能监控
- `methodRoutes.ts` - 检测方法

---

### 4. 验证层 (Validation Layer)

**目录**: `src/validators/`

**工具**: 使用 `Joi` 库进行数据验证

**职责**:
- 请求参数类型验证
- 数据格式校验
- 业务规则前置检查
- 生成友好的错误消息

**示例**:
```typescript
// sampleValidator.ts
export const createSampleSchema = Joi.object({
  clientName: Joi.string().required().min(1).max(200).messages({
    'string.empty': '客户名称不能为空',
    'any.required': '客户名称是必填项'
  }),
  sampleName: Joi.string().required().min(1).max(200),
  quantity: Joi.number().required().positive(),
  unit: Joi.string().required().min(1).max(20),
  // ...
})
```

**验证器模块**:
- `sampleValidator.ts` - 样品数据验证
- `userValidator.ts` - 用户数据验证
- `roleValidator.ts` - 角色数据验证
- `taskValidator.ts` - 任务数据验证
- `formulaValidator.ts` - 公式验证

---

### 5. 控制器层 (Controller Layer)

**目录**: `src/controllers/`

**职责**:
- 接收 HTTP 请求
- 提取和转换请求参数
- 调用服务层方法
- 处理响应格式
- 错误捕获和转换
- HTTP 状态码管理

**特点**:
- **薄控制器**: 不包含业务逻辑
- **统一响应格式**: `{ message, data, error }`
- **错误处理**: try-catch 捕获并转换为 HTTP 响应

**示例**:
```typescript
// sampleController.ts
class SampleController {
  async createSample(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ 
          error: { code: 'UNAUTHORIZED', message: '用户未认证' } 
        })
        return
      }
      
      const data: CreateSampleDto = { ...req.body, createdBy: userId }
      const sample = await sampleService.createSample(data)
      
      logger.info('Sample created', { sampleId: sample.id })
      res.status(201).json({ message: '样品创建成功', data: sample })
    } catch (error: any) {
      logger.error('Error creating sample', { error: error.message })
      res.status(500).json({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: '创建样品失败',
          details: error.message 
        } 
      })
    }
  }
}
```

**控制器模块**:
- `authController.ts` - 认证控制器
- `sampleController.ts` - 样品控制器
- `workflowController.ts` - 工作流控制器
- `taskController.ts` - 任务控制器
- `resultController.ts` - 结果控制器
- `auditController.ts` - 审核控制器
- `reportController.ts` - 报告控制器
- `statisticsController.ts` - 统计控制器
- 等等...

---

### 6. 服务层 (Service Layer)

**目录**: `src/services/`

**职责**:
- **核心业务逻辑实现**
- 数据库事务管理
- 复杂业务规则实现
- 跨模块业务协调
- 数据转换和计算

**核心服务**:
- `authService.ts` - 认证和令牌管理
- `sampleService.ts` - 样品管理业务逻辑
- `workflowService.ts` - 工作流引擎
- `taskService.ts` - 任务管理和派工
- `resultService.ts` - 检测结果处理
- `auditService.ts` - 审核流程管理
- `reportService.ts` - 报告生成和管理
- `statisticsService.ts` - 统计分析
- `permissionService.ts` - 权限管理
- `cacheService.ts` - 缓存管理
- `queueService.ts` - 异步任务队列

**特点**:
- 包含复杂的业务逻辑
- 使用 Prisma 事务确保数据一致性
- 可复用的业务方法
- 与数据库直接交互

**示例**:
```typescript
// sampleService.ts
export class SampleService {
  /**
   * 样品流转 - 创建流转记录并更新样品位置
   * 使用事务确保数据一致性
   */
  async transferSample(data: TransferSampleDto): Promise<Transfer> {
    try {
      logger.info('Transferring sample', { 
        sampleId: data.sampleId, 
        from: data.fromLocation, 
        to: data.toLocation 
      })
      
      // 使用事务确保流转记录创建和样品位置更新的原子性
      const result = await prisma.$transaction(async (tx) => {
        // 1. 检查样品是否存在
        const sample = await tx.sample.findUnique({
          where: { id: data.sampleId }
        })
        
        if (!sample) {
          throw new Error('样品不存在')
        }
        
        // 2. 创建流转记录
        const transfer = await tx.transfer.create({
          data: {
            sampleId: data.sampleId,
            fromLocation: data.fromLocation?.trim(),
            toLocation: data.toLocation?.trim(),
            fromPerson: data.fromPerson?.trim(),
            toPerson: data.toPerson?.trim(),
            remarks: data.remarks?.trim(),
            status: 'PENDING',
            senderConfirmed: false,
            receiverConfirmed: false
          }
        })
        
        // 3. 更新样品当前位置
        await tx.sample.update({
          where: { id: data.sampleId },
          data: {
            storageLocation: data.toLocation?.trim()
          }
        })
        
        logger.info('Sample transferred successfully', { 
          transferId: transfer.id,
          sampleId: data.sampleId 
        })
        
        return transfer
      })
      
      return result
    } catch (error) {
      logger.error('Failed to transfer sample', { error, data })
      throw error
    }
  }
}
```

---

### 7. 数据访问层 (Data Access Layer)

**工具**: Prisma ORM

**文件**: `prisma/schema.prisma`

**职责**:
- 数据库模型定义
- 类型安全的数据库查询
- 关系映射
- 数据库迁移管理
- 查询优化

**特点**:
- 自动生成 TypeScript 类型
- 支持事务和批量操作
- 内置连接池管理
- 查询构建器

**示例**:
```prisma
model Sample {
  id                String       @id @default(uuid())
  barcode           String       @unique
  sampleNumber      String       @unique
  clientName        String
  sampleName        String
  sampleType        String
  quantity          Float
  unit              String
  status            SampleStatus @default(REGISTERED)
  
  // 关联关系
  testItems         TestItem[]
  results           Result[]
  transfers         Transfer[]
  reports           Report[]
  
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([barcode])
  @@index([sampleNumber])
  @@index([status])
}
```

---

### 8. 工具层 (Utility Layer)

**目录**: `src/utils/`

**核心工具**:
- `barcodeGenerator.ts` - 条码和编号生成
- `encryption.ts` - 加密解密
- `fileParser.ts` - 文件解析 (Excel, CSV)
- `paginationHelper.ts` - 分页辅助
- `queryOptimizer.ts` - 查询优化
- `concurrencyControl.ts` - 并发控制和版本管理

**示例**:
```typescript
// barcodeGenerator.ts
export async function generateBarcode(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  
  // 查询今天已有的最大序列号
  const prefix = `SP${datePrefix}`
  const lastSample = await prisma.sample.findFirst({
    where: { barcode: { startsWith: prefix } },
    orderBy: { barcode: 'desc' }
  })
  
  let sequence = 1
  if (lastSample) {
    const lastSequence = parseInt(lastSample.barcode.slice(-6))
    sequence = lastSequence + 1
  }
  
  return `${prefix}${String(sequence).padStart(6, '0')}`
}
```

---

### 9. 类型定义层 (Type Definition Layer)

**目录**: `src/types/`

**职责**:
- TypeScript 接口定义
- DTO (数据传输对象)
- 枚举类型
- 请求/响应类型

**示例**:
```typescript
// sample.ts
export interface CreateSampleDto {
  clientName: string
  clientContact?: string
  sampleName: string
  sampleType: string
  sampleCategory: string
  quantity: number
  unit: string
  receivedDate: Date
  samplingDate?: Date
  samplingLocation?: string
  samplingPerson?: string
  storageLocation?: string
  storageCondition?: string
  priority?: Priority
  description?: string
  remarks?: string
  createdBy: string
}

export interface SampleQuery {
  page?: number
  pageSize?: number
  barcode?: string
  sampleNumber?: string
  clientName?: string
  sampleType?: string
  status?: SampleStatus
  priority?: Priority
  startDate?: Date
  endDate?: Date
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

---

### 10. 配置层 (Configuration Layer)

**目录**: `src/config/`

**配置模块**:
- `env.ts` - 环境变量管理
- `database.ts` - 数据库配置
- `redis.ts` - Redis 配置
- `logger.ts` - 日志配置
- `swagger.ts` - API 文档配置
- `security.ts` - 安全配置 (CORS, Helmet)
- `queue.ts` - 队列配置

**示例**:
```typescript
// env.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || []
}
```

---

### 11. 装饰器层 (Decorator Layer)

**目录**: `src/decorators/`

**职责**: 提供横切关注点的装饰器

**示例**:
```typescript
// cache.ts
export function Cacheable(ttl: number) {
  return function (
    target: any, 
    propertyKey: string, 
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`
      const cached = await redis.get(cacheKey)
      
      if (cached) {
        return JSON.parse(cached)
      }
      
      const result = await originalMethod.apply(this, args)
      await redis.setex(cacheKey, ttl, JSON.stringify(result))
      
      return result
    }
    
    return descriptor
  }
}
```

---

### 12. 后台任务层 (Background Jobs Layer)

**目录**: `src/workers/`, `src/jobs/`

**职责**:
- 异步任务处理
- 定时任务
- 批量处理

**示例**:
```typescript
// batchWorker.ts
import Queue from 'bull'

const batchQueue = new Queue('batch-processing', {
  redis: { host: 'localhost', port: 6379 }
})

batchQueue.process(async (job) => {
  const { type, data } = job.data
  
  switch (type) {
    case 'IMPORT_RESULTS':
      await importService.processImport(data)
      break
    case 'GENERATE_REPORT':
      await reportService.generateReport(data)
      break
    case 'EXPORT_DATA':
      await exportService.exportData(data)
      break
  }
})
```

---

## 请求处理完整流程

```
客户端请求
    ↓
[入口层] Express 应用接收请求
    ↓
[中间件层 - 安全] Helmet, CORS, 压缩
    ↓
[中间件层 - 限流] 全局速率限制
    ↓
[中间件层 - 日志] 请求日志记录
    ↓
[中间件层 - 监控] 性能监控开始
    ↓
[中间件层 - 审计] 审计日志记录
    ↓
[路由层] 路由匹配和参数解析
    ↓
[中间件层 - 认证] JWT 令牌验证
    ↓
[中间件层 - 权限] RBAC 权限检查
    ↓
[验证层] Joi 参数验证
    ↓
[控制器层] 提取参数,调用服务
    ↓
[服务层] 执行业务逻辑
    ↓
[数据访问层] Prisma ORM 查询
    ↓
[数据层] PostgreSQL/Redis
    ↓
[服务层] 返回结果
    ↓
[控制器层] 格式化响应
    ↓
[中间件层 - 错误] 错误处理(如有)
    ↓
客户端接收响应
```

## 具体示例:样品创建流程

让我们通过一个完整的样品创建请求来展示各层的协作:

### 1. 客户端发起请求
```http
POST /api/samples HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "clientName": "测试客户",
  "sampleName": "水样",
  "sampleType": "环境样品",
  "quantity": 500,
  "unit": "ml"
}
```

### 2. 入口层接收
```typescript
// app.ts
app.use('/api', apiRoutes)
```

### 3. 中间件层处理
```typescript
// 安全中间件
app.use(helmet())
app.use(cors())

// 认证中间件
authenticate(req, res, next)  // 验证 JWT

// 权限中间件
requirePermission('sample', 'create')(req, res, next)
```

### 4. 路由层匹配
```typescript
// sampleRoutes.ts
router.post('/', 
  authenticate,
  requirePermission('sample', 'create'),
  validate(createSampleSchema),
  sampleController.createSample
)
```

### 5. 验证层校验
```typescript
// sampleValidator.ts
const createSampleSchema = Joi.object({
  clientName: Joi.string().required(),
  sampleName: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  // ...
})
```

### 6. 控制器层处理
```typescript
// sampleController.ts
async createSample(req: Request, res: Response) {
  const userId = req.user?.userId
  const data = { ...req.body, createdBy: userId }
  const sample = await sampleService.createSample(data)
  res.status(201).json({ message: '样品创建成功', data: sample })
}
```

### 7. 服务层执行业务逻辑
```typescript
// sampleService.ts
async createSample(data: CreateSampleDto): Promise<Sample> {
  const barcode = await generateBarcode()
  const sampleNumber = await generateSampleNumber()
  
  const sample = await prisma.sample.create({
    data: {
      barcode,
      sampleNumber,
      ...data,
      status: 'REGISTERED'
    }
  })
  
  return sample
}
```

### 8. 数据访问层操作数据库
```typescript
// Prisma 自动生成的查询
await prisma.sample.create({ data: {...} })
```

### 9. 响应返回客户端
```json
{
  "message": "样品创建成功",
  "data": {
    "id": "uuid-123",
    "barcode": "SP202604090001",
    "sampleNumber": "20260001",
    "clientName": "测试客户",
    "sampleName": "水样",
    "status": "REGISTERED",
    "createdAt": "2026-04-09T10:00:00Z"
  }
}
```

## 架构优势

### 1. 关注点分离
每层职责清晰,易于理解和维护:
- 控制器只负责 HTTP 处理
- 服务层专注业务逻辑
- 数据访问层封装数据库操作

### 2. 可测试性
各层可独立进行单元测试:
- 控制器测试: Mock 服务层
- 服务层测试: Mock 数据访问层
- 集成测试: 测试完整流程

### 3. 可扩展性
新功能只需添加对应层的代码:
- 新增 API: 添加路由、控制器、服务
- 新增业务规则: 修改服务层
- 新增数据模型: 更新 Prisma schema

### 4. 安全性
多层安全防护:
- 中间件层: 认证、授权、限流
- 验证层: 参数校验
- 服务层: 业务规则验证
- 审计层: 操作日志记录

### 5. 性能优化
多种优化手段:
- 缓存层: Redis 缓存
- 查询优化: 索引、分页
- 并发控制: 乐观锁
- 异步处理: 队列系统

### 6. 代码复用
通用功能可复用:
- 工具层: 通用工具函数
- 装饰器层: 横切关注点
- 中间件层: 可组合的中间件

### 7. 类型安全
端到端类型安全:
- TypeScript 类型检查
- Prisma 自动生成类型
- DTO 类型定义

### 8. 可维护性
清晰的结构便于维护:
- 统一的目录结构
- 一致的命名规范
- 完善的文档

## 最佳实践

### 1. 控制器层
- 保持薄控制器,不包含业务逻辑
- 统一错误处理
- 统一响应格式
- 记录关键操作日志

### 2. 服务层
- 单一职责原则
- 使用事务确保数据一致性
- 复杂业务逻辑拆分为多个方法
- 添加详细的注释说明

### 3. 数据访问层
- 使用 Prisma 的类型安全查询
- 合理使用索引
- 避免 N+1 查询问题
- 使用连接池

### 4. 中间件层
- 中间件顺序很重要
- 错误处理中间件放在最后
- 认证在权限检查之前
- 日志记录尽早执行

### 5. 验证层
- 前端验证 + 后端验证
- 提供友好的错误消息
- 验证规则集中管理
- 复用验证规则

## 总结

这个分层架构设计为实验室管理系统提供了:
- **清晰的结构**: 每层职责明确
- **高可维护性**: 易于理解和修改
- **强可扩展性**: 便于添加新功能
- **好的性能**: 多层优化机制
- **高安全性**: 多层安全防护
- **易测试性**: 各层可独立测试

通过这种架构,系统能够支持复杂的业务需求,同时保持代码的清晰和可维护性。
