"""
权限控制使用示例

展示如何在 FastAPI 路由中使用 RBAC 权限控制
"""
from fastapi import APIRouter, Depends, Query, Path
from typing import List, Optional
from app.core.permissions import (
    Resource,
    Action,
    create_permission_dependency,
    check_permission,
    require_permission
)
from app.core.security import JWTPayload
from app.api.deps import get_current_user

# 创建路由器
router = APIRouter(prefix="/api/v1/samples", tags=["samples"])


# ============================================================================
# 示例 1: 使用依赖注入进行权限检查（推荐方式）
# ============================================================================

@router.post("/", status_code=201)
async def create_sample(
    sample_data: dict,
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.CREATE))
):
    """
    创建新样品
    
    需要权限: SAMPLE:CREATE
    允许角色: ADMIN, LAB_MANAGER
    
    这是最推荐的方式：
    - 代码简洁
    - 自动处理权限检查
    - 权限不足时自动返回 403 错误
    """
    return {
        "message": "样品创建成功",
        "data": {
            "id": "sample-123",
            "created_by": current_user.get("username")
        }
    }


@router.get("/")
async def list_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.READ))
):
    """
    查询样品列表
    
    需要权限: SAMPLE:READ
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN, VIEWER
    """
    return {
        "message": "查询成功",
        "data": {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size
        }
    }


@router.delete("/{sample_id}")
async def delete_sample(
    sample_id: str = Path(...),
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.DELETE))
):
    """
    删除样品（软删除）
    
    需要权限: SAMPLE:DELETE
    允许角色: ADMIN（仅管理员可以删除）
    """
    return {
        "message": "样品删除成功",
        "data": {"id": sample_id}
    }


# ============================================================================
# 示例 2: 手动调用权限检查
# ============================================================================

@router.patch("/{sample_id}")
async def update_sample(
    sample_id: str = Path(...),
    sample_data: dict = {},
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    更新样品信息
    
    需要权限: SAMPLE:UPDATE
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN
    
    使用手动权限检查，适合需要更灵活控制的场景
    """
    # 手动检查权限（如果没有权限会抛出 ForbiddenException）
    user_roles = current_user.get("roles", [])
    require_permission(user_roles, Resource.SAMPLE, Action.UPDATE)
    
    # 执行更新逻辑
    return {
        "message": "样品更新成功",
        "data": {
            "id": sample_id,
            "updated_by": current_user.get("username")
        }
    }


# ============================================================================
# 示例 3: 条件权限检查
# ============================================================================

@router.get("/detailed")
async def list_samples_detailed(
    include_deleted: bool = Query(False),
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.READ))
):
    """
    查询样品列表（详细信息）
    
    需要权限: SAMPLE:READ
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN, VIEWER
    
    根据用户权限返回不同级别的数据：
    - 有删除权限的用户可以看到已删除的样品
    - 普通用户只能看到未删除的样品
    """
    user_roles = current_user.get("roles", [])
    
    # 检查用户是否有删除权限（不抛出异常，只返回布尔值）
    can_delete = check_permission(user_roles, Resource.SAMPLE, Action.DELETE)
    
    # 根据权限决定是否包含已删除的样品
    if can_delete and include_deleted:
        # 管理员可以看到包括已删除的样品
        samples = [
            {"id": "sample-1", "name": "样品1", "status": "ACTIVE"},
            {"id": "sample-2", "name": "样品2", "status": "DELETED"}
        ]
    else:
        # 普通用户只能看到未删除的样品
        samples = [
            {"id": "sample-1", "name": "样品1", "status": "ACTIVE"}
        ]
    
    return {
        "message": "查询成功",
        "data": {
            "items": samples,
            "can_delete": can_delete,
            "user_roles": user_roles
        }
    }


# ============================================================================
# 示例 4: 多权限检查
# ============================================================================

@router.post("/{sample_id}/transfer")
async def transfer_sample(
    sample_id: str = Path(...),
    transfer_data: dict = {},
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    创建样品流转记录
    
    需要权限: SAMPLE:TRANSFER
    允许角色: ADMIN, LAB_MANAGER
    
    这个操作需要检查多个权限
    """
    user_roles = current_user.get("roles", [])
    
    # 检查样品流转权限
    require_permission(user_roles, Resource.SAMPLE, Action.TRANSFER)
    
    # 同时检查是否可以创建流转记录
    require_permission(user_roles, Resource.TRANSFER, Action.CREATE)
    
    return {
        "message": "流转记录创建成功",
        "data": {
            "sample_id": sample_id,
            "transfer_id": "transfer-123",
            "created_by": current_user.get("username")
        }
    }


# ============================================================================
# 示例 5: 根据权限返回不同的响应
# ============================================================================

@router.get("/{sample_id}")
async def get_sample(
    sample_id: str = Path(...),
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.READ))
):
    """
    获取样品详情
    
    需要权限: SAMPLE:READ
    允许角色: ADMIN, LAB_MANAGER, TECHNICIAN, VIEWER
    
    根据用户权限返回不同级别的详细信息
    """
    user_roles = current_user.get("roles", [])
    
    # 基础样品信息（所有有读取权限的用户都能看到）
    sample = {
        "id": sample_id,
        "name": "测试样品",
        "status": "ACTIVE",
        "created_at": "2024-01-01T00:00:00Z"
    }
    
    # 检查是否有更新权限，决定是否返回敏感信息
    can_update = check_permission(user_roles, Resource.SAMPLE, Action.UPDATE)
    if can_update:
        sample["internal_notes"] = "这是内部备注，只有有更新权限的用户能看到"
        sample["cost"] = 1000.00
    
    # 检查是否有删除权限，决定是否返回操作按钮
    can_delete = check_permission(user_roles, Resource.SAMPLE, Action.DELETE)
    
    return {
        "message": "查询成功",
        "data": sample,
        "permissions": {
            "can_update": can_update,
            "can_delete": can_delete
        }
    }


# ============================================================================
# 示例 6: 用户和角色管理（仅管理员）
# ============================================================================

@router.get("/admin/users")
async def list_users(
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.USER, Action.READ))
):
    """
    查询用户列表
    
    需要权限: USER:READ
    允许角色: ADMIN, LAB_MANAGER
    
    只有管理员和实验室管理员可以查看用户列表
    """
    return {
        "message": "查询成功",
        "data": {
            "items": [
                {"id": "user-1", "username": "admin", "roles": ["ADMIN"]},
                {"id": "user-2", "username": "manager", "roles": ["LAB_MANAGER"]}
            ]
        }
    }


@router.post("/admin/users")
async def create_user(
    user_data: dict,
    current_user: JWTPayload = Depends(get_current_user),
    _: None = Depends(create_permission_dependency(Resource.USER, Action.CREATE))
):
    """
    创建新用户
    
    需要权限: USER:CREATE
    允许角色: ADMIN（仅管理员可以创建用户）
    """
    return {
        "message": "用户创建成功",
        "data": {
            "id": "user-123",
            "username": user_data.get("username"),
            "created_by": current_user.get("username")
        }
    }


# ============================================================================
# 示例 7: 错误处理示例
# ============================================================================

@router.get("/examples/error-handling")
async def error_handling_example(
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    错误处理示例
    
    展示当用户没有权限时会发生什么
    """
    user_roles = current_user.get("roles", [])
    
    try:
        # 尝试检查删除权限
        require_permission(user_roles, Resource.SAMPLE, Action.DELETE)
        return {"message": "您有删除权限"}
    except Exception as e:
        # 如果没有权限，会抛出 ForbiddenException
        # FastAPI 会自动捕获并返回 403 错误响应
        # 这里只是演示，实际使用中不需要 try-except
        return {
            "message": "权限检查失败",
            "error": str(e)
        }


# ============================================================================
# 使用说明
# ============================================================================

"""
如何测试这些端点：

1. 获取 JWT 令牌（使用不同角色的用户登录）:
   POST /api/v1/auth/login
   {
       "username": "admin",
       "password": "password"
   }

2. 使用令牌访问受保护的端点:
   GET /api/v1/samples
   Headers: {
       "Authorization": "Bearer <your-jwt-token>"
   }

3. 测试不同角色的权限:
   - ADMIN: 可以访问所有端点
   - LAB_MANAGER: 可以创建、读取、更新样品，但不能删除
   - TECHNICIAN: 只能读取和更新样品
   - VIEWER: 只能读取样品

4. 预期的错误响应（权限不足）:
   {
       "message": "操作失败",
       "error": {
           "code": "FORBIDDEN",
           "message": "您没有权限执行此操作: sample:delete",
           "details": null
       }
   }
"""
