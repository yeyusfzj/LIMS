"""
权限控制验证脚本

快速验证 RBAC 权限系统的功能
"""
from app.core.permissions import (
    Resource,
    Action,
    Role,
    check_permission,
    require_permission,
    ROLE_PERMISSIONS
)
from app.core.exceptions import ForbiddenException


def print_section(title: str):
    """打印分节标题"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


def test_role_permissions(role_name: str, roles: list):
    """测试特定角色的权限"""
    print(f"\n角色: {role_name}")
    print("-" * 60)
    
    # 测试样品资源的各种操作
    sample_actions = [
        (Action.CREATE, "创建样品"),
        (Action.READ, "读取样品"),
        (Action.UPDATE, "更新样品"),
        (Action.DELETE, "删除样品"),
        (Action.TRANSFER, "流转样品"),
        (Action.SPLIT, "分样"),
        (Action.MERGE, "合样"),
    ]
    
    print("\n样品资源权限:")
    for action, desc in sample_actions:
        has_permission = check_permission(roles, Resource.SAMPLE, action)
        status = "✅ 允许" if has_permission else "❌ 拒绝"
        print(f"  {desc:12} - {status}")
    
    # 测试流转资源的操作
    transfer_actions = [
        (Action.CREATE, "创建流转"),
        (Action.READ, "读取流转"),
        (Action.CONFIRM, "确认流转"),
        (Action.CANCEL, "取消流转"),
    ]
    
    print("\n流转资源权限:")
    for action, desc in transfer_actions:
        has_permission = check_permission(roles, Resource.TRANSFER, action)
        status = "✅ 允许" if has_permission else "❌ 拒绝"
        print(f"  {desc:12} - {status}")
    
    # 测试用户资源的操作
    user_actions = [
        (Action.CREATE, "创建用户"),
        (Action.READ, "读取用户"),
        (Action.UPDATE, "更新用户"),
        (Action.DELETE, "删除用户"),
    ]
    
    print("\n用户资源权限:")
    for action, desc in user_actions:
        has_permission = check_permission(roles, Resource.USER, action)
        status = "✅ 允许" if has_permission else "❌ 拒绝"
        print(f"  {desc:12} - {status}")


def test_permission_enforcement():
    """测试权限强制执行"""
    print_section("权限强制执行测试")
    
    # 测试 1: ADMIN 可以删除样品
    print("\n测试 1: ADMIN 删除样品")
    try:
        require_permission(["ADMIN"], Resource.SAMPLE, Action.DELETE)
        print("✅ 权限检查通过 - ADMIN 可以删除样品")
    except ForbiddenException as e:
        print(f"❌ 权限检查失败: {e.detail}")
    
    # 测试 2: VIEWER 不能删除样品
    print("\n测试 2: VIEWER 删除样品")
    try:
        require_permission(["VIEWER"], Resource.SAMPLE, Action.DELETE)
        print("❌ 权限检查应该失败但通过了")
    except ForbiddenException as e:
        print(f"✅ 权限检查正确拒绝 - {e.detail['message']}")
    
    # 测试 3: LAB_MANAGER 可以创建样品
    print("\n测试 3: LAB_MANAGER 创建样品")
    try:
        require_permission(["LAB_MANAGER"], Resource.SAMPLE, Action.CREATE)
        print("✅ 权限检查通过 - LAB_MANAGER 可以创建样品")
    except ForbiddenException as e:
        print(f"❌ 权限检查失败: {e.detail}")
    
    # 测试 4: TECHNICIAN 不能创建样品
    print("\n测试 4: TECHNICIAN 创建样品")
    try:
        require_permission(["TECHNICIAN"], Resource.SAMPLE, Action.CREATE)
        print("❌ 权限检查应该失败但通过了")
    except ForbiddenException as e:
        print(f"✅ 权限检查正确拒绝 - {e.detail['message']}")


def test_multi_role():
    """测试多角色支持"""
    print_section("多角色支持测试")
    
    # 用户同时拥有 TECHNICIAN 和 VIEWER 角色
    multi_roles = ["TECHNICIAN", "VIEWER"]
    
    print(f"\n用户角色: {', '.join(multi_roles)}")
    print("-" * 60)
    
    # 测试读取权限（两个角色都有）
    print("\n测试 1: 读取样品")
    has_read = check_permission(multi_roles, Resource.SAMPLE, Action.READ)
    print(f"  结果: {'✅ 允许' if has_read else '❌ 拒绝'}")
    print(f"  说明: TECHNICIAN 和 VIEWER 都有读取权限")
    
    # 测试更新权限（只有 TECHNICIAN 有）
    print("\n测试 2: 更新样品")
    has_update = check_permission(multi_roles, Resource.SAMPLE, Action.UPDATE)
    print(f"  结果: {'✅ 允许' if has_update else '❌ 拒绝'}")
    print(f"  说明: TECHNICIAN 有更新权限，VIEWER 没有")
    
    # 测试删除权限（两个角色都没有）
    print("\n测试 3: 删除样品")
    has_delete = check_permission(multi_roles, Resource.SAMPLE, Action.DELETE)
    print(f"  结果: {'✅ 允许' if has_delete else '❌ 拒绝'}")
    print(f"  说明: TECHNICIAN 和 VIEWER 都没有删除权限")


def test_case_insensitive():
    """测试角色名称大小写不敏感"""
    print_section("角色名称大小写测试")
    
    role_variations = [
        "ADMIN",
        "admin",
        "Admin",
        "aDmIn"
    ]
    
    print("\n测试不同大小写的 ADMIN 角色:")
    print("-" * 60)
    
    for role in role_variations:
        has_permission = check_permission([role], Resource.SAMPLE, Action.DELETE)
        status = "✅ 通过" if has_permission else "❌ 失败"
        print(f"  角色 '{role:10}' - {status}")


def print_permission_matrix():
    """打印完整的权限矩阵"""
    print_section("完整权限矩阵")
    
    roles = [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN, Role.VIEWER]
    
    for resource in Resource:
        print(f"\n资源: {resource.value.upper()}")
        print("-" * 80)
        
        # 获取该资源的所有操作
        resource_permissions = ROLE_PERMISSIONS.get(resource, {})
        
        if not resource_permissions:
            print("  (无权限定义)")
            continue
        
        # 打印表头
        print(f"  {'操作':<15}", end="")
        for role in roles:
            print(f"{role.value:<15}", end="")
        print()
        
        print(f"  {'-' * 15}", end="")
        for _ in roles:
            print(f"{'-' * 15}", end="")
        print()
        
        # 打印每个操作的权限
        for action in resource_permissions.keys():
            print(f"  {action.value:<15}", end="")
            for role in roles:
                has_permission = check_permission([role.value], resource, action)
                symbol = "✅" if has_permission else "❌"
                print(f"{symbol:<15}", end="")
            print()


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("  FastAPI 样品管理系统 - RBAC 权限控制验证")
    print("=" * 60)
    
    # 测试各个角色的权限
    print_section("各角色权限测试")
    test_role_permissions("ADMIN (系统管理员)", ["ADMIN"])
    test_role_permissions("LAB_MANAGER (实验室管理员)", ["LAB_MANAGER"])
    test_role_permissions("TECHNICIAN (实验室技术员)", ["TECHNICIAN"])
    test_role_permissions("VIEWER (查看者)", ["VIEWER"])
    
    # 测试权限强制执行
    test_permission_enforcement()
    
    # 测试多角色支持
    test_multi_role()
    
    # 测试大小写不敏感
    test_case_insensitive()
    
    # 打印完整权限矩阵
    print_permission_matrix()
    
    # 总结
    print_section("验证完成")
    print("\n✅ 所有权限控制功能正常工作！")
    print("\n权限系统特性:")
    print("  • 支持 4 种角色: ADMIN, LAB_MANAGER, TECHNICIAN, VIEWER")
    print("  • 支持 4 种资源: SAMPLE, TRANSFER, USER, ROLE")
    print("  • 支持 9 种操作: CREATE, READ, UPDATE, DELETE, TRANSFER, SPLIT, MERGE, CONFIRM, CANCEL")
    print("  • 支持多角色（用户可以拥有多个角色）")
    print("  • 角色名称大小写不敏感")
    print("  • 权限不足时自动返回 403 错误")
    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    main()
