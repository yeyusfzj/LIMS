"""
JWT 认证和安全相关功能
"""
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import secrets
import redis.asyncio as redis
from app.config import settings
from app.core.exceptions import UnauthorizedException
from app.core.logging import logger


# Redis 客户端（可选）
_redis_client: Optional[redis.Redis] = None


async def get_redis_client() -> Optional[redis.Redis]:
    """获取 Redis 客户端"""
    global _redis_client
    
    if _redis_client is None and settings.REDIS_URL:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            # 测试连接
            await _redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Continuing without Redis.")
            _redis_client = None
    elif _redis_client is None and (settings.REDIS_HOST or settings.REDIS_PORT):
        try:
            _redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                encoding="utf-8",
                decode_responses=True
            )
            # 测试连接
            await _redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Continuing without Redis.")
            _redis_client = None
    
    return _redis_client


async def close_redis_client():
    """关闭 Redis 客户端"""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


class JWTPayload:
    """JWT 令牌载荷"""
    
    def __init__(
        self,
        user_id: str,
        username: str,
        roles: list[str],
        jti: Optional[str] = None,
        iat: Optional[int] = None,
        exp: Optional[int] = None
    ):
        self.user_id = user_id
        self.username = username
        self.roles = roles
        self.jti = jti
        self.iat = iat
        self.exp = exp
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JWTPayload":
        """从字典创建载荷对象"""
        return cls(
            user_id=data.get("userId"),
            username=data.get("username"),
            roles=data.get("roles", []),
            jti=data.get("jti"),
            iat=data.get("iat"),
            exp=data.get("exp")
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "userId": self.user_id,
            "username": self.username,
            "roles": self.roles,
            "jti": self.jti,
            "iat": self.iat,
            "exp": self.exp
        }


def decode_jwt_token(token: str) -> JWTPayload:
    """
    解码和验证 JWT 令牌
    
    Args:
        token: JWT 令牌字符串
        
    Returns:
        JWTPayload: 令牌载荷对象
        
    Raises:
        UnauthorizedException: 令牌无效、过期或格式错误
    """
    try:
        # 验证令牌签名和过期时间
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException(
            message="令牌已过期",
            error_code="TOKEN_EXPIRED"
        )
    except jwt.JWTClaimsError:
        raise UnauthorizedException(
            message="令牌声明无效",
            error_code="INVALID_CLAIMS"
        )
    except JWTError as e:
        # 处理其他 JWT 错误（包括签名错误、解码错误等）
        error_msg = str(e).lower()
        if "signature" in error_msg:
            raise UnauthorizedException(
                message="令牌签名无效",
                error_code="INVALID_SIGNATURE"
            )
        elif "decode" in error_msg or "format" in error_msg:
            raise UnauthorizedException(
                message="令牌格式错误",
                error_code="MALFORMED_TOKEN"
            )
        else:
            raise UnauthorizedException(
                message=f"令牌无效: {str(e)}",
                error_code="INVALID_TOKEN"
            )
    except Exception as e:
        raise UnauthorizedException(
            message=f"令牌验证失败: {str(e)}",
            error_code="TOKEN_VERIFICATION_FAILED"
        )
    
    # 验证必需字段
    if "userId" not in payload:
        raise UnauthorizedException(
            message="令牌格式错误：缺少 userId 字段",
            error_code="MALFORMED_TOKEN"
        )
    
    if "roles" not in payload:
        raise UnauthorizedException(
            message="令牌格式错误：缺少 roles 字段",
            error_code="MALFORMED_TOKEN"
        )
    
    # 创建载荷对象
    jwt_payload = JWTPayload.from_dict(payload)
    
    return jwt_payload


def generate_jwt_token(
    user_id: str,
    username: str,
    roles: list[str],
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access"
) -> str:
    """
    生成 JWT 令牌
    
    Args:
        user_id: 用户ID
        username: 用户名
        roles: 角色列表
        expires_delta: 过期时间增量（可选）
        token_type: 令牌类型（access 或 refresh）
        
    Returns:
        str: JWT 令牌字符串
    """
    if expires_delta is None:
        if token_type == "refresh":
            expires_delta = timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
        else:
            expires_delta = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    iat = datetime.utcnow()
    
    # 生成唯一的 JTI（JWT ID）
    jti = secrets.token_urlsafe(16)
    
    payload = {
        "userId": user_id,
        "username": username,
        "roles": roles,
        "jti": jti,
        "exp": expire,
        "iat": iat
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return token


async def verify_token(token: str, check_blacklist: bool = True) -> JWTPayload:
    """
    验证 JWT 令牌
    
    Args:
        token: JWT 令牌字符串
        check_blacklist: 是否检查黑名单
        
    Returns:
        JWTPayload: 令牌载荷对象
        
    Raises:
        UnauthorizedException: 令牌无效、过期或已被撤销
    """
    # 解码令牌
    payload_obj = decode_jwt_token(token)
    
    # 检查令牌是否在黑名单中
    if check_blacklist:
        redis_client = await get_redis_client()
        if redis_client:
            try:
                is_blacklisted = await redis_client.exists(f"blacklist:{token}")
                if is_blacklisted:
                    raise UnauthorizedException(
                        message="令牌已被撤销",
                        error_code="TOKEN_REVOKED"
                    )
            except Exception as e:
                logger.warning(f"Failed to check token blacklist: {e}")
                # 如果 Redis 不可用，跳过黑名单检查
    
    return payload_obj


async def revoke_token(token: str, user_id: str):
    """
    撤销令牌（将令牌加入黑名单）
    
    Args:
        token: 要撤销的令牌
        user_id: 用户ID
    """
    redis_client = await get_redis_client()
    if redis_client:
        try:
            # 解码令牌获取过期时间
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_exp": False}  # 不验证过期时间
            )
            
            exp = payload.get("exp")
            if exp:
                # 计算 TTL（直到令牌过期）
                ttl = exp - int(datetime.utcnow().timestamp())
                if ttl > 0:
                    # 将令牌加入黑名单
                    await redis_client.setex(f"blacklist:{token}", ttl, "1")
                    logger.info(f"Token revoked for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to revoke token: {e}")
    else:
        logger.warning("Redis not available, cannot revoke token")


async def store_refresh_token(user_id: str, refresh_token: str):
    """
    存储刷新令牌到 Redis
    
    Args:
        user_id: 用户ID
        refresh_token: 刷新令牌
    """
    redis_client = await get_redis_client()
    if redis_client:
        try:
            # 存储刷新令牌，过期时间为 7 天
            ttl = settings.JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60
            await redis_client.setex(
                f"refresh_token:{user_id}",
                ttl,
                refresh_token
            )
            logger.info(f"Refresh token stored for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to store refresh token: {e}")
    else:
        logger.warning("Redis not available, cannot store refresh token")


async def verify_refresh_token(user_id: str, refresh_token: str) -> bool:
    """
    验证刷新令牌是否有效
    
    Args:
        user_id: 用户ID
        refresh_token: 刷新令牌
        
    Returns:
        bool: 令牌是否有效
    """
    redis_client = await get_redis_client()
    if redis_client:
        try:
            stored_token = await redis_client.get(f"refresh_token:{user_id}")
            return stored_token == refresh_token
        except Exception as e:
            logger.warning(f"Failed to verify refresh token: {e}")
            # 如果 Redis 不可用，跳过验证
            return True
    else:
        # 如果 Redis 不可用，跳过验证
        return True


async def delete_refresh_token(user_id: str):
    """
    删除刷新令牌
    
    Args:
        user_id: 用户ID
    """
    redis_client = await get_redis_client()
    if redis_client:
        try:
            await redis_client.delete(f"refresh_token:{user_id}")
            logger.info(f"Refresh token deleted for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to delete refresh token: {e}")
    else:
        logger.warning("Redis not available, cannot delete refresh token")
