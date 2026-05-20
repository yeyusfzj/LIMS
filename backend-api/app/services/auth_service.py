"""
认证服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt  # 直接使用 bcrypt 库,避免 passlib 的并发初始化问题
from typing import Optional, List
from datetime import datetime
from app.models.user import User, Role
from app.core.security import (
    generate_jwt_token,
    verify_token,
    revoke_token,
    store_refresh_token,
    verify_refresh_token,
    delete_refresh_token,
    JWTPayload
)
from app.core.exceptions import UnauthorizedException, NotFoundException
from app.core.logging import logger
from app.config import settings


class AuthService:
    """认证服务类"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        验证密码
        
        使用 bcrypt 直接验证,避免 passlib 的并发初始化问题
        
        Args:
            plain_password: 明文密码
            hashed_password: 哈希密码
            
        Returns:
            bool: 密码是否匹配
        """
        try:
            # bcrypt 需要 bytes 类型
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Password verification failed: {str(e)}")
            return False
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        哈希密码
        
        使用 bcrypt 直接哈希,避免 passlib 的并发初始化问题
        
        Args:
            password: 明文密码
            
        Returns:
            str: 哈希后的密码
        """
        try:
            # 生成 salt 并哈希密码
            salt = bcrypt.gensalt(rounds=12)  # 12 轮,平衡安全性和性能
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')
        except Exception as e:
            logger.error(f"Password hashing failed: {str(e)}")
            raise
    
    @staticmethod
    async def get_user_by_username(
        db: AsyncSession,
        username: str
    ) -> Optional[User]:
        """
        根据用户名获取用户
        
        Args:
            db: 数据库会话
            username: 用户名
            
        Returns:
            Optional[User]: 用户对象或 None
        """
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """
        根据用户ID获取用户
        
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
    async def get_user_roles(
        db: AsyncSession,
        user: User
    ) -> List[str]:
        """
        获取用户角色列表
        
        Args:
            db: 数据库会话
            user: 用户对象
            
        Returns:
            List[str]: 角色名称列表
        """
        # 使用 selectinload 预加载角色关系
        from sqlalchemy.orm import selectinload
        
        result = await db.execute(
            select(User)
            .where(User.id == user.id)
            .options(selectinload(User.roles))
        )
        user_with_roles = result.scalar_one_or_none()
        
        if user_with_roles and user_with_roles.roles:
            return [role.name for role in user_with_roles.roles]
        
        return []
    
    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str
    ) -> Optional[User]:
        """
        认证用户
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 密码
            
        Returns:
            Optional[User]: 认证成功返回用户对象，否则返回 None
        """
        user = await AuthService.get_user_by_username(db, username)
        
        if not user:
            logger.warning(f"Login failed: user not found - {username}")
            return None
        
        if not AuthService.verify_password(password, user.passwordHash):
            logger.warning(f"Login failed: invalid password - {username}")
            return None
        
        # 检查用户状态
        if user.status != "ACTIVE":
            logger.warning(f"Login failed: user not active - {username} (status: {user.status})")
            return None
        
        return user
    
    @staticmethod
    async def login(
        db: AsyncSession,
        username: str,
        password: str
    ) -> dict:
        """
        用户登录
        
        Args:
            db: 数据库会话
            username: 用户名
            password: 密码
            
        Returns:
            dict: 包含访问令牌和刷新令牌的字典
            
        Raises:
            UnauthorizedException: 认证失败
        """
        # 认证用户
        user = await AuthService.authenticate_user(db, username, password)
        
        if not user:
            raise UnauthorizedException(
                message="用户名或密码错误",
                error_code="INVALID_CREDENTIALS"
            )
        
        # 获取用户角色
        roles = await AuthService.get_user_roles(db, user)
        
        # 生成访问令牌
        access_token = generate_jwt_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            token_type="access"
        )
        
        # 生成刷新令牌
        refresh_token = generate_jwt_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            token_type="refresh"
        )
        
        # 存储刷新令牌到 Redis
        await store_refresh_token(user.id, refresh_token)
        
        # 更新最后登录时间
        user.lastLoginAt = datetime.utcnow()
        await db.commit()
        
        logger.info(f"User logged in successfully: {username}")
        
        return {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": settings.JWT_EXPIRE_MINUTES * 60,  # 转换为秒
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "fullName": user.fullName,
                "roles": roles
            }
        }
    
    @staticmethod
    async def refresh_access_token(
        db: AsyncSession,
        refresh_token: str
    ) -> dict:
        """
        刷新访问令牌
        
        Args:
            db: 数据库会话
            refresh_token: 刷新令牌
            
        Returns:
            dict: 包含新的访问令牌和刷新令牌的字典
            
        Raises:
            UnauthorizedException: 刷新令牌无效
        """
        # 验证刷新令牌
        try:
            payload = await verify_token(refresh_token, check_blacklist=True)
        except UnauthorizedException:
            raise UnauthorizedException(
                message="刷新令牌无效或已过期",
                error_code="INVALID_REFRESH_TOKEN"
            )
        
        # 验证刷新令牌是否在 Redis 中
        is_valid = await verify_refresh_token(payload.user_id, refresh_token)
        if not is_valid:
            raise UnauthorizedException(
                message="刷新令牌已失效",
                error_code="REFRESH_TOKEN_REVOKED"
            )
        
        # 获取用户信息
        user = await AuthService.get_user_by_id(db, payload.user_id)
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 检查用户状态
        if user.status != "ACTIVE":
            raise UnauthorizedException(
                message="用户已被禁用",
                error_code="USER_INACTIVE"
            )
        
        # 获取用户角色
        roles = await AuthService.get_user_roles(db, user)
        
        # 生成新的访问令牌
        new_access_token = generate_jwt_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            token_type="access"
        )
        
        # 生成新的刷新令牌（令牌轮换）
        new_refresh_token = generate_jwt_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            token_type="refresh"
        )
        
        # 撤销旧的刷新令牌
        await revoke_token(refresh_token, user.id)
        
        # 存储新的刷新令牌
        await store_refresh_token(user.id, new_refresh_token)
        
        logger.info(f"Access token refreshed for user: {user.username}")
        
        return {
            "accessToken": new_access_token,
            "refreshToken": new_refresh_token,
            "tokenType": "Bearer",
            "expiresIn": settings.JWT_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def logout(
        db: AsyncSession,
        user_id: str,
        access_token: Optional[str] = None
    ) -> None:
        """
        用户登出
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            access_token: 访问令牌（可选）
        """
        # 删除刷新令牌
        await delete_refresh_token(user_id)
        
        # 如果提供了访问令牌，则撤销它
        if access_token:
            await revoke_token(access_token, user_id)
        
        logger.info(f"User logged out: {user_id}")
    
    @staticmethod
    async def get_current_user_info(
        db: AsyncSession,
        user_id: str
    ) -> dict:
        """
        获取当前用户信息
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            dict: 用户信息
            
        Raises:
            NotFoundException: 用户不存在
        """
        user = await AuthService.get_user_by_id(db, user_id)
        
        if not user:
            raise NotFoundException(
                message="用户不存在",
                error_code="USER_NOT_FOUND"
            )
        
        # 获取用户角色
        roles = await AuthService.get_user_roles(db, user)
        
        return {
            "userId": user.id,
            "username": user.username,
            "email": user.email,
            "fullName": user.fullName,
            "department": user.department,
            "position": user.position,
            "roles": roles
        }
