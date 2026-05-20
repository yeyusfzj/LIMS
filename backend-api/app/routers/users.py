"""
用户管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.permissions import PermissionChecker
from app.models.user import User, UserStatus as UserStatusEnum
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    ResetPasswordRequest,
    UpdateUserStatusRequest,
    AssignRolesRequest,
    UserStatus
)
from app.services.user_service import UserService
from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.core.logging import logger
from app.middleware.rate_limit import limiter
from app.utils.password_validator import validate_password_strength

router = APIRouter(prefix="/users", tags=["用户管理"])


@router.post(
    "/",
    response_model=dict,
    status_code=201,
    summary="创建用户",
    description="创建新的用户（限流：每分钟 10 次）"
)
@limiter.limit("10/minute")  # 敏感操作限流
async def create_user(
    request: Request,
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "create"))
):
    """创建用户"""
    try:
        user = await UserService.create_user(
            db=db,
            username=data.username,
            password=data.password,
            email=data.email,
            full_name=data.fullName,
            department=data.department,
            position=data.position,
            phone=data.phone
        )
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except ConflictException as e:
        raise HTTPException(status_code=409, detail={
            "code": "CONFLICT",
            "message": e.message
        })
    except ValidationException as e:
        raise HTTPException(status_code=400, detail={
            "code": "VALIDATION_ERROR",
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Create user error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "创建用户失败"
        })


@router.get(
    "/",
    response_model=dict,
    summary="获取用户列表",
    description="查询用户列表，支持多条件筛选"
)
async def list_users(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    username: Optional[str] = Query(None, description="用户名"),
    email: Optional[str] = Query(None, description="邮箱"),
    fullName: Optional[str] = Query(None, description="真实姓名"),
    department: Optional[str] = Query(None, description="部门"),
    status: Optional[UserStatus] = Query(None, description="状态"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "read"))
):
    """获取用户列表"""
    try:
        # 转换状态枚举
        status_enum = None
        if status:
            status_enum = UserStatusEnum[status.value]
        
        users, total = await UserService.get_users(
            db=db,
            skip=(page - 1) * pageSize,
            limit=pageSize,
            status=status_enum,
            department=department
        )
        
        # 客户端筛选（用户名、邮箱、姓名）
        if username:
            users = [u for u in users if username.lower() in u.username.lower()]
        if email:
            users = [u for u in users if email.lower() in u.email.lower()]
        if fullName:
            users = [u for u in users if fullName.lower() in u.fullName.lower()]
        
        return {
            "success": True,
            "data": {
                "items": [UserResponse.model_validate(u) for u in users],
                "total": total,
                "page": page,
                "pageSize": pageSize
            }
        }
    except Exception as e:
        logger.error(f"List users error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取用户列表失败"
        })


@router.get(
    "/{user_id}",
    response_model=dict,
    summary="获取用户详情",
    description="根据ID获取用户详细信息"
)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "read"))
):
    """获取用户详情"""
    try:
        user = await UserService.get_user_by_id(db=db, user_id=user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 加载用户的角色
        await db.refresh(user, ['roles'])
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取用户详情失败"
        })


@router.put(
    "/{user_id}",
    response_model=dict,
    summary="更新用户",
    description="更新用户信息"
)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "update"))
):
    """更新用户"""
    try:
        # 转换状态枚举
        status_enum = None
        if data.status:
            status_enum = UserStatusEnum[data.status.value]
        
        user = await UserService.update_user(
            db=db,
            user_id=user_id,
            email=data.email,
            full_name=data.fullName,
            department=data.department,
            position=data.position,
            phone=data.phone,
            status=status_enum
        )
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except ConflictException as e:
        raise HTTPException(status_code=409, detail={
            "code": "CONFLICT",
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "更新用户失败"
        })


@router.patch(
    "/{user_id}/status",
    response_model=dict,
    summary="更新用户状态",
    description="更新用户的状态"
)
async def update_user_status(
    user_id: str,
    data: UpdateUserStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "update"))
):
    """更新用户状态"""
    try:
        # 转换状态枚举
        status_enum = UserStatusEnum[data.status.value]
        
        user = await UserService.update_user(
            db=db,
            user_id=user_id,
            status=status_enum
        )
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Update user status error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "更新用户状态失败"
        })


@router.post(
    "/{user_id}/reset-password",
    response_model=dict,
    summary="重置用户密码",
    description="重置指定用户的密码（限流：每分钟 5 次）"
)
@limiter.limit("5/minute")  # 敏感操作：严格限流
async def reset_password(
    request: Request,
    user_id: str,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "update"))
):
    """重置用户密码"""
    try:
        from app.services.auth_service import AuthService
        
        user = await UserService.get_user_by_id(db=db, user_id=user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 验证新密码强度
        validate_password_strength(data.newPassword, user.username)
        
        # 更新密码
        user.passwordHash = AuthService.hash_password(data.newPassword)
        await db.commit()
        
        logger.info(f"Password reset for user: {user_id}")
        
        return {
            "success": True,
            "message": "密码重置成功"
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except ValidationException as e:
        raise HTTPException(status_code=400, detail={
            "code": "VALIDATION_ERROR",
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "重置密码失败"
        })


@router.delete(
    "/{user_id}",
    response_model=dict,
    summary="删除用户",
    description="删除指定的用户"
)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "delete"))
):
    """删除用户"""
    try:
        await UserService.delete_user(db=db, user_id=user_id)
        
        return {
            "success": True,
            "message": "用户删除成功"
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Delete user error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "删除用户失败"
        })


@router.post(
    "/{user_id}/roles",
    response_model=dict,
    summary="为用户分配角色",
    description="为指定用户分配角色"
)
async def assign_roles(
    user_id: str,
    data: AssignRolesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "update"))
):
    """为用户分配角色"""
    try:
        user = await UserService.assign_roles(
            db=db,
            user_id=user_id,
            role_ids=data.roleIds
        )
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Assign roles error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "分配角色失败"
        })


@router.get(
    "/{user_id}/roles",
    response_model=dict,
    summary="获取用户角色",
    description="获取指定用户的角色列表"
)
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "read"))
):
    """获取用户角色"""
    try:
        from app.schemas.role import RoleResponse
        
        roles = await UserService.get_user_roles(db=db, user_id=user_id)
        
        return {
            "success": True,
            "data": [RoleResponse.model_validate(role) for role in roles]
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Get user roles error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取用户角色失败"
        })


@router.delete(
    "/{user_id}/roles",
    response_model=dict,
    summary="从用户移除角色",
    description="从指定用户移除角色"
)
async def remove_roles(
    user_id: str,
    data: AssignRolesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "update"))
):
    """从用户移除角色"""
    try:
        user = await UserService.get_user_by_id(db=db, user_id=user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 加载当前角色
        await db.refresh(user, ['roles'])
        
        # 移除指定的角色
        current_role_ids = {r.id for r in user.roles}
        new_role_ids = current_role_ids - set(data.roleIds)
        
        # 重新分配角色
        user = await UserService.assign_roles(
            db=db,
            user_id=user_id,
            role_ids=list(new_role_ids)
        )
        
        return {
            "success": True,
            "data": UserResponse.model_validate(user)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Remove roles error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "移除角色失败"
        })
