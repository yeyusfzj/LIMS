#!/usr/bin/env python3
"""
修复响应格式脚本

将 FastAPI 后端的响应格式修改为与 Node.js 后端完全一致:
- 添加 success 字段
- 统一错误响应格式
- 统一分页响应格式
"""

import os
import re
from pathlib import Path


def fix_response_schema():
    """修复响应模式定义"""
    schema_file = Path("app/schemas/response.py")
    
    content = '''"""
通用响应 Pydantic 模型

定义统一的 API 响应格式，与 Node.js 后端保持完全兼容。
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, TypeVar, Generic, List
from datetime import datetime

T = TypeVar('T')


class ErrorDetail(BaseModel):
    """错误详情模型"""
    code: str = Field(..., description="错误代码")
    message: str = Field(..., description="错误消息")
    details: Optional[Any] = Field(None, description="错误详细信息")


class SuccessResponse(BaseModel, Generic[T]):
    """
    成功响应模型（与 Node.js 后端完全兼容）
    
    Node.js 格式:
    {
        "success": true,
        "data": { ... },
        "message": "操作成功"
    }
    """
    success: bool = Field(default=True, description="操作是否成功")
    data: T = Field(..., description="响应数据")
    message: str = Field(default="操作成功", description="响应消息")
    
    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    """
    错误响应模型（与 Node.js 后端完全兼容）
    
    Node.js 格式:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "错误消息",
            "details": { ... }
        }
    }
    """
    error: ErrorDetail = Field(..., description="错误详情")
    
    class Config:
        from_attributes = True


class PaginationInfo(BaseModel):
    """分页信息模型"""
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页记录数", alias="page_size")
    totalPages: int = Field(..., description="总页数", alias="total_pages")
    
    class Config:
        populate_by_name = True


class PaginatedData(BaseModel, Generic[T]):
    """
    分页数据模型（与 Node.js 后端完全兼容）
    
    Node.js 格式:
    {
        "items": [...],
        "total": 100,
        "page": 1,
        "pageSize": 10,
        "totalPages": 10
    }
    """
    items: List[T] = Field(..., description="数据列表")
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页记录数", alias="page_size")
    totalPages: int = Field(..., description="总页数", alias="total_pages")
    
    class Config:
        populate_by_name = True


class PaginatedResponse(BaseModel, Generic[T]):
    """
    分页响应模型（与 Node.js 后端完全兼容）
    
    Node.js 格式:
    {
        "success": true,
        "data": {
            "items": [...],
            "total": 100,
            "page": 1,
            "pageSize": 10,
            "totalPages": 10
        },
        "message": "查询成功"
    }
    """
    success: bool = Field(default=True, description="操作是否成功")
    data: PaginatedData[T] = Field(..., description="分页数据")
    message: str = Field(default="查询成功", description="响应消息")
    
    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    """健康检查响应模型"""
    status: str = Field(..., description="服务状态")
    database: str = Field(..., description="数据库状态")
    redis: Optional[str] = Field(None, description="Redis 状态")
    timestamp: datetime = Field(..., description="检查时间戳")
    version: str = Field(..., description="服务版本")


class ValidationErrorDetail(BaseModel):
    """验证错误详情模型"""
    field: str = Field(..., description="字段名")
    message: str = Field(..., description="错误消息")
    type: str = Field(..., description="错误类型")


class ValidationErrorResponse(BaseModel):
    """验证错误响应模型"""
    error: ErrorDetail = Field(..., description="错误详情")
    
    class Config:
        from_attributes = True
'''
    
    with open(schema_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ 已更新 {schema_file}")


def main():
    """主函数"""
    print("开始修复响应格式...")
    print()
    
    # 修复响应模式
    fix_response_schema()
    
    print()
    print("响应格式修复完成！")
    print()
    print("注意事项:")
    print("1. 所有路由需要返回 SuccessResponse 格式")
    print("2. 分页响应需要使用 PaginatedResponse 格式")
    print("3. 错误响应需要使用 ErrorResponse 格式")
    print("4. 确保 success 字段始终存在")
    print("5. 分页字段使用 camelCase: pageSize, totalPages")


if __name__ == "__main__":
    main()
