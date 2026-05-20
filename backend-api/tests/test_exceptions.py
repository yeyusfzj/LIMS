"""
测试自定义异常类

验证所有异常类的功能和错误响应格式。
"""
import pytest
from fastapi import status
from app.core.exceptions import (
    APIException,
    NotFoundException,
    ValidationException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    RateLimitException,
    InternalServerException
)


class TestAPIException:
    """测试基础 API 异常类"""
    
    def test_api_exception_initialization(self):
        """测试 API 异常初始化"""
        exc = APIException(
            status_code=400,
            error_code="TEST_ERROR",
            message="测试错误",
            details={"field": "test"}
        )
        
        assert exc.status_code == 400
        assert exc.error_code == "TEST_ERROR"
        assert exc.details == {"field": "test"}
        assert exc.detail["code"] == "TEST_ERROR"
        assert exc.detail["message"] == "测试错误"
        assert exc.detail["details"] == {"field": "test"}
    
    def test_api_exception_without_details(self):
        """测试不带详细信息的 API 异常"""
        exc = APIException(
            status_code=400,
            error_code="TEST_ERROR",
            message="测试错误"
        )
        
        assert exc.details is None
        assert exc.detail["details"] is None


class TestNotFoundException:
    """测试资源不存在异常"""
    
    def test_not_found_exception_default_message(self):
        """测试默认错误消息"""
        exc = NotFoundException()
        
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert exc.error_code == "NOT_FOUND"
        assert exc.detail["message"] == "资源不存在"
    
    def test_not_found_exception_custom_message(self):
        """测试自定义错误消息"""
        exc = NotFoundException(message="样品不存在")
        
        assert exc.status_code == status.HTTP_404_NOT_FOUND
        assert exc.error_code == "NOT_FOUND"
        assert exc.detail["message"] == "样品不存在"


class TestValidationException:
    """测试验证错误异常"""
    
    def test_validation_exception_with_message(self):
        """测试带消息的验证异常"""
        exc = ValidationException(message="验证失败")
        
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.detail["message"] == "验证失败"
        assert exc.detail["details"] is None
    
    def test_validation_exception_with_details(self):
        """测试带详细信息的验证异常"""
        details = {
            "fields": [
                {"field": "name", "error": "名称不能为空"},
                {"field": "quantity", "error": "数量必须大于0"}
            ]
        }
        exc = ValidationException(message="验证失败", details=details)
        
        assert exc.status_code == status.HTTP_400_BAD_REQUEST
        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.detail["message"] == "验证失败"
        assert exc.detail["details"] == details


class TestUnauthorizedException:
    """测试未认证异常"""
    
    def test_unauthorized_exception_default_message(self):
        """测试默认错误消息"""
        exc = UnauthorizedException()
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "UNAUTHORIZED"
        assert exc.detail["message"] == "用户未认证"
    
    def test_unauthorized_exception_custom_message(self):
        """测试自定义错误消息"""
        exc = UnauthorizedException(message="令牌已过期")
        
        assert exc.status_code == status.HTTP_401_UNAUTHORIZED
        assert exc.error_code == "UNAUTHORIZED"
        assert exc.detail["message"] == "令牌已过期"


class TestForbiddenException:
    """测试权限不足异常"""
    
    def test_forbidden_exception_default_message(self):
        """测试默认错误消息"""
        exc = ForbiddenException()
        
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.error_code == "FORBIDDEN"
        assert exc.detail["message"] == "权限不足"
    
    def test_forbidden_exception_custom_message(self):
        """测试自定义错误消息"""
        exc = ForbiddenException(message="无权访问此资源")
        
        assert exc.status_code == status.HTTP_403_FORBIDDEN
        assert exc.error_code == "FORBIDDEN"
        assert exc.detail["message"] == "无权访问此资源"


class TestConflictException:
    """测试数据冲突异常"""
    
    def test_conflict_exception_default_message(self):
        """测试默认错误消息"""
        exc = ConflictException()
        
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert exc.error_code == "CONFLICT"
        assert exc.detail["message"] == "数据冲突"
    
    def test_conflict_exception_custom_message(self):
        """测试自定义错误消息"""
        exc = ConflictException(message="版本冲突，请刷新后重试")
        
        assert exc.status_code == status.HTTP_409_CONFLICT
        assert exc.error_code == "CONFLICT"
        assert exc.detail["message"] == "版本冲突，请刷新后重试"


class TestRateLimitException:
    """测试请求限流异常"""
    
    def test_rate_limit_exception_default_values(self):
        """测试默认值"""
        exc = RateLimitException()
        
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc.detail["message"] == "请求过于频繁"
        assert exc.detail["details"]["retry_after"] == 60
    
    def test_rate_limit_exception_custom_values(self):
        """测试自定义值"""
        exc = RateLimitException(
            message="超过每分钟请求限制",
            retry_after=120
        )
        
        assert exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert exc.error_code == "RATE_LIMIT_EXCEEDED"
        assert exc.detail["message"] == "超过每分钟请求限制"
        assert exc.detail["details"]["retry_after"] == 120


class TestInternalServerException:
    """测试内部服务器错误异常"""
    
    def test_internal_server_exception_default_message(self):
        """测试默认错误消息"""
        exc = InternalServerException()
        
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.error_code == "INTERNAL_ERROR"
        assert exc.detail["message"] == "服务器内部错误"
    
    def test_internal_server_exception_custom_message(self):
        """测试自定义错误消息"""
        exc = InternalServerException(message="数据库连接失败")
        
        assert exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert exc.error_code == "INTERNAL_ERROR"
        assert exc.detail["message"] == "数据库连接失败"


class TestExceptionCompatibility:
    """测试异常与 Node.js 后端的兼容性"""
    
    def test_error_response_format(self):
        """测试错误响应格式与 Node.js 后端兼容"""
        exc = ValidationException(
            message="验证失败",
            details={"field": "name", "error": "必填字段"}
        )
        
        # 验证响应格式包含所需字段
        assert "code" in exc.detail
        assert "message" in exc.detail
        assert "details" in exc.detail
        
        # 验证字段值
        assert exc.detail["code"] == "VALIDATION_ERROR"
        assert exc.detail["message"] == "验证失败"
        assert exc.detail["details"]["field"] == "name"
    
    def test_all_exceptions_have_error_code(self):
        """测试所有异常都有错误代码"""
        exceptions = [
            NotFoundException(),
            ValidationException("test"),
            UnauthorizedException(),
            ForbiddenException(),
            ConflictException(),
            RateLimitException(),
            InternalServerException()
        ]
        
        for exc in exceptions:
            assert hasattr(exc, "error_code")
            assert exc.error_code is not None
            assert isinstance(exc.error_code, str)
            assert len(exc.error_code) > 0
    
    def test_all_exceptions_have_status_code(self):
        """测试所有异常都有 HTTP 状态码"""
        exceptions = [
            (NotFoundException(), 404),
            (ValidationException("test"), 400),
            (UnauthorizedException(), 401),
            (ForbiddenException(), 403),
            (ConflictException(), 409),
            (RateLimitException(), 429),
            (InternalServerException(), 500)
        ]
        
        for exc, expected_status in exceptions:
            assert exc.status_code == expected_status
