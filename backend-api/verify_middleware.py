"""
验证中间件配置

这个脚本验证所有中间件是否正确配置和工作。
"""

import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_imports():
    """验证所有中间件模块是否可以导入"""
    logger.info("验证中间件模块导入...")
    
    try:
        from app.middleware.cors import configure_cors, get_cors_config
        logger.info("✓ CORS 中间件导入成功")
    except Exception as e:
        logger.error(f"✗ CORS 中间件导入失败: {e}")
        return False
    
    try:
        from app.middleware.rate_limit import RateLimitMiddleware
        logger.info("✓ 限流中间件导入成功")
    except Exception as e:
        logger.error(f"✗ 限流中间件导入失败: {e}")
        return False
    
    try:
        from app.middleware.logging import RequestLoggingMiddleware
        logger.info("✓ 日志中间件导入成功")
    except Exception as e:
        logger.error(f"✗ 日志中间件导入失败: {e}")
        return False
    
    try:
        from app.middleware.error_handler import (
            api_exception_handler,
            validation_exception_handler,
            integrity_error_handler,
            database_error_handler,
            data_error_handler,
            http_exception_handler,
            generic_exception_handler
        )
        logger.info("✓ 错误处理器导入成功")
    except Exception as e:
        logger.error(f"✗ 错误处理器导入失败: {e}")
        return False
    
    return True


def verify_main_app():
    """验证主应用是否可以加载"""
    logger.info("\n验证主应用加载...")
    
    try:
        from app.main import app
        logger.info("✓ 主应用加载成功")
        
        # 检查中间件
        middleware_count = len(app.user_middleware)
        logger.info(f"✓ 已注册 {middleware_count} 个中间件")
        
        # 检查异常处理器
        exception_handlers_count = len(app.exception_handlers)
        logger.info(f"✓ 已注册 {exception_handlers_count} 个异常处理器")
        
        # 检查路由
        routes_count = len(app.routes)
        logger.info(f"✓ 已注册 {routes_count} 个路由")
        
        return True
    except Exception as e:
        logger.error(f"✗ 主应用加载失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_cors_config():
    """验证 CORS 配置"""
    logger.info("\n验证 CORS 配置...")
    
    try:
        from app.middleware.cors import get_cors_config
        config = get_cors_config()
        
        logger.info(f"✓ 允许的源: {config['allowed_origins']}")
        logger.info(f"✓ 允许凭证: {config['allow_credentials']}")
        logger.info(f"✓ 允许方法: {config['allow_methods']}")
        logger.info(f"✓ 预检缓存: {config['max_age']} 秒")
        
        return True
    except Exception as e:
        logger.error(f"✗ CORS 配置验证失败: {e}")
        return False


def verify_rate_limit_config():
    """验证限流配置"""
    logger.info("\n验证限流配置...")
    
    try:
        from app.config import settings
        
        logger.info(f"✓ 限流配置: {settings.RATE_LIMIT_PER_MINUTE} 次/分钟")
        
        return True
    except Exception as e:
        logger.error(f"✗ 限流配置验证失败: {e}")
        return False


def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("开始验证中间件配置")
    logger.info("=" * 60)
    
    results = []
    
    # 验证导入
    results.append(("模块导入", verify_imports()))
    
    # 验证主应用
    results.append(("主应用加载", verify_main_app()))
    
    # 验证 CORS 配置
    results.append(("CORS 配置", verify_cors_config()))
    
    # 验证限流配置
    results.append(("限流配置", verify_rate_limit_config()))
    
    # 输出总结
    logger.info("\n" + "=" * 60)
    logger.info("验证结果总结")
    logger.info("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        logger.info(f"{name}: {status}")
        if not passed:
            all_passed = False
    
    logger.info("=" * 60)
    
    if all_passed:
        logger.info("✓ 所有验证通过！中间件配置正确。")
        return 0
    else:
        logger.error("✗ 部分验证失败，请检查错误信息。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
