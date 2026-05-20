"""
测试权限、角色和用户管理 API
"""
import asyncio
import sys
sys.path.insert(0, 'fastapi-backend')

from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def test_api_routes():
    """测试 API 路由是否正确注册"""
    print("测试 API 路由...")
    
    # 获取所有路由
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            for method in route.methods:
                routes.append(f"{method} {route.path}")
    
    # 检查权限管理路由
    permission_routes = [
        "POST /api/permissions/",
        "GET /api/permissions/",
        "DELETE /api/permissions/{permission_id}",
        "GET /api/permissions/me",
        "GET /api/permissions/me/roles",
    ]
    
    # 检查角色管理路由
    role_routes = [
        "POST /api/roles/",
        "GET /api/roles/",
        "GET /api/roles/{role_id}",
        "PUT /api/roles/{role_id}",
        "DELETE /api/roles/{role_id}",
        "POST /api/roles/{role_id}/permissions",
        "DELETE /api/roles/{role_id}/permissions",
    ]
    
    # 检查用户管理路由
    user_routes = [
        "POST /api/users/",
        "GET /api/users/",
        "GET /api/users/{user_id}",
        "PUT /api/users/{user_id}",
        "PATCH /api/users/{user_id}/status",
        "POST /api/users/{user_id}/reset-password",
        "DELETE /api/users/{user_id}",
    ]
    
    all_expected_routes = permission_routes + role_routes + user_routes
    
    print(f"\n已注册的路由总数: {len(routes)}")
    print(f"预期的新路由数: {len(all_expected_routes)}")
    
    # 检查每个预期路由是否存在
    missing_routes = []
    for expected_route in all_expected_routes:
        if expected_route not in routes:
            missing_routes.append(expected_route)
    
    if missing_routes:
        print(f"\n❌ 缺少以下路由:")
        for route in missing_routes:
            print(f"  - {route}")
        return False
    else:
        print(f"\n✅ 所有预期路由都已正确注册!")
        print(f"\n权限管理路由 ({len(permission_routes)}):")
        for route in permission_routes:
            print(f"  ✓ {route}")
        print(f"\n角色管理路由 ({len(role_routes)}):")
        for route in role_routes:
            print(f"  ✓ {route}")
        print(f"\n用户管理路由 ({len(user_routes)}):")
        for route in user_routes:
            print(f"  ✓ {route}")
        return True

if __name__ == "__main__":
    try:
        success = test_api_routes()
        if success:
            print("\n✅ 所有测试通过!")
            sys.exit(0)
        else:
            print("\n❌ 测试失败!")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试出错: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
