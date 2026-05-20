# RBAC 权限控制使用指南

## 概述

本文档介绍如何在 FastAPI 样品管理后端服务中使用 RBAC（基于角色的访问控制）权限系统。

## 权限模型

### 角色定义

系统定义了以下四种角色：

| 角色 | 说明 | 权限范围 |
|------|------|---------|
| `ADMIN` | 系统管理员 | 拥有所有资源的所有操作权限 |
| `LAB_MANAGER` | 实验室管理员 | 样品和流转的所有操作，用户的读取操作 |
| `TECHNICIAN` | 实验室技术员 | 样品和流转的读取和更新操作 |
| `VIEWER` | 查看者 | 所有资源的只读操作 |

### 资源定义

系统定义了以下资源类型：

- `SAMPLE` - 样品
- `TRANSFER` - 流转记录
- `USER` - 用户
- `ROLE` - 角色

### 操作定义

系统定义了以下操作类型：

- `CREATE` - 创建
- `READ` - 读取
- `UPDATE` - 更新
- `DELETE` - 删除
- `TRANSFER` - 流转
- `SPLIT` - 分样
- `MERGE` - 合样
- `CONFIRM` - 确认
- `CANCEL` - 取消

## 权限映射表

### 样品资源 (SAMPLE)

| 操作 | ADMIN | LAB_MANAGER | TECHNICIAN | VIEWER |
|------|-------|-------------|------------|--------|
| CREATE | ✅ | ✅ | ❌ | ❌ |
| READ | ✅ | ✅ | ✅ | ✅ |
| UPDATE | ✅ | ✅ | ✅ | ❌ |
| DELETE | ✅ | ❌ | ❌ | ❌ |
| TRANSFER | ✅ | ✅ | ❌ | ❌ |
| SPLIT | ✅ | ✅ | ❌ | ❌ |
| MERGE | ✅ | ✅ | ❌ | ❌ |

### 流转资源 (TRANSFER)

| 操作 | ADMIN | LAB_MANAGER | TECHNICIAN | VIEWER |
|------|-------|-------------|------------|--------|
| CREATE | ✅ | ✅ | ❌ | ❌ |
| READ | ✅ | ✅ | ✅ | ✅ |
| UPDATE | ✅ | ✅ | ✅ | ❌ |
| CONFIRM | ✅ | ✅ | ✅ | ❌ |
| CANCEL | ✅ | ❌ | ❌ | ❌ |

### 用户资源 (USER)

| 操作 | ADMIN | LAB_MANAGER | TECHNICIAN | VIEWER |
|------|-------|-------------|------------|--------|
| CREATE | ✅ | ❌ | ❌ | ❌ |
| READ | ✅ | ✅ | ❌ | ❌ |
| UPDATE | ✅ | ❌ | ❌ | ❌ |
| DELETE | ✅ | ❌ | ❌ | ❌ |

### 角色资源 (ROLE)

| 操作 | ADMIN | LAB_MANAGER | TECHNICIAN | VIEWER |
|------|-------|-------------|------------|--------|
| CREATE | ✅ | ❌ | ❌ | ❌ |
| READ | ✅ | ✅ | ❌ | ❌ |
| UPDATE | ✅ | ❌ | ❌ | ❌ |
| DELETE | ✅ | ❌ | ❌ | ❌ |

## 使用方法

### 方法 1: 使用依赖注入（推荐）

这是最简洁和推荐的方式，使用 FastAPI 的依赖注入系统。

```python
from fastapi import APIRouter, Depends
from app.core.permissions import Resource, Action, create_permission_dependency
from app.core.security import JWTPayload
from app.api.deps import get_current_user
from app.schemas.sample import SampleCreate, SampleResponse

router = APIRouter(prefix="/samples", tags=["samples"])

@router.post("/", response_model=SampleResponse, status_code=201)
async def create_sample(
    sample: SampleCreate,
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.CREATE))
):
    """
    创建新样品
    
    需要权限: SAMPLE:CREATE
    允许角色: ADMIN, LAB_MANAGER
    """
    # 创建样品逻辑
    pass
```

**优点**:
- 代码简洁，易于阅读
- 自动处理权限检查
- 权限不足时自动返回 403 错误
- 在 OpenAPI 文档中自动显示权限要求

### 方法 2: 手动调用权限检查

如果需要更灵活的权限控制逻辑，可以手动调用权限检查函数。

```python
from fastapi import APIRouter, Depends, HTTPException
from app.core.permissions import Resource, Action, check_permission, require_permission
from app.core.security import JWTPayload
from app.api.deps import get_current_user
from app.schemas.sample import SampleUpdate, SampleResponse

router = APIRouter(prefix="/samples", tags=["samples"])

@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: str,
    sample: SampleUpdate,
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    更新样品信息
    
    需要权限: SAMPLE:UPDATE
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN
    """
    # 检查权限（如果没有权限会抛出 ForbiddenException）
    user_roles = current_user.get("roles", [])
    require_permission(user_roles, Resource.SAMPLE, Action.UPDATE)
    
    # 更新样品逻辑
    pass
```

### 方法 3: 条件权限检查

在某些情况下，你可能需要根据权限检查结果执行不同的逻辑。

```python
from fastapi import APIRouter, Depends
from app.core.permissions import Resource, Action, check_permission
from app.core.security import JWTPayload
from app.api.deps import get_current_user
from app.schemas.sample import SampleListResponse

router = APIRouter(prefix="/samples", tags=["samples"])

@router.get("/", response_model=SampleListResponse)
async def list_samples(
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询样品列表
    
    需要权限: SAMPLE:READ
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN, VIEWER
    """
    user_roles = current_user.get("roles", [])
    
    # 检查是否有删除权限（不抛出异常，只返回布尔值）
    can_delete = check_permission(user_roles, Resource.SAMPLE, Action.DELETE)
    
    # 根据权限返回不同的数据
    if can_delete:
        # 管理员可以看到包括已删除的样品
        samples = await get_all_samples(include_deleted=True)
    else:
        # 普通用户只能看到未删除的样品
        samples = await get_all_samples(include_deleted=False)
    
    return samples
```

## 多角色支持

用户可以拥有多个角色，只要用户拥有的任一角色有权限，就可以执行该操作。

```python
# JWT 令牌中的用户信息示例
{
    "userId": "user-123",
    "username": "john.doe",
    "roles": ["LAB_MANAGER", "TECHNICIAN"]  # 用户拥有两个角色
}
```

在这个例子中，用户同时拥有 `LAB_MANAGER` 和 `TECHNICIAN` 角色，因此拥有这两个角色的所有权限的并集。

## 错误处理

当用户没有权限执行操作时，系统会返回 403 Forbidden 错误：

```json
{
    "message": "操作失败",
    "error": {
        "code": "FORBIDDEN",
        "message": "您没有权限执行此操作: sample:delete",
        "details": null
    }
}
```

## 自定义权限规则

如果需要修改权限规则，可以编辑 `app/core/permissions.py` 文件中的 `ROLE_PERMISSIONS` 字典：

```python
ROLE_PERMISSIONS: Dict[Resource, Dict[Action, List[Role]]] = {
    Resource.SAMPLE: {
        Action.CREATE: [Role.ADMIN, Role.LAB_MANAGER],  # 添加或删除角色
        Action.READ: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN, Role.VIEWER],
        # ... 其他操作
    },
    # ... 其他资源
}
```

## 测试权限控制

### 单元测试示例

```python
import pytest
from app.core.permissions import Resource, Action, check_permission
from app.core.exceptions import ForbiddenException

def test_admin_can_delete_sample():
    """测试管理员可以删除样品"""
    assert check_permission(["ADMIN"], Resource.SAMPLE, Action.DELETE) is True

def test_viewer_cannot_delete_sample():
    """测试查看者不能删除样品"""
    assert check_permission(["VIEWER"], Resource.SAMPLE, Action.DELETE) is False

def test_require_permission_raises_exception():
    """测试权限不足时抛出异常"""
    from app.core.permissions import require_permission
    
    with pytest.raises(ForbiddenException):
        require_permission(["VIEWER"], Resource.SAMPLE, Action.DELETE)
```

### 集成测试示例

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_sample_without_permission():
    """测试没有权限创建样品"""
    # 使用 VIEWER 角色的令牌
    headers = {"Authorization": f"Bearer {viewer_token}"}
    
    response = client.post(
        "/api/v1/samples",
        json={"sample_name": "Test Sample", ...},
        headers=headers
    )
    
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

def test_create_sample_with_permission():
    """测试有权限创建样品"""
    # 使用 ADMIN 角色的令牌
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = client.post(
        "/api/v1/samples",
        json={"sample_name": "Test Sample", ...},
        headers=headers
    )
    
    assert response.status_code == 201
```

## 最佳实践

1. **使用依赖注入**: 优先使用 `create_permission_dependency()` 方法，代码更简洁
2. **明确文档化**: 在 API 端点的文档字符串中明确说明所需权限和允许的角色
3. **最小权限原则**: 只授予用户完成工作所需的最小权限
4. **定期审查**: 定期审查和更新权限规则，确保符合业务需求
5. **测试覆盖**: 为所有权限检查编写单元测试和集成测试
6. **日志记录**: 记录权限拒绝事件，便于审计和调试

## 常见问题

### Q: 如何添加新的角色？

A: 在 `app/core/permissions.py` 中的 `Role` 枚举中添加新角色，然后在 `ROLE_PERMISSIONS` 中为该角色分配权限。

### Q: 如何添加新的资源或操作？

A: 在 `Resource` 或 `Action` 枚举中添加新的值，然后在 `ROLE_PERMISSIONS` 中定义相应的权限规则。

### Q: 用户的角色信息从哪里来？

A: 用户的角色信息存储在 JWT 令牌的 `roles` 字段中，由认证服务在用户登录时生成。

### Q: 如何实现数据级权限控制？

A: 当前实现的是功能级权限控制。如果需要数据级权限控制（例如，用户只能访问自己创建的样品），需要在业务逻辑层额外实现。

### Q: 权限检查的性能如何？

A: 权限检查是纯内存操作，性能非常高。权限规则在应用启动时加载到内存中，每次检查只需要简单的字典查找和集合比较。

## 相关文档

- [JWT 认证实现](./TASK_5.1_SUMMARY.md)
- [API 依赖注入](../app/api/deps.py)
- [自定义异常处理](../app/core/exceptions.py)
