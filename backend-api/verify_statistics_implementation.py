"""
统计分析实现验证脚本

验证统计分析服务和 API 的实现是否正确
"""

import os
import sys


def check_file_exists(filepath: str) -> bool:
    """检查文件是否存在"""
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    print(f"{status} {filepath}")
    return exists


def check_import(module_path: str) -> bool:
    """检查模块是否可以导入"""
    try:
        parts = module_path.split(".")
        module = __import__(module_path)
        for part in parts[1:]:
            module = getattr(module, part)
        print(f"✓ 可以导入: {module_path}")
        return True
    except Exception as e:
        print(f"✗ 无法导入: {module_path} - {str(e)}")
        return False


def check_class_methods(module_path: str, class_name: str, methods: list) -> bool:
    """检查类的方法是否存在"""
    try:
        parts = module_path.split(".")
        module = __import__(module_path)
        for part in parts[1:]:
            module = getattr(module, part)
        
        cls = getattr(module, class_name)
        all_exist = True
        
        for method in methods:
            if hasattr(cls, method):
                print(f"  ✓ {class_name}.{method}")
            else:
                print(f"  ✗ {class_name}.{method} 不存在")
                all_exist = False
        
        return all_exist
    except Exception as e:
        print(f"✗ 检查类方法失败: {str(e)}")
        return False


def check_router_endpoints(module_path: str, endpoints: list) -> bool:
    """检查路由端点是否存在"""
    try:
        parts = module_path.split(".")
        module = __import__(module_path)
        for part in parts[1:]:
            module = getattr(module, part)
        
        router = getattr(module, "router")
        routes = [route.path for route in router.routes]
        
        all_exist = True
        for endpoint in endpoints:
            if endpoint in routes:
                print(f"  ✓ {endpoint}")
            else:
                print(f"  ✗ {endpoint} 不存在")
                all_exist = False
        
        return all_exist
    except Exception as e:
        print(f"✗ 检查路由端点失败: {str(e)}")
        return False


def main():
    """主验证函数"""
    print("=" * 60)
    print("统计分析实现验证")
    print("=" * 60)
    
    all_checks_passed = True
    
    # 1. 检查文件是否存在
    print("\n1. 检查文件是否存在")
    print("-" * 60)
    files = [
        "app/services/statistics_service.py",
        "app/routers/statistics.py",
        "app/core/cache.py",
        "test_statistics_api.py",
        "TASK_7.11_SUMMARY.md"
    ]
    
    for filepath in files:
        if not check_file_exists(filepath):
            all_checks_passed = False
    
    # 2. 检查模块导入
    print("\n2. 检查模块导入")
    print("-" * 60)
    modules = [
        "app.services.statistics_service",
        "app.routers.statistics",
        "app.core.cache"
    ]
    
    for module in modules:
        if not check_import(module):
            all_checks_passed = False
    
    # 3. 检查 StatisticsService 类方法
    print("\n3. 检查 StatisticsService 类方法")
    print("-" * 60)
    methods = [
        "get_overview_statistics",
        "get_audit_statistics",
        "get_workload_statistics",
        "get_quality_statistics",
        "clear_cache",
        "_generate_cache_key",
        "_build_time_filter"
    ]
    
    if not check_class_methods("app.services.statistics_service", "StatisticsService", methods):
        all_checks_passed = False
    
    # 4. 检查路由端点
    print("\n4. 检查路由端点")
    print("-" * 60)
    endpoints = [
        "/api/v1/statistics/overview",
        "/api/v1/statistics/audit",
        "/api/v1/statistics/workload",
        "/api/v1/statistics/quality",
        "/api/v1/statistics/cache"
    ]
    
    if not check_router_endpoints("app.routers.statistics", endpoints):
        all_checks_passed = False
    
    # 5. 检查缓存工具函数
    print("\n5. 检查缓存工具函数")
    print("-" * 60)
    try:
        from app.core import cache
        functions = [
            "get_cache",
            "set_cache",
            "delete_cache",
            "delete_cache_pattern",
            "exists_cache",
            "get_ttl"
        ]
        
        for func_name in functions:
            if hasattr(cache, func_name):
                print(f"  ✓ {func_name}")
            else:
                print(f"  ✗ {func_name} 不存在")
                all_checks_passed = False
    except Exception as e:
        print(f"✗ 检查缓存工具函数失败: {str(e)}")
        all_checks_passed = False
    
    # 6. 检查主应用集成
    print("\n6. 检查主应用集成")
    print("-" * 60)
    try:
        from app import main
        
        # 检查是否导入了 statistics 路由
        import inspect
        source = inspect.getsource(main)
        
        if "from app.routers import" in source and "statistics" in source:
            print("  ✓ 已导入 statistics 路由")
        else:
            print("  ✗ 未导入 statistics 路由")
            all_checks_passed = False
        
        if "app.include_router(statistics.router)" in source:
            print("  ✓ 已注册 statistics 路由")
        else:
            print("  ✗ 未注册 statistics 路由")
            all_checks_passed = False
        
        if '"name": "statistics"' in source:
            print("  ✓ 已添加 OpenAPI 标签")
        else:
            print("  ✗ 未添加 OpenAPI 标签")
            all_checks_passed = False
    except Exception as e:
        print(f"✗ 检查主应用集成失败: {str(e)}")
        all_checks_passed = False
    
    # 总结
    print("\n" + "=" * 60)
    if all_checks_passed:
        print("✓ 所有检查通过！")
        print("\n下一步：")
        print("1. 启动 FastAPI 服务: uvicorn app.main:app --reload")
        print("2. 运行测试脚本: python test_statistics_api.py")
        print("3. 访问 API 文档: http://localhost:8000/docs")
    else:
        print("✗ 部分检查失败，请检查上述错误")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    # 切换到 fastapi-backend 目录
    if os.path.basename(os.getcwd()) != "fastapi-backend":
        if os.path.exists("fastapi-backend"):
            os.chdir("fastapi-backend")
        else:
            print("错误：请在项目根目录或 fastapi-backend 目录下运行此脚本")
            sys.exit(1)
    
    main()
