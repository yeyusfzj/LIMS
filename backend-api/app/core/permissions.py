"""
RBAC 权限控制模块

实现基于角色的访问控制（Role-Based Access Control）
支持两种权限检查模式：
1. 基于数据库的动态权限检查（推荐）
2. 基于枚举的静态权限检查（向后兼容）
"""
from typing import List, Dict, Set, Optional
from enum import Enum
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ForbiddenException
from app.core.security import JWTPayload
from app.api.deps import get_current_user
from app.core.database import get_db
from app.services.permission_service import PermissionService


class Resource(str, Enum):
    """资源枚举"""
    SAMPLE = "sample"
    TRANSFER = "transfer"
    USER = "user"
    ROLE = "role"
    PERMISSION = "permission"
    WORKFLOW = "workflow"
    TASK = "task"
    RESULT = "result"
    AUDIT = "audit"
    REPORT = "report"
    METHOD = "method"


class Action(str, Enum):
    """操作枚举"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    TRANSFER = "transfer"
    SPLIT = "split"
    MERGE = "merge"
    CONFIRM = "confirm"
    CANCEL = "cancel"
    EXECUTE = "execute"
    APPROVE = "approve"
    SIGN = "sign"
    DISTRIBUTE = "distribute"


class Role(str, Enum):
    """角色枚举（向后兼容）"""
    ADMIN = "ADMIN"
    LAB_MANAGER = "LAB_MANAGER"
    TECHNICIAN = "TECHNICIAN"
    VIEWER = "VIEWER"


# 权限映射：资源 -> 操作 -> 允许的角色列表（向后兼容）
ROLE_PERMISSIONS: Dict[Resource, Dict[Action, List[Role]]] = {
    Resource.SAMPLE: {
        Action.CREATE: [Role.ADMIN, Role.LAB_MANAGER],
        Action.READ: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN, Role.VIEWER],
        Action.UPDATE: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN],
        Action.DELETE: [Role.ADMIN],
        Action.TRANSFER: [Role.ADMIN, Role.LAB_MANAGER],
        Action.SPLIT: [Role.ADMIN, Role.LAB_MANAGER],
        Action.MERGE: [Role.ADMIN, Role.LAB_MANAGER],
    },
    Resource.TRANSFER: {
        Action.CREATE: [Role.ADMIN, Role.LAB_MANAGER],
        Action.READ: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN, Role.VIEWER],
        Action.UPDATE: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN],
        Action.CONFIRM: [Role.ADMIN, Role.LAB_MANAGER, Role.TECHNICIAN],
        Action.CANCEL: [Role.ADMIN],
    },
    Resource.USER: {
        Action.CREATE: [Role.ADMIN],
        Action.READ: [Role.ADMIN, Role.LAB_MANAGER],
        Action.UPDATE: [Role.ADMIN],
        Action.DELETE: [Role.ADMIN],
    },
    Resource.ROLE: {
        Action.CREATE: [Role.ADMIN],
        Action.READ: [Role.ADMIN, Role.LAB_MANAGER],
        Action.UPDATE: [Role.ADMIN],
        Action.DELETE: [Role.ADMIN],
    },
}


def check_permission(
    user_roles: List[str],
    resource: Resource,
    action: Action
) -> bool:
    """
    检查用户是否有权限执行指定操作（静态检查）
    
    Args:
        user_roles: 用户角色列表
        resource: 资源类型
        action: 操作类型
        
    Returns:
        bool: 如果用户有权限返回 True，否则返回 False
    """
    if not user_roles:
        return False
    
    # 获取该资源和操作所需的角色
    resource_permissions = ROLE_PERMISSIONS.get(resource, {})
    required_roles = resource_permissions.get(action, [])
    
    if not required_roles:
        # 如果没有定义权限，默认拒绝访问
        return False
    
    # 将用户角色转换为 Role 枚举（支持字符串和枚举）
    user_role_set: Set[str] = set()
    for role in user_roles:
        if isinstance(role, str):
            user_role_set.add(role.upper())
        else:
            user_role_set.add(str(role))
    
    # 检查用户是否拥有所需角色之一
    for required_role in required_roles:
        if required_role.value in user_role_set or required_role.name in user_role_set:
            return True
    
    return False


async def check_permission_db(
    db: AsyncSession,
    user_id: str,
    resource: str,
    action: str
) -> bool:
    """
    检查用户是否有权限执行指定操作（数据库检查）
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        resource: 资源名称
        action: 操作名称
        
    Returns:
        bool: 如果用户有权限返回 True，否则返回 False
    """
    return await PermissionService.check_user_permission(
        db=db,
        user_id=user_id,
        resource=resource,
        action=action
    )


def require_permission(
    user_roles: List[str],
    resource: Resource,
    action: Action
) -> None:
    """
    要求用户有权限执行指定操作，如果没有权限则抛出异常（静态检查）
    
    Args:
        user_roles: 用户角色列表
        resource: 资源类型
        action: 操作类型
        
    Raises:
        ForbiddenException: 如果用户没有权限
    """
    if not check_permission(user_roles, resource, action):
        raise ForbiddenException(
            message=f"您没有权限执行此操作: {resource.value}:{action.value}"
        )


async def require_permission_db(
    db: AsyncSession,
    user_id: str,
    resource: str,
    action: str
) -> None:
    """
    要求用户有权限执行指定操作，如果没有权限则抛出异常（数据库检查）
    
    Args:
        db: 数据库会话
        user_id: 用户ID
        resource: 资源名称
        action: 操作名称
        
    Raises:
        ForbiddenException: 如果用户没有权限
    """
    has_permission = await check_permission_db(db, user_id, resource, action)
    
    if not has_permission:
        raise ForbiddenException(
            message=f"您没有权限执行此操作: {resource}:{action}"
        )


def create_permission_dependency(resource: Resource, action: Action):
    """
    创建权限检查依赖函数（用于 FastAPI 路由，静态检查）
    
    Args:
        resource: 资源类型
        action: 操作类型
        
    Returns:
        依赖函数
        
    Example:
        @router.post("/samples")
        async def create_sample(
            current_user: JWTPayload = Depends(get_current_user),
            _: None = Depends(create_permission_dependency(Resource.SAMPLE, Action.CREATE))
        ):
            # 创建样品逻辑
            pass
    """
    async def permission_checker(
        current_user: JWTPayload = Depends(get_current_user)
    ) -> None:
        """权限检查依赖"""
        user_roles = current_user.roles
        require_permission(user_roles, resource, action)
    
    return permission_checker


def create_permission_dependency_db(resource: str, action: str):
    """
    创建权限检查依赖函数（用于 FastAPI 路由，数据库检查）
    
    Args:
        resource: 资源名称
        action: 操作名称
        
    Returns:
        依赖函数
        
    Example:
        @router.post("/samples")
        async def create_sample(
            current_user: JWTPayload = Depends(get_current_user),
            db: AsyncSession = Depends(get_db),
            _: None = Depends(create_permission_dependency_db("sample", "create"))
        ):
            # 创建样品逻辑
            pass
    """
    async def permission_checker(
        current_user: JWTPayload = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> None:
        """权限检查依赖"""
        await require_permission_db(db, current_user.user_id, resource, action)
    
    return permission_checker



class PermissionChecker:
    """
    权限检查器类（用于 FastAPI 依赖注入）
    
    使用数据库动态权限检查
    
    Example:
        @router.post("/samples")
        async def create_sample(
            current_user: User = Depends(PermissionChecker("sample", "create"))
        ):
            # 创建样品逻辑
            pass
    """
    
    def __init__(self, resource: str, action: str):
        """
        初始化权限检查器
        
        Args:
            resource: 资源名称
            action: 操作名称
        """
        self.resource = resource
        self.action = action
    
    async def __call__(
        self,
        db: AsyncSession = Depends(get_db),
        current_user = Depends(get_current_user)
    ):
        """
        执行权限检查
        
        Args:
            db: 数据库会话
            current_user: 当前用户
            
        Returns:
            当前用户对象
            
        Raises:
            ForbiddenException: 如果用户没有权限
        """
        # 获取用户ID
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.user_id
        
        # 检查权限
        await require_permission_db(db, user_id, self.resource, self.action)
        
        # 返回用户对象
        return current_user
