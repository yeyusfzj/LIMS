"""
角色相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.permission import PermissionResponse


class RoleBase(BaseModel):
    """角色基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="角色名称")
    description: Optional[str] = Field(None, max_length=500, description="角色描述")


class RoleCreate(RoleBase):
    """创建角色请求模型"""
    pass


class RoleUpdate(BaseModel):
    """更新角色请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="角色名称")
    description: Optional[str] = Field(None, max_length=500, description="角色描述")


class RoleResponse(RoleBase):
    """角色响应模型"""
    id: str
    createdAt: datetime
    updatedAt: datetime
    permissions: list[PermissionResponse] = []
    
    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """角色列表响应模型"""
    items: list[RoleResponse]
    total: int
    page: int
    pageSize: int


class AssignPermissionsRequest(BaseModel):
    """分配权限请求模型"""
    permissionIds: list[str] = Field(..., min_length=1, description="权限ID列表")
