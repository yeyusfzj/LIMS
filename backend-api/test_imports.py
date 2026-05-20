#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试导入模块"""

try:
    from app.core.exceptions import APIException, NotFoundException
    print("✓ exceptions.py 导入成功")
except Exception as e:
    print(f"✗ exceptions.py 导入失败: {e}")

try:
    from app.core.logging import setup_logging, get_logger
    print("✓ logging.py 导入成功")
except Exception as e:
    print(f"✗ logging.py 导入失败: {e}")

try:
    from app.middleware.error_handler import register_exception_handlers
    print("✓ error_handler.py 导入成功")
except Exception as e:
    print(f"✗ error_handler.py 导入失败: {e}")

print("\n所有模块导入测试完成")
