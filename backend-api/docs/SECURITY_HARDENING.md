# 安全加固指南

本文档总结了 FastAPI 后端实施的所有安全加固措施,确保系统的安全性。

## 概述

安全加固是保护系统免受攻击的重要措施。本项目实施了多层安全防护,包括:

1. **数据加密** - 敏感数据加密存储
2. **密码安全** - 强密码策略和安全哈希
3. **认证授权** - JWT 令牌和 RBAC 权限控制
4. **输入验证** - 防止 SQL 注入和 XSS 攻击
5. **CORS 配置** - 限制跨域访问
6. **限流保护** - 防止暴力破解和 DDoS 攻击
7. **HTTPS 传输** - 加密数据传输
8. **审计日志** - 记录所有关键操作

## 1. 数据加密

### 1.1 加密算法

使用 **AES-256-GCM** 加密算法,提供:
- 256 位密钥长度
- 认证加密(AEAD)
- 防止篡改和重放攻击

### 1.2 实现位置

**文件:** `app/core/encryption.py`

**功能:**
- `encrypt(data)` - 加密数据
- `decrypt(encrypted_data)` - 解密数据
- `encrypt_sensitive_field(value)` - 加密敏感字段
- `decrypt_sensitive_field(encrypted_value)` - 解密敏感字段

### 1.3 使用示例

```python
from app.core.encryption import EncryptionUtils

# 加密敏感数据
encrypted = EncryptionUtils.encrypt("敏感信息")

# 解密数据
decrypted = EncryptionUtils.decrypt(encrypted)

# 加密数据库字段
user.id_card = EncryptionUtils.encrypt_sensitive_field(id_card_number)
```

### 1.4 密钥管理

**环境变量:**
- `ENCRYPTION_KEY` - 数据加密密钥(32 字节)
- `SIGNATURE_ENCRYPTION_KEY` - 签名数据加密密钥(32 字节)

**最佳实践:**
- 使用强随机密钥
- 定期轮换密钥
- 使用密钥管理服务(如 AWS KMS, Azure Key Vault)
- 不要在代码中硬编码密钥

### 1.5 敏感数据字段

以下字段应加密存储:
- 身份证号
- 手机号
- 银行卡号
- 电子签名数据
- 其他个人隐私信息

## 2. 密码安全

### 2.1 密码哈希

使用 **bcrypt** 算法进行密码哈希:
- 自适应哈希函数
- 内置盐值(salt)
- 防止彩虹表攻击
- 计算成本可调

**实现位置:** `app/services/auth_service.py`

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 哈希密码
hashed = pwd_context.hash(password)

# 验证密码
is_valid = pwd_context.verify(plain_password, hashed_password)
```

### 2.2 密码强度验证

**实现位置:** `app/utils/password_validator.py`

**密码要求:**
- 最小长度: 8 个字符
- 必须包含大写字母
- 必须包含小写字母
- 必须包含数字
- 必须包含特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)
- 不能使用常见弱密码
- 不能包含用户名
- 不能包含连续字符序列(如 abc, 123)
- 不能包含过多重复字符

**使用示例:**

```python
from app.utils.password_validator import validate_password_strength

# 验证密码强度
validate_password_strength(password, username)  # 抛出异常如果不符合要求
```

**密码强度等级:**
- `weak` - 弱密码
- `medium` - 中等强度
- `strong` - 强密码
- `very_strong` - 非常强的密码

### 2.3 密码策略

**实施位置:**
- 用户注册: `app/services/user_service.py` - `create_user()`
- 密码修改: `app/services/user_service.py` - `change_password()`
- 密码重置: `app/routers/users.py` - `reset_password()`

**建议:**
- 定期提醒用户更换密码(90 天)
- 记录密码历史,防止重复使用
- 实施账户锁定策略(多次失败登录)
- 提供密码强度指示器

## 3. 认证和授权

### 3.1 JWT 认证

**实现位置:** `app/core/security.py`

**令牌类型:**
- **访问令牌 (Access Token)** - 有效期 15 分钟
- **刷新令牌 (Refresh Token)** - 有效期 7 天

**令牌结构:**
```json
{
  "userId": "user-id",
  "username": "username",
  "roles": ["role1", "role2"],
  "jti": "token-id",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**安全特性:**
- 令牌签名验证
- 令牌过期检查
- 令牌撤销(黑名单)
- 令牌轮换(刷新时生成新令牌)

### 3.2 RBAC 权限控制

**实现位置:** `app/core/permissions.py`

**权限模型:**
- **权限 (Permission)** - 资源:操作 (如 sample:create)
- **角色 (Role)** - 权限集合
- **用户 (User)** - 角色集合

**使用示例:**

```python
from app.core.permissions import PermissionChecker

@router.post("/samples")
async def create_sample(
    data: SampleCreate,
    user: User = Depends(PermissionChecker("sample", "create"))
):
    # 只有具有 sample:create 权限的用户才能访问
    pass
```

### 3.3 会话管理

**特性:**
- 令牌存储在 Redis 中
- 登出时撤销令牌
- 支持单点登出
- 支持多设备登录管理

## 4. 输入验证

### 4.1 Pydantic 数据验证

FastAPI 使用 Pydantic 进行自动数据验证:

```python
from pydantic import BaseModel, Field, field_validator

class SampleCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    quantity: float = Field(..., gt=0)
    
    @field_validator('client_name')
    @classmethod
    def strip_strings(cls, v):
        return v.strip() if isinstance(v, str) else v
```

**验证类型:**
- 类型验证(字符串、数字、日期等)
- 长度验证(最小/最大长度)
- 范围验证(最小/最大值)
- 格式验证(邮箱、URL 等)
- 自定义验证器

### 4.2 输入清洗

**实现位置:** `app/utils/input_sanitizer.py`

**功能:**
- `sanitize_html(text)` - 清洗 HTML 内容
- `escape_html(text)` - 转义 HTML 字符
- `sanitize_string(text)` - 清洗字符串
- `validate_no_sql_injection(text)` - 检查 SQL 注入
- `validate_no_xss(text)` - 检查 XSS 攻击
- `sanitize_filename(filename)` - 清洗文件名
- `sanitize_url(url)` - 清洗 URL

**使用示例:**

```python
from app.utils.input_sanitizer import sanitize_html, validate_safe_input

# 清洗 HTML 内容
clean_text = sanitize_html(user_input)

# 验证输入安全性
if not validate_safe_input(user_input):
    raise ValidationException("输入包含危险内容")
```

### 4.3 SQL 注入防护

**防护措施:**
1. **使用 SQLAlchemy ORM** - 自动参数化查询
2. **避免原始 SQL** - 使用 ORM 查询构建器
3. **输入验证** - 验证所有用户输入
4. **最小权限原则** - 数据库用户只有必要的权限

**示例:**

```python
# 安全的查询(参数化)
result = await db.execute(
    select(Sample).where(Sample.barcode == barcode)
)

# 不安全的查询(避免使用)
# query = f"SELECT * FROM Sample WHERE barcode = '{barcode}'"
```

### 4.4 XSS 防护

**防护措施:**
1. **输入验证** - 验证和清洗所有用户输入
2. **输出编码** - 转义 HTML 特殊字符
3. **Content Security Policy** - 限制脚本执行
4. **HttpOnly Cookie** - 防止 JavaScript 访问 Cookie

**示例:**

```python
from app.utils.input_sanitizer import escape_html

# 转义用户输入
safe_text = escape_html(user_input)
```

## 5. CORS 配置

**实现位置:** `app/middleware/cors.py`

**配置:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600
)
```

**环境变量:**
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://app.example.com
```

**最佳实践:**
- 只允许信任的源
- 避免使用通配符 `*`
- 生产环境使用 HTTPS 源
- 定期审查允许的源列表

## 6. 限流保护

**实现位置:** `app/middleware/rate_limit.py`

**全局限流:**
- 默认: 60 次/分钟
- 可通过环境变量配置: `RATE_LIMIT_PER_MINUTE`

**端点级限流:**

```python
from app.middleware.rate_limit import limiter

@router.post("/auth/login")
@limiter.limit("5/minute")  # 登录端点: 5 次/分钟
async def login(request: Request, credentials: LoginCredentials):
    pass
```

**限流策略:**
- 登录端点: 5 次/分钟
- 密码重置: 5 次/分钟
- 敏感操作: 10 次/分钟
- 普通 API: 60 次/分钟

**响应:**
- 状态码: 429 Too Many Requests
- 响应头: `Retry-After` (秒)

## 7. HTTPS 传输

**详细文档:** `docs/HTTPS_DEPLOYMENT.md`

**要求:**
- 生产环境必须使用 HTTPS
- 使用 TLS 1.2 或更高版本
- 使用强加密套件
- 启用 HSTS
- 配置安全头

**Nginx 配置示例:**

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## 8. 审计日志

**实现位置:** `app/services/audit_log_service.py`

**记录内容:**
- 用户操作(创建、更新、删除)
- 登录/登出事件
- 权限变更
- 敏感数据访问
- 系统配置变更

**日志字段:**
- 用户 ID
- 操作类型
- 资源类型和 ID
- 操作时间
- IP 地址
- 操作结果

**使用示例:**

```python
from app.services.audit_log_service import AuditLogService

await AuditLogService.log_action(
    db=db,
    log=AuditLogCreate(
        userId=user.id,
        action="CREATE",
        resourceType="Sample",
        resourceId=sample.id,
        ipAddress=request.client.host
    )
)
```

## 9. 安全头配置

**推荐的安全头:**

```nginx
# HSTS - 强制使用 HTTPS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# X-Frame-Options - 防止点击劫持
add_header X-Frame-Options "SAMEORIGIN" always;

# X-Content-Type-Options - 防止 MIME 类型嗅探
add_header X-Content-Type-Options "nosniff" always;

# X-XSS-Protection - XSS 过滤器
add_header X-XSS-Protection "1; mode=block" always;

# Referrer-Policy - 控制 Referer 头
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content-Security-Policy - 内容安全策略
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## 10. 环境变量安全

**最佳实践:**
1. 使用 `.env` 文件存储敏感配置
2. 不要提交 `.env` 文件到版本控制
3. 使用环境变量管理工具(如 AWS Secrets Manager)
4. 定期轮换密钥和密码
5. 使用强随机密钥

**示例 `.env` 文件:**

```bash
# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/lab_db

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here-use-strong-random-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=15
JWT_REFRESH_EXPIRE_DAYS=7

# 加密密钥
ENCRYPTION_KEY=your-encryption-key-32-bytes-long
SIGNATURE_ENCRYPTION_KEY=your-signature-key-32-bytes-long

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# CORS 配置
CORS_ORIGINS=http://localhost:5173,https://app.example.com

# 限流配置
RATE_LIMIT_PER_MINUTE=60
```

## 11. 安全检查清单

### 部署前检查

- [ ] 所有敏感数据已加密
- [ ] 密码强度验证已启用
- [ ] JWT 密钥已配置且足够强
- [ ] CORS 配置正确
- [ ] 限流已启用
- [ ] HTTPS 已配置
- [ ] 安全头已配置
- [ ] 审计日志已启用
- [ ] 环境变量已正确配置
- [ ] 数据库连接使用最小权限
- [ ] 所有依赖包已更新到最新版本
- [ ] 安全扫描已通过

### 定期检查

- [ ] 审查审计日志
- [ ] 检查异常登录活动
- [ ] 更新依赖包
- [ ] 轮换密钥和密码
- [ ] 检查 SSL 证书有效期
- [ ] 审查权限配置
- [ ] 测试备份恢复
- [ ] 进行安全扫描

## 12. 安全工具

### 依赖扫描

```bash
# 使用 safety 扫描依赖漏洞
pip install safety
safety check

# 使用 bandit 扫描代码安全问题
pip install bandit
bandit -r app/
```

### 代码审计

```bash
# 使用 pylint 进行代码质量检查
pip install pylint
pylint app/

# 使用 mypy 进行类型检查
pip install mypy
mypy app/
```

### 渗透测试

- OWASP ZAP
- Burp Suite
- Nmap
- SQLMap

## 13. 应急响应

### 安全事件处理流程

1. **检测** - 监控系统异常活动
2. **隔离** - 隔离受影响的系统
3. **分析** - 分析攻击方式和影响范围
4. **修复** - 修复漏洞和恢复系统
5. **总结** - 总结经验和改进措施

### 常见安全事件

**1. 数据泄露**
- 立即撤销所有令牌
- 强制用户重置密码
- 通知受影响用户
- 审查访问日志

**2. 暴力破解**
- 启用账户锁定
- 加强限流策略
- 启用验证码
- 审查登录日志

**3. SQL 注入**
- 修复漏洞代码
- 审查数据库日志
- 检查数据完整性
- 加强输入验证

**4. XSS 攻击**
- 清理恶意脚本
- 加强输出编码
- 启用 CSP
- 审查用户输入

## 14. 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security_warnings.html)

## 总结

本项目实施了全面的安全加固措施,包括:

1. ✅ **数据加密** - AES-256-GCM 加密敏感数据
2. ✅ **密码安全** - bcrypt 哈希 + 强密码策略
3. ✅ **认证授权** - JWT + RBAC 权限控制
4. ✅ **输入验证** - Pydantic + 输入清洗
5. ✅ **CORS 配置** - 限制跨域访问
6. ✅ **限流保护** - 防止暴力破解和 DDoS
7. ✅ **HTTPS 传输** - TLS 1.2+ 加密传输
8. ✅ **审计日志** - 记录所有关键操作

这些措施共同构建了多层安全防护体系,确保系统的安全性和可靠性。
