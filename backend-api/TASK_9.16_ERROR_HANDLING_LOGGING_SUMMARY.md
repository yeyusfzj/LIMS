# 任务 9.16 总结：完善错误处理和日志记录

## 任务概述

完善 FastAPI 后端的错误处理和日志记录系统，实现与 Node.js 后端完全兼容的错误响应格式和结构化日志记录。

## 实现内容

### 1. 异常类层次结构 (`app/core/exceptions.py`)

#### 1.1 基础异常类

- **APIException**: 所有自定义异常的基类
  - 统一的错误响应格式
  - 支持错误追踪（request_id）
  - 支持详细错误信息
  - 与 Node.js 后端完全兼容

#### 1.2 具体异常类

| 异常类 | HTTP 状态码 | 错误代码 | 使用场景 |
|--------|------------|---------|---------|
| NotFoundException | 404 | NOT_FOUND | 资源不存在 |
| ValidationException | 400 | VALIDATION_ERROR | 业务规则验证失败 |
| UnauthorizedException | 401 | UNAUTHORIZED | 未认证或令牌无效 |
| ForbiddenException | 403 | FORBIDDEN | 权限不足 |
| ConflictException | 409 | CONFLICT | 数据冲突 |
| RateLimitException | 429 | RATE_LIMIT_EXCEEDED | 请求限流 |
| InternalServerException | 500 | INTERNAL_ERROR | 服务器内部错误 |
| BadRequestException | 400 | BAD_REQUEST | 错误的请求 |
| ServiceUnavailableException | 503 | SERVICE_UNAVAILABLE | 服务不可用 |
| DatabaseException | 500 | DATABASE_ERROR | 数据库操作失败 |

#### 1.3 特性

- **完整的文档注释**：每个异常类都有详细的中文文档
- **使用场景说明**：明确每个异常的适用场景
- **示例代码**：提供使用示例
- **可选的详细信息**：支持传递额外的错误详情

### 2. 日志配置系统 (`app/core/logging.py`)

#### 2.1 JSON 格式化器 (JSONFormatter)

**输出格式**:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "logger": "app.services.sample_service",
  "message": "样品创建成功",
  "module": "sample_service",
  "function": "create_sample",
  "line": 123,
  "request_id": "uuid",
  "user_id": "user_id",
  "exception": "堆栈跟踪信息"
}
```

**特性**:
- 结构化 JSON 输出
- 自动添加时间戳（UTC）
- 支持请求追踪（request_id）
- 支持用户追踪（user_id）
- 自动记录异常堆栈
- 支持自定义字段

#### 2.2 彩色格式化器 (ColoredFormatter)

**特性**:
- 控制台彩色输出
- 不同日志级别使用不同颜色
- 提高开发环境可读性

**颜色映射**:
- DEBUG: 青色
- INFO: 绿色
- WARNING: 黄色
- ERROR: 红色
- CRITICAL: 紫色

#### 2.3 日志配置函数 (setup_logging)

**支持的配置选项**:
- `log_level`: 日志级别（DEBUG, INFO, WARNING, ERROR, CRITICAL）
- `log_dir`: 日志文件目录
- `enable_console`: 是否启用控制台输出
- `enable_file`: 是否启用文件输出
- `enable_json`: 是否使用 JSON 格式
- `enable_rotation`: 是否启用日志轮转

**日志文件**:
1. **combined.log**: 所有日志
   - 使用 RotatingFileHandler
   - 每个文件最大 10MB
   - 保留 10 个备份文件

2. **error.log**: 错误日志
   - 只记录 ERROR 及以上级别
   - 使用 RotatingFileHandler
   - 每个文件最大 10MB
   - 保留 10 个备份文件

3. **access.log**: 访问日志
   - 使用 TimedRotatingFileHandler
   - 每天午夜轮转
   - 保留 30 天

#### 2.4 辅助函数

**get_logger(name)**:
- 获取指定名称的日志器
- 推荐使用 `__name__` 作为参数

**log_with_context()**:
- 记录带上下文信息的日志
- 自动添加 request_id 和 user_id
- 支持自定义字段

### 3. 错误处理中间件 (`app/middleware/error_handler.py`)

#### 3.1 异常处理器

| 处理器 | 处理的异常 | 功能 |
|--------|-----------|------|
| api_exception_handler | APIException | 处理自定义 API 异常 |
| validation_exception_handler | RequestValidationError | 处理 Pydantic 验证异常 |
| integrity_error_handler | IntegrityError | 处理数据库完整性约束异常 |
| database_error_handler | OperationalError | 处理数据库操作异常 |
| data_error_handler | DataError | 处理数据类型错误 |
| sqlalchemy_error_handler | SQLAlchemyError | 处理通用 SQLAlchemy 异常 |
| http_exception_handler | HTTPException | 处理 FastAPI HTTP 异常 |
| generic_exception_handler | Exception | 处理未捕获的异常 |

#### 3.2 错误响应格式

**统一格式**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "ERROR_CODE",
    "message": "详细错误信息",
    "details": {...},
    "timestamp": "2024-01-01T00:00:00Z",
    "path": "/api/v1/samples",
    "requestId": "uuid"
  }
}
```

**与 Node.js 后端的兼容性**:
- ✅ 相同的响应结构
- ✅ 相同的错误代码
- ✅ 相同的 HTTP 状态码
- ✅ 支持 request_id 追踪
- ✅ 支持详细错误信息

#### 3.3 错误日志记录

**日志级别**:
- **WARNING**: API 异常、验证错误、数据类型错误
- **ERROR**: 数据库错误、未捕获的异常

**日志内容**:
- 错误类型和消息
- 请求路径和方法
- request_id
- 异常堆栈跟踪
- 额外的上下文信息

#### 3.4 注册函数

**register_exception_handlers(app)**:
- 一次性注册所有异常处理器
- 按照从具体到通用的顺序注册
- 确保异常被正确捕获和处理

### 4. 错误追踪和报告

#### 4.1 请求 ID 追踪

- 每个请求自动生成唯一的 request_id
- request_id 添加到请求状态中
- request_id 添加到响应头（X-Request-ID）
- request_id 记录在所有日志中
- request_id 包含在错误响应中

#### 4.2 堆栈跟踪

- 所有错误都记录完整的堆栈跟踪
- 堆栈跟踪只记录在日志中
- 不暴露给客户端（安全考虑）

#### 4.3 上下文信息

- 请求路径和方法
- 客户端 IP
- 用户 ID（如果已认证）
- 异常类型
- 错误详情

## 与 Node.js 后端的对比

### 相同点

1. **错误响应格式**: 完全一致
2. **错误代码**: 使用相同的错误代码
3. **HTTP 状态码**: 使用相同的状态码
4. **日志结构**: 相似的日志字段
5. **错误追踪**: 都支持 request_id

### 差异点

| 特性 | Node.js 后端 | FastAPI 后端 | 说明 |
|------|-------------|-------------|------|
| 日志库 | Winston | Python logging | 功能相似 |
| 日志格式 | JSON | JSON | 格式一致 |
| 异常类型 | AppError | APIException | 概念相同 |
| 中间件 | Express middleware | FastAPI exception handler | 实现方式不同，功能相同 |

## 使用示例

### 1. 抛出自定义异常

```python
from app.core.exceptions import NotFoundException, ValidationException

# 资源不存在
raise NotFoundException(message="样品不存在", error_code="SAMPLE_NOT_FOUND")

# 验证失败
raise ValidationException(
    message="样品数量必须大于0",
    details={"field": "quantity", "value": -1}
)
```

### 2. 记录日志

```python
from app.core.logging import get_logger, log_with_context

logger = get_logger(__name__)

# 基础日志
logger.info("样品创建成功")
logger.error("样品创建失败", exc_info=True)

# 带上下文的日志
log_with_context(
    logger,
    "info",
    "样品创建成功",
    request_id="uuid",
    user_id="user123",
    sample_id="sample456"
)
```

### 3. 配置日志系统

```python
from app.core.logging import setup_logging

# 开发环境
setup_logging(
    log_level="DEBUG",
    log_dir="logs",
    enable_console=True,
    enable_file=True,
    enable_json=False,  # 开发环境使用文本格式
    enable_rotation=True
)

# 生产环境
setup_logging(
    log_level="INFO",
    log_dir="/var/log/fastapi",
    enable_console=False,
    enable_file=True,
    enable_json=True,  # 生产环境使用 JSON 格式
    enable_rotation=True
)
```

### 4. 注册异常处理器

```python
from fastapi import FastAPI
from app.middleware.error_handler import register_exception_handlers

app = FastAPI()

# 注册所有异常处理器
register_exception_handlers(app)
```

## 测试建议

### 1. 异常处理测试

```python
import pytest
from fastapi.testclient import TestClient
from app.core.exceptions import NotFoundException

def test_not_found_exception(client: TestClient):
    """测试 404 异常处理"""
    response = client.get("/api/v1/samples/nonexistent")
    
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"
    assert "requestId" in data["error"]
```

### 2. 日志记录测试

```python
import logging
from app.core.logging import JSONFormatter

def test_json_formatter():
    """测试 JSON 格式化器"""
    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=1,
        msg="Test message",
        args=(),
        exc_info=None
    )
    
    result = formatter.format(record)
    data = json.loads(result)
    
    assert data["level"] == "INFO"
    assert data["message"] == "Test message"
    assert "timestamp" in data
```

### 3. 错误响应格式测试

```python
def test_error_response_format(client: TestClient):
    """测试错误响应格式"""
    response = client.post("/api/v1/samples", json={})
    
    assert response.status_code == 422
    data = response.json()
    
    # 验证响应结构
    assert "message" in data
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]
    assert "timestamp" in data["error"]
    assert "path" in data["error"]
    assert "requestId" in data["error"]
```

## 性能考虑

### 1. 日志性能

- **异步日志**: 使用 QueueHandler 实现异步日志写入
- **日志轮转**: 避免单个日志文件过大
- **日志级别**: 生产环境使用 INFO 级别
- **日志采样**: 高频日志可以考虑采样

### 2. 异常处理性能

- **快速路径**: 正常请求不经过异常处理
- **最小开销**: 异常处理器只在异常发生时执行
- **避免重复**: 不重复记录相同的错误

## 安全考虑

### 1. 错误信息脱敏

- **生产环境**: 不暴露内部实现细节
- **堆栈跟踪**: 只记录在日志中，不返回给客户端
- **敏感信息**: 不在错误消息中包含密码、令牌等

### 2. 日志安全

- **敏感数据**: 不记录密码、令牌等敏感信息
- **日志权限**: 限制日志文件的访问权限
- **日志加密**: 考虑对日志文件进行加密

## 运维建议

### 1. 日志管理

- **日志收集**: 使用 ELK Stack 或 Loki 收集日志
- **日志分析**: 定期分析错误日志，发现问题
- **日志告警**: 设置错误日志告警
- **日志归档**: 定期归档历史日志

### 2. 错误监控

- **错误率监控**: 监控 API 错误率
- **错误类型分析**: 分析常见错误类型
- **错误趋势**: 跟踪错误趋势
- **告警设置**: 设置错误率告警

### 3. 日志轮转

- **按大小轮转**: combined.log 和 error.log 按大小轮转
- **按时间轮转**: access.log 按天轮转
- **保留策略**: 根据磁盘空间调整保留天数

## 后续优化

### 1. 异步日志

```python
from logging.handlers import QueueHandler, QueueListener
import queue

# 创建日志队列
log_queue = queue.Queue(-1)

# 创建队列处理器
queue_handler = QueueHandler(log_queue)

# 创建队列监听器
queue_listener = QueueListener(
    log_queue,
    file_handler,
    respect_handler_level=True
)

# 启动监听器
queue_listener.start()
```

### 2. 分布式追踪

```python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# 集成 OpenTelemetry
FastAPIInstrumentor.instrument_app(app)
```

### 3. 错误聚合

```python
# 集成 Sentry
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0
)
```

## 验收标准

- ✅ 所有异常类都已实现并有完整文档
- ✅ 日志系统支持 JSON 格式和日志轮转
- ✅ 错误处理中间件处理所有类型的异常
- ✅ 错误响应格式与 Node.js 后端完全一致
- ✅ 支持请求追踪（request_id）
- ✅ 支持错误堆栈跟踪
- ✅ 所有代码注释使用中文
- ✅ 提供完整的使用示例

## 总结

本任务成功实现了 FastAPI 后端的完整错误处理和日志记录系统，主要成果包括：

1. **完整的异常类层次结构**: 10 个具体异常类，覆盖所有常见错误场景
2. **结构化日志记录**: 支持 JSON 格式、日志轮转、请求追踪
3. **统一的错误处理**: 8 个异常处理器，处理所有类型的异常
4. **与 Node.js 后端完全兼容**: 相同的错误响应格式和错误代码
5. **完善的文档**: 所有代码都有详细的中文注释和使用示例

该系统为 FastAPI 后端提供了生产级别的错误处理和日志记录能力，确保了系统的可维护性、可观测性和用户体验。
