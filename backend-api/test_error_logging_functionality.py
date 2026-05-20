#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试错误处理和日志记录功能"""

import json
import logging
from pathlib import Path
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    RateLimitException
)
from app.core.logging import setup_logging, get_logger, log_with_context, JSONFormatter


def test_exceptions():
    """测试异常类"""
    print("\n=== 测试异常类 ===")
    
    # 测试 NotFoundException
    try:
        raise NotFoundException(message="样品不存在", error_code="SAMPLE_NOT_FOUND")
    except NotFoundException as e:
        print(f"✓ NotFoundException: {e.status_code} - {e.error_code}")
        assert e.status_code == 404
        assert e.error_code == "SAMPLE_NOT_FOUND"
    
    # 测试 ValidationException
    try:
        raise ValidationException(
            message="验证失败",
            details={"field": "quantity", "value": -1}
        )
    except ValidationException as e:
        print(f"✓ ValidationException: {e.status_code} - {e.error_code}")
        assert e.status_code == 400
        assert e.error_code == "VALIDATION_ERROR"
        assert e.details is not None
    
    # 测试 UnauthorizedException
    try:
        raise UnauthorizedException(message="令牌已过期")
    except UnauthorizedException as e:
        print(f"✓ UnauthorizedException: {e.status_code} - {e.error_code}")
        assert e.status_code == 401
    
    # 测试 ForbiddenException
    try:
        raise ForbiddenException(message="权限不足")
    except ForbiddenException as e:
        print(f"✓ ForbiddenException: {e.status_code} - {e.error_code}")
        assert e.status_code == 403
    
    # 测试 ConflictException
    try:
        raise ConflictException(message="数据冲突")
    except ConflictException as e:
        print(f"✓ ConflictException: {e.status_code} - {e.error_code}")
        assert e.status_code == 409
    
    # 测试 RateLimitException
    try:
        raise RateLimitException(message="请求过于频繁", retry_after=60)
    except RateLimitException as e:
        print(f"✓ RateLimitException: {e.status_code} - {e.error_code}")
        assert e.status_code == 429
        assert e.details["retry_after"] == 60
    
    print("所有异常类测试通过 ✓")


def test_json_formatter():
    """测试 JSON 格式化器"""
    print("\n=== 测试 JSON 格式化器 ===")
    
    formatter = JSONFormatter()
    
    # 创建测试日志记录
    record = logging.LogRecord(
        name="test.module",
        level=logging.INFO,
        pathname="test.py",
        lineno=42,
        msg="测试消息",
        args=(),
        exc_info=None
    )
    
    # 添加额外字段
    record.request_id = "test-request-id"
    record.user_id = "test-user-id"
    
    # 格式化
    result = formatter.format(record)
    data = json.loads(result)
    
    # 验证
    assert data["level"] == "INFO"
    assert data["message"] == "测试消息"
    assert data["logger"] == "test.module"
    assert data["line"] == 42
    assert data["request_id"] == "test-request-id"
    assert data["user_id"] == "test-user-id"
    assert "timestamp" in data
    
    print(f"✓ JSON 格式化器测试通过")
    print(f"  示例输出: {json.dumps(data, ensure_ascii=False, indent=2)[:200]}...")


def test_logging_setup():
    """测试日志配置"""
    print("\n=== 测试日志配置 ===")
    
    # 创建临时日志目录
    test_log_dir = Path("test_logs")
    test_log_dir.mkdir(exist_ok=True)
    
    # 配置日志
    setup_logging(
        log_level="DEBUG",
        log_dir=str(test_log_dir),
        enable_console=False,  # 禁用控制台输出以避免干扰
        enable_file=True,
        enable_json=True,
        enable_rotation=True
    )
    
    # 获取日志器
    logger = get_logger("test")
    
    # 记录不同级别的日志
    logger.debug("这是 DEBUG 日志")
    logger.info("这是 INFO 日志")
    logger.warning("这是 WARNING 日志")
    logger.error("这是 ERROR 日志")
    
    # 验证日志文件是否创建
    combined_log = test_log_dir / "combined.log"
    error_log = test_log_dir / "error.log"
    
    assert combined_log.exists(), "combined.log 应该被创建"
    assert error_log.exists(), "error.log 应该被创建"
    
    # 读取日志内容
    with open(combined_log, "r", encoding="utf-8") as f:
        combined_content = f.read()
        assert "DEBUG" in combined_content or "INFO" in combined_content
    
    with open(error_log, "r", encoding="utf-8") as f:
        error_content = f.read()
        assert "ERROR" in error_content
    
    print(f"✓ 日志文件创建成功")
    print(f"  - combined.log: {combined_log.stat().st_size} bytes")
    print(f"  - error.log: {error_log.stat().st_size} bytes")
    
    # 关闭所有日志处理器
    for handler in logging.root.handlers[:]:
        handler.close()
        logging.root.removeHandler(handler)
    
    # 清理
    import shutil
    import time
    time.sleep(0.1)  # 等待文件句柄释放
    try:
        shutil.rmtree(test_log_dir)
        print(f"✓ 测试日志目录已清理")
    except Exception as e:
        print(f"⚠ 无法清理测试日志目录: {e}")
        print(f"  请手动删除: {test_log_dir}")


def test_log_with_context():
    """测试带上下文的日志"""
    print("\n=== 测试带上下文的日志 ===")
    
    logger = get_logger("test.context")
    
    # 记录带上下文的日志
    log_with_context(
        logger,
        "info",
        "样品创建成功",
        request_id="req-123",
        user_id="user-456",
        sample_id="sample-789"
    )
    
    print("✓ 带上下文的日志记录成功")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("错误处理和日志记录功能测试")
    print("=" * 60)
    
    try:
        test_exceptions()
        test_json_formatter()
        test_logging_setup()
        test_log_with_context()
        
        print("\n" + "=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
        raise
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        raise


if __name__ == "__main__":
    main()
