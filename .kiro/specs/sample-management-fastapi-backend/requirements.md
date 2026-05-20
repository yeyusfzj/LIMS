# 需求文档

## 介绍

本文档定义了样品管理 FastAPI 后端服务的需求。该服务将作为独立的微服务运行，专门处理样品管理相关的业务逻辑，与现有的 Node.js/Express 后端并存，共享同一个 PostgreSQL 数据库。

### 业务背景

现有实验室管理系统使用 Node.js/Express 后端和 Vue.js 前端。为了实现技术栈多样化、提升特定模块的性能，以及为未来的微服务架构转型做准备，决定将样品管理模块迁移到 FastAPI 框架。

### 系统目标

1. 提供高性能的样品管理 API 服务
2. 与现有 Node.js 后端和 PostgreSQL 数据库无缝集成
3. 保持与前端 Vue.js 应用的兼容性
4. 支持未来的微服务架构演进

## 术语表

- **FastAPI_Service**: 基于 FastAPI 框架的样品管理后端服务
- **Node_Backend**: 现有的 Node.js/Express 后端服务
- **Database**: PostgreSQL 数据库实例
- **Sample**: 样品实体，包含条码、编号、客户信息等
- **Transfer**: 样品流转记录
- **API_Gateway**: API 网关（可选，用于路由请求）
- **Authentication_Token**: JWT 认证令牌
- **Prisma_Schema**: 数据库模型定义文件

## 需求

### 需求 1: 服务初始化和配置

**用户故事:** 作为系统管理员，我想要能够独立部署和配置 FastAPI 服务，以便与现有系统集成。

#### 验收标准

1. THE FastAPI_Service SHALL 使用独立的端口运行（默认 8000）
2. THE FastAPI_Service SHALL 从环境变量读取数据库连接配置
3. THE FastAPI_Service SHALL 从环境变量读取 JWT 密钥配置
4. THE FastAPI_Service SHALL 支持 CORS 配置以允许前端跨域访问
5. WHEN FastAPI_Service 启动时，THE FastAPI_Service SHALL 验证数据库连接是否可用
6. THE FastAPI_Service SHALL 提供健康检查端点 `/health`

### 需求 2: 数据库集成

**用户故事:** 作为开发人员，我想要 FastAPI 服务能够访问现有的 PostgreSQL 数据库，以便读写样品数据。

#### 验收标准

1. THE FastAPI_Service SHALL 使用 SQLAlchemy ORM 连接 PostgreSQL 数据库
2. THE FastAPI_Service SHALL 使用与 Prisma_Schema 兼容的数据模型定义
3. THE FastAPI_Service SHALL 支持数据库连接池管理
4. THE FastAPI_Service SHALL 在数据库操作失败时返回明确的错误信息
5. FOR ALL 数据库事务操作，THE FastAPI_Service SHALL 确保 ACID 特性
6. THE FastAPI_Service SHALL 使用与 Node_Backend 相同的表结构和字段命名

### 需求 3: 认证和授权

**用户故事:** 作为系统用户，我想要使用相同的认证令牌访问 FastAPI 服务，以便保持统一的用户体验。

#### 验收标准

1. THE FastAPI_Service SHALL 验证 JWT 格式的 Authentication_Token
2. THE FastAPI_Service SHALL 使用与 Node_Backend 相同的 JWT 密钥
3. WHEN Authentication_Token 无效或过期时，THE FastAPI_Service SHALL 返回 401 状态码
4. THE FastAPI_Service SHALL 从 Authentication_Token 中提取用户 ID 和角色信息
5. THE FastAPI_Service SHALL 实现基于角色的访问控制（RBAC）
6. FOR ALL 受保护的端点，THE FastAPI_Service SHALL 要求有效的 Authentication_Token

### 需求 4: 样品创建 API

**用户故事:** 作为实验室人员，我想要通过 API 创建新样品，以便记录样品信息。

#### 验收标准

1. WHEN 接收到有效的样品创建请求时，THE FastAPI_Service SHALL 生成唯一的条码
2. WHEN 接收到有效的样品创建请求时，THE FastAPI_Service SHALL 生成唯一的样品编号
3. THE FastAPI_Service SHALL 验证必填字段（客户名称、样品名称、数量、单位）
4. THE FastAPI_Service SHALL 将样品状态初始化为 REGISTERED
5. WHEN 样品创建成功时，THE FastAPI_Service SHALL 返回 201 状态码和完整的样品对象
6. IF 必填字段缺失或格式错误，THEN THE FastAPI_Service SHALL 返回 400 状态码和详细的验证错误信息
7. FOR ALL 样品创建操作，条码生成和样品编号生成 SHALL 遵循与 Node_Backend 相同的规则（格式：SP{YYYYMMDD}{6位序列号}）

### 需求 5: 样品查询 API

**用户故事:** 作为实验室人员，我想要查询样品列表和详情，以便查看样品信息。

#### 验收标准

1. THE FastAPI_Service SHALL 提供分页查询样品列表的端点
2. THE FastAPI_Service SHALL 支持按条码、样品编号、客户名称、样品类型、状态进行过滤
3. THE FastAPI_Service SHALL 支持按日期范围过滤样品
4. THE FastAPI_Service SHALL 默认排除已归档（ARCHIVED）状态的样品
5. THE FastAPI_Service SHALL 提供按 ID 查询单个样品详情的端点
6. WHEN 查询单个样品时，THE FastAPI_Service SHALL 包含关联的检测项、流转记录、审核任务等信息
7. THE FastAPI_Service SHALL 返回分页元数据（总数、页码、每页数量、总页数）

### 需求 6: 样品更新 API

**用户故事:** 作为实验室人员，我想要更新样品信息，以便修正或补充样品数据。

#### 验收标准

1. THE FastAPI_Service SHALL 提供更新样品信息的端点
2. THE FastAPI_Service SHALL 支持部分字段更新（PATCH 语义）
3. THE FastAPI_Service SHALL 验证更新字段的格式和有效性
4. IF 样品不存在，THEN THE FastAPI_Service SHALL 返回 404 状态码
5. WHEN 样品更新成功时，THE FastAPI_Service SHALL 返回更新后的完整样品对象
6. THE FastAPI_Service SHALL 记录更新时间戳
7. THE FastAPI_Service SHALL 防止更新系统生成的字段（条码、样品编号、创建时间）

### 需求 7: 样品状态管理 API

**用户故事:** 作为实验室人员，我想要更新样品状态，以便跟踪样品的生命周期。

#### 验收标准

1. THE FastAPI_Service SHALL 提供更新样品状态的专用端点
2. THE FastAPI_Service SHALL 验证状态值是否为有效的枚举值（REGISTERED, IN_TESTING, TESTING_COMPLETE, IN_AUDIT, AUDIT_COMPLETE, RELEASED, ARCHIVED）
3. THE FastAPI_Service SHALL 记录状态变更时间
4. WHEN 状态更新为 RELEASED 时，THE FastAPI_Service SHALL 记录放行时间和放行人
5. IF 状态转换不符合业务规则，THEN THE FastAPI_Service SHALL 返回 400 状态码和错误说明

### 需求 8: 样品流转 API

**用户故事:** 作为实验室人员，我想要记录样品流转，以便追踪样品位置和监管链。

#### 验收标准

1. THE FastAPI_Service SHALL 提供创建流转记录的端点
2. WHEN 创建流转记录时，THE FastAPI_Service SHALL 使用数据库事务确保流转记录创建和样品位置更新的原子性
3. THE FastAPI_Service SHALL 验证必填字段（样品 ID、起始位置、目标位置、交接人）
4. THE FastAPI_Service SHALL 将流转状态初始化为 PENDING
5. THE FastAPI_Service SHALL 更新样品的当前存储位置为目标位置
6. THE FastAPI_Service SHALL 提供发送方和接收方确认流转的端点
7. WHEN 双方都确认时，THE FastAPI_Service SHALL 更新流转状态为 RECEIVED
8. THE FastAPI_Service SHALL 提供查询样品完整监管链的端点

### 需求 9: 样品分样和合样 API

**用户故事:** 作为实验室人员，我想要进行分样和合样操作，以便处理样品的拆分和合并。

#### 验收标准

1. THE FastAPI_Service SHALL 提供分样操作的端点
2. WHEN 执行分样操作时，THE FastAPI_Service SHALL 使用数据库事务确保所有子样品创建的原子性
3. THE FastAPI_Service SHALL 为每个子样品生成唯一的条码和样品编号
4. THE FastAPI_Service SHALL 建立子样品与母样品的关联关系
5. THE FastAPI_Service SHALL 提供合样操作的端点
6. WHEN 执行合样操作时，THE FastAPI_Service SHALL 验证所有来源样品是否存在
7. THE FastAPI_Service SHALL 记录合样的来源样品 ID 列表
8. IF 来源样品状态为 ARCHIVED，THEN THE FastAPI_Service SHALL 拒绝合样操作

### 需求 10: 样品删除 API

**用户故事:** 作为实验室管理员，我想要删除样品，以便清理错误或测试数据。

#### 验收标准

1. THE FastAPI_Service SHALL 提供软删除样品的端点
2. WHEN 删除样品时，THE FastAPI_Service SHALL 将状态更新为 ARCHIVED 而不是物理删除
3. IF 样品已有审核任务或报告，THEN THE FastAPI_Service SHALL 拒绝删除操作并返回 400 状态码
4. THE FastAPI_Service SHALL 提供批量删除样品的端点
5. WHEN 批量删除时，THE FastAPI_Service SHALL 返回成功和失败的统计信息
6. THE FastAPI_Service SHALL 记录删除操作的审计日志

### 需求 11: API 文档和规范

**用户故事:** 作为开发人员，我想要查看完整的 API 文档，以便理解和使用 API。

#### 验收标准

1. THE FastAPI_Service SHALL 自动生成 OpenAPI 3.0 规范文档
2. THE FastAPI_Service SHALL 提供 Swagger UI 交互式文档界面（路径：`/docs`）
3. THE FastAPI_Service SHALL 提供 ReDoc 文档界面（路径：`/redoc`）
4. THE FastAPI_Service SHALL 在文档中包含所有端点的描述、参数、响应示例
5. THE FastAPI_Service SHALL 在文档中标注需要认证的端点
6. THE FastAPI_Service SHALL 提供 JSON 格式的 OpenAPI 规范文件（路径：`/openapi.json`）

### 需求 12: 错误处理和日志

**用户故事:** 作为开发人员，我想要清晰的错误信息和日志，以便调试和监控系统。

#### 验收标准

1. THE FastAPI_Service SHALL 返回统一格式的错误响应（包含错误代码、消息、详情）
2. THE FastAPI_Service SHALL 记录所有 API 请求的日志（包含请求 ID、方法、路径、状态码、响应时间）
3. THE FastAPI_Service SHALL 记录所有错误和异常的详细堆栈信息
4. THE FastAPI_Service SHALL 使用结构化日志格式（JSON）
5. THE FastAPI_Service SHALL 支持配置日志级别（DEBUG, INFO, WARNING, ERROR）
6. IF 发生未捕获的异常，THEN THE FastAPI_Service SHALL 返回 500 状态码和通用错误消息（不暴露内部实现细节）

### 需求 13: 性能和并发控制

**用户故事:** 作为系统管理员，我想要服务能够处理高并发请求，以便支持多用户同时操作。

#### 验收标准

1. THE FastAPI_Service SHALL 使用异步 I/O 处理数据库操作
2. THE FastAPI_Service SHALL 使用数据库连接池管理连接
3. THE FastAPI_Service SHALL 实现乐观锁机制防止并发更新冲突
4. WHEN 检测到版本冲突时，THE FastAPI_Service SHALL 返回 409 状态码
5. THE FastAPI_Service SHALL 支持配置最大并发连接数
6. FOR ALL 数据库查询，THE FastAPI_Service SHALL 使用索引优化查询性能

### 需求 14: 数据验证和序列化

**用户故事:** 作为开发人员，我想要自动的数据验证和序列化，以便确保数据一致性。

#### 验收标准

1. THE FastAPI_Service SHALL 使用 Pydantic 模型定义请求和响应数据结构
2. THE FastAPI_Service SHALL 自动验证请求数据的类型和格式
3. THE FastAPI_Service SHALL 自动序列化响应数据为 JSON 格式
4. IF 请求数据验证失败，THEN THE FastAPI_Service SHALL 返回 422 状态码和详细的验证错误列表
5. THE FastAPI_Service SHALL 支持日期时间的 ISO 8601 格式
6. THE FastAPI_Service SHALL 清洗输入数据（去除首尾空格）

### 需求 15: 与 Node.js 后端的兼容性

**用户故事:** 作为前端开发人员，我想要 FastAPI 服务的 API 与现有 Node.js 后端保持一致，以便最小化前端改动。

#### 验收标准

1. THE FastAPI_Service SHALL 使用与 Node_Backend 相同的 API 路径前缀（`/api/samples`）
2. THE FastAPI_Service SHALL 返回与 Node_Backend 相同格式的响应结构（`{ message, data, error }`）
3. THE FastAPI_Service SHALL 使用与 Node_Backend 相同的 HTTP 状态码约定
4. THE FastAPI_Service SHALL 使用与 Node_Backend 相同的错误代码（UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR 等）
5. THE FastAPI_Service SHALL 支持与 Node_Backend 相同的查询参数命名
6. FOR ALL 日期时间字段，THE FastAPI_Service SHALL 使用与 Node_Backend 相同的格式

### 需求 16: 条码和编号生成器

**用户故事:** 作为系统，我需要生成唯一的条码和样品编号，以便标识每个样品。

#### 验收标准

1. THE Barcode_Generator SHALL 生成格式为 `SP{YYYYMMDD}{6位序列号}` 的条码
2. THE Sample_Number_Generator SHALL 生成格式为 `{YYYY}{6位序列号}` 的样品编号
3. FOR ALL 条码生成操作，THE Barcode_Generator SHALL 查询数据库获取当天最大序列号并递增
4. FOR ALL 样品编号生成操作，THE Sample_Number_Generator SHALL 查询数据库获取当年最大序列号并递增
5. THE FastAPI_Service SHALL 在数据库事务中生成条码和编号以确保唯一性
6. IF 序列号达到最大值（999999），THEN THE FastAPI_Service SHALL 返回错误

### 需求 17: 监管链追踪

**用户故事:** 作为质量管理人员，我想要查看样品的完整监管链，以便确保样品流转的可追溯性。

#### 验收标准

1. THE FastAPI_Service SHALL 提供查询样品完整监管链的端点
2. THE FastAPI_Service SHALL 按时间顺序返回所有流转记录
3. THE FastAPI_Service SHALL 包含每次流转的起始位置、目标位置、交接人、时间戳
4. THE FastAPI_Service SHALL 包含每次流转的确认状态
5. FOR ALL 监管链查询，THE FastAPI_Service SHALL 验证样品是否存在
6. THE FastAPI_Service SHALL 支持导出监管链为 PDF 或 Excel 格式（可选）

### 需求 18: 限流和安全防护

**用户故事:** 作为系统管理员，我想要保护 API 免受滥用，以便确保服务稳定性。

#### 验收标准

1. THE FastAPI_Service SHALL 实现基于 IP 的请求限流
2. THE FastAPI_Service SHALL 实现基于用户的请求限流
3. WHEN 超过限流阈值时，THE FastAPI_Service SHALL 返回 429 状态码
4. THE FastAPI_Service SHALL 在响应头中包含 `Retry-After` 信息
5. THE FastAPI_Service SHALL 防止 SQL 注入攻击
6. THE FastAPI_Service SHALL 防止 XSS 攻击（清洗输入数据）
7. THE FastAPI_Service SHALL 使用 HTTPS 加密传输（生产环境）

### 需求 19: 部署和运维

**用户故事:** 作为运维人员，我想要能够轻松部署和监控 FastAPI 服务，以便确保服务可用性。

#### 验收标准

1. THE FastAPI_Service SHALL 提供 Docker 镜像
2. THE FastAPI_Service SHALL 提供 docker-compose 配置文件
3. THE FastAPI_Service SHALL 支持通过环境变量配置所有参数
4. THE FastAPI_Service SHALL 提供健康检查端点用于负载均衡器探测
5. THE FastAPI_Service SHALL 提供指标端点（Prometheus 格式）用于监控
6. THE FastAPI_Service SHALL 支持优雅关闭（处理完当前请求后关闭）

### 需求 20: 测试和质量保证

**用户故事:** 作为开发人员，我想要完整的测试覆盖，以便确保代码质量。

#### 验收标准

1. THE FastAPI_Service SHALL 包含单元测试覆盖所有服务层函数
2. THE FastAPI_Service SHALL 包含集成测试覆盖所有 API 端点
3. THE FastAPI_Service SHALL 包含属性测试验证条码生成的唯一性
4. THE FastAPI_Service SHALL 包含属性测试验证样品编号生成的唯一性
5. THE FastAPI_Service SHALL 包含属性测试验证流转操作的事务性
6. FOR ALL 属性测试，THE FastAPI_Service SHALL 生成随机测试数据并验证不变量
7. THE FastAPI_Service SHALL 达到至少 80% 的代码覆盖率

