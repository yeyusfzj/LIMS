"""
全局异常处理器

处理所有类型的异常，返回统一格式的错误响应，与 Node.js 后端保持兼容。

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

支持的异常类型：
1. APIException - 自定义 API 异常
2. RequestValidationError - Pydantic 验证异常
3. IntegrityError - 数据库完整性约束异常
4. OperationalError - 数据库操作异常
5. DataError - 数据类型错误
6. HTTPException - FastAPI HTTP 异常
7. Exception - 未捕获的通用异常

与 Node.js 后端的兼容性：
- 使用相同的错误响应格式
- 使用相同的错误代码
- 使用相同的 HTTP 状态码
- 支持错误追踪（request_id）
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError, DataError, SQLAlchemyError
from app.core.exceptions import APIException
from app.config import settings
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)


def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """
    为响应添加 CORS 头
    
    确保错误响应也包含正确的 CORS 头，避免浏览器阻止响应。
    
    Args:
        response: JSON 响应对象
        request: 请求对象
        
    Returns:
        JSONResponse: 添加了 CORS 头的响应
    """
    # 获取请求的 Origin
    origin = request.headers.get("origin")
    
    # 检查 Origin 是否在允许列表中
    if origin and origin in settings.cors_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response


async def api_exception_handler(request: Request, exc: APIException) -> JSONResponse:
    """
    处理自定义 API 异常
    
    处理所有继承自 APIException 的自定义异常，包括：
    - NotFoundException (404)
    - ValidationException (400)
    - UnauthorizedException (401)
    - ForbiddenException (403)
    - ConflictException (409)
    - RateLimitException (429)
    - InternalServerException (500)
    - BadRequestException (400)
    - ServiceUnavailableException (503)
    - DatabaseException (500)
    
    Args:
        request: FastAPI 请求对象
        exc: API 异常实例
        
    Returns:
        JSONResponse: 统一格式的错误响应
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 记录日志
    logger.warning(
        f"API exception: {exc.error_code} - {exc.detail['message']}",
        extra={
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "details": exc.details
        }
    )
    
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "message": "操作失败",
            "error": {
                "code": exc.error_code,
                "message": exc.detail["message"],
                "details": exc.detail.get("details"),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    处理 Pydantic 验证异常
    
    当请求数据不符合 Pydantic 模型定义时触发，例如：
    - 缺少必填字段
    - 字段类型错误
    - 字段值不符合约束（长度、范围等）
    
    Args:
        request: FastAPI 请求对象
        exc: Pydantic 验证异常
        
    Returns:
        JSONResponse: 包含详细验证错误信息的响应 (HTTP 422)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 解析验证错误，构建字段级错误信息
    errors = {}
    for error in exc.errors():
        # 构建字段路径（跳过第一个元素 'body'）
        if len(error["loc"]) > 1:
            field = ".".join(str(loc) for loc in error["loc"][1:])
        else:
            field = str(error["loc"][0])
        
        errors[field] = {
            "message": error["msg"],
            "type": error["type"]
        }
    
    # 记录日志
    logger.warning(
        f"Validation error: {len(errors)} field(s) failed validation",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": errors,
            "request_id": request_id
        }
    )
    
    response = JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": "请求参数验证失败",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "请求参数格式不正确",
                "details": errors,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    """
    处理数据库完整性约束异常
    
    当数据库操作违反完整性约束时触发，例如：
    - 唯一性约束冲突（条码、样品编号重复）
    - 外键约束冲突（关联数据不存在）
    - 非空约束冲突
    - 检查约束冲突
    
    Args:
        request: FastAPI 请求对象
        exc: SQLAlchemy 完整性错误异常
        
    Returns:
        JSONResponse: 包含友好错误信息的响应 (HTTP 400 或 409)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 记录详细错误日志
    logger.error(
        f"Database integrity error: {str(exc.orig)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    # 解析约束违反类型，提供友好的错误消息
    error_msg = str(exc.orig).lower()
    
    if "unique constraint" in error_msg or "duplicate key" in error_msg:
        message = "数据已存在，违反唯一性约束"
        code = "DUPLICATE_ERROR"
        status_code = status.HTTP_409_CONFLICT
    elif "foreign key constraint" in error_msg:
        message = "关联数据不存在"
        code = "FOREIGN_KEY_ERROR"
        status_code = status.HTTP_400_BAD_REQUEST
    elif "not null constraint" in error_msg or "null value" in error_msg:
        message = "必填字段不能为空"
        code = "NOT_NULL_ERROR"
        status_code = status.HTTP_400_BAD_REQUEST
    elif "check constraint" in error_msg:
        message = "数据值不符合约束条件"
        code = "CHECK_CONSTRAINT_ERROR"
        status_code = status.HTTP_400_BAD_REQUEST
    else:
        message = "数据完整性约束违反"
        code = "INTEGRITY_ERROR"
        status_code = status.HTTP_400_BAD_REQUEST
    
    response = JSONResponse(
        status_code=status_code,
        content={
            "message": "操作失败",
            "error": {
                "code": code,
                "message": message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def database_error_handler(request: Request, exc: OperationalError) -> JSONResponse:
    """
    处理数据库操作异常
    
    当数据库连接或操作失败时触发，例如：
    - 数据库连接超时
    - 数据库服务不可用
    - SQL 语法错误
    - 事务死锁
    - 连接池耗尽
    
    Args:
        request: FastAPI 请求对象
        exc: SQLAlchemy 操作错误异常
        
    Returns:
        JSONResponse: 服务不可用响应 (HTTP 503)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 记录详细错误日志
    logger.error(
        f"Database operational error: {str(exc.orig)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    response = JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "message": "服务暂时不可用",
            "error": {
                "code": "DATABASE_ERROR",
                "message": "数据库连接失败，请稍后重试",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def data_error_handler(request: Request, exc: DataError) -> JSONResponse:
    """
    处理数据类型错误异常
    
    当数据库操作中的数据类型不匹配时触发，例如：
    - 字符串长度超过字段限制
    - 数值超出范围
    - 日期格式错误
    - 枚举值不合法
    
    Args:
        request: FastAPI 请求对象
        exc: SQLAlchemy 数据错误异常
        
    Returns:
        JSONResponse: 数据错误响应 (HTTP 400)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 记录警告日志
    logger.warning(
        f"Database data error: {str(exc.orig)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "exception_type": type(exc).__name__
        }
    )
    
    response = JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "message": "数据格式错误",
            "error": {
                "code": "DATA_ERROR",
                "message": "提供的数据格式不正确或超出允许范围",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """
    处理通用 SQLAlchemy 异常
    
    捕获所有未被其他处理器处理的 SQLAlchemy 异常。
    
    Args:
        request: FastAPI 请求对象
        exc: SQLAlchemy 异常
        
    Returns:
        JSONResponse: 内部服务器错误响应 (HTTP 500)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 记录详细错误日志
    logger.error(
        f"SQLAlchemy error: {type(exc).__name__}: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "服务器内部错误",
            "error": {
                "code": "DATABASE_ERROR",
                "message": "数据库操作失败",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    处理 FastAPI HTTP 异常
    
    处理 FastAPI 内置的 HTTP 异常，例如：
    - 404 Not Found
    - 405 Method Not Allowed
    - 401 Unauthorized
    - 403 Forbidden
    
    Args:
        request: FastAPI 请求对象
        exc: FastAPI HTTP 异常
        
    Returns:
        JSONResponse: HTTP 错误响应
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 根据状态码确定错误代码
    error_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE"
    }
    
    error_code = error_codes.get(exc.status_code, "HTTP_ERROR")
    
    # 记录日志
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id
        }
    )
    
    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "message": "操作失败",
            "error": {
                "code": error_code,
                "message": str(exc.detail),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    处理未捕获的异常
    
    作为最后的兜底处理器，捕获所有未被其他处理器处理的异常。
    记录详细的错误信息用于调试，但只返回通用的错误消息给客户端，
    避免暴露内部实现细节。
    
    Args:
        request: FastAPI 请求对象
        exc: 未捕获的异常
        
    Returns:
        JSONResponse: 内部服务器错误响应 (HTTP 500)
    """
    # 获取 request_id（如果存在）
    request_id = getattr(request.state, "request_id", "unknown")
    
    # 获取堆栈跟踪
    stack_trace = traceback.format_exc()
    
    # 记录详细错误日志
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
            "request_id": request_id,
            "stack_trace": stack_trace
        },
        exc_info=True
    )
    
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "服务器内部错误",
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "服务器处理请求时发生错误",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": request.url.path,
                "requestId": request_id
            }
        }
    )
    
    # 添加 CORS 头
    return add_cors_headers(response, request)


def register_exception_handlers(app):
    """
    注册所有异常处理器到 FastAPI 应用
    
    Args:
        app: FastAPI 应用实例
    
    注册顺序（从具体到通用）：
    1. APIException - 自定义 API 异常
    2. RequestValidationError - Pydantic 验证异常
    3. IntegrityError - 数据库完整性约束异常
    4. OperationalError - 数据库操作异常
    5. DataError - 数据类型错误
    6. SQLAlchemyError - 通用 SQLAlchemy 异常
    7. HTTPException - FastAPI HTTP 异常
    8. Exception - 未捕获的通用异常
    """
    app.add_exception_handler(APIException, api_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(OperationalError, database_error_handler)
    app.add_exception_handler(DataError, data_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("All exception handlers registered successfully")
