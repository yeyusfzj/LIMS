"""
权限相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PermissionBase(BaseModel):
    """权限基础模型"""
    resource: str = Field(..., description="资源名称")
    action: str = Field(..., description="操作名称")


class PermissionCreate(PermissionBase):
    """创建权限请求模型"""
    pass


class PermissionResponse(PermissionBase):
    """权限响应模型"""
    id: str
    createdAt: datetime
    updatedAt: datetime
    
    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    """权限列表响应模型"""
    items: list[PermissionResponse]
    total: int
    page: int
    pageSize: int
