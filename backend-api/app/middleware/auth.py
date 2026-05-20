"""
JWT 认证中间件
"""
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.security import verify_token, JWTPayload
from app.core.exceptions import UnauthorizedException
from app.core.logging import logger


# HTTP Bearer 认证方案
security = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = None
) -> Optional[JWTPayload]:
    """
    获取当前用户（可选）
    如果没有提供令牌或令牌无效，返回 None
    
    Args:
        credentials: HTTP 认证凭据
        
    Returns:
        Optional[JWTPayload]: 用户信息或 None
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = await verify_token(token)
        return payload
    except Exception as e:
        logger.warning(f"Optional authentication failed: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> JWTPayload:
    """
    获取当前用户（必需）
    如果没有提供令牌或令牌无效，抛出异常
    
    Args:
        credentials: HTTP 认证凭据
        
    Returns:
        JWTPayload: 用户信息
        
    Raises:
        HTTPException: 认证失败
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "缺少认证令牌"
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        token = credentials.credentials
        payload = await verify_token(token)
        return payload
    except UnauthorizedException as e:
        # e.detail 是一个字典，包含 code, message, details
        error_detail = e.detail if isinstance(e.detail, dict) else {}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": error_detail.get("code", "AUTH_FAILED"),
                    "message": error_detail.get("message", "认证失败")
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "AUTH_FAILED",
                    "message": "认证失败"
                }
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    从 Authorization 头中提取令牌
    
    Args:
        authorization: Authorization 头的值
        
    Returns:
        Optional[str]: 提取的令牌或 None
    """
    if not authorization:
        return None
    
    if not authorization.startswith("Bearer "):
        return None
    
    return authorization[7:]  # 移除 "Bearer " 前缀


async def authenticate_request(request: Request) -> Optional[JWTPayload]:
    """
    认证请求（从请求头中提取令牌并验证）
    
    Args:
        request: FastAPI 请求对象
        
    Returns:
        Optional[JWTPayload]: 用户信息或 None
    """
    authorization = request.headers.get("Authorization")
    token = extract_token_from_header(authorization)
    
    if not token:
        return None
    
    try:
        payload = await verify_token(token)
        return payload
    except Exception as e:
        logger.warning(f"Request authentication failed: {e}")
        return None
