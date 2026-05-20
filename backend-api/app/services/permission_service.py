"""
权限服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from app.models.user import Permission, Role
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import logger


class PermissionService:
    """权限服务类"""
    
    @staticmethod
    async def create_permission(
        db: AsyncSession,
        resource: str,
        action: str
    ) -> Permission:
        """
        创建权限
        
        Args:
            db: 数据库会话
            resource: 资源名称
            action: 操作名称
            
        Returns:
            Permission: 权限对象
            
        Raises:
            ConflictException: 权限已存在
        """
        # 检查权限是否已存在
        result = await db.execute(
            select(Permission).where(
                Permission.resource == resource,
                Permission.action == action
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise ConflictException(
                message=f"权限已存在: {resource}:{action}"
            )
        
        # 创建权限
        permission = Permission(
            id=str(uuid.uuid4()),
            resource=resource,
            action=action
        )
        
        db.add(permission)
        await db.commit()
        await db.refresh(permission)
        
        logger.info(f"Permission created: {resource}:{action}")
        
        return permission
    
    @staticmethod
    async def get_permission_by_id(
        db: AsyncSession,
        permission_id: str
    ) -> Optional[Permission]:
        """
        根据ID获取权限
        
        Args:
            db: 数据库会话
            permission_id: 权限ID
            
        Returns:
            Optional[Permission]: 权限对象或 None
        """
        result = await db.execute(
            select(Permission).where(Permission.id == permission_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_permissions(
        db: AsyncSession,
        resource: Optional[str] = None,
        action: Optional[str] = None
    ) -> List[Permission]:
        """
        查询权限列表
        
        Args:
            db: 数据库会话
            resource: 资源名称（可选）
            action: 操作名称（可选）
            
        Returns:
            List[Permission]: 权限列表
        """
        query = select(Permission)
        
        if resource:
            query = query.where(Permission.resource == resource)
        
        if action:
            query = query.where(Permission.action == action)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def delete_permission(
        db: AsyncSession,
        permission_id: str
    ) -> None:
        """
        删除权限
        
        Args:
            db: 数据库会话
            permission_id: 权限ID
            
        Raises:
            NotFoundException: 权限不存在
        """
        permission = await PermissionService.get_permission_by_id(db, permission_id)
        
        if not permission:
            raise NotFoundException(
                message="权限不存在",
                error_code="PERMISSION_NOT_FOUND"
            )
        
        await db.delete(permission)
        await db.commit()
        
        logger.info(f"Permission deleted: {permission_id}")
    
    @staticmethod
    async def check_user_permission(
        db: AsyncSession,
        user_id: str,
        resource: str,
        action: str
    ) -> bool:
        """
        检查用户是否有指定权限
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            resource: 资源名称
            action: 操作名称
            
        Returns:
            bool: 是否有权限
        """
        from app.models.user import User
        
        # 获取用户及其角色
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        # 加载用户的角色
        await db.refresh(user, ['roles'])
        
        # 检查用户的每个角色是否有该权限
        for role in user.roles:
            # 加载角色的权限
            await db.refresh(role, ['permissions'])
            
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    return True
        
        return False
