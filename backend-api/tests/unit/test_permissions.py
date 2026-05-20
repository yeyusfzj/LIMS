"""
权限控制单元测试

测试 RBAC 权限检查逻辑
"""
import pytest
from app.core.permissions import (
    Resource,
    Action,
    Role,
    check_permission,
    require_permission,
    ROLE_PERMISSIONS
)
from app.core.exceptions import ForbiddenException


class TestPermissionCheck:
    """测试权限检查函数"""
    
    def test_admin_has_all_sample_permissions(self):
        """测试 ADMIN 角色拥有所有样品权限"""
        admin_roles = ["ADMIN"]
        
        assert check_permission(admin_roles, Resource.SAMPLE, Action.CREATE) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.READ) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.UPDATE) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.DELETE) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.TRANSFER) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.SPLIT) is True
        assert check_permission(admin_roles, Resource.SAMPLE, Action.MERGE) is True
    
    def test_lab_manager_sample_permissions(self):
        """测试 LAB_MANAGER 角色的样品权限"""
        lab_manager_roles = ["LAB_MANAGER"]
        
        # LAB_MANAGER 可以创建、读取、更新、流转、分样、合样
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.CREATE) is True
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.READ) is True
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.UPDATE) is True
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.TRANSFER) is True
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.SPLIT) is True
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.MERGE) is True
        
        # LAB_MANAGER 不能删除样品
        assert check_permission(lab_manager_roles, Resource.SAMPLE, Action.DELETE) is False
    
    def test_technician_sample_permissions(self):
        """测试 TECHNICIAN 角色的样品权限"""
        technician_roles = ["TECHNICIAN"]
        
        # TECHNICIAN 可以读取和更新样品
        assert check_permission(technician_roles, Resource.SAMPLE, Action.READ) is True
        assert check_permission(technician_roles, Resource.SAMPLE, Action.UPDATE) is True
        
        # TECHNICIAN 不能创建、删除、流转、分样、合样
        assert check_permission(technician_roles, Resource.SAMPLE, Action.CREATE) is False
        assert check_permission(technician_roles, Resource.SAMPLE, Action.DELETE) is False
        assert check_permission(technician_roles, Resource.SAMPLE, Action.TRANSFER) is False
        assert check_permission(technician_roles, Resource.SAMPLE, Action.SPLIT) is False
        assert check_permission(technician_roles, Resource.SAMPLE, Action.MERGE) is False
    
    def test_viewer_sample_permissions(self):
        """测试 VIEWER 角色的样品权限"""
        viewer_roles = ["VIEWER"]
        
        # VIEWER 只能读取样品
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.READ) is True
        
        # VIEWER 不能执行其他操作
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.CREATE) is False
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.UPDATE) is False
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.DELETE) is False
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.TRANSFER) is False
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.SPLIT) is False
        assert check_permission(viewer_roles, Resource.SAMPLE, Action.MERGE) is False
    
    def test_multiple_roles(self):
        """测试用户拥有多个角色的情况"""
        # 用户同时拥有 TECHNICIAN 和 VIEWER 角色
        roles = ["TECHNICIAN", "VIEWER"]
        
        # 应该拥有 TECHNICIAN 的权限
        assert check_permission(roles, Resource.SAMPLE, Action.READ) is True
        assert check_permission(roles, Resource.SAMPLE, Action.UPDATE) is True
        
        # 仍然不能创建样品
        assert check_permission(roles, Resource.SAMPLE, Action.CREATE) is False
    
    def test_empty_roles(self):
        """测试空角色列表"""
        empty_roles = []
        
        # 没有角色的用户不能执行任何操作
        assert check_permission(empty_roles, Resource.SAMPLE, Action.READ) is False
        assert check_permission(empty_roles, Resource.SAMPLE, Action.CREATE) is False
    
    def test_case_insensitive_roles(self):
        """测试角色名称大小写不敏感"""
        # 小写角色名
        roles_lower = ["admin"]
        assert check_permission(roles_lower, Resource.SAMPLE, Action.DELETE) is True
        
        # 混合大小写
        roles_mixed = ["Admin"]
        assert check_permission(roles_mixed, Resource.SAMPLE, Action.DELETE) is True
    
    def test_transfer_permissions(self):
        """测试流转资源的权限"""
        # ADMIN 可以确认和取消流转
        assert check_permission(["ADMIN"], Resource.TRANSFER, Action.CONFIRM) is True
        assert check_permission(["ADMIN"], Resource.TRANSFER, Action.CANCEL) is True
        
        # TECHNICIAN 可以确认流转但不能取消
        assert check_permission(["TECHNICIAN"], Resource.TRANSFER, Action.CONFIRM) is True
        assert check_permission(["TECHNICIAN"], Resource.TRANSFER, Action.CANCEL) is False
        
        # VIEWER 不能确认或取消流转
        assert check_permission(["VIEWER"], Resource.TRANSFER, Action.CONFIRM) is False
        assert check_permission(["VIEWER"], Resource.TRANSFER, Action.CANCEL) is False
    
    def test_user_resource_permissions(self):
        """测试用户资源的权限"""
        # 只有 ADMIN 可以管理用户
        assert check_permission(["ADMIN"], Resource.USER, Action.CREATE) is True
        assert check_permission(["ADMIN"], Resource.USER, Action.UPDATE) is True
        assert check_permission(["ADMIN"], Resource.USER, Action.DELETE) is True
        
        # LAB_MANAGER 可以读取用户信息
        assert check_permission(["LAB_MANAGER"], Resource.USER, Action.READ) is True
        
        # LAB_MANAGER 不能创建、更新、删除用户
        assert check_permission(["LAB_MANAGER"], Resource.USER, Action.CREATE) is False
        assert check_permission(["LAB_MANAGER"], Resource.USER, Action.UPDATE) is False
        assert check_permission(["LAB_MANAGER"], Resource.USER, Action.DELETE) is False
        
        # TECHNICIAN 和 VIEWER 不能访问用户资源
        assert check_permission(["TECHNICIAN"], Resource.USER, Action.READ) is False
        assert check_permission(["VIEWER"], Resource.USER, Action.READ) is False


class TestRequirePermission:
    """测试权限要求函数"""
    
    def test_require_permission_success(self):
        """测试权限检查通过的情况"""
        # ADMIN 有删除样品的权限，不应抛出异常
        try:
            require_permission(["ADMIN"], Resource.SAMPLE, Action.DELETE)
        except ForbiddenException:
            pytest.fail("不应该抛出 ForbiddenException")
    
    def test_require_permission_failure(self):
        """测试权限检查失败的情况"""
        # VIEWER 没有删除样品的权限，应抛出异常
        with pytest.raises(ForbiddenException) as exc_info:
            require_permission(["VIEWER"], Resource.SAMPLE, Action.DELETE)
        
        # 验证异常消息
        assert "您没有权限执行此操作" in str(exc_info.value.detail)
        assert "sample:delete" in str(exc_info.value.detail)
    
    def test_require_permission_empty_roles(self):
        """测试空角色列表"""
        with pytest.raises(ForbiddenException):
            require_permission([], Resource.SAMPLE, Action.READ)
    
    def test_require_permission_multiple_roles_success(self):
        """测试多角色权限检查通过"""
        # 用户拥有 TECHNICIAN 和 VIEWER 角色，可以更新样品
        try:
            require_permission(["TECHNICIAN", "VIEWER"], Resource.SAMPLE, Action.UPDATE)
        except ForbiddenException:
            pytest.fail("不应该抛出 ForbiddenException")
    
    def test_require_permission_multiple_roles_failure(self):
        """测试多角色权限检查失败"""
        # 用户拥有 TECHNICIAN 和 VIEWER 角色，不能删除样品
        with pytest.raises(ForbiddenException):
            require_permission(["TECHNICIAN", "VIEWER"], Resource.SAMPLE, Action.DELETE)


class TestRolePermissionsMapping:
    """测试权限映射配置"""
    
    def test_all_resources_defined(self):
        """测试所有资源都有权限定义"""
        for resource in Resource:
            assert resource in ROLE_PERMISSIONS, f"资源 {resource} 没有权限定义"
    
    def test_sample_resource_has_all_actions(self):
        """测试样品资源定义了所有必要的操作"""
        sample_permissions = ROLE_PERMISSIONS[Resource.SAMPLE]
        
        required_actions = [
            Action.CREATE,
            Action.READ,
            Action.UPDATE,
            Action.DELETE,
            Action.TRANSFER,
            Action.SPLIT,
            Action.MERGE
        ]
        
        for action in required_actions:
            assert action in sample_permissions, f"样品资源缺少 {action} 操作定义"
    
    def test_transfer_resource_has_required_actions(self):
        """测试流转资源定义了必要的操作"""
        transfer_permissions = ROLE_PERMISSIONS[Resource.TRANSFER]
        
        required_actions = [
            Action.CREATE,
            Action.READ,
            Action.UPDATE,
            Action.CONFIRM,
            Action.CANCEL
        ]
        
        for action in required_actions:
            assert action in transfer_permissions, f"流转资源缺少 {action} 操作定义"
    
    def test_all_permissions_have_roles(self):
        """测试所有权限都至少分配给一个角色"""
        for resource, actions in ROLE_PERMISSIONS.items():
            for action, roles in actions.items():
                assert len(roles) > 0, f"{resource}:{action} 没有分配任何角色"
    
    def test_admin_in_all_permissions(self):
        """测试 ADMIN 角色在所有权限中都存在"""
        for resource, actions in ROLE_PERMISSIONS.items():
            for action, roles in actions.items():
                assert Role.ADMIN in roles, f"ADMIN 角色不在 {resource}:{action} 权限中"


class TestPermissionEdgeCases:
    """测试边界情况"""
    
    def test_undefined_resource_action(self):
        """测试未定义的资源和操作组合"""
        # 如果资源或操作未定义，应该拒绝访问
        # 注意：这里我们不能直接测试未定义的枚举值，
        # 但可以测试权限映射中不存在的组合
        
        # 假设我们有一个资源但没有定义某个操作
        # 这种情况下 check_permission 应该返回 False
        pass
    
    def test_role_name_variations(self):
        """测试角色名称的各种变体"""
        # 测试不同的角色名称格式
        variations = [
            "ADMIN",
            "admin",
            "Admin",
            "aDmIn"
        ]
        
        for role_name in variations:
            assert check_permission([role_name], Resource.SAMPLE, Action.DELETE) is True
