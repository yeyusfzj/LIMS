"""
认证相关的 Pydantic 模型
"""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, description="密码")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "admin",
                    "password": "admin123"
                }
            ]
        }
    }


class UserBasicInfo(BaseModel):
    """用户基本信息（用于登录响应）"""
    id: str = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    fullName: Optional[str] = Field(None, description="真实姓名")
    roles: List[str] = Field(default_factory=list, description="角色列表")


class TokenResponse(BaseModel):
    """令牌响应"""
    accessToken: str = Field(..., description="访问令牌")
    refreshToken: str = Field(..., description="刷新令牌")
    tokenType: str = Field(default="Bearer", description="令牌类型")
    expiresIn: int = Field(..., description="访问令牌过期时间（秒）")
    user: UserBasicInfo = Field(..., description="用户基本信息")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "tokenType": "Bearer",
                    "expiresIn": 900,
                    "user": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "username": "admin",
                        "email": "admin@example.com",
                        "fullName": "管理员",
                        "roles": ["admin"]
                    }
                }
            ]
        }
    }


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""
    refreshToken: str = Field(..., description="刷新令牌")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                }
            ]
        }
    }


class UserInfo(BaseModel):
    """用户信息"""
    userId: str = Field(..., description="用户ID")
    username: str = Field(..., description="用户名")
    email: Optional[str] = Field(None, description="邮箱")
    fullName: Optional[str] = Field(None, description="真实姓名")
    department: Optional[str] = Field(None, description="部门")
    position: Optional[str] = Field(None, description="职位")
    roles: List[str] = Field(default_factory=list, description="角色列表")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "userId": "550e8400-e29b-41d4-a716-446655440000",
                    "username": "admin",
                    "email": "admin@example.com",
                    "fullName": "管理员",
                    "department": "技术部",
                    "position": "系统管理员",
                    "roles": ["admin", "user"]
                }
            ]
        }
    }


class LogoutRequest(BaseModel):
    """登出请求（可选，用于撤销特定令牌）"""
    accessToken: Optional[str] = Field(None, description="要撤销的访问令牌")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                }
            ]
        }
    }
