"""
权限管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import PermissionChecker
from app.models.user import User
from app.schemas.permission import (
    PermissionCreate,
    PermissionResponse,
    PermissionListResponse
)
from app.services.permission_service import PermissionService
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import logger

router = APIRouter(prefix="/permissions", tags=["权限管理"])


@router.post(
    "/",
    response_model=dict,
    status_code=201,
    summary="创建权限",
    description="创建新的权限"
)
async def create_permission(
    data: PermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("permission", "create"))
):
    """创建权限"""
    try:
        permission = await PermissionService.create_permission(
            db=db,
            resource=data.resource,
            action=data.action
        )
        
        return {
            "success": True,
            "data": PermissionResponse.model_validate(permission)
        }
    except ConflictException as e:
        raise HTTPException(status_code=409, detail={
            "code": "CONFLICT",
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Create permission error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "创建权限失败"
        })


@router.get(
    "/",
    response_model=dict,
    summary="获取权限列表",
    description="查询权限列表，支持按资源和操作筛选"
)
async def list_permissions(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    resource: Optional[str] = Query(None, description="资源名称"),
    action: Optional[str] = Query(None, description="操作名称"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("permission", "read"))
):
    """获取权限列表"""
    try:
        permissions = await PermissionService.get_permissions(
            db=db,
            resource=resource,
            action=action
        )
        
        # 手动分页
        total = len(permissions)
        start = (page - 1) * pageSize
        end = start + pageSize
        items = permissions[start:end]
        
        return {
            "success": True,
            "data": {
                "items": [PermissionResponse.model_validate(p) for p in items],
                "total": total,
                "page": page,
                "pageSize": pageSize
            }
        }
    except Exception as e:
        logger.error(f"List permissions error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取权限列表失败"
        })


@router.delete(
    "/{permission_id}",
    response_model=dict,
    summary="删除权限",
    description="删除指定的权限"
)
async def delete_permission(
    permission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("permission", "delete"))
):
    """删除权限"""
    try:
        await PermissionService.delete_permission(db=db, permission_id=permission_id)
        
        return {
            "success": True,
            "message": "权限删除成功"
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Delete permission error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "删除权限失败"
        })


@router.get(
    "/me",
    response_model=dict,
    summary="获取当前用户权限",
    description="获取当前登录用户的所有权限"
)
async def get_my_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的权限列表"""
    try:
        # 加载用户的角色
        await db.refresh(current_user, ['roles'])
        
        # 收集所有权限
        permissions = []
        for role in current_user.roles:
            await db.refresh(role, ['permissions'])
            permissions.extend(role.permissions)
        
        # 去重
        unique_permissions = {p.id: p for p in permissions}.values()
        
        return {
            "success": True,
            "data": [PermissionResponse.model_validate(p) for p in unique_permissions]
        }
    except Exception as e:
        logger.error(f"Get my permissions error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取用户权限失败"
        })


@router.get(
    "/me/roles",
    response_model=dict,
    summary="获取当前用户角色",
    description="获取当前登录用户的所有角色"
)
async def get_my_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的角色列表"""
    try:
        from app.schemas.role import RoleResponse
        
        # 加载用户的角色
        await db.refresh(current_user, ['roles'])
        
        return {
            "success": True,
            "data": [RoleResponse.model_validate(role) for role in current_user.roles]
        }
    except Exception as e:
        logger.error(f"Get my roles error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取用户角色失败"
        })
