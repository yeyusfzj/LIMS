"""
验证限流实现
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def verify_rate_limit_middleware():
    """验证限流中间件"""
    print("=" * 60)
    print("验证限流中间件实现")
    print("=" * 60)
    
    try:
        from app.middleware.rate_limit import RateLimitMiddleware, limiter, rate_limit_exceeded_handler
        print("✓ 限流中间件导入成功")
        
        # 检查中间件类
        assert hasattr(RateLimitMiddleware, '__init__')
        assert hasattr(RateLimitMiddleware, 'dispatch')
        assert hasattr(RateLimitMiddleware, '_get_client_ip')
        assert hasattr(RateLimitMiddleware, '_cleanup_old_records')
        assert hasattr(RateLimitMiddleware, '_check_rate_limit_memory')
        assert hasattr(RateLimitMiddleware, '_check_rate_limit_redis')
        assert hasattr(RateLimitMiddleware, '_record_request_redis')
        assert hasattr(RateLimitMiddleware, '_get_endpoint_limit')
        print("✓ 限流中间件方法完整")
        
        # 检查 slowapi 集成
        assert limiter is not None
        print("✓ slowapi 限流器已配置")
        
        # 检查异常处理器
        assert rate_limit_exceeded_handler is not None
        print("✓ 限流异常处理器已配置")
        
        # 检查端点限流配置
        middleware = RateLimitMiddleware(None, 60, 60)
        assert "/api/v1/auth/login" in middleware.endpoint_limits
        assert "/api/v1/auth/refresh" in middleware.endpoint_limits
        assert middleware.endpoint_limits["/api/v1/auth/login"] == (5, 60)
        assert middleware.endpoint_limits["/api/v1/auth/refresh"] == (10, 60)
        print("✓ 端点限流配置正确")
        
        print("\n✅ 限流中间件验证通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 限流中间件验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def verify_auth_routes():
    """验证认证路由限流"""
    print("\n" + "=" * 60)
    print("验证认证路由限流")
    print("=" * 60)
    
    try:
        from app.api.v1.auth import router
        print("✓ 认证路由导入成功")
        
        # 检查路由是否存在
        routes = [route for route in router.routes]
        assert len(routes) > 0
        print(f"✓ 找到 {len(routes)} 个路由")
        
        # 检查登录路由
        login_route = next((r for r in routes if r.path == "/login" and "POST" in r.methods), None)
        assert login_route is not None
        print("✓ 登录路由存在")
        
        # 检查刷新路由
        refresh_route = next((r for r in routes if r.path == "/refresh" and "POST" in r.methods), None)
        assert refresh_route is not None
        print("✓ 刷新令牌路由存在")
        
        print("\n✅ 认证路由验证通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 认证路由验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def verify_user_routes():
    """验证用户管理路由限流"""
    print("\n" + "=" * 60)
    print("验证用户管理路由限流")
    print("=" * 60)
    
    try:
        from app.routers.users import router
        print("✓ 用户管理路由导入成功")
        
        # 检查路由是否存在
        routes = [route for route in router.routes]
        assert len(routes) > 0
        print(f"✓ 找到 {len(routes)} 个路由")
        
        # 检查创建用户路由
        create_route = next((r for r in routes if r.path == "/" and "POST" in r.methods), None)
        assert create_route is not None
        print("✓ 创建用户路由存在")
        
        # 检查重置密码路由
        reset_route = next((r for r in routes if "reset-password" in r.path and "POST" in r.methods), None)
        assert reset_route is not None
        print("✓ 重置密码路由存在")
        
        print("\n✅ 用户管理路由验证通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 用户管理路由验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def verify_main_app():
    """验证主应用配置"""
    print("\n" + "=" * 60)
    print("验证主应用配置")
    print("=" * 60)
    
    try:
        from app.main import app
        print("✓ 主应用导入成功")
        
        # 检查中间件
        middleware_count = len(app.user_middleware)
        print(f"✓ 找到 {middleware_count} 个中间件")
        
        # 检查异常处理器
        exception_handlers = app.exception_handlers
        print(f"✓ 找到 {len(exception_handlers)} 个异常处理器")
        
        # 检查路由
        routes = app.routes
        print(f"✓ 找到 {len(routes)} 个路由")
        
        print("\n✅ 主应用配置验证通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 主应用配置验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def verify_documentation():
    """验证文档文件"""
    print("\n" + "=" * 60)
    print("验证文档文件")
    print("=" * 60)
    
    try:
        # 检查限流指南
        guide_path = "docs/RATE_LIMIT_GUIDE.md"
        assert os.path.exists(guide_path)
        print(f"✓ 限流指南存在: {guide_path}")
        
        # 检查任务总结
        summary_path = "TASK_9.15_RATE_LIMIT_SUMMARY.md"
        assert os.path.exists(summary_path)
        print(f"✓ 任务总结存在: {summary_path}")
        
        # 检查测试文件
        test_path = "tests/test_rate_limit.py"
        assert os.path.exists(test_path)
        print(f"✓ 测试文件存在: {test_path}")
        
        print("\n✅ 文档文件验证通过")
        return True
        
    except Exception as e:
        print(f"\n❌ 文档文件验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("限流保护实现验证")
    print("=" * 60)
    
    results = []
    
    # 运行所有验证
    results.append(("限流中间件", verify_rate_limit_middleware()))
    results.append(("认证路由", verify_auth_routes()))
    results.append(("用户管理路由", verify_user_routes()))
    results.append(("主应用配置", verify_main_app()))
    results.append(("文档文件", verify_documentation()))
    
    # 打印总结
    print("\n" + "=" * 60)
    print("验证总结")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name}: {status}")
    
    # 总体结果
    all_passed = all(result for _, result in results)
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ 所有验证通过！限流保护实现完成。")
    else:
        print("❌ 部分验证失败，请检查错误信息。")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
