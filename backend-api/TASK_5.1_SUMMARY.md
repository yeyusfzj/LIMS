# 任务 5.1 实现总结：JWT 认证

## 任务概述

实现 FastAPI 后端的 JWT 认证功能，包括 JWT 解码和验证、认证依赖函数，确保与现有 Node.js 后端的完全兼容。

## 实现内容

### 1. 核心安全模块 (`app/core/security.py`)

实现了以下功能：

#### JWTPayload 类
- 封装 JWT 令牌载荷数据
- 支持从字典创建和转换为字典
- 包含必需字段：`userId`, `username`, `roles`
- 支持可选字段：`jti`, `iat`, `exp`

#### decode_jwt_token() 函数
- 解码和验证 JWT 令牌
- 验证令牌签名（使用 HS256 算法）
- 验证令牌过期时间
- 验证必需字段（userId, roles）
- 详细的错误处理：
  - `TOKEN_EXPIRED`: 令牌已过期
  - `INVALID_SIGNATURE`: 签名无效
  - `MALFORMED_TOKEN`: 格式错误或缺少必需字段
  - `INVALID_CLAIMS`: 声明无效
  - `INVALID_TOKEN`: 其他令牌错误

#### generate_jwt_token() 函数
- 生成 JWT 令牌
- 支持自定义过期时间
- 自动添加 `iat` 和 `exp` 字段
- 与 Node.js 后端使用相同的格式

### 2. API 依赖模块 (`app/api/deps.py`)

实现了以下依赖函数：

#### get_current_user()
- FastAPI 依赖函数，用于保护需要认证的路由
- 从 `Authorization` header 提取 Bearer token
- 验证令牌格式（必须是 "Bearer {token}"）
- 调用 `decode_jwt_token()` 验证令牌
- 返回用户信息（JWTPayload 对象）
- 详细的错误处理：
  - `MISSING_TOKEN`: 缺少认证令牌
  - `INVALID_TOKEN_FORMAT`: 令牌格式错误
  - `EMPTY_TOKEN`: 令牌为空

#### get_optional_user()
- 可选认证依赖函数
- 如果有令牌则验证，没有令牌则返回 None
- 认证失败不抛出异常，返回 None
- 适用于可选认证的路由

### 3. 异常处理增强 (`app/core/exceptions.py`)

更新了 `UnauthorizedException` 类：
- 支持自定义错误代码
- 默认错误代码为 `UNAUTHORIZED`
- 可以指定具体的错误代码（如 `TOKEN_EXPIRED`, `INVALID_SIGNATURE` 等）

### 4. 配置更新 (`app/config.py`)

更新了 JWT 配置：
- `JWT_SECRET_KEY`: 与 Node.js 后端一致（`dev-secret-key-12345`）
- `JWT_ALGORITHM`: HS256
- `JWT_EXPIRE_MINUTES`: 1440（24 小时）

## 测试覆盖

### 单元测试

#### test_jwt_auth.py (13 个测试)
- ✅ JWTPayload 类测试（创建、from_dict、to_dict）
- ✅ decode_jwt_token() 测试：
  - 有效令牌解码
  - 过期令牌处理
  - 无效签名处理
  - 格式错误令牌处理
  - 缺少必需字段处理
  - Node.js 格式兼容性
- ✅ generate_jwt_token() 测试：
  - 基本令牌生成
  - 自定义过期时间
  - 生成和解码完整流程

#### test_api_deps.py (13 个测试)
- ✅ get_current_user() 测试：
  - 有效令牌认证
  - 缺少 Authorization header
  - 无效令牌格式
  - 空令牌
  - 过期令牌
  - 格式错误令牌
  - 多个角色处理
- ✅ get_optional_user() 测试：
  - 有效令牌认证
  - 缺少 header 返回 None
  - 无效格式返回 None
  - 过期令牌返回 None

### 集成测试

#### test_jwt_auth_integration.py (8 个测试)
- ✅ 使用有效令牌访问受保护路由
- ✅ 不带令牌访问受保护路由（401）
- ✅ 使用过期令牌访问受保护路由（401）
- ✅ 使用无效格式令牌访问受保护路由（401）
- ✅ 使用格式错误令牌访问受保护路由（401）
- ✅ 不带令牌访问公开路由（200）
- ✅ 使用同一令牌发送多个请求
- ✅ 不同用户使用不同令牌

#### test_nodejs_compatibility.py (8 个测试)
- ✅ Node.js 令牌格式兼容性
- ✅ 多个角色处理
- ✅ 长用户 ID（Prisma cuid 格式）
- ✅ 中文用户名和角色名
- ✅ 15 分钟过期时间（Node.js 默认）
- ✅ 可选字段处理
- ✅ 密钥和算法一致性验证
- ✅ 空角色列表处理

**总计：42 个测试，全部通过 ✅**

## 与 Node.js 后端的兼容性

### 完全兼容的特性

1. **JWT 密钥和算法**
   - 使用相同的 `JWT_SECRET_KEY`: `dev-secret-key-12345`
   - 使用相同的算法: `HS256`

2. **令牌格式**
   - 载荷字段命名一致：`userId`, `username`, `roles`, `jti`, `iat`, `exp`
   - 支持 Prisma 生成的 cuid 格式用户 ID
   - 支持中文用户名和角色名

3. **过期时间**
   - 支持 Node.js 默认的 15 分钟访问令牌过期时间
   - 支持自定义过期时间

4. **错误处理**
   - 返回 401 状态码用于认证失败
   - 提供详细的错误代码和消息
   - 错误响应格式与 Node.js 后端一致

## 代码质量

- **测试覆盖率**: 
  - `app/core/security.py`: 94%
  - `app/api/deps.py`: 100%
- **类型安全**: 使用 Python 类型提示
- **文档完整**: 所有函数都有详细的 docstring
- **错误处理**: 完善的异常处理机制
- **代码风格**: 符合 PEP 8 规范

## 使用示例

### 保护路由

```python
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.core.security import JWTPayload

router = APIRouter()

@router.get("/protected")
async def protected_route(
    current_user: JWTPayload = Depends(get_current_user)
):
    return {
        "message": "访问成功",
        "user_id": current_user.user_id,
        "username": current_user.username,
        "roles": current_user.roles
    }
```

### 可选认证

```python
from app.api.deps import get_optional_user

@router.get("/optional")
async def optional_route(
    current_user: Optional[JWTPayload] = Depends(get_optional_user)
):
    if current_user:
        return {"message": f"欢迎, {current_user.username}"}
    else:
        return {"message": "欢迎访客"}
```

### 生成令牌

```python
from app.core.security import generate_jwt_token

token = generate_jwt_token(
    user_id="user123",
    username="testuser",
    roles=["admin", "user"]
)
```

## 相关需求

本任务实现了以下需求：

- **需求 3.1**: JWT 格式验证
- **需求 3.2**: 使用与 Node.js 相同的 JWT 密钥
- **需求 3.3**: 令牌无效或过期时返回 401
- **需求 3.4**: 从令牌中提取用户 ID 和角色信息

## 下一步

JWT 认证功能已完全实现并通过测试。可以在后续任务中：

1. 在样品管理 API 路由中使用 `get_current_user` 依赖
2. 实现基于角色的访问控制（RBAC）
3. 添加 Redis 支持用于令牌黑名单（可选）
4. 实现令牌刷新功能（可选）

## 文件清单

### 新增文件
- `fastapi-backend/app/core/security.py` - JWT 认证核心功能
- `fastapi-backend/app/api/deps.py` - API 依赖函数
- `fastapi-backend/tests/unit/test_jwt_auth.py` - JWT 认证单元测试
- `fastapi-backend/tests/unit/test_api_deps.py` - API 依赖单元测试
- `fastapi-backend/tests/integration/test_jwt_auth_integration.py` - JWT 认证集成测试
- `fastapi-backend/tests/integration/test_nodejs_compatibility.py` - Node.js 兼容性测试
- `fastapi-backend/TASK_5.1_SUMMARY.md` - 任务总结文档

### 修改文件
- `fastapi-backend/app/core/exceptions.py` - 更新 UnauthorizedException 支持自定义错误代码
- `fastapi-backend/app/config.py` - 更新 JWT_SECRET_KEY 与 Node.js 一致

## 验证结果

✅ 所有 42 个测试通过
✅ 与 Node.js 后端完全兼容
✅ 代码覆盖率达标
✅ 错误处理完善
✅ 文档完整

任务 5.1 已成功完成！
