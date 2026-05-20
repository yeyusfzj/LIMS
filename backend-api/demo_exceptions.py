"""
异常类使用演示

展示如何在实际场景中使用自定义异常类。
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    RateLimitException,
    InternalServerException
)


def demo_not_found():
    """演示资源不存在异常"""
    print("\n=== 演示 NotFoundException ===")
    try:
        sample_id = 12345
        # 模拟查询不存在的样品
        raise NotFoundException(message=f"ID 为 {sample_id} 的样品不存在")
    except NotFoundException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_validation():
    """演示验证错误异常"""
    print("\n=== 演示 ValidationException ===")
    try:
        # 模拟验证失败
        raise ValidationException(
            message="样品数据验证失败",
            details={
                "fields": [
                    {"field": "name", "error": "名称不能为空"},
                    {"field": "quantity", "error": "数量必须大于0"},
                    {"field": "unit", "error": "单位必须是有效值"}
                ]
            }
        )
    except ValidationException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_unauthorized():
    """演示未认证异常"""
    print("\n=== 演示 UnauthorizedException ===")
    try:
        # 模拟令牌过期
        raise UnauthorizedException(message="认证令牌已过期，请重新登录")
    except UnauthorizedException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_forbidden():
    """演示权限不足异常"""
    print("\n=== 演示 ForbiddenException ===")
    try:
        # 模拟权限不足
        raise ForbiddenException(message="只有管理员可以删除样品")
    except ForbiddenException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_conflict():
    """演示数据冲突异常"""
    print("\n=== 演示 ConflictException ===")
    try:
        # 模拟版本冲突
        raise ConflictException(
            message="样品已被其他用户修改，请刷新后重试"
        )
    except ConflictException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_rate_limit():
    """演示请求限流异常"""
    print("\n=== 演示 RateLimitException ===")
    try:
        # 模拟超过限流
        raise RateLimitException(
            message="超过每分钟请求限制",
            retry_after=120
        )
    except RateLimitException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")
        print(f"重试等待时间: {e.detail['details']['retry_after']} 秒")


def demo_internal_server():
    """演示内部服务器错误异常"""
    print("\n=== 演示 InternalServerException ===")
    try:
        # 模拟内部错误
        raise InternalServerException(message="服务暂时不可用，请稍后重试")
    except InternalServerException as e:
        print(f"状态码: {e.status_code}")
        print(f"错误代码: {e.error_code}")
        print(f"错误详情: {e.detail}")


def demo_api_response_format():
    """演示 API 响应格式"""
    print("\n=== 演示 API 响应格式（与 Node.js 后端兼容）===")
    try:
        raise ValidationException(
            message="验证失败",
            details={"field": "barcode", "error": "条码格式不正确"}
        )
    except ValidationException as e:
        # 模拟 API 响应
        response = {
            "message": "操作失败",
            "error": e.detail
        }
        print("API 响应格式:")
        import json
        print(json.dumps(response, ensure_ascii=False, indent=2))


def main():
    """运行所有演示"""
    print("=" * 60)
    print("自定义异常类使用演示")
    print("=" * 60)
    
    demo_not_found()
    demo_validation()
    demo_unauthorized()
    demo_forbidden()
    demo_conflict()
    demo_rate_limit()
    demo_internal_server()
    demo_api_response_format()
    
    print("\n" + "=" * 60)
    print("演示完成！")
    print("=" * 60)


if __name__ == "__main__":
    main()
