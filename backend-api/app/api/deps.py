"""
API 依赖函数
"""
from typing import Optional, AsyncGenerator
from fastapi import Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import verify_token, JWTPayload
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.database import AsyncSessionLocal


# HTTP Bearer 认证方案
security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    依赖注入函数：提供异步数据库会话
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> JWTPayload:
    """
    获取当前用户信息（FastAPI 依赖函数）
    
    从 Authorization header 提取 Bearer token，验证令牌并返回用户信息
    
    Args:
        credentials: HTTP 认证凭据
        
    Returns:
        JWTPayload: 用户信息（包含 userId, username, roles 等）
        
    Raises:
        UnauthorizedException: 认证失败（令牌缺失、无效、过期等）
    """
    # 检查是否提供了凭据
    if not credentials:
        raise UnauthorizedException(
            message="缺少认证令牌",
            error_code="MISSING_TOKEN"
        )
    
    # 提取令牌
    token = credentials.credentials
    
    if not token:
        raise UnauthorizedException(
            message="认证令牌为空",
            error_code="EMPTY_TOKEN"
        )
    
    # 验证令牌并返回用户信息
    user_payload = await verify_token(token)
    
    return user_payload


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[JWTPayload]:
    """
    获取当前用户信息（可选）
    
    如果有令牌则验证，没有令牌则返回 None
    
    Args:
        credentials: HTTP 认证凭据
        
    Returns:
        Optional[JWTPayload]: 用户信息或 None
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    
    if not token:
        return None
    
    try:
        user_payload = await verify_token(token)
        return user_payload
    except UnauthorizedException:
        # 可选认证失败不抛出异常
        return None


def require_permission(permission: str):
    """
    创建权限检查依赖函数（简化版本）
    
    接受字符串格式的权限（如 "sample:create"），并返回一个依赖函数
    用于 FastAPI 路由的权限检查
    
    Args:
        permission: 权限字符串，格式为 "resource:action"
        
    Returns:
        依赖函数
        
    Example:
        @router.post("/samples")
        async def create_sample(
            current_user: JWTPayload = Depends(get_current_user),
            _: None = Depends(require_permission("sample:create"))
        ):
            # 创建样品逻辑
            pass
    """
    async def permission_checker(
        current_user: JWTPayload = Depends(get_current_user)
    ) -> None:
        """权限检查依赖"""
        # 解析权限字符串
        try:
            resource_str, action_str = permission.split(":")
        except ValueError:
            raise ForbiddenException(
                message=f"权限格式错误: {permission}，应为 'resource:action'"
            )
        
        # 导入权限模块（延迟导入避免循环依赖）
        from app.core.permissions import Resource, Action, check_permission
        
        # 转换为枚举
        try:
            resource = Resource(resource_str)
            action = Action(action_str)
        except ValueError as e:
            raise ForbiddenException(
                message=f"无效的权限: {permission}"
            )
        
        # 获取用户角色（JWTPayload 是 Pydantic 模型，使用属性访问）
        user_roles = current_user.roles if hasattr(current_user, 'roles') else []
        
        # 检查权限
        if not check_permission(user_roles, resource, action):
            raise ForbiddenException(
                message=f"您没有权限执行此操作: {permission}"
            )
    
    return permission_checker
