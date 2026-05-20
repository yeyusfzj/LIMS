"""
独立测试脚本 - 验证自定义异常类

不依赖 pytest，直接运行验证。
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

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


def test_api_exception():
    """测试基础 API 异常"""
    print("测试 APIException...")
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
    print("✓ APIException 测试通过")


def test_not_found_exception():
    """测试资源不存在异常"""
    print("测试 NotFoundException...")
    exc = NotFoundException()
    assert exc.status_code == 404
    assert exc.error_code == "NOT_FOUND"
    
    exc2 = NotFoundException(message="样品不存在")
    assert exc2.detail["message"] == "样品不存在"
    print("✓ NotFoundException 测试通过")


def test_validation_exception():
    """测试验证错误异常"""
    print("测试 ValidationException...")
    exc = ValidationException(message="验证失败")
    assert exc.status_code == 400
    assert exc.error_code == "VALIDATION_ERROR"
    
    details = {"fields": [{"field": "name", "error": "必填"}]}
    exc2 = ValidationException(message="验证失败", details=details)
    assert exc2.detail["details"] == details
    print("✓ ValidationException 测试通过")


def test_unauthorized_exception():
    """测试未认证异常"""
    print("测试 UnauthorizedException...")
    exc = UnauthorizedException()
    assert exc.status_code == 401
    assert exc.error_code == "UNAUTHORIZED"
    
    exc2 = UnauthorizedException(message="令牌已过期")
    assert exc2.detail["message"] == "令牌已过期"
    print("✓ UnauthorizedException 测试通过")


def test_forbidden_exception():
    """测试权限不足异常"""
    print("测试 ForbiddenException...")
    exc = ForbiddenException()
    assert exc.status_code == 403
    assert exc.error_code == "FORBIDDEN"
    
    exc2 = ForbiddenException(message="无权访问")
    assert exc2.detail["message"] == "无权访问"
    print("✓ ForbiddenException 测试通过")


def test_conflict_exception():
    """测试数据冲突异常"""
    print("测试 ConflictException...")
    exc = ConflictException()
    assert exc.status_code == 409
    assert exc.error_code == "CONFLICT"
    
    exc2 = ConflictException(message="版本冲突")
    assert exc2.detail["message"] == "版本冲突"
    print("✓ ConflictException 测试通过")


def test_rate_limit_exception():
    """测试请求限流异常"""
    print("测试 RateLimitException...")
    exc = RateLimitException()
    assert exc.status_code == 429
    assert exc.error_code == "RATE_LIMIT_EXCEEDED"
    assert exc.detail["details"]["retry_after"] == 60
    
    exc2 = RateLimitException(message="超限", retry_after=120)
    assert exc2.detail["details"]["retry_after"] == 120
    print("✓ RateLimitException 测试通过")


def test_internal_server_exception():
    """测试内部服务器错误异常"""
    print("测试 InternalServerException...")
    exc = InternalServerException()
    assert exc.status_code == 500
    assert exc.error_code == "INTERNAL_ERROR"
    
    exc2 = InternalServerException(message="数据库错误")
    assert exc2.detail["message"] == "数据库错误"
    print("✓ InternalServerException 测试通过")


def test_error_response_format():
    """测试错误响应格式兼容性"""
    print("测试错误响应格式...")
    exc = ValidationException(
        message="验证失败",
        details={"field": "name", "error": "必填字段"}
    )
    
    # 验证响应格式
    assert "code" in exc.detail
    assert "message" in exc.detail
    assert "details" in exc.detail
    
    # 验证与 Node.js 后端兼容的格式
    assert exc.detail["code"] == "VALIDATION_ERROR"
    assert exc.detail["message"] == "验证失败"
    assert exc.detail["details"]["field"] == "name"
    print("✓ 错误响应格式测试通过")


def test_all_exceptions_have_required_fields():
    """测试所有异常都有必需字段"""
    print("测试所有异常的必需字段...")
    exceptions = [
        (NotFoundException(), 404, "NOT_FOUND"),
        (ValidationException("test"), 400, "VALIDATION_ERROR"),
        (UnauthorizedException(), 401, "UNAUTHORIZED"),
        (ForbiddenException(), 403, "FORBIDDEN"),
        (ConflictException(), 409, "CONFLICT"),
        (RateLimitException(), 429, "RATE_LIMIT_EXCEEDED"),
        (InternalServerException(), 500, "INTERNAL_ERROR")
    ]
    
    for exc, expected_status, expected_code in exceptions:
        assert exc.status_code == expected_status
        assert exc.error_code == expected_code
        assert hasattr(exc, "detail")
        assert "code" in exc.detail
        assert "message" in exc.detail
    
    print("✓ 所有异常必需字段测试通过")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("开始测试自定义异常类")
    print("=" * 60)
    print()
    
    try:
        test_api_exception()
        test_not_found_exception()
        test_validation_exception()
        test_unauthorized_exception()
        test_forbidden_exception()
        test_conflict_exception()
        test_rate_limit_exception()
        test_internal_server_exception()
        test_error_response_format()
        test_all_exceptions_have_required_fields()
        
        print()
        print("=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"✗ 测试失败: {e}")
        print("=" * 60)
        return 1
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ 发生错误: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
