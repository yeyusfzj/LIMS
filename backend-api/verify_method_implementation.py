"""
验证检测方法实现

检查所有必要的文件和导入是否正确
"""
import sys


def verify_implementation():
    """验证实现"""
    print("=" * 80)
    print("检测方法实现验证")
    print("=" * 80)
    
    errors = []
    
    # 1. 检查 schemas
    print("\n[1] 检查 schemas...")
    try:
        from app.schemas.method import (
            MethodCreate,
            MethodUpdate,
            MethodResponse,
            MethodListResponse,
            CopyMethodRequest,
            Equipment,
            MethodStep,
            MethodStatus
        )
        print("  ✓ schemas 导入成功")
    except Exception as e:
        errors.append(f"schemas 导入失败: {str(e)}")
        print(f"  ✗ schemas 导入失败: {str(e)}")
    
    # 2. 检查 models
    print("\n[2] 检查 models...")
    try:
        from app.models.method import TestMethod, MethodStatus as ModelMethodStatus
        print("  ✓ models 导入成功")
    except Exception as e:
        errors.append(f"models 导入失败: {str(e)}")
        print(f"  ✗ models 导入失败: {str(e)}")
    
    # 3. 检查 service
    print("\n[3] 检查 service...")
    try:
        from app.services.method_service import method_service
        print("  ✓ service 导入成功")
        
        # 检查服务方法
        methods = [
            'create_method',
            'get_method_list',
            'get_method_by_id',
            'update_method',
            'delete_method',
            'get_method_history',
            'copy_method',
            'archive_method',
            'activate_method'
        ]
        
        for method in methods:
            if not hasattr(method_service, method):
                errors.append(f"service 缺少方法: {method}")
                print(f"  ✗ 缺少方法: {method}")
            else:
                print(f"  ✓ 方法存在: {method}")
                
    except Exception as e:
        errors.append(f"service 导入失败: {str(e)}")
        print(f"  ✗ service 导入失败: {str(e)}")
    
    # 4. 检查 router
    print("\n[4] 检查 router...")
    try:
        from app.routers.methods import router
        print("  ✓ router 导入成功")
        
        # 检查路由
        routes = router.routes
        print(f"  ✓ 路由数量: {len(routes)}")
        
        for route in routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods_str = ', '.join(route.methods) if route.methods else 'N/A'
                print(f"    - {methods_str:10} {route.path}")
                
    except Exception as e:
        errors.append(f"router 导入失败: {str(e)}")
        print(f"  ✗ router 导入失败: {str(e)}")
    
    # 5. 检查主应用注册
    print("\n[5] 检查主应用注册...")
    try:
        from app.main import app
        
        # 检查路由是否注册
        registered = False
        for route in app.routes:
            if hasattr(route, 'path') and '/api/v1/methods' in route.path:
                registered = True
                break
        
        if registered:
            print("  ✓ 路由已注册到主应用")
        else:
            errors.append("路由未注册到主应用")
            print("  ✗ 路由未注册到主应用")
            
    except Exception as e:
        errors.append(f"主应用检查失败: {str(e)}")
        print(f"  ✗ 主应用检查失败: {str(e)}")
    
    # 总结
    print("\n" + "=" * 80)
    if errors:
        print(f"验证失败，发现 {len(errors)} 个错误:")
        for error in errors:
            print(f"  - {error}")
        print("=" * 80)
        return False
    else:
        print("所有验证通过！")
        print("=" * 80)
        return True


if __name__ == "__main__":
    success = verify_implementation()
    sys.exit(0 if success else 1)
