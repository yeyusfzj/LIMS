# AI Agent 日志系统

本文档介绍 AI Agent 日志系统的功能和使用方法。

## 功能概述

日志系统提供以下功能：

1. **请求日志记录** (需求 13.1)
   - 记录所有 API 请求
   - 包含端点、方法、用户标识和请求参数

2. **响应日志记录** (需求 13.2)
   - 记录所有 API 响应
   - 包含状态码和响应时间

3. **错误日志记录** (需求 13.3)
   - 记录所有错误和异常
   - 包含错误类型、错误消息和堆栈跟踪

4. **处理耗时记录** (需求 13.7)
   - 自动记录每个请求的处理时间（毫秒）

5. **日志格式** (需求 13.4, 13.5, 13.6)
   - 时间戳：精确到秒
   - 日志级别：INFO, WARNING, ERROR
   - 模块名称：标识日志来源
   - 用户标识：追踪用户操作
   - 操作类型：request, response, error

6. **日志轮转** (需求 13.8, 13.9)
   - 文件大小限制：100MB
   - 自动创建新日志文件
   - 保留最近 30 天的日志

7. **日志查询接口** (需求 13.10)
   - 按时间范围查询
   - 按日志级别过滤
   - 按操作类型过滤
   - 日志统计信息

## 日志文件位置

日志文件存储在 `logs/` 目录下：

```
logs/
├── agent.log          # 当前日志文件
├── agent.log.1        # 轮转后的日志文件
├── agent.log.2
└── ...
```

## 日志格式示例

### 请求日志
```
2026-05-06 10:30:00 - ai_agent - INFO - logger - REQUEST - {"type": "request", "endpoint": "/api/agent/parse", "method": "POST", "user_id": "user123", "params": {"text_length": 50}}
```

### 响应日志
```
2026-05-06 10:30:01 - ai_agent - INFO - logger - RESPONSE - {"type": "response", "endpoint": "/api/agent/parse", "status_code": 200, "duration_ms": 125.5, "user_id": "user123"}
```

### 错误日志
```
2026-05-06 10:30:02 - ai_agent - ERROR - logger - ERROR - {"type": "error", "endpoint": "/api/agent/parse", "error_type": "ValueError", "error_message": "输入文本不能为空", "user_id": "user123", "stack_trace": "Traceback..."}
```

## 使用方法

### 1. 在代码中使用日志记录器

```python
from app.agent.logger import get_agent_logger

# 获取日志记录器
logger = get_agent_logger()

# 记录请求
logger.log_request(
    endpoint="/api/agent/parse",
    method="POST",
    user_id="user123",
    params={"text": "实验需求"}
)

# 记录响应
logger.log_response(
    endpoint="/api/agent/parse",
    status_code=200,
    duration_ms=125.5,
    user_id="user123"
)

# 记录错误
logger.log_error(
    endpoint="/api/agent/parse",
    error_type="ValueError",
    error_message="输入文本不能为空",
    user_id="user123",
    stack_trace="Traceback..."
)

# 记录普通日志
logger.info("处理完成")
logger.warning("警告信息")
logger.error("错误信息")
```

### 2. 使用装饰器自动记录日志

```python
from app.agent.logger import log_api_call

@log_api_call
async def my_endpoint(request: Request):
    # 自动记录请求、响应、错误和处理耗时
    return {"result": "success"}
```

### 3. 查询日志

#### 通过 API 查询

```bash
# 查询所有日志
curl http://localhost:8000/api/agent/logs?limit=100

# 查询错误日志
curl http://localhost:8000/api/agent/logs?level=ERROR&limit=50

# 查询特定时间范围的日志
curl "http://localhost:8000/api/agent/logs?start_time=2026-05-06T10:00:00&end_time=2026-05-06T11:00:00"

# 查询特定操作类型的日志
curl http://localhost:8000/api/agent/logs?operation_type=error&limit=50
```

#### 通过代码查询

```python
from app.agent.logger import LogQuery
from datetime import datetime, timedelta

# 创建查询工具
log_query = LogQuery()

# 查询最近 1 小时的日志
end_time = datetime.now()
start_time = end_time - timedelta(hours=1)
logs = log_query.query_logs(
    start_time=start_time,
    end_time=end_time,
    limit=100
)

# 查询错误日志
error_logs = log_query.query_logs(level="ERROR", limit=50)

# 查询请求日志
request_logs = log_query.query_logs(operation_type="request", limit=50)

# 获取统计信息
stats = log_query.get_statistics()
print(f"总日志数: {stats['total_logs']}")
print(f"错误数: {stats['error_count']}")
print(f"平均响应时间: {stats['avg_duration_ms']} ms")
```

### 4. 获取日志统计信息

```bash
# 通过 API 获取统计信息
curl http://localhost:8000/api/agent/logs/statistics

# 获取特定时间范围的统计信息
curl "http://localhost:8000/api/agent/logs/statistics?start_time=2026-05-06T10:00:00&end_time=2026-05-06T11:00:00"
```

响应示例：
```json
{
    "total_logs": 1000,
    "by_level": {
        "INFO": 850,
        "WARNING": 100,
        "ERROR": 50
    },
    "by_operation": {
        "request": 400,
        "response": 400,
        "error": 50
    },
    "avg_duration_ms": 125.5,
    "error_count": 50
}
```

### 5. 清理旧日志

```python
from app.agent.logger import LogQuery

# 创建查询工具
log_query = LogQuery()

# 清理 30 天前的日志
log_query.cleanup_old_logs(days=30)
```

## 配置选项

日志系统的配置在 `app/agent/logger.py` 中：

```python
# 日志目录
LOG_DIR = Path("logs")

# 日志文件名
LOG_FILE = "agent.log"

# 日志文件大小限制（100MB）
LOG_MAX_BYTES = 100 * 1024 * 1024

# 保留日志文件数量（30 天）
LOG_BACKUP_COUNT = 30

# 日志格式
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(message)s"

# 日志时间格式
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
```

## 性能考虑

1. **轻量级设计**：日志系统设计为轻量级，不会显著影响 API 性能
2. **异步写入**：日志写入是异步的，不会阻塞请求处理
3. **自动轮转**：日志文件自动轮转，避免单个文件过大
4. **查询限制**：日志查询 API 限制返回数量，避免内存溢出

## 监控和告警

建议配合监控系统使用：

1. **错误率监控**：监控 ERROR 级别日志的数量
2. **响应时间监控**：监控平均响应时间（avg_duration_ms）
3. **日志文件大小监控**：监控日志文件大小，确保轮转正常工作
4. **磁盘空间监控**：监控日志目录的磁盘空间使用情况

## 故障排查

### 日志文件不存在

如果日志文件不存在，系统会自动创建 `logs/` 目录和日志文件。

### 日志轮转不工作

检查以下配置：
- `LOG_MAX_BYTES`：确保设置正确
- `LOG_BACKUP_COUNT`：确保设置正确
- 文件权限：确保应用有写入权限

### 日志查询慢

如果日志查询慢，可以：
- 减少查询的时间范围
- 减少返回的日志数量（limit 参数）
- 使用更具体的过滤条件

## 验证需求

本日志系统实现了以下需求：

- ✅ 需求 13.1：记录请求日志
- ✅ 需求 13.2：记录响应日志
- ✅ 需求 13.3：记录错误日志
- ✅ 需求 13.4：记录时间戳
- ✅ 需求 13.5：记录用户标识
- ✅ 需求 13.6：记录操作类型
- ✅ 需求 13.7：记录处理耗时
- ✅ 需求 13.8：日志文件大小限制（100MB）
- ✅ 需求 13.9：保留最近 30 天的日志
- ✅ 需求 13.10：提供日志查询接口

## 测试

运行日志系统测试：

```bash
# 运行单元测试
pytest tests/test_logger.py -v

# 运行集成测试
pytest tests/test_agent_logging_integration.py -v

# 运行所有日志相关测试
pytest tests/test_logger.py tests/test_agent_logging_integration.py -v
```

## 相关文件

- `app/agent/logger.py` - 日志系统核心模块
- `app/agent/routes.py` - API 路由（集成了日志记录）
- `tests/test_logger.py` - 单元测试
- `tests/test_agent_logging_integration.py` - 集成测试
- `logs/` - 日志文件目录
