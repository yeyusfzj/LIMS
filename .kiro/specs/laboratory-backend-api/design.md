# 设计文档 - 实验室管理系统后端 API

## 概述

实验室管理系统后端 API 是一个基于 RESTful 架构的企业级后端服务，为实验室智能管理系统提供完整的数据管理、业务逻辑处理和系统集成能力。系统采用现代化的微服务架构思想，支持高并发、高可用和可扩展的部署方式。

### 核心目标

- 提供安全可靠的数据存储和访问服务
- 实现复杂的业务逻辑和工作流引擎
- 支持实验室全流程的数字化管理
- 确保数据的完整性、一致性和可追溯性
- 提供高性能的 API 服务和良好的开发体验

### 技术栈选择

**后端框架：** Node.js + Express.js
- 成熟稳定的生态系统
- 高性能的异步 I/O 处理
- 与前端 TypeScript 技术栈统一
- 丰富的中间件和工具库支持

**数据库：** PostgreSQL
- 强大的 ACID 事务支持
- 丰富的数据类型（JSON、数组等）
- 优秀的并发控制和性能
- 完善的全文搜索和索引能力

**ORM：** Prisma
- 类型安全的数据库访问
- 自动生成的类型定义
- 强大的迁移工具
- 优秀的开发体验

**缓存：** Redis
- 高性能的内存数据库
- 支持多种数据结构
- 分布式锁和会话管理
- 发布订阅功能

**认证：** JWT (JSON Web Token)
- 无状态的身份验证
- 易于扩展和分布式部署
- 标准化的令牌格式


## 架构设计

### 整体架构

系统采用分层架构设计，从上到下分为以下层次：

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

### 中间件架构

系统使用中间件链处理请求：

1. **日志中间件**：记录所有请求和响应
2. **认证中间件**：验证 JWT 令牌
3. **授权中间件**：检查用户权限
4. **验证中间件**：验证请求参数
5. **错误处理中间件**：统一错误处理
6. **审计中间件**：记录关键操作

### 模块划分

系统按业务领域划分为以下核心模块：

- **认证模块 (Auth)**：用户登录、令牌管理、权限验证
- **样品模块 (Sample)**：样品管理、流转追踪、分样合样
- **工作流模块 (Workflow)**：工作流配置、任务管理、自动派工
- **检测模块 (Testing)**：结果录入、公式计算、异常检测
- **审核模块 (Audit)**：多级审核、质量判定、放行控制
- **报告模块 (Report)**：模板管理、报告生成、电子签名、分发回收
- **统计模块 (Statistics)**：数据聚合、报表生成、数据导出
- **系统模块 (System)**：用户管理、角色权限、审计日志、系统配置


## 组件和接口

### 核心组件

#### 1. 认证服务 (AuthService)

```typescript
interface AuthService {
  // 用户登录
  login(username: string, password: string): Promise<AuthResult>
  
  // 刷新令牌
  refreshToken(refreshToken: string): Promise<AuthResult>
  
  // 验证令牌
  verifyToken(token: string): Promise<TokenPayload>
  
  // 登出
  logout(userId: string): Promise<void>
}

interface AuthResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserInfo
}
```

#### 2. 样品服务 (SampleService)

```typescript
interface SampleService {
  // 创建样品
  createSample(data: CreateSampleDto): Promise<Sample>
  
  // 查询样品列表
  listSamples(query: SampleQuery): Promise<PaginatedResult<Sample>>
  
  // 获取样品详情
  getSample(id: string): Promise<Sample>
  
  // 更新样品
  updateSample(id: string, data: UpdateSampleDto): Promise<Sample>
  
  // 样品流转
  transferSample(data: TransferDto): Promise<Transfer>
  
  // 分样
  splitSample(parentId: string, data: SplitDto): Promise<Sample[]>
  
  // 合样
  mergeSamples(sampleIds: string[], data: MergeDto): Promise<Sample>
  
  // 获取监管链
  getChainOfCustody(sampleId: string): Promise<Transfer[]>
}
```

#### 3. 工作流服务 (WorkflowService)

```typescript
interface WorkflowService {
  // 创建工作流配置
  createWorkflow(data: CreateWorkflowDto): Promise<Workflow>
  
  // 验证工作流配置
  validateWorkflow(config: WorkflowConfig): Promise<ValidationResult>
  
  // 启动工作流实例
  startWorkflowInstance(sampleId: string, workflowId: string): Promise<WorkflowInstance>
  
  // 完成节点
  completeNode(instanceId: string, nodeId: string): Promise<void>
  
  // 获取当前节点
  getCurrentNodes(instanceId: string): Promise<WorkflowNode[]>
}
```

#### 4. 任务服务 (TaskService)

```typescript
interface TaskService {
  // 创建任务
  createTask(data: CreateTaskDto): Promise<Task>
  
  // 自动派工
  autoAssignTask(taskId: string): Promise<Task>
  
  // 手动分配任务
  assignTask(taskId: string, userId: string): Promise<Task>
  
  // 查询任务列表
  listTasks(query: TaskQuery): Promise<PaginatedResult<Task>>
  
  // 完成任务
  completeTask(taskId: string, result: TaskResult): Promise<Task>
}
```

#### 5. 检测结果服务 (ResultService)

```typescript
interface ResultService {
  // 录入结果
  createResult(data: CreateResultDto): Promise<Result>
  
  // 批量导入结果
  importResults(file: File, mapping: FieldMapping): Promise<ImportResult>
  
  // 执行公式计算
  calculateFormula(resultId: string): Promise<Result>
  
  // 检测异常
  detectAnomalies(resultId: string): Promise<Anomaly[]>
  
  // 申请复测
  requestRetest(resultId: string, reason: string): Promise<Task>
}
```

#### 6. 审核服务 (AuditService)

```typescript
interface AuditService {
  // 提交审核
  submitForAudit(sampleId: string): Promise<AuditTask[]>
  
  // 执行审核
  performAudit(taskId: string, decision: AuditDecision): Promise<AuditTask>
  
  // 质量判定
  performQualityJudgment(sampleId: string): Promise<QualityJudgment>
  
  // 样品放行
  releaseSample(sampleId: string): Promise<Sample>
  
  // 批量放行
  batchRelease(sampleIds: string[]): Promise<ReleaseResult>
}
```

#### 7. 报告服务 (ReportService)

```typescript
interface ReportService {
  // 创建报告模板
  createTemplate(data: CreateTemplateDto): Promise<ReportTemplate>
  
  // 生成报告
  generateReport(sampleId: string, templateId: string): Promise<Report>
  
  // 预览报告
  previewReport(sampleId: string, templateId: string): Promise<string>
  
  // 签名报告
  signReport(reportId: string, signature: SignatureDto): Promise<Report>
  
  // 分发报告
  distributeReport(reportId: string, method: DistributionMethod): Promise<Distribution>
  
  // 回收报告
  recallReport(reportId: string, reason: string): Promise<Report>
}
```

#### 8. 统计服务 (StatisticsService)

```typescript
interface StatisticsService {
  // 获取统计数据
  getStatistics(query: StatisticsQuery): Promise<StatisticsResult>
  
  // 导出数据
  exportData(query: ExportQuery): Promise<ExportResult>
  
  // 生成自定义报表
  generateCustomReport(config: ReportConfig): Promise<CustomReport>
}
```

### API 端点设计

系统遵循 RESTful API 设计原则，主要端点包括：

#### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

#### 样品管理
- `POST /api/samples` - 创建样品
- `GET /api/samples` - 查询样品列表
- `GET /api/samples/:id` - 获取样品详情
- `PUT /api/samples/:id` - 更新样品
- `POST /api/samples/:id/transfer` - 样品流转
- `POST /api/samples/:id/split` - 分样
- `POST /api/samples/merge` - 合样
- `GET /api/samples/:id/custody` - 获取监管链

#### 工作流管理
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows` - 查询工作流列表
- `GET /api/workflows/:id` - 获取工作流详情
- `PUT /api/workflows/:id` - 更新工作流
- `POST /api/workflows/:id/validate` - 验证工作流
- `POST /api/workflows/:id/instances` - 启动工作流实例

#### 任务管理
- `POST /api/tasks` - 创建任务
- `GET /api/tasks` - 查询任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks/:id/assign` - 分配任务
- `POST /api/tasks/:id/complete` - 完成任务

#### 检测结果
- `POST /api/results` - 录入结果
- `POST /api/results/import` - 批量导入
- `GET /api/results` - 查询结果列表
- `POST /api/results/:id/calculate` - 执行计算
- `POST /api/results/:id/retest` - 申请复测

#### 审核管理
- `POST /api/audits` - 提交审核
- `GET /api/audits` - 查询审核任务
- `POST /api/audits/:id/review` - 执行审核
- `POST /api/samples/:id/judgment` - 质量判定
- `POST /api/samples/:id/release` - 样品放行

#### 报告管理
- `POST /api/report-templates` - 创建模板
- `GET /api/report-templates` - 查询模板列表
- `POST /api/reports` - 生成报告
- `GET /api/reports/:id/preview` - 预览报告
- `POST /api/reports/:id/sign` - 签名报告
- `POST /api/reports/:id/distribute` - 分发报告
- `POST /api/reports/:id/recall` - 回收报告

#### 统计分析
- `GET /api/statistics` - 获取统计数据
- `POST /api/statistics/export` - 导出数据
- `POST /api/statistics/custom-report` - 生成自定义报表


## 数据模型

### 核心实体模型

#### 用户和权限

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  email         String   @unique
  fullName      String
  department    String?
  position      String?
  phone         String?
  status        UserStatus @default(ACTIVE)
  roles         UserRole[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  lastLoginAt   DateTime?
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  permissions Permission[]
  users       UserRole[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Permission {
  id          String   @id @default(uuid())
  resource    String   // 资源类型：sample, workflow, report 等
  action      String   // 操作类型：create, read, update, delete
  roles       Role[]
  createdAt   DateTime @default(now())
}

model UserRole {
  userId    String
  roleId    String
  user      User   @relation(fields: [userId], references: [id])
  role      Role   @relation(fields: [roleId], references: [id])
  assignedAt DateTime @default(now())
  
  @@id([userId, roleId])
}

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
}
```

#### 样品管理

```prisma
model Sample {
  id                String       @id @default(uuid())
  barcode           String       @unique
  sampleNumber      String       @unique
  clientName        String
  clientContact     String?
  sampleName        String
  sampleType        String
  sampleCategory    String
  quantity          Float
  unit              String
  receivedDate      DateTime
  samplingDate      DateTime?
  samplingLocation  String?
  samplingPerson    String?
  storageLocation   String?
  storageCondition  String?
  status            SampleStatus @default(REGISTERED)
  priority          Priority     @default(NORMAL)
  description       String?
  remarks           String?
  
  // 关联关系
  parentSampleId    String?
  parentSample      Sample?      @relation("SampleSplit", fields: [parentSampleId], references: [id])
  childSamples      Sample[]     @relation("SampleSplit")
  mergedFromIds     String[]     // 合样来源样品 ID 数组
  
  // 工作流
  workflowInstanceId String?
  workflowInstance   WorkflowInstance?
  
  // 检测项目
  testItems         TestItem[]
  results           Result[]
  
  // 审核和判定
  auditTasks        AuditTask[]
  qualityJudgment   QualityJudgment?
  
  // 报告
  reports           Report[]
  
  // 流转记录
  transfers         Transfer[]
  
  // 审计
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  releasedAt        DateTime?
  releasedBy        String?
  
  @@index([barcode])
  @@index([sampleNumber])
  @@index([status])
  @@index([clientName])
}

model TestItem {
  id              String   @id @default(uuid())
  sampleId        String
  sample          Sample   @relation(fields: [sampleId], references: [id])
  testMethod      String
  testStandard    String?
  testParameters  Json     // 检测参数配置
  status          TestItemStatus @default(PENDING)
  assignedTo      String?
  assignedAt      DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([sampleId])
  @@index([status])
}

model Transfer {
  id              String   @id @default(uuid())
  sampleId        String
  sample          Sample   @relation(fields: [sampleId], references: [id])
  fromLocation    String
  toLocation      String
  fromPerson      String
  toPerson        String
  transferDate    DateTime @default(now())
  receivedDate    DateTime?
  status          TransferStatus @default(PENDING)
  remarks         String?
  
  // 双方确认
  senderConfirmed   Boolean @default(false)
  receiverConfirmed Boolean @default(false)
  
  createdAt       DateTime @default(now())
  
  @@index([sampleId])
  @@index([transferDate])
}

enum SampleStatus {
  REGISTERED      // 已登记
  IN_TESTING      // 检测中
  TESTING_COMPLETE // 检测完成
  IN_AUDIT        // 审核中
  AUDIT_COMPLETE  // 审核完成
  RELEASED        // 已放行
  ARCHIVED        // 已归档
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum TestItemStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  ABNORMAL
}

enum TransferStatus {
  PENDING
  IN_TRANSIT
  RECEIVED
  REJECTED
}
```

#### 工作流引擎

```prisma
model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  version     Int      @default(1)
  config      Json     // 工作流配置（节点和边）
  status      WorkflowStatus @default(DRAFT)
  isActive    Boolean  @default(false)
  
  instances   WorkflowInstance[]
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  activatedAt DateTime?
  
  @@index([status])
  @@index([isActive])
}

model WorkflowInstance {
  id          String   @id @default(uuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id])
  sampleId    String   @unique
  sample      Sample   @relation(fields: [sampleId], references: [id])
  
  currentNodes String[] // 当前所在节点 ID 数组
  status      InstanceStatus @default(RUNNING)
  variables   Json     @default("{}")
  
  tasks       Task[]
  
  startedAt   DateTime @default(now())
  completedAt DateTime?
  
  @@index([workflowId])
  @@index([status])
}

model Task {
  id              String   @id @default(uuid())
  instanceId      String
  instance        WorkflowInstance @relation(fields: [instanceId], references: [id])
  nodeId          String
  nodeName        String
  nodeType        String
  
  assignedTo      String?
  assignedAt      DateTime?
  status          TaskStatus @default(PENDING)
  priority        Priority @default(NORMAL)
  
  result          Json?
  completedAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([instanceId])
  @@index([assignedTo])
  @@index([status])
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum InstanceStatus {
  RUNNING
  COMPLETED
  SUSPENDED
  TERMINATED
}

enum TaskStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  REJECTED
}
```

#### 检测结果

```prisma
model Result {
  id              String   @id @default(uuid())
  sampleId        String
  sample          Sample   @relation(fields: [sampleId], references: [id])
  testItemId      String
  parameter       String   // 检测参数名称
  value           Float?
  textValue       String?  // 文本型结果
  unit            String?
  method          String
  
  // 结果来源
  source          ResultSource @default(MANUAL)
  instrumentId    String?
  
  // 计算公式
  formulaId       String?
  isCalculated    Boolean @default(false)
  
  // 异常检测
  isAbnormal      Boolean @default(false)
  abnormalReason  String?
  
  // 复测
  isRetest        Boolean @default(false)
  originalResultId String?
  retestReason    String?
  
  // 审计
  enteredBy       String
  enteredAt       DateTime @default(now())
  reviewedBy      String?
  reviewedAt      DateTime?
  
  @@index([sampleId])
  @@index([testItemId])
}

model Formula {
  id          String   @id @default(uuid())
  name        String
  description String?
  expression  String   // 公式表达式
  parameters  Json     // 参数定义
  isActive    Boolean  @default(true)
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum ResultSource {
  MANUAL      // 手工录入
  INSTRUMENT  // 仪器导入
  CALCULATED  // 公式计算
}
```

#### 审核和判定

```prisma
model AuditTask {
  id          String   @id @default(uuid())
  sampleId    String
  sample      Sample   @relation(fields: [sampleId], references: [id])
  level       Int      // 审核级别：1, 2, 3...
  auditorId   String
  auditor     User     @relation(fields: [auditorId], references: [id])
  status      AuditStatus @default(PENDING)
  decision    AuditDecision?
  comments    String?
  
  submittedAt DateTime @default(now())
  completedAt DateTime?
  
  @@index([sampleId])
  @@index([auditorId])
  @@index([status])
}

model QualityJudgment {
  id          String   @id @default(uuid())
  sampleId    String   @unique
  sample      Sample   @relation(fields: [sampleId], references: [id])
  
  result      JudgmentResult
  basis       String   // 判定依据
  isAutomatic Boolean  @default(true)
  
  judgedBy    String
  judgedAt    DateTime @default(now())
  reviewedBy  String?
  reviewedAt  DateTime?
  
  @@index([result])
}

enum AuditStatus {
  PENDING
  IN_PROGRESS
  APPROVED
  REJECTED
}

enum AuditDecision {
  APPROVE
  REJECT
  RETURN
}

enum JudgmentResult {
  QUALIFIED
  UNQUALIFIED
  PENDING
}
```

#### 报告管理

```prisma
model ReportTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  category    String
  content     String   // 模板内容（HTML）
  variables   Json     // 变量定义
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  
  reports     Report[]
  
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Report {
  id          String   @id @default(uuid())
  reportNumber String  @unique
  sampleId    String
  sample      Sample   @relation(fields: [sampleId], references: [id])
  templateId  String
  template    ReportTemplate @relation(fields: [templateId], references: [id])
  
  content     String   // 生成的报告内容
  status      ReportStatus @default(DRAFT)
  
  // 签名
  signatures  Signature[]
  
  // 分发
  distributions Distribution[]
  
  generatedBy String
  generatedAt DateTime @default(now())
  approvedAt  DateTime?
  recalledAt  DateTime?
  recallReason String?
  
  @@index([reportNumber])
  @@index([sampleId])
  @@index([status])
}

model Signature {
  id          String   @id @default(uuid())
  reportId    String
  report      Report   @relation(fields: [reportId], references: [id])
  signerId    String
  signerName  String
  signerRole  String
  signatureData String // 加密的签名数据
  signedAt    DateTime @default(now())
  
  @@index([reportId])
}

model Distribution {
  id          String   @id @default(uuid())
  reportId    String
  report      Report   @relation(fields: [reportId], references: [id])
  method      DistributionMethod
  recipient   String
  recipientEmail String?
  status      DistributionStatus @default(PENDING)
  
  sentAt      DateTime?
  receivedAt  DateTime?
  
  @@index([reportId])
}

enum ReportStatus {
  DRAFT
  PENDING_SIGNATURE
  SIGNED
  DISTRIBUTED
  RECALLED
}

enum DistributionMethod {
  EMAIL
  DOWNLOAD
  PRINT
}

enum DistributionStatus {
  PENDING
  SENT
  RECEIVED
  FAILED
}
```

#### 审计日志

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  username    String
  action      String   // 操作类型
  resource    String   // 资源类型
  resourceId  String   // 资源 ID
  changes     Json?    // 变更内容
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  @@index([userId])
  @@index([resource, resourceId])
  @@index([timestamp])
}
```

### 数据库索引策略

为了优化查询性能，系统在以下字段上创建索引：

1. **唯一索引**：barcode, sampleNumber, reportNumber, username, email
2. **状态索引**：sample.status, task.status, report.status
3. **时间索引**：createdAt, updatedAt, timestamp（用于时间范围查询）
4. **关联索引**：所有外键字段
5. **复合索引**：(resource, resourceId) 用于审计日志查询

### 数据完整性约束

1. **外键约束**：确保关联数据的完整性
2. **唯一约束**：防止重复数据（条码、编号等）
3. **非空约束**：确保必填字段不为空
4. **检查约束**：验证数据范围和格式
5. **级联删除**：谨慎使用，主要用于从属数据


## 正确性属性

属性是系统在所有有效执行中都应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### 验收标准可测试性分析

在定义正确性属性之前，我分析了所有 25 个需求的验收标准，确定哪些可以通过属性测试验证：

**需求 1-5（认证、样品管理、流转、分样合样、工作流）**：大部分验收标准可测试为属性，涉及数据一致性、事务完整性和关联关系验证。

**需求 6-10（派工、结果存储、批量导入、异常检测、审核）**：可测试为属性，重点是业务规则验证和状态转换。

**需求 11-16（判定、放行、报告模板、生成、签名、分发）**：可测试为属性，涉及条件验证和状态管理。

**需求 17-25（统计、权限、审计、备份、性能、错误处理、文档、验证、并发）**：部分可测试，某些涉及性能和文档的标准不适合属性测试。

### 核心正确性属性

#### 属性 1：认证令牌往返一致性

*对于任何*有效的用户凭据，如果登录成功生成令牌，那么使用该令牌验证应该返回相同的用户信息。

**验证需求：1.1, 1.3**

#### 属性 2：样品条码唯一性

*对于任何*样品创建操作，生成的条码在整个系统中必须是唯一的，不会与现有样品条码冲突。

**验证需求：2.1, 2.5**

#### 属性 3：样品流转事务完整性

*对于任何*样品流转操作，流转记录的创建和样品位置的更新必须在同一事务中完成，要么全部成功要么全部失败。

**验证需求：3.1, 3.2**

#### 属性 4：监管链完整性

*对于任何*样品，其监管链记录应该按时间顺序完整记录所有流转历史，不存在时间间隙或记录缺失。

**验证需求：3.3, 3.4**

#### 属性 5：分样关联一致性

*对于任何*分样操作，创建的子样品必须正确关联到母样品，且母样品的 childSampleIds 字段必须包含所有子样品 ID。

**验证需求：4.1, 4.2**

#### 属性 6：合样来源可追溯性

*对于任何*合样操作，合并后的样品必须记录所有来源样品 ID，且这些来源样品必须在系统中存在。

**验证需求：4.3**

#### 属性 7：分样合样原子性

*对于任何*分样或合样操作，所有相关的数据库操作（创建样品、建立关联、更新状态）必须在单个事务中完成。

**验证需求：4.5**

#### 属性 8：工作流配置有效性

*对于任何*工作流配置，系统必须能够检测出死循环和孤立节点，拒绝保存无效配置。

**验证需求：5.2**

#### 属性 9：工作流版本一致性

*对于任何*工作流配置的更新，系统必须创建新版本并保留历史版本，版本号单调递增。

**验证需求：5.3**

#### 属性 10：任务自动创建一致性

*对于任何*进入工作流节点的样品，如果节点配置了自动创建任务，系统必须创建对应的任务记录。

**验证需求：6.1**

#### 属性 11：派工规则确定性

*对于任何*满足派工规则的任务，系统应该根据优先级规则选择唯一的最合适人员，相同输入产生相同输出。

**验证需求：6.3**

#### 属性 12：结果录入时间戳一致性

*对于任何*检测结果录入，系统必须记录准确的时间戳和操作人员，且时间戳不能被篡改。

**验证需求：7.2**

#### 属性 13：公式计算幂等性

*对于任何*给定的原始结果和公式，多次执行计算应该产生相同的计算结果。

**验证需求：7.3**

#### 属性 14：批量导入事务性

*对于任何*批量导入操作，所有有效数据必须在单个事务中插入，如果任何记录失败则全部回滚。

**验证需求：8.4**

#### 属性 15：异常检测一致性

*对于任何*检测结果，如果其值超出配置的范围规则，系统必须将其标记为异常。

**验证需求：9.1, 9.2**

#### 属性 16：复测关联完整性

*对于任何*复测申请，系统必须创建新的检测任务并正确关联到原样品和原结果。

**验证需求：9.4, 9.5**

#### 属性 17：审核顺序强制性

*对于任何*多级审核流程，下一级审核任务只能在前一级审核通过后才能执行。

**验证需求：10.2, 10.3**

#### 属性 18：审核状态一致性

*对于任何*审核操作，样品状态、审核任务状态和审核结果必须保持一致，不存在状态冲突。

**验证需求：10.3**

#### 属性 19：质量判定可覆盖性

*对于任何*自动质量判定结果，系统必须允许授权人员进行人工复核并覆盖，同时记录变更原因。

**验证需求：11.4, 11.5**

#### 属性 20：放行前置条件完整性

*对于任何*样品放行请求，系统必须验证所有前置条件（审核完成、判定合格等），只有全部满足才允许放行。

**验证需求：12.1, 12.2**

#### 属性 21：批量放行原子性

*对于任何*批量放行操作，所有样品的状态更新必须在单个事务中完成，要么全部成功要么全部失败。

**验证需求：12.4**

#### 属性 22：放行幂等性

*对于任何*已放行的样品，重复的放行请求应该被拒绝，防止重复放行。

**验证需求：12.5**

#### 属性 23：报告模板变量有效性

*对于任何*报告模板，系统必须验证模板中的所有变量占位符都是有效的数据字段。

**验证需求：13.5**

#### 属性 24：报告编号唯一性

*对于任何*生成的报告，系统必须分配唯一的报告编号，不会与现有报告编号冲突。

**验证需求：14.3**

#### 属性 25：报告数据一致性

*对于任何*生成的报告，报告中的数据必须与样品、结果和判定数据完全一致，不存在数据不匹配。

**验证需求：14.1, 14.2**

#### 属性 26：签名后不可变性

*对于任何*已完成所有必需签名的报告，报告内容必须被锁定，任何修改尝试都应该被拒绝。

**验证需求：15.3, 15.4**

#### 属性 27：签名身份验证

*对于任何*签名请求，系统必须验证签名人员的身份和权限，只有授权人员才能签名。

**验证需求：15.1**

#### 属性 28：报告分发可追溯性

*对于任何*报告分发操作，系统必须完整记录分发方式、接收人、时间等信息，形成完整的分发历史。

**验证需求：16.1, 16.5**

#### 属性 29：报告回收状态一致性

*对于任何*报告回收操作，系统必须更新报告状态并记录回收原因，且回收后的报告不能再次分发。

**验证需求：16.4**

#### 属性 30：权限验证一致性

*对于任何*API 请求，系统必须验证用户是否具有所需权限，无权限的请求必须被拒绝并记录。

**验证需求：18.2, 18.5**

#### 属性 31：数据级权限过滤

*对于任何*数据查询请求，系统必须只返回用户有权限访问的数据，自动过滤无权限数据。

**验证需求：18.4**

#### 属性 32：审计日志不可篡改性

*对于任何*已记录的审计日志，系统必须确保其不可被修改或删除，保持审计追踪的完整性。

**验证需求：19.3**

#### 属性 33：审计日志完整性

*对于任何*关键操作（创建、更新、删除、审核等），系统必须记录完整的审计日志，包含时间、用户、操作和变更内容。

**验证需求：19.1, 19.2**

#### 属性 34：并发冲突检测

*对于任何*并发修改同一资源的操作，系统必须检测到冲突并返回 409 错误，防止数据覆盖。

**验证需求：25.2**

#### 属性 35：事务原子性

*对于任何*需要原子性的操作，系统必须在事务中执行，确保要么全部成功要么全部失败，不存在部分成功状态。

**验证需求：25.3**

### 属性反思与去重

在定义上述属性后，我进行了反思以消除冗余：

- **属性 3 和属性 7** 都涉及事务完整性，但属性 3 专注于流转操作，属性 7 专注于分样合样，它们验证不同的业务场景，保留两者。
- **属性 14 和属性 21** 都涉及批量操作的原子性，但分别针对结果导入和样品放行，保留两者。
- **属性 20 和属性 22** 分别验证放行的前置条件和幂等性，是不同的验证维度，保留两者。
- **属性 32 和属性 33** 分别验证审计日志的不可篡改性和完整性，是互补的属性，保留两者。

所有属性都提供了独特的验证价值，没有逻辑冗余。


## 错误处理

### 错误响应标准化

系统使用统一的错误响应格式：

```typescript
interface ErrorResponse {
  error: {
    code: string          // 错误码（如 AUTH_FAILED, VALIDATION_ERROR）
    message: string       // 用户友好的错误消息
    details?: any         // 详细错误信息（开发环境）
    timestamp: string     // 错误发生时间
    path: string          // 请求路径
    requestId: string     // 请求追踪 ID
  }
}
```

### HTTP 状态码使用

- **200 OK**：请求成功
- **201 Created**：资源创建成功
- **204 No Content**：删除成功
- **400 Bad Request**：请求参数错误
- **401 Unauthorized**：未认证或令牌无效
- **403 Forbidden**：无权限访问
- **404 Not Found**：资源不存在
- **409 Conflict**：并发冲突或业务规则冲突
- **422 Unprocessable Entity**：业务验证失败
- **500 Internal Server Error**：服务器内部错误
- **503 Service Unavailable**：服务暂时不可用

### 错误分类

#### 1. 验证错误（400）

```typescript
{
  code: "VALIDATION_ERROR",
  message: "请求参数验证失败",
  details: {
    fields: [
      { field: "email", message: "邮箱格式不正确" },
      { field: "quantity", message: "数量必须大于 0" }
    ]
  }
}
```

#### 2. 认证错误（401）

```typescript
{
  code: "AUTH_FAILED",
  message: "认证失败，请重新登录",
  details: { reason: "令牌已过期" }
}
```

#### 3. 权限错误（403）

```typescript
{
  code: "PERMISSION_DENIED",
  message: "您没有权限执行此操作",
  details: { 
    required: "sample:update",
    current: ["sample:read"]
  }
}
```

#### 4. 业务规则错误（422）

```typescript
{
  code: "BUSINESS_RULE_VIOLATION",
  message: "样品放行条件不满足",
  details: {
    violations: [
      "审核未完成",
      "质量判定未通过"
    ]
  }
}
```

#### 5. 并发冲突（409）

```typescript
{
  code: "CONFLICT",
  message: "资源已被其他用户修改",
  details: {
    currentVersion: 5,
    requestedVersion: 4
  }
}
```

### 错误日志记录

系统使用分级日志记录：

- **ERROR**：服务器错误、数据库错误、外部服务错误
- **WARN**：业务规则违反、权限拒绝、并发冲突
- **INFO**：正常业务操作、API 请求
- **DEBUG**：详细的调试信息（仅开发环境）

### 错误恢复策略

1. **数据库事务回滚**：所有数据库错误自动回滚事务
2. **重试机制**：外部服务调用失败时自动重试（最多 3 次）
3. **降级处理**：缓存服务不可用时直接查询数据库
4. **熔断机制**：外部服务持续失败时暂时停止调用


## 测试策略

### 双重测试方法

系统采用单元测试和属性测试相结合的综合测试策略：

#### 单元测试

单元测试专注于：
- **具体示例**：验证特定输入产生预期输出
- **边界条件**：测试空值、零值、最大值等边界情况
- **错误条件**：验证错误处理和异常情况
- **集成点**：测试组件之间的交互

单元测试应该保持精简，避免过多测试。属性测试已经覆盖了大量输入组合。

#### 属性测试

属性测试专注于：
- **通用属性**：验证对所有输入都成立的规则
- **不变量**：验证操作前后保持不变的特性
- **往返属性**：验证序列化/反序列化、编码/解码等往返操作
- **关系属性**：验证不同操作之间的关系

### 属性测试配置

**测试库选择**：使用 `fast-check` 库进行属性测试（Node.js/TypeScript 生态系统中最成熟的属性测试库）

**测试配置**：
```typescript
import fc from 'fast-check'

// 每个属性测试至少运行 100 次
fc.assert(
  fc.property(
    // 生成器定义
    fc.string(),
    fc.integer(),
    // 属性验证
    (str, num) => {
      // 测试逻辑
    }
  ),
  { numRuns: 100 }
)
```

**标签格式**：
```typescript
describe('Feature: laboratory-backend-api, Property 1: 认证令牌往返一致性', () => {
  it('对于任何有效的用户凭据，令牌验证应返回相同的用户信息', () => {
    fc.assert(
      fc.property(
        userCredentialsArbitrary(),
        async (credentials) => {
          const authResult = await authService.login(credentials)
          const tokenPayload = await authService.verifyToken(authResult.accessToken)
          expect(tokenPayload.userId).toBe(authResult.user.id)
          expect(tokenPayload.username).toBe(authResult.user.username)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 测试覆盖率目标

- **代码覆盖率**：≥ 80%
- **分支覆盖率**：≥ 75%
- **关键路径覆盖率**：100%（认证、事务、审核等）

### 测试环境

#### 开发环境
- 使用 Docker 容器运行 PostgreSQL 和 Redis
- 使用测试数据库，每次测试后清理
- Mock 外部服务（邮件、文件存储等）

#### CI/CD 环境
- 自动运行所有测试
- 生成测试覆盖率报告
- 测试失败时阻止部署

### 性能测试

使用 `artillery` 或 `k6` 进行性能测试：

- **负载测试**：模拟正常负载下的系统表现
- **压力测试**：测试系统的极限承载能力
- **持久性测试**：长时间运行验证内存泄漏等问题

性能指标：
- API 响应时间 P95 < 500ms
- API 响应时间 P99 < 1000ms
- 吞吐量 > 1000 req/s（单实例）
- 数据库连接池利用率 < 80%

### 安全测试

- **SQL 注入测试**：验证参数化查询
- **XSS 测试**：验证输入清洗
- **认证测试**：验证令牌验证机制
- **权限测试**：验证访问控制
- **CSRF 测试**：验证跨站请求伪造防护


## 安全设计

### 认证机制

#### JWT 令牌结构

```typescript
interface TokenPayload {
  userId: string
  username: string
  roles: string[]
  iat: number        // 签发时间
  exp: number        // 过期时间
  jti: string        // 令牌唯一标识
}
```

#### 令牌策略

- **访问令牌（Access Token）**：有效期 15 分钟
- **刷新令牌（Refresh Token）**：有效期 7 天
- **令牌轮换**：刷新时生成新的刷新令牌
- **令牌黑名单**：使用 Redis 存储已撤销的令牌

#### 密码安全

- 使用 `bcrypt` 进行密码哈希（成本因子 12）
- 强制密码复杂度要求：
  - 最小长度 8 字符
  - 包含大小写字母、数字和特殊字符
- 密码历史：防止重复使用最近 5 次密码
- 登录失败锁定：5 次失败后锁定账户 30 分钟

### 授权机制

#### RBAC 模型

```
用户 (User) ──┐
              ├──> 角色 (Role) ──> 权限 (Permission)
              └──> 角色 (Role) ──> 权限 (Permission)
```

#### 权限粒度

```typescript
interface Permission {
  resource: string   // 资源：sample, workflow, report, user 等
  action: string     // 操作：create, read, update, delete, approve 等
  scope?: string     // 范围：own（自己的）, department（部门）, all（全部）
}
```

#### 权限检查中间件

```typescript
const requirePermission = (resource: string, action: string) => {
  return async (req, res, next) => {
    const user = req.user
    const hasPermission = await authService.checkPermission(
      user.id,
      resource,
      action
    )
    
    if (!hasPermission) {
      return res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: '您没有权限执行此操作'
        }
      })
    }
    
    next()
  }
}
```

### 数据安全

#### 敏感数据加密

- **密码**：使用 bcrypt 单向哈希
- **签名数据**：使用 AES-256-GCM 加密
- **个人信息**：根据需要进行字段级加密
- **传输加密**：强制使用 HTTPS/TLS 1.3

#### SQL 注入防护

- 使用 Prisma ORM 的参数化查询
- 禁止动态 SQL 拼接
- 输入验证和清洗

#### XSS 防护

- 输出编码：对所有用户输入进行 HTML 编码
- Content Security Policy (CSP) 头
- 使用 `helmet` 中间件设置安全头

### API 安全

#### 速率限制

```typescript
// 全局速率限制
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 1000                   // 最多 1000 个请求
}))

// 登录接口特殊限制
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5                      // 最多 5 次登录尝试
}))
```

#### CORS 配置

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

#### 请求验证

- 使用 `joi` 或 `zod` 进行请求参数验证
- 验证所有输入的类型、格式和范围
- 拒绝包含恶意内容的请求

### 审计与监控

#### 安全事件记录

记录以下安全事件：
- 登录失败
- 权限拒绝
- 敏感操作（删除、修改权限等）
- 异常访问模式
- API 滥用

#### 实时监控

- 异常登录检测（异地登录、频繁登录等）
- API 滥用检测（高频请求、异常模式）
- 数据泄露检测（大量数据导出）


## 性能优化方案

### 数据库优化

#### 索引策略

```sql
-- 高频查询字段索引
CREATE INDEX idx_sample_barcode ON samples(barcode);
CREATE INDEX idx_sample_status ON samples(status);
CREATE INDEX idx_sample_client ON samples(client_name);
CREATE INDEX idx_sample_created ON samples(created_at);

-- 复合索引
CREATE INDEX idx_sample_status_created ON samples(status, created_at);
CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id);

-- 全文搜索索引
CREATE INDEX idx_sample_search ON samples USING gin(to_tsvector('chinese', sample_name || ' ' || client_name));
```

#### 查询优化

- 使用 `SELECT` 指定需要的字段，避免 `SELECT *`
- 使用分页查询，避免一次性加载大量数据
- 使用 `JOIN` 代替 N+1 查询
- 使用 `EXPLAIN ANALYZE` 分析慢查询

#### 连接池配置

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 连接池配置
  pool: {
    min: 5,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
})
```

### 缓存策略

#### Redis 缓存层次

```typescript
// 1. 用户会话缓存（TTL: 15 分钟）
await redis.setex(`session:${userId}`, 900, JSON.stringify(session))

// 2. 权限缓存（TTL: 5 分钟）
await redis.setex(`permissions:${userId}`, 300, JSON.stringify(permissions))

// 3. 配置缓存（TTL: 1 小时）
await redis.setex(`config:workflow:${id}`, 3600, JSON.stringify(workflow))

// 4. 统计数据缓存（TTL: 10 分钟）
await redis.setex(`stats:${key}`, 600, JSON.stringify(stats))
```

#### 缓存失效策略

- **主动失效**：数据更新时立即删除相关缓存
- **被动失效**：设置合理的 TTL，自动过期
- **缓存预热**：系统启动时预加载常用数据
- **缓存穿透防护**：使用布隆过滤器或缓存空值

#### 缓存更新模式

```typescript
// Cache-Aside 模式
async function getSample(id: string): Promise<Sample> {
  // 1. 尝试从缓存获取
  const cached = await redis.get(`sample:${id}`)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 2. 缓存未命中，查询数据库
  const sample = await prisma.sample.findUnique({ where: { id } })
  
  // 3. 写入缓存
  if (sample) {
    await redis.setex(`sample:${id}`, 300, JSON.stringify(sample))
  }
  
  return sample
}

// 更新时删除缓存
async function updateSample(id: string, data: UpdateSampleDto): Promise<Sample> {
  const sample = await prisma.sample.update({
    where: { id },
    data,
  })
  
  // 删除缓存
  await redis.del(`sample:${id}`)
  
  return sample
}
```

### API 响应优化

#### 响应压缩

```typescript
import compression from 'compression'

app.use(compression({
  level: 6,                    // 压缩级别
  threshold: 1024,             // 大于 1KB 才压缩
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))
```

#### 分页优化

```typescript
interface PaginationQuery {
  page: number
  pageSize: number
  cursor?: string  // 游标分页
}

// 偏移分页（适合小数据量）
async function listSamplesOffset(query: PaginationQuery) {
  const { page, pageSize } = query
  const skip = (page - 1) * pageSize
  
  const [items, total] = await Promise.all([
    prisma.sample.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.sample.count()
  ])
  
  return { items, total, page, pageSize }
}

// 游标分页（适合大数据量）
async function listSamplesCursor(query: PaginationQuery) {
  const { pageSize, cursor } = query
  
  const items = await prisma.sample.findMany({
    take: pageSize + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' }
  })
  
  const hasMore = items.length > pageSize
  const nextCursor = hasMore ? items[pageSize - 1].id : null
  
  return {
    items: items.slice(0, pageSize),
    nextCursor,
    hasMore
  }
}
```

#### 字段选择

```typescript
// 允许客户端指定需要的字段
app.get('/api/samples', async (req, res) => {
  const fields = req.query.fields?.split(',') || []
  
  const select = fields.length > 0
    ? fields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    : undefined
  
  const samples = await prisma.sample.findMany({ select })
  
  res.json(samples)
})
```

### 异步处理

#### 任务队列

使用 `Bull` 队列处理耗时任务：

```typescript
import Queue from 'bull'

// 创建队列
const reportQueue = new Queue('report-generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  }
})

// 添加任务
async function generateReportAsync(sampleId: string, templateId: string) {
  const job = await reportQueue.add({
    sampleId,
    templateId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
  
  return { jobId: job.id }
}

// 处理任务
reportQueue.process(async (job) => {
  const { sampleId, templateId } = job.data
  
  // 生成报告
  const report = await reportService.generateReport(sampleId, templateId)
  
  // 通知前端
  await notificationService.notify(job.data.userId, {
    type: 'REPORT_READY',
    reportId: report.id
  })
  
  return report
})
```

#### 批量操作优化

```typescript
// 批量插入
async function batchInsertResults(results: CreateResultDto[]) {
  // 使用事务批量插入
  await prisma.$transaction(
    results.map(result => 
      prisma.result.create({ data: result })
    )
  )
}

// 批量更新
async function batchUpdateSamples(updates: Array<{ id: string, data: any }>) {
  await prisma.$transaction(
    updates.map(({ id, data }) =>
      prisma.sample.update({ where: { id }, data })
    )
  )
}
```

### 监控与调优

#### 性能监控

```typescript
import { performance } from 'perf_hooks'

// API 性能监控中间件
app.use((req, res, next) => {
  const start = performance.now()
  
  res.on('finish', () => {
    const duration = performance.now() - start
    
    // 记录慢请求
    if (duration > 1000) {
      logger.warn('Slow request', {
        method: req.method,
        path: req.path,
        duration,
        query: req.query
      })
    }
    
    // 记录指标
    metrics.recordApiDuration(req.path, duration)
  })
  
  next()
})
```

#### 数据库查询监控

```typescript
// Prisma 查询日志
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
})

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn('Slow query', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})
```


## 部署架构

### 容器化部署

#### Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# 构建应用
COPY . .
RUN npm run build
RUN npx prisma generate

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 只复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# 非 root 用户运行
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### Docker Compose 配置

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/lims
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=lims
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 高可用架构

```
                    ┌─────────────┐
                    │   用户请求   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ API 实例1│       │ API 实例2│       │ API 实例3│
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │PostgreSQL│       │  Redis   │       │  文件存储 │
   │  主从复制 │       │  集群    │       │   (S3)   │
   └─────────┘       └─────────┘       └─────────┘
```

### Kubernetes 部署

#### Deployment 配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lims-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lims-api
  template:
    metadata:
      labels:
        app: lims-api
    spec:
      containers:
      - name: api
        image: lims-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: lims-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: lims-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Service 配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: lims-api-service
spec:
  selector:
    app: lims-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### Ingress 配置

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lims-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.lims.example.com
    secretName: lims-tls
  rules:
  - host: api.lims.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: lims-api-service
            port:
              number: 80
```

### 环境配置

#### 开发环境

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/lims_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key
LOG_LEVEL=debug
```

#### 生产环境

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod-db:5432/lims
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=${JWT_SECRET}  # 从密钥管理服务获取
LOG_LEVEL=info
CORS_ORIGINS=https://lims.example.com
```

### 监控与日志

#### 健康检查端点

```typescript
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`
    
    // 检查 Redis 连接
    await redis.ping()
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})

app.get('/ready', async (req, res) => {
  // 检查应用是否准备好接收流量
  const isReady = await checkReadiness()
  
  if (isReady) {
    res.json({ status: 'ready' })
  } else {
    res.status(503).json({ status: 'not ready' })
  }
})
```

#### 日志聚合

使用 ELK Stack（Elasticsearch + Logstash + Kibana）或云服务（如 CloudWatch）：

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

#### 指标收集

使用 Prometheus + Grafana：

```typescript
import promClient from 'prom-client'

// 创建指标
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
})

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
})

// 暴露指标端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType)
  res.end(await promClient.register.metrics())
})
```

### 备份与恢复

#### 数据库备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lims_backup_$TIMESTAMP.sql"

# 执行备份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_FILE

# 上传到云存储
aws s3 cp $BACKUP_FILE.gz s3://lims-backups/

# 删除 7 天前的本地备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

#### 自动备份配置

```yaml
# Kubernetes CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-backup
spec:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dump $DATABASE_URL | gzip > /backup/backup_$(date +%Y%m%d).sql.gz
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
```

### CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: lims-api:${{ github.sha }}
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/lims-api \
            api=lims-api:${{ github.sha }}
          kubectl rollout status deployment/lims-api
```

## 总结

本设计文档为实验室管理系统后端 API 提供了完整的技术方案，涵盖了架构设计、数据模型、API 接口、安全机制、性能优化和部署策略。系统采用现代化的技术栈和最佳实践，确保了高性能、高可用和可扩展性。

通过属性测试和单元测试的双重测试策略，系统能够保证代码质量和业务逻辑的正确性。完善的安全设计和监控机制确保了系统的安全性和可维护性。

