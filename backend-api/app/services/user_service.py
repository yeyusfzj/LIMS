"""
用户服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict, Any
import uuid
from app.models.user import User, Role, UserStatus
from app.services.auth_service import AuthService
from app.core.exceptions import NotFoundException, ConflictException, ValidationException
from app.core.logging import logger
from app.utils.password_validator import validate_password_strength


class UserService:
    """用户服务类"""
    
    @staticmethod
    async def create_user(
        db: AsyncSession,
        username: str,
        password: str,
        email: str,
        full_name: str,
        department: Optional[str] = None,
        position: Optional[str] = None,
        phone: Optional[str] = None
    ) -> User:
        """
        创建用户
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 密码
            email: 邮箱
            full_name: 真实姓名
            department: 部门
            position: 职位
            phone: 电话
            
        Returns:
            User: 用户对象
            
        Raises:
            ConflictException: 用户名或邮箱已存在
            ValidationException: 数据验证失败
        """
        # 验证密码强度
        validate_password_strength(password, username)
        
        # 检查用户名是否已存在
        result = await db.execute(
            select(User).where(User.username == username)
        )
        if result.scalar_one_or_none():
            raise ConflictException(
                message=f"用户名已存在: {username}"
            )
        
        # 检查邮箱是否已存在
        result = await db.execute(
            select(User).where(User.email == email)
        )
        if result.scalar_one_or_none():
            raise ConflictException(
                message=f"邮箱已存在: {email}"
            )
        
        # 创建用户
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            passwordHash=AuthService.hash_password(password),
            email=email,
            fullName=full_name,
            department=department,
            position=position,
            phone=phone,
            status=UserStatus.ACTIVE
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User created: {username}")
        
        return user
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """
        根据ID获取用户
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            Optional[User]: 用户对象或 None
        """
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_users(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        status: Optional[UserStatus] = None,
        department: Optional[str] = None
    ) -> tuple[List[User], int]:
        """
        查询用户列表
        
        Args:
            db: 数据库会话
            skip: 跳过记录数
            limit: 返回记录数
            status: 用户状态（可选）
            department: 部门（可选）
            
        Returns:
            tuple[List[User], int]: 用户列表和总数
        """
        query = select(User)
        count_query = select(func.count()).select_from(User)
        
        if status:
            query = query.where(User.status == status)
            count_query = count_query.where(User.status == status)
        
        if department:
            query = query.where(User.department == department)
            count_query = count_query.where(User.department == department)
        
        # 获取总数
        result = await db.execute(count_query)
        total = result.scalar()
        
        # 获取用户列表
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        users = list(result.scalars().all())
        
        return users, total
    
    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        department: Optional[str] = None,
        position: Optional[str] = None,
        phone: Optional[str] = None,
        status: Optional[UserStatus] = None
    ) -> User:
        """
        更新用户
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            email: 邮箱（可选）
            full_name: 真实姓名（可选）
            department: 部门（可选）
            position: 职位（可选）
            phone: 电话（可选）
            status: 状态（可选）
            
        Returns:
            User: 更新后的用户对象
            
        Raises:
            NotFoundException: 用户不存在
            ConflictException: 邮箱已存在
        """
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 检查邮箱是否重复
        if email and email != user.email:
            result = await db.execute(
                select(User).where(User.email == email)
            )
            if result.scalar_one_or_none():
                raise ConflictException(
                    message=f"邮箱已存在: {email}"
                )
            user.email = email
        
        if full_name is not None:
            user.fullName = full_name
        
        if department is not None:
            user.department = department
        
        if position is not None:
            user.position = position
        
        if phone is not None:
            user.phone = phone
        
        if status is not None:
            user.status = status
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User updated: {user_id}")
        
        return user
    
    @staticmethod
    async def delete_user(
        db: AsyncSession,
        user_id: str
    ) -> None:
        """
        删除用户
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Raises:
            NotFoundException: 用户不存在
        """
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        await db.delete(user)
        await db.commit()
        
        logger.info(f"User deleted: {user_id}")
    
    @staticmethod
    async def assign_roles(
        db: AsyncSession,
        user_id: str,
        role_ids: List[str]
    ) -> User:
        """
        为用户分配角色
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            role_ids: 角色ID列表
            
        Returns:
            User: 更新后的用户对象
            
        Raises:
            NotFoundException: 用户或角色不存在
        """
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 获取角色对象
        roles = []
        for role_id in role_ids:
            result = await db.execute(
                select(Role).where(Role.id == role_id)
            )
            role = result.scalar_one_or_none()
            
            if not role:
                raise NotFoundException(
                    message=f"角色不存在: {role_id}",
                    error_code="ROLE_NOT_FOUND"
                )
            
            roles.append(role)
        
        # 分配角色
        user.roles = roles
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"Roles assigned to user {user_id}: {len(roles)} roles")
        
        return user
    
    @staticmethod
    async def get_user_roles(
        db: AsyncSession,
        user_id: str
    ) -> List[Role]:
        """
        获取用户的角色列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            List[Role]: 角色列表
            
        Raises:
            NotFoundException: 用户不存在
        """
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 加载用户的角色
        await db.refresh(user, ['roles'])
        
        return user.roles
    
    @staticmethod
    async def change_password(
        db: AsyncSession,
        user_id: str,
        old_password: str,
        new_password: str
    ) -> None:
        """
        修改密码
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            old_password: 旧密码
            new_password: 新密码
            
        Raises:
            NotFoundException: 用户不存在
            ValidationException: 旧密码错误或新密码不符合要求
        """
        user = await UserService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 验证旧密码
        if not AuthService.verify_password(old_password, user.passwordHash):
            raise ValidationException(
                message="旧密码错误"
            )
        
        # 验证新密码强度
        validate_password_strength(new_password, user.username)
        
        # 更新密码
        user.passwordHash = AuthService.hash_password(new_password)
        
        await db.commit()
        
        logger.info(f"Password changed for user: {user_id}")
