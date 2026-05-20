# 限流保护指南

## 概述

FastAPI 后端实现了完善的限流保护机制，防止 API 滥用、暴力破解和 DDoS 攻击。限流系统支持全局限流和端点级限流，并提供了灵活的配置选项。

## 限流策略

### 1. 全局限流

**默认配置**: 每分钟 60 次请求

所有 API 端点都受到全局限流保护，基于客户端 IP 地址进行限制。

**配置方式**:
```python
# app/config.py
RATE_LIMIT_PER_MINUTE: int = 60
```

**环境变量**:
```bash
RATE_LIMIT_PER_MINUTE=60
```

### 2. 端点级限流

针对特定端点设置更严格的限流规则：

| 端点 | 限流规则 | 说明 |
|------|---------|------|
| `/api/v1/auth/login` | 5 次/分钟 | 防止暴力破解 |
| `/api/v1/auth/refresh` | 10 次/分钟 | 防止令牌滥用 |
| `/api/users/` (POST) | 10 次/分钟 | 防止批量创建用户 |
| `/api/users/{id}/reset-password` | 5 次/分钟 | 防止密码重置滥用 |

### 3. 敏感操作限流

以下操作受到严格限流保护：

- **用户认证**: 登录、刷新令牌
- **用户管理**: 创建用户、重置密码
- **权限管理**: 分配角色、修改权限
- **数据导出**: 批量导出数据

## 实现方式

### 1. 全局限流中间件

使用自定义中间件实现全局限流：

```python
# app/middleware/rate_limit.py
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    全局限流中间件
    
    特性：
    - 基于 IP 地址的限流
    - 支持内存和 Redis 两种存储方式
    - 滑动窗口算法
    - 自动清理过期记录
    """
```

**内存模式**（开发环境）:
- 使用 Python 字典存储请求记录
- 滑动窗口算法
- 自动清理过期记录

**Redis 模式**（生产环境）:
- 使用 Redis 存储请求计数
- 利用 Redis 的过期键特性
- 支持分布式部署

### 2. 端点级限流装饰器

使用 `slowapi` 库实现端点级限流：

```python
from app.middleware.rate_limit import limiter

@router.post("/login")
@limiter.limit("5/minute")  # 每分钟 5 次
async def login(request: Request, ...):
    """用户登录"""
    pass
```

## 响应格式

### 正常响应

所有响应都包含限流信息头：

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1678901234
```

**响应头说明**:
- `X-RateLimit-Limit`: 时间窗口内允许的最大请求数
- `X-RateLimit-Remaining`: 剩余可用请求数
- `X-RateLimit-Reset`: 限流重置时间（Unix 时间戳）

### 限流响应

当超过限流时，返回 429 状态码：

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1678901234
Retry-After: 45

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请在 45 秒后重试",
    "details": "限流规则: 5 次请求/60 秒"
  }
}
```

**响应头说明**:
- `Retry-After`: 需要等待的秒数

## 配置指南

### 1. 修改全局限流

编辑 `.env` 文件：

```bash
# 每分钟允许的请求数
RATE_LIMIT_PER_MINUTE=100
```

### 2. 添加端点级限流

在路由文件中添加装饰器：

```python
from fastapi import Request
from app.middleware.rate_limit import limiter

@router.post("/sensitive-operation")
@limiter.limit("10/minute")  # 每分钟 10 次
async def sensitive_operation(request: Request, ...):
    """敏感操作"""
    pass
```

### 3. 配置 Redis 存储

编辑 `.env` 文件：

```bash
# Redis 配置
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

修改 `app/main.py`：

```python
from app.core.redis import get_redis_client

# 获取 Redis 客户端
redis_client = await get_redis_client()

# 添加限流中间件（使用 Redis）
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.RATE_LIMIT_PER_MINUTE,
    window_size=60,
    redis_client=redis_client  # 传入 Redis 客户端
)
```

### 4. 自定义端点限流规则

修改 `app/middleware/rate_limit.py`：

```python
# 端点级限流配置
self.endpoint_limits: Dict[str, Tuple[int, int]] = {
    "/api/v1/auth/login": (5, 60),  # 登录：每分钟 5 次
    "/api/v1/auth/refresh": (10, 60),  # 刷新：每分钟 10 次
    "/api/custom/endpoint": (20, 60),  # 自定义端点：每分钟 20 次
}
```

## 客户端 IP 识别

限流系统按以下优先级识别客户端 IP：

1. `X-Forwarded-For` 头（代理/负载均衡器）
2. `X-Real-IP` 头（Nginx）
3. `request.client.host`（直连）

**Nginx 配置示例**:

```nginx
location / {
    proxy_pass http://fastapi_backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 监控和日志

### 1. 限流日志

当触发限流时，系统会记录警告日志：

```
WARNING - Rate limit exceeded for IP 192.168.1.100 on /api/v1/auth/login: limit=5/60s
```

### 2. 监控指标

使用 Prometheus 监控限流情况：

```python
# 限流触发次数
rate_limit_exceeded_total{endpoint="/api/v1/auth/login"} 15

# 限流拒绝率
rate_limit_rejection_rate{endpoint="/api/v1/auth/login"} 0.05
```

### 3. 查询限流状态

通过 Redis 查询当前限流状态：

```bash
# 查看所有限流键
redis-cli KEYS "rate_limit:*"

# 查看特定 IP 的限流状态
redis-cli GET "rate_limit:192.168.1.100:/api/v1/auth/login"

# 查看键的过期时间
redis-cli TTL "rate_limit:192.168.1.100:/api/v1/auth/login"
```

## 最佳实践

### 1. 开发环境

- 使用内存存储（默认）
- 设置较宽松的限流规则
- 启用详细日志

```python
# 开发环境配置
RATE_LIMIT_PER_MINUTE=1000
LOG_LEVEL=DEBUG
```

### 2. 生产环境

- 使用 Redis 存储
- 设置合理的限流规则
- 启用监控和告警

```python
# 生产环境配置
RATE_LIMIT_PER_MINUTE=60
REDIS_URL=redis://redis:6379/0
LOG_LEVEL=INFO
```

### 3. 白名单

对于可信的 IP 地址，可以跳过限流：

```python
# app/middleware/rate_limit.py
WHITELIST_IPS = ["127.0.0.1", "10.0.0.0/8"]

async def dispatch(self, request: Request, call_next):
    client_ip = self._get_client_ip(request)
    
    # 检查白名单
    if client_ip in WHITELIST_IPS:
        return await call_next(request)
    
    # 正常限流逻辑
    ...
```

### 4. 动态限流

根据用户角色或订阅级别设置不同的限流规则：

```python
async def dispatch(self, request: Request, call_next):
    # 获取用户信息
    user = await get_current_user(request)
    
    # 根据用户角色设置限流
    if user.role == "admin":
        requests_limit = 1000  # 管理员：更高限制
    elif user.role == "premium":
        requests_limit = 200  # 高级用户
    else:
        requests_limit = 60  # 普通用户
    
    # 应用限流
    ...
```

## 故障排查

### 1. 限流过于严格

**症状**: 正常用户频繁收到 429 错误

**解决方案**:
- 增加全局限流配置
- 检查端点级限流规则
- 查看日志确认触发原因

### 2. 限流不生效

**症状**: 恶意请求未被限制

**解决方案**:
- 检查中间件是否正确注册
- 验证 IP 识别是否正确
- 检查 Redis 连接状态

### 3. Redis 连接失败

**症状**: 限流功能降级到内存模式

**解决方案**:
- 检查 Redis 服务状态
- 验证 Redis 连接配置
- 查看错误日志

## 性能考虑

### 1. 内存模式

**优点**:
- 简单易用
- 无外部依赖
- 低延迟

**缺点**:
- 不支持分布式
- 重启后数据丢失
- 内存占用随 IP 数量增长

**适用场景**: 开发环境、单实例部署

### 2. Redis 模式

**优点**:
- 支持分布式部署
- 数据持久化
- 高性能

**缺点**:
- 需要 Redis 服务
- 网络延迟
- 额外的运维成本

**适用场景**: 生产环境、多实例部署

## 安全建议

1. **合理设置限流规则**: 既要防止滥用，又要保证正常用户体验
2. **监控限流触发**: 及时发现异常流量
3. **结合其他安全措施**: 限流只是防护的一部分，还需要配合认证、授权、输入验证等
4. **定期审查规则**: 根据实际使用情况调整限流配置
5. **记录审计日志**: 保留限流触发记录用于安全分析

## 参考资料

- [FastAPI 中间件文档](https://fastapi.tiangolo.com/tutorial/middleware/)
- [slowapi 文档](https://github.com/laurentS/slowapi)
- [Redis 限流算法](https://redis.io/docs/manual/patterns/rate-limiter/)
- [OWASP API 安全](https://owasp.org/www-project-api-security/)
