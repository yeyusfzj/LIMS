"""
用户相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum
from app.schemas.role import RoleResponse


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    fullName: str = Field(..., min_length=1, max_length=100, description="真实姓名")
    department: Optional[str] = Field(None, max_length=100, description="部门")
    position: Optional[str] = Field(None, max_length=100, description="职位")
    phone: Optional[str] = Field(None, max_length=20, description="电话")


class UserCreate(UserBase):
    """创建用户请求模型"""
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class UserUpdate(BaseModel):
    """更新用户请求模型"""
    email: Optional[EmailStr] = Field(None, description="邮箱")
    fullName: Optional[str] = Field(None, min_length=1, max_length=100, description="真实姓名")
    department: Optional[str] = Field(None, max_length=100, description="部门")
    position: Optional[str] = Field(None, max_length=100, description="职位")
    phone: Optional[str] = Field(None, max_length=20, description="电话")
    status: Optional[UserStatus] = Field(None, description="状态")


class UserResponse(UserBase):
    """用户响应模型"""
    id: str
    status: UserStatus
    createdAt: datetime
    updatedAt: datetime
    roles: list[RoleResponse] = []
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """用户列表响应模型"""
    items: list[UserResponse]
    total: int
    page: int
    pageSize: int


class ResetPasswordRequest(BaseModel):
    """重置密码请求模型"""
    newPassword: str = Field(..., min_length=6, max_length=100, description="新密码")


class UpdateUserStatusRequest(BaseModel):
    """更新用户状态请求模型"""
    status: UserStatus = Field(..., description="用户状态")


class AssignRolesRequest(BaseModel):
    """分配角色请求模型"""
    roleIds: list[str] = Field(..., min_length=1, description="角色ID列表")
