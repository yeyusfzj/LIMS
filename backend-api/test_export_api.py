"""
测试导出 API

验证导出 API 端点功能
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))


def test_export_endpoints_defined():
    """测试导出端点是否已定义"""
    print("\n=== 测试导出端点定义 ===")
    
    try:
        from app.routers import export
        
        # 检查路由器是否存在
        if hasattr(export, 'router'):
            print("✓ 导出路由器已定义")
            
            # 检查路由器的前缀
            if export.router.prefix == "/api/v1/export":
                print("✓ 路由前缀正确: /api/v1/export")
            else:
                print(f"✗ 路由前缀错误: {export.router.prefix}")
            
            # 检查路由器的标签
            if "export" in export.router.tags:
                print("✓ 路由标签正确: export")
            else:
                print(f"✗ 路由标签错误: {export.router.tags}")
            
            # 检查路由数量
            route_count = len(export.router.routes)
            print(f"✓ 已定义 {route_count} 个路由")
            
            # 列出所有路由
            print("\n已定义的路由:")
            for route in export.router.routes:
                if hasattr(route, 'methods') and hasattr(route, 'path'):
                    methods = ', '.join(route.methods)
                    print(f"  - {methods} {export.router.prefix}{route.path}")
        else:
            print("✗ 导出路由器未定义")
            
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


def test_export_service_functions():
    """测试导出服务函数"""
    print("\n=== 测试导出服务函数 ===")
    
    try:
        from app.services.export_service import ExportService, ExportFormat, ExportStatus
        
        # 检查类是否存在
        print("✓ ExportService 类已定义")
        
        # 检查枚举
        print(f"✓ ExportFormat 枚举: {[f.value for f in ExportFormat]}")
        print(f"✓ ExportStatus 枚举: {[s.value for s in ExportStatus]}")
        
        # 检查方法
        methods = [
            'initialize',
            'create_export_task',
            'get_export_task',
            'export_to_excel',
            'export_to_csv',
            'get_export_file',
            'cleanup_expired_files'
        ]
        
        for method in methods:
            if hasattr(ExportService, method):
                print(f"✓ 方法已定义: {method}")
            else:
                print(f"✗ 方法未定义: {method}")
                
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


def test_statistics_export_integration():
    """测试统计路由中的导出集成"""
    print("\n=== 测试统计路由导出集成 ===")
    
    try:
        from app.routers import statistics
        
        # 检查统计路由是否导入了导出服务
        import inspect
        source = inspect.getsource(statistics)
        
        if 'ExportService' in source:
            print("✓ 统计路由已导入 ExportService")
        else:
            print("✗ 统计路由未导入 ExportService")
        
        if 'export_statistics' in source or '/export' in source:
            print("✓ 统计路由包含导出端点")
        else:
            print("✗ 统计路由未包含导出端点")
            
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


def test_request_models():
    """测试请求模型"""
    print("\n=== 测试请求模型 ===")
    
    try:
        from app.routers.export import ExportExcelRequest, ExportCSVRequest
        
        print("✓ ExportExcelRequest 模型已定义")
        print("✓ ExportCSVRequest 模型已定义")
        
        # 测试模型字段
        excel_fields = ExportExcelRequest.model_fields
        print(f"  Excel 请求字段: {list(excel_fields.keys())}")
        
        csv_fields = ExportCSVRequest.model_fields
        print(f"  CSV 请求字段: {list(csv_fields.keys())}")
        
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


def test_main_app_integration():
    """测试主应用集成"""
    print("\n=== 测试主应用集成 ===")
    
    try:
        # 检查 main.py 是否导入了 export 路由
        with open('app/main.py', 'r', encoding='utf-8') as f:
            main_content = f.read()
        
        if 'from app.routers import' in main_content and 'export' in main_content:
            print("✓ main.py 已导入 export 路由")
        else:
            print("✗ main.py 未导入 export 路由")
        
        if 'app.include_router(export.router)' in main_content:
            print("✓ main.py 已注册 export 路由")
        else:
            print("✗ main.py 未注册 export 路由")
        
        if '"name": "export"' in main_content:
            print("✓ main.py 已定义 export 标签")
        else:
            print("✗ main.py 未定义 export 标签")
            
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("导出 API 测试")
    print("=" * 60)
    
    test_export_endpoints_defined()
    test_export_service_functions()
    test_statistics_export_integration()
    test_request_models()
    test_main_app_integration()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
