"""
角色管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.permissions import PermissionChecker
from app.models.user import User
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleListResponse,
    AssignPermissionsRequest
)
from app.services.role_service import RoleService
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import logger

router = APIRouter(prefix="/roles", tags=["角色管理"])


@router.post(
    "/",
    response_model=dict,
    status_code=201,
    summary="创建角色",
    description="创建新的角色"
)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "create"))
):
    """创建角色"""
    try:
        role = await RoleService.create_role(
            db=db,
            name=data.name,
            description=data.description
        )
        
        return {
            "success": True,
            "data": RoleResponse.model_validate(role)
        }
    except ConflictException as e:
        raise HTTPException(status_code=409, detail={
            "code": "CONFLICT",
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Create role error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "创建角色失败"
        })


@router.get(
    "/",
    response_model=dict,
    summary="获取角色列表",
    description="查询角色列表"
)
async def list_roles(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    name: Optional[str] = Query(None, description="角色名称"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "read"))
):
    """获取角色列表"""
    try:
        roles = await RoleService.get_roles(db=db)
        
        # 按名称筛选
        if name:
            roles = [r for r in roles if name.lower() in r.name.lower()]
        
        # 手动分页
        total = len(roles)
        start = (page - 1) * pageSize
        end = start + pageSize
        items = roles[start:end]
        
        return {
            "success": True,
            "data": {
                "items": [RoleResponse.model_validate(r) for r in items],
                "total": total,
                "page": page,
                "pageSize": pageSize
            }
        }
    except Exception as e:
        logger.error(f"List roles error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取角色列表失败"
        })


@router.get(
    "/{role_id}",
    response_model=dict,
    summary="获取角色详情",
    description="根据ID获取角色详细信息"
)
async def get_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "read"))
):
    """获取角色详情"""
    try:
        role = await RoleService.get_role_by_id(db=db, role_id=role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        # 加载角色的权限
        await db.refresh(role, ['permissions'])
        
        return {
            "success": True,
            "data": RoleResponse.model_validate(role)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Get role error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "获取角色详情失败"
        })


@router.put(
    "/{role_id}",
    response_model=dict,
    summary="更新角色",
    description="更新角色信息"
)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "update"))
):
    """更新角色"""
    try:
        role = await RoleService.update_role(
            db=db,
            role_id=role_id,
            name=data.name,
            description=data.description
        )
        
        return {
            "success": True,
            "data": RoleResponse.model_validate(role)
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
        logger.error(f"Update role error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "更新角色失败"
        })


@router.delete(
    "/{role_id}",
    response_model=dict,
    summary="删除角色",
    description="删除指定的角色"
)
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "delete"))
):
    """删除角色"""
    try:
        await RoleService.delete_role(db=db, role_id=role_id)
        
        return {
            "success": True,
            "message": "角色删除成功"
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Delete role error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "删除角色失败"
        })


@router.post(
    "/{role_id}/permissions",
    response_model=dict,
    summary="为角色分配权限",
    description="为指定角色分配权限"
)
async def assign_permissions(
    role_id: str,
    data: AssignPermissionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "update"))
):
    """为角色分配权限"""
    try:
        role = await RoleService.assign_permissions(
            db=db,
            role_id=role_id,
            permission_ids=data.permissionIds
        )
        
        return {
            "success": True,
            "data": RoleResponse.model_validate(role)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Assign permissions error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "分配权限失败"
        })


@router.delete(
    "/{role_id}/permissions",
    response_model=dict,
    summary="从角色移除权限",
    description="从指定角色移除权限"
)
async def remove_permissions(
    role_id: str,
    data: AssignPermissionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("role", "update"))
):
    """从角色移除权限"""
    try:
        role = await RoleService.get_role_by_id(db=db, role_id=role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        # 加载当前权限
        await db.refresh(role, ['permissions'])
        
        # 移除指定的权限
        current_permission_ids = {p.id for p in role.permissions}
        new_permission_ids = current_permission_ids - set(data.permissionIds)
        
        # 重新分配权限
        role = await RoleService.assign_permissions(
            db=db,
            role_id=role_id,
            permission_ids=list(new_permission_ids)
        )
        
        return {
            "success": True,
            "data": RoleResponse.model_validate(role)
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail={
            "code": e.error_code,
            "message": e.message
        })
    except Exception as e:
        logger.error(f"Remove permissions error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "code": "INTERNAL_ERROR",
            "message": "移除权限失败"
        })
