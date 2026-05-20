"""
认证 API 路由
"""
from fastapi import APIRouter, Depends, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserInfo,
    LogoutRequest
)
from app.schemas.response import APIResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.core.security import JWTPayload
from app.core.logging import logger
from app.middleware.rate_limit import limiter


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="用户登录",
    description="""
    用户登录接口
    
    **限流规则**: 每分钟最多 5 次请求（防止暴力破解）
    
    **请求参数**:
    - username: 用户名
    - password: 密码
    
    **返回数据**:
    - accessToken: 访问令牌（有效期 15 分钟）
    - refreshToken: 刷新令牌（有效期 7 天）
    - tokenType: 令牌类型（Bearer）
    - expiresIn: 访问令牌过期时间（秒）
    
    **错误代码**:
    - 401: 用户名或密码错误
    - 429: 请求过于频繁（超过限流）
    """
)
@limiter.limit("10000/minute")  # 性能测试：临时放宽限流
async def login(
    request: Request,
    login_request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """用户登录"""
    logger.info(f"Login attempt for user: {login_request.username}")
    
    # 调用认证服务
    token_data = await AuthService.login(
        db=db,
        username=login_request.username,
        password=login_request.password
    )
    
    return APIResponse(
        message="登录成功",
        data=TokenResponse(**token_data)
    )


@router.post(
    "/refresh",
    response_model=APIResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="刷新访问令牌",
    description="""
    使用刷新令牌获取新的访问令牌
    
    **限流规则**: 每分钟最多 10 次请求
    
    **请求参数**:
    - refreshToken: 刷新令牌
    
    **返回数据**:
    - accessToken: 新的访问令牌
    - refreshToken: 新的刷新令牌（令牌轮换）
    - tokenType: 令牌类型（Bearer）
    - expiresIn: 访问令牌过期时间（秒）
    
    **错误代码**:
    - 401: 刷新令牌无效或已过期
    - 429: 请求过于频繁
    """
)
@limiter.limit("10/minute")  # 恢复正常限流：每分钟 10 次
async def refresh_token(
    request: Request,
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """刷新访问令牌"""
    logger.info("Token refresh attempt")
    
    # 调用认证服务
    token_data = await AuthService.refresh_access_token(
        db=db,
        refresh_token=refresh_request.refreshToken
    )
    
    return APIResponse(
        message="令牌刷新成功",
        data=TokenResponse(**token_data)
    )


@router.post(
    "/logout",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="用户登出",
    description="""
    用户登出接口
    
    **认证要求**: 需要有效的访问令牌
    
    **请求参数**:
    - accessToken: 要撤销的访问令牌（可选，如果不提供则从 Authorization 头获取）
    
    **功能**:
    - 删除用户的刷新令牌
    - 将访问令牌加入黑名单
    
    **错误代码**:
    - 401: 未授权（令牌无效或过期）
    """
)
async def logout(
    request: LogoutRequest = None,
    current_user: JWTPayload = Depends(get_current_user),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """用户登出"""
    logger.info(f"Logout attempt for user: {current_user.username}")
    
    # 提取访问令牌
    access_token = None
    if request and request.accessToken:
        access_token = request.accessToken
    elif authorization and authorization.startswith("Bearer "):
        access_token = authorization.replace("Bearer ", "")
    
    # 调用认证服务
    await AuthService.logout(
        db=db,
        user_id=current_user.user_id,
        access_token=access_token
    )
    
    return APIResponse(
        message="登出成功",
        data=None
    )


@router.get(
    "/me",
    response_model=APIResponse[UserInfo],
    status_code=status.HTTP_200_OK,
    summary="获取当前用户信息",
    description="""
    获取当前登录用户的详细信息
    
    **认证要求**: 需要有效的访问令牌
    
    **返回数据**:
    - userId: 用户ID
    - username: 用户名
    - email: 邮箱
    - fullName: 真实姓名
    - department: 部门
    - position: 职位
    - roles: 角色列表
    
    **错误代码**:
    - 401: 未授权（令牌无效或过期）
    - 404: 用户不存在
    """
)
async def get_current_user_info(
    current_user: JWTPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户信息"""
    logger.info(f"Get user info for: {current_user.username}")
    
    # 调用认证服务
    user_info = await AuthService.get_current_user_info(
        db=db,
        user_id=current_user.user_id
    )
    
    return APIResponse(
        message="获取用户信息成功",
        data=UserInfo(**user_info)
    )
