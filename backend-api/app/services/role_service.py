"""
角色服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
from app.models.user import Role, Permission
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import logger


class RoleService:
    """角色服务类"""
    
    @staticmethod
    async def create_role(
        db: AsyncSession,
        name: str,
        description: Optional[str] = None
    ) -> Role:
        """
        创建角色
        
        Args:
            db: 数据库会话
            name: 角色名称
            description: 角色描述
            
        Returns:
            Role: 角色对象
            
        Raises:
            ConflictException: 角色已存在
        """
        # 检查角色是否已存在
        result = await db.execute(
            select(Role).where(Role.name == name)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise ConflictException(
                message=f"角色已存在: {name}"
            )
        
        # 创建角色
        role = Role(
            id=str(uuid.uuid4()),
            name=name,
            description=description
        )
        
        db.add(role)
        await db.commit()
        await db.refresh(role)
        
        logger.info(f"Role created: {name}")
        
        return role
    
    @staticmethod
    async def get_role_by_id(
        db: AsyncSession,
        role_id: str
    ) -> Optional[Role]:
        """
        根据ID获取角色
        
        Args:
            db: 数据库会话
            role_id: 角色ID
            
        Returns:
            Optional[Role]: 角色对象或 None
        """
        result = await db.execute(
            select(Role).where(Role.id == role_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_role_by_name(
        db: AsyncSession,
        name: str
    ) -> Optional[Role]:
        """
        根据名称获取角色
        
        Args:
            db: 数据库会话
            name: 角色名称
            
        Returns:
            Optional[Role]: 角色对象或 None
        """
        result = await db.execute(
            select(Role).where(Role.name == name)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_roles(
        db: AsyncSession
    ) -> List[Role]:
        """
        查询角色列表
        
        Args:
            db: 数据库会话
            
        Returns:
            List[Role]: 角色列表
        """
        result = await db.execute(select(Role))
        return list(result.scalars().all())
    
    @staticmethod
    async def update_role(
        db: AsyncSession,
        role_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None
    ) -> Role:
        """
        更新角色
        
        Args:
            db: 数据库会话
            role_id: 角色ID
            name: 角色名称（可选）
            description: 角色描述（可选）
            
        Returns:
            Role: 更新后的角色对象
            
        Raises:
            NotFoundException: 角色不存在
            ConflictException: 角色名称已存在
        """
        role = await RoleService.get_role_by_id(db, role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        # 检查名称是否重复
        if name and name != role.name:
            result = await db.execute(
                select(Role).where(Role.name == name)
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                raise ConflictException(
                    message=f"角色名称已存在: {name}"
                )
            
            role.name = name
        
        if description is not None:
            role.description = description
        
        await db.commit()
        await db.refresh(role)
        
        logger.info(f"Role updated: {role_id}")
        
        return role
    
    @staticmethod
    async def delete_role(
        db: AsyncSession,
        role_id: str
    ) -> None:
        """
        删除角色
        
        Args:
            db: 数据库会话
            role_id: 角色ID
            
        Raises:
            NotFoundException: 角色不存在
        """
        role = await RoleService.get_role_by_id(db, role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        await db.delete(role)
        await db.commit()
        
        logger.info(f"Role deleted: {role_id}")
    
    @staticmethod
    async def assign_permissions(
        db: AsyncSession,
        role_id: str,
        permission_ids: List[str]
    ) -> Role:
        """
        为角色分配权限
        
        Args:
            db: 数据库会话
            role_id: 角色ID
            permission_ids: 权限ID列表
            
        Returns:
            Role: 更新后的角色对象
            
        Raises:
            NotFoundException: 角色或权限不存在
        """
        role = await RoleService.get_role_by_id(db, role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        # 获取权限对象
        permissions = []
        for perm_id in permission_ids:
            result = await db.execute(
                select(Permission).where(Permission.id == perm_id)
            )
            permission = result.scalar_one_or_none()
            
            if not permission:
                raise NotFoundException(
                    message=f"权限不存在: {perm_id}",
                    error_code="PERMISSION_NOT_FOUND"
                )
            
            permissions.append(permission)
        
        # 分配权限
        role.permissions = permissions
        
        await db.commit()
        await db.refresh(role)
        
        logger.info(f"Permissions assigned to role {role_id}: {len(permissions)} permissions")
        
        return role
    
    @staticmethod
    async def get_role_permissions(
        db: AsyncSession,
        role_id: str
    ) -> List[Permission]:
        """
        获取角色的权限列表
        
        Args:
            db: 数据库会话
            role_id: 角色ID
            
        Returns:
            List[Permission]: 权限列表
            
        Raises:
            NotFoundException: 角色不存在
        """
        role = await RoleService.get_role_by_id(db, role_id)
        
        if not role:
            raise NotFoundException(
                message="角色不存在",
                error_code="ROLE_NOT_FOUND"
            )
        
        # 加载角色的权限
        await db.refresh(role, ['permissions'])
        
        return role.permissions
