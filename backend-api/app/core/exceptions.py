"""
自定义异常类

定义统一的异常处理机制，与 Node.js 后端保持兼容。
错误响应格式：
{
    "message": "操作失败",
    "error": {
        "code": "ERROR_CODE",
        "message": "详细错误信息",
        "details": {...},
        "timestamp": "2024-01-01T00:00:00Z",
        "path": "/api/v1/samples",
        "requestId": "uuid"
    }
}
"""
from fastapi import HTTPException, status
from typing import Optional, Any, Dict


class APIException(HTTPException):
    """
    基础 API 异常类
    
    所有自定义异常的基类，继承自 FastAPI 的 HTTPException。
    提供统一的错误响应格式，包含状态码、错误代码、消息和详细信息。
    
    特性：
    - 统一的错误响应格式
    - 支持错误追踪（request_id）
    - 支持详细错误信息
    - 与 Node.js 后端完全兼容
    """
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Any] = None
    ):
        """
        初始化 API 异常
        
        Args:
            status_code: HTTP 状态码
            error_code: 错误代码字符串（如 NOT_FOUND, VALIDATION_ERROR）
            message: 错误消息
            details: 可选的详细信息（字典或其他可序列化对象）
        """
        self.error_code = error_code
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "code": error_code,
                "message": message,
                "details": details
            }
        )


class NotFoundException(APIException):
    """
    资源不存在异常 (HTTP 404)
    
    当请求的资源（如样品、用户等）不存在时抛出此异常。
    
    使用场景：
    - 根据 ID 查询资源时，资源不存在
    - 访问不存在的端点
    - 查询结果为空且必须存在
    
    示例：
        raise NotFoundException(message="样品不存在", error_code="SAMPLE_NOT_FOUND")
    """
    def __init__(self, message: str = "资源不存在", error_code: str = "NOT_FOUND", details: Optional[Any] = None):
        """
        初始化资源不存在异常
        
        Args:
            message: 错误消息，默认为"资源不存在"
            error_code: 错误代码，默认为"NOT_FOUND"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            message=message,
            details=details
        )


class ValidationException(APIException):
    """
    验证错误异常 (HTTP 400)
    
    当请求数据验证失败时抛出此异常。
    可以包含详细的验证错误信息。
    
    使用场景：
    - 业务规则验证失败
    - 数据格式不正确
    - 参数值不在允许范围内
    
    示例：
        raise ValidationException(
            message="样品数量必须大于0",
            details={"field": "quantity", "value": -1}
        )
    """
    def __init__(self, message: str, details: Optional[Dict] = None):
        """
        初始化验证错误异常
        
        Args:
            message: 错误消息
            details: 可选的详细验证错误信息（如字段级别的错误）
        """
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            message=message,
            details=details
        )


class UnauthorizedException(APIException):
    """
    未认证异常 (HTTP 401)
    
    当用户未提供有效的认证令牌或令牌已过期时抛出此异常。
    
    使用场景：
    - 未提供认证令牌
    - 令牌已过期
    - 令牌格式不正确
    - 令牌签名验证失败
    
    示例：
        raise UnauthorizedException(message="令牌已过期", error_code="TOKEN_EXPIRED")
    """
    def __init__(self, message: str = "用户未认证", error_code: str = "UNAUTHORIZED", details: Optional[Any] = None):
        """
        初始化未认证异常
        
        Args:
            message: 错误消息，默认为"用户未认证"
            error_code: 错误代码，默认为"UNAUTHORIZED"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            message=message,
            details=details
        )


class ForbiddenException(APIException):
    """
    权限不足异常 (HTTP 403)
    
    当用户已认证但没有足够权限执行操作时抛出此异常。
    
    使用场景：
    - 用户没有访问资源的权限
    - 用户没有执行操作的权限
    - 数据权限限制
    
    示例：
        raise ForbiddenException(message="您没有权限删除此样品")
    """
    def __init__(self, message: str = "权限不足", details: Optional[Any] = None):
        """
        初始化权限不足异常
        
        Args:
            message: 错误消息，默认为"权限不足"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
            message=message,
            details=details
        )


class ConflictException(APIException):
    """
    数据冲突异常 (HTTP 409)
    
    当发生数据冲突时抛出此异常，例如：
    - 乐观锁版本冲突
    - 唯一性约束冲突
    - 并发更新冲突
    - 业务状态冲突
    
    使用场景：
    - 样品条码重复
    - 样品编号重复
    - 数据版本冲突
    - 状态不允许的操作
    
    示例：
        raise ConflictException(
            message="样品条码已存在",
            details={"barcode": "SP20240101000001"}
        )
    """
    def __init__(self, message: str = "数据冲突", details: Optional[Any] = None):
        """
        初始化数据冲突异常
        
        Args:
            message: 错误消息，默认为"数据冲突"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message=message,
            details=details
        )


class RateLimitException(APIException):
    """
    请求限流异常 (HTTP 429)
    
    当用户请求超过限流阈值时抛出此异常。
    包含 retry_after 信息，告知客户端何时可以重试。
    
    使用场景：
    - 登录尝试次数过多
    - API 调用频率过高
    - 批量操作限制
    
    示例：
        raise RateLimitException(
            message="登录尝试次数过多，请1分钟后重试",
            retry_after=60
        )
    """
    def __init__(self, message: str = "请求过于频繁", retry_after: int = 60):
        """
        初始化请求限流异常
        
        Args:
            message: 错误消息，默认为"请求过于频繁"
            retry_after: 重试等待时间（秒），默认 60 秒
        """
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message=message,
            details={"retry_after": retry_after}
        )


class InternalServerException(APIException):
    """
    内部服务器错误异常 (HTTP 500)
    
    当服务器内部发生未预期的错误时抛出此异常。
    通常用于包装未捕获的异常，避免暴露内部实现细节。
    
    使用场景：
    - 数据库连接失败
    - 外部服务调用失败
    - 未预期的运行时错误
    - 系统资源不足
    
    示例：
        raise InternalServerException(message="数据库连接失败")
    """
    def __init__(self, message: str = "服务器内部错误", details: Optional[Any] = None):
        """
        初始化内部服务器错误异常
        
        Args:
            message: 错误消息，默认为"服务器内部错误"
            details: 可选的详细信息（生产环境不应暴露）
        """
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            message=message,
            details=details
        )


class BadRequestException(APIException):
    """
    错误请求异常 (HTTP 400)
    
    当请求格式不正确或参数无效时抛出此异常。
    
    使用场景：
    - 请求参数缺失
    - 请求格式不正确
    - 参数类型错误
    
    示例：
        raise BadRequestException(message="缺少必填参数: clientName")
    """
    def __init__(self, message: str = "错误的请求", details: Optional[Any] = None):
        """
        初始化错误请求异常
        
        Args:
            message: 错误消息，默认为"错误的请求"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="BAD_REQUEST",
            message=message,
            details=details
        )


class ServiceUnavailableException(APIException):
    """
    服务不可用异常 (HTTP 503)
    
    当依赖的服务不可用时抛出此异常。
    
    使用场景：
    - 数据库服务不可用
    - Redis 服务不可用
    - 外部 API 不可用
    - 系统维护中
    
    示例：
        raise ServiceUnavailableException(message="数据库服务暂时不可用")
    """
    def __init__(self, message: str = "服务暂时不可用", details: Optional[Any] = None):
        """
        初始化服务不可用异常
        
        Args:
            message: 错误消息，默认为"服务暂时不可用"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            message=message,
            details=details
        )


class DatabaseException(APIException):
    """
    数据库异常 (HTTP 500)
    
    当数据库操作失败时抛出此异常。
    
    使用场景：
    - 数据库查询失败
    - 数据库连接超时
    - 事务失败
    
    示例：
        raise DatabaseException(message="数据库查询超时")
    """
    def __init__(self, message: str = "数据库操作失败", details: Optional[Any] = None):
        """
        初始化数据库异常
        
        Args:
            message: 错误消息，默认为"数据库操作失败"
            details: 可选的详细信息
        """
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            message=message,
            details=details
        )
