"""
验证路由定义
"""
import sys
sys.path.insert(0, '.')

from app.routers import permissions, roles, users

def verify_routes():
    """验证路由定义"""
    print("=" * 60)
    print("验证权限、角色和用户管理 API 路由")
    print("=" * 60)
    
    # 权限路由
    print("\n=== 权限管理路由 ===")
    print(f"路由前缀: {permissions.router.prefix}")
    print(f"标签: {permissions.router.tags}")
    print(f"路由数量: {len(permissions.router.routes)}")
    print("\n端点列表:")
    for route in permissions.router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            print(f"  {methods:10} {route.path}")
    
    # 角色路由
    print("\n=== 角色管理路由 ===")
    print(f"路由前缀: {roles.router.prefix}")
    print(f"标签: {roles.router.tags}")
    print(f"路由数量: {len(roles.router.routes)}")
    print("\n端点列表:")
    for route in roles.router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            print(f"  {methods:10} {route.path}")
    
    # 用户路由
    print("\n=== 用户管理路由 ===")
    print(f"路由前缀: {users.router.prefix}")
    print(f"标签: {users.router.tags}")
    print(f"路由数量: {len(users.router.routes)}")
    print("\n端点列表:")
    for route in users.router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            print(f"  {methods:10} {route.path}")
    
    # 统计
    print("\n" + "=" * 60)
    print("统计信息")
    print("=" * 60)
    total_routes = (
        len(permissions.router.routes) +
        len(roles.router.routes) +
        len(users.router.routes)
    )
    print(f"\n总路由数: {total_routes}")
    print(f"  - 权限管理: {len(permissions.router.routes)} 个端点")
    print(f"  - 角色管理: {len(roles.router.routes)} 个端点")
    print(f"  - 用户管理: {len(users.router.routes)} 个端点")
    
    print("\n✅ 所有路由定义验证完成!")
    
    # 验证必需的端点
    print("\n" + "=" * 60)
    print("验证必需端点")
    print("=" * 60)
    
    required_endpoints = {
        "权限管理": [
            ("POST", "/"),
            ("GET", "/"),
            ("DELETE", "/{permission_id}"),
        ],
        "角色管理": [
            ("POST", "/"),
            ("GET", "/"),
            ("GET", "/{role_id}"),
            ("PUT", "/{role_id}"),
            ("DELETE", "/{role_id}"),
            ("POST", "/{role_id}/permissions"),
        ],
        "用户管理": [
            ("POST", "/"),
            ("GET", "/"),
            ("GET", "/{user_id}"),
            ("PUT", "/{user_id}"),
            ("DELETE", "/{user_id}"),
            ("POST", "/{user_id}/roles"),
            ("GET", "/{user_id}/roles"),
        ]
    }
    
    all_passed = True
    
    for module_name, endpoints in required_endpoints.items():
        print(f"\n{module_name}:")
        if module_name == "权限管理":
            router = permissions.router
        elif module_name == "角色管理":
            router = roles.router
        else:
            router = users.router
        
        for method, path in endpoints:
            found = False
            for route in router.routes:
                if hasattr(route, 'methods') and hasattr(route, 'path'):
                    if method in route.methods and route.path == path:
                        found = True
                        break
            
            status = "✓" if found else "✗"
            print(f"  {status} {method:6} {path}")
            if not found:
                all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有必需端点都已实现!")
        return 0
    else:
        print("⚠️  部分必需端点缺失")
        return 1


if __name__ == "__main__":
    try:
        exit_code = verify_routes()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ 验证失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
