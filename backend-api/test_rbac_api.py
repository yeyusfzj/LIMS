"""
测试权限、角色和用户管理 API
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.permission_service import PermissionService
from app.services.role_service import RoleService
from app.services.user_service import UserService


async def test_permission_api():
    """测试权限管理 API"""
    print("\n=== 测试权限管理 ===")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 创建权限
            print("\n1. 创建权限...")
            permission1 = await PermissionService.create_permission(
                db=db,
                resource="test_resource",
                action="test_action"
            )
            print(f"✓ 权限创建成功: {permission1.resource}:{permission1.action}")
            
            # 2. 查询权限列表
            print("\n2. 查询权限列表...")
            permissions = await PermissionService.get_permissions(db=db)
            print(f"✓ 查询到 {len(permissions)} 个权限")
            
            # 3. 按资源筛选
            print("\n3. 按资源筛选权限...")
            filtered = await PermissionService.get_permissions(
                db=db,
                resource="test_resource"
            )
            print(f"✓ 筛选到 {len(filtered)} 个权限")
            
            # 4. 删除权限
            print("\n4. 删除权限...")
            await PermissionService.delete_permission(db=db, permission_id=permission1.id)
            print("✓ 权限删除成功")
            
            print("\n✅ 权限管理测试通过")
            return True
            
        except Exception as e:
            print(f"\n❌ 权限管理测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


async def test_role_api():
    """测试角色管理 API"""
    print("\n=== 测试角色管理 ===")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 创建角色
            print("\n1. 创建角色...")
            role = await RoleService.create_role(
                db=db,
                name="测试角色",
                description="这是一个测试角色"
            )
            print(f"✓ 角色创建成功: {role.name}")
            
            # 2. 查询角色列表
            print("\n2. 查询角色列表...")
            roles = await RoleService.get_roles(db=db)
            print(f"✓ 查询到 {len(roles)} 个角色")
            
            # 3. 更新角色
            print("\n3. 更新角色...")
            updated_role = await RoleService.update_role(
                db=db,
                role_id=role.id,
                description="更新后的描述"
            )
            print(f"✓ 角色更新成功: {updated_role.description}")
            
            # 4. 创建权限并分配给角色
            print("\n4. 创建权限并分配给角色...")
            perm1 = await PermissionService.create_permission(
                db=db,
                resource="sample",
                action="create"
            )
            perm2 = await PermissionService.create_permission(
                db=db,
                resource="sample",
                action="read"
            )
            
            role_with_perms = await RoleService.assign_permissions(
                db=db,
                role_id=role.id,
                permission_ids=[perm1.id, perm2.id]
            )
            print(f"✓ 权限分配成功，角色拥有 {len(role_with_perms.permissions)} 个权限")
            
            # 5. 获取角色权限
            print("\n5. 获取角色权限...")
            permissions = await RoleService.get_role_permissions(db=db, role_id=role.id)
            print(f"✓ 角色拥有 {len(permissions)} 个权限")
            for perm in permissions:
                print(f"  - {perm.resource}:{perm.action}")
            
            # 6. 清理
            print("\n6. 清理测试数据...")
            await RoleService.delete_role(db=db, role_id=role.id)
            await PermissionService.delete_permission(db=db, permission_id=perm1.id)
            await PermissionService.delete_permission(db=db, permission_id=perm2.id)
            print("✓ 清理完成")
            
            print("\n✅ 角色管理测试通过")
            return True
            
        except Exception as e:
            print(f"\n❌ 角色管理测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


async def test_user_api():
    """测试用户管理 API"""
    print("\n=== 测试用户管理 ===")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 创建用户
            print("\n1. 创建用户...")
            user = await UserService.create_user(
                db=db,
                username="testuser",
                password="test123456",
                email="test@example.com",
                full_name="测试用户",
                department="测试部门",
                position="测试职位"
            )
            print(f"✓ 用户创建成功: {user.username}")
            
            # 2. 查询用户列表
            print("\n2. 查询用户列表...")
            users, total = await UserService.get_users(db=db)
            print(f"✓ 查询到 {total} 个用户")
            
            # 3. 更新用户
            print("\n3. 更新用户...")
            updated_user = await UserService.update_user(
                db=db,
                user_id=user.id,
                department="更新后的部门"
            )
            print(f"✓ 用户更新成功: {updated_user.department}")
            
            # 4. 创建角色并分配给用户
            print("\n4. 创建角色并分配给用户...")
            role1 = await RoleService.create_role(
                db=db,
                name="测试角色1",
                description="测试角色1"
            )
            role2 = await RoleService.create_role(
                db=db,
                name="测试角色2",
                description="测试角色2"
            )
            
            user_with_roles = await UserService.assign_roles(
                db=db,
                user_id=user.id,
                role_ids=[role1.id, role2.id]
            )
            print(f"✓ 角色分配成功，用户拥有 {len(user_with_roles.roles)} 个角色")
            
            # 5. 获取用户角色
            print("\n5. 获取用户角色...")
            roles = await UserService.get_user_roles(db=db, user_id=user.id)
            print(f"✓ 用户拥有 {len(roles)} 个角色")
            for role in roles:
                print(f"  - {role.name}")
            
            # 6. 修改密码
            print("\n6. 修改密码...")
            await UserService.change_password(
                db=db,
                user_id=user.id,
                old_password="test123456",
                new_password="newpassword123"
            )
            print("✓ 密码修改成功")
            
            # 7. 清理
            print("\n7. 清理测试数据...")
            await UserService.delete_user(db=db, user_id=user.id)
            await RoleService.delete_role(db=db, role_id=role1.id)
            await RoleService.delete_role(db=db, role_id=role2.id)
            print("✓ 清理完成")
            
            print("\n✅ 用户管理测试通过")
            return True
            
        except Exception as e:
            print(f"\n❌ 用户管理测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


async def test_permission_check():
    """测试权限检查功能"""
    print("\n=== 测试权限检查 ===")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 创建用户、角色和权限
            print("\n1. 创建测试数据...")
            user = await UserService.create_user(
                db=db,
                username="permtest",
                password="test123456",
                email="permtest@example.com",
                full_name="权限测试用户"
            )
            
            role = await RoleService.create_role(
                db=db,
                name="权限测试角色"
            )
            
            perm = await PermissionService.create_permission(
                db=db,
                resource="sample",
                action="create"
            )
            
            # 2. 分配权限给角色
            print("\n2. 分配权限给角色...")
            await RoleService.assign_permissions(
                db=db,
                role_id=role.id,
                permission_ids=[perm.id]
            )
            print("✓ 权限分配成功")
            
            # 3. 分配角色给用户
            print("\n3. 分配角色给用户...")
            await UserService.assign_roles(
                db=db,
                user_id=user.id,
                role_ids=[role.id]
            )
            print("✓ 角色分配成功")
            
            # 4. 检查用户权限
            print("\n4. 检查用户权限...")
            has_permission = await PermissionService.check_user_permission(
                db=db,
                user_id=user.id,
                resource="sample",
                action="create"
            )
            print(f"✓ 用户是否有 sample:create 权限: {has_permission}")
            
            has_no_permission = await PermissionService.check_user_permission(
                db=db,
                user_id=user.id,
                resource="sample",
                action="delete"
            )
            print(f"✓ 用户是否有 sample:delete 权限: {has_no_permission}")
            
            # 5. 清理
            print("\n5. 清理测试数据...")
            await UserService.delete_user(db=db, user_id=user.id)
            await RoleService.delete_role(db=db, role_id=role.id)
            await PermissionService.delete_permission(db=db, permission_id=perm.id)
            print("✓ 清理完成")
            
            if has_permission and not has_no_permission:
                print("\n✅ 权限检查测试通过")
                return True
            else:
                print("\n❌ 权限检查测试失败")
                return False
            
        except Exception as e:
            print(f"\n❌ 权限检查测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


async def main():
    """运行所有测试"""
    print("=" * 60)
    print("权限、角色和用户管理 API 测试")
    print("=" * 60)
    
    results = []
    
    # 运行测试
    results.append(await test_permission_api())
    results.append(await test_role_api())
    results.append(await test_user_api())
    results.append(await test_permission_check())
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    total = len(results)
    passed = sum(results)
    failed = total - passed
    
    print(f"\n总计: {total} 个测试")
    print(f"通过: {passed} 个")
    print(f"失败: {failed} 个")
    
    if all(results):
        print("\n🎉 所有测试通过!")
        return 0
    else:
        print("\n⚠️  部分测试失败")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
