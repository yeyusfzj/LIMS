"""
审计日志 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.services.audit_log_service import AuditLogService
from app.schemas.audit_log import (
    CreateAuditLogDto,
    AuditLogResponse,
    AuditLogQuery,
    PaginatedAuditLogsResponse,
    AuditStatistics,
    ArchiveStatistics
)
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/audit-logs", tags=["audit-logs"])


@router.post("", response_model=AuditLogResponse, summary="创建审计日志")
async def create_audit_log(
    data: CreateAuditLogDto,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建审计日志
    
    - **userId**: 用户 ID
    - **username**: 用户名
    - **action**: 操作类型
    - **resource**: 资源类型
    - **resourceId**: 资源 ID
    - **changes**: 变更内容（可选）
    - **ipAddress**: IP 地址（可选）
    - **userAgent**: 用户代理（可选）
    """
    service = AuditLogService(db)
    return service.create_audit_log(data)


@router.get("", response_model=PaginatedAuditLogsResponse, summary="查询审计日志列表")
async def list_audit_logs(
    userId: Optional[str] = Query(None, description="用户 ID"),
    username: Optional[str] = Query(None, description="用户名"),
    action: Optional[str] = Query(None, description="操作类型"),
    resource: Optional[str] = Query(None, description="资源类型"),
    resourceId: Optional[str] = Query(None, description="资源 ID"),
    startDate: Optional[datetime] = Query(None, description="开始日期"),
    endDate: Optional[datetime] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询审计日志列表
    
    支持多条件过滤和分页查询
    """
    query = AuditLogQuery(
        userId=userId,
        username=username,
        action=action,
        resource=resource,
        resourceId=resourceId,
        startDate=startDate,
        endDate=endDate,
        page=page,
        pageSize=pageSize
    )
    service = AuditLogService(db)
    return service.list_audit_logs(query)


@router.get("/{log_id}", response_model=AuditLogResponse, summary="获取审计日志详情")
async def get_audit_log(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取单个审计日志的详细信息"""
    service = AuditLogService(db)
    audit_log = service.get_audit_log(log_id)
    
    if not audit_log:
        raise HTTPException(status_code=404, detail="审计日志不存在")
    
    return audit_log


@router.get("/resource/{resource}/{resource_id}", response_model=list[AuditLogResponse], 
            summary="获取资源审计历史")
async def get_resource_audit_history(
    resource: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取特定资源的审计历史
    
    返回该资源的所有操作记录
    """
    service = AuditLogService(db)
    return service.get_resource_audit_history(resource, resource_id)


@router.get("/user/{user_id}/history", response_model=list[AuditLogResponse], 
            summary="获取用户操作历史")
async def get_user_audit_history(
    user_id: str,
    limit: int = Query(100, ge=1, le=1000, description="返回记录数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取特定用户的操作历史
    
    返回该用户的最近操作记录
    """
    service = AuditLogService(db)
    return service.get_user_audit_history(user_id, limit)


@router.get("/statistics/overview", response_model=AuditStatistics, 
            summary="获取审计统计")
async def get_audit_statistics(
    startDate: Optional[datetime] = Query(None, description="开始日期"),
    endDate: Optional[datetime] = Query(None, description="结束日期"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审计日志统计信息
    
    按操作类型、资源类型、用户等维度统计
    """
    service = AuditLogService(db)
    return service.get_audit_statistics(startDate, endDate)


@router.post("/archive", summary="归档审计日志")
async def archive_audit_logs(
    beforeDate: datetime = Query(..., description="归档此日期之前的日志"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    归档旧的审计日志
    
    将指定日期之前的日志移动到归档表
    """
    service = AuditLogService(db)
    count = service.archive_audit_logs(beforeDate)
    
    return {
        "success": True,
        "message": f"成功归档 {count} 条审计日志",
        "count": count
    }


@router.get("/archived/list", response_model=PaginatedAuditLogsResponse, 
            summary="查询归档审计日志")
async def list_archived_audit_logs(
    userId: Optional[str] = Query(None, description="用户 ID"),
    username: Optional[str] = Query(None, description="用户名"),
    action: Optional[str] = Query(None, description="操作类型"),
    resource: Optional[str] = Query(None, description="资源类型"),
    resourceId: Optional[str] = Query(None, description="资源 ID"),
    startDate: Optional[datetime] = Query(None, description="开始日期"),
    endDate: Optional[datetime] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询归档的审计日志
    
    支持多条件过滤和分页查询
    """
    query = AuditLogQuery(
        userId=userId,
        username=username,
        action=action,
        resource=resource,
        resourceId=resourceId,
        startDate=startDate,
        endDate=endDate,
        page=page,
        pageSize=pageSize
    )
    service = AuditLogService(db)
    return service.list_archived_audit_logs(query)


@router.get("/archived/statistics", response_model=ArchiveStatistics, 
            summary="获取归档统计")
async def get_archive_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取归档统计信息
    
    包括活跃日志数量、归档日志数量、最旧日志时间等
    """
    service = AuditLogService(db)
    return service.get_archive_statistics()
