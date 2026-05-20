"""
审计日志相关的 Pydantic schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime


class CreateAuditLogDto(BaseModel):
    """创建审计日志 DTO"""
    userId: str = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")
    action: str = Field(..., description="操作类型")
    resource: str = Field(..., description="资源类型")
    resourceId: str = Field(..., description="资源 ID")
    changes: Optional[Any] = Field(None, description="变更内容（JSON）")
    ipAddress: Optional[str] = Field(None, description="IP 地址")
    userAgent: Optional[str] = Field(None, description="用户代理")


class AuditLogResponse(BaseModel):
    """审计日志响应"""
    id: str
    userId: str
    username: str
    action: str
    resource: str
    resourceId: str
    changes: Optional[Any] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogQuery(BaseModel):
    """审计日志查询参数"""
    userId: Optional[str] = None
    username: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    resourceId: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class PaginatedAuditLogsResponse(BaseModel):
    """分页审计日志响应"""
    items: List[AuditLogResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int


class AuditStatistics(BaseModel):
    """审计统计"""
    byAction: List[dict]
    byResource: List[dict]
    topUsers: List[dict]


class ArchiveStatistics(BaseModel):
    """归档统计"""
    activeCount: int
    archivedCount: int
    oldestActive: Optional[datetime] = None
    oldestArchived: Optional[datetime] = None
