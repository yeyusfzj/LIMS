"""
审计日志服务
负责记录和查询系统审计日志
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Tuple
from datetime import datetime
import uuid
import logging

from app.models.audit_log import AuditLog, ArchivedAuditLog
from app.schemas.audit_log import (
    CreateAuditLogDto,
    AuditLogQuery,
    AuditLogResponse,
    PaginatedAuditLogsResponse,
    AuditStatistics,
    ArchiveStatistics
)

logger = logging.getLogger(__name__)


class AuditLogService:
    """审计日志服务类"""

    def __init__(self, db: Session):
        self.db = db

    def create_audit_log(self, data: CreateAuditLogDto) -> AuditLogResponse:
        """
        创建审计日志
        日志创建后不可修改或删除，确保审计追踪的完整性
        """
        try:
            audit_log = AuditLog(
                id=str(uuid.uuid4()),
                userId=data.userId,
                username=data.username,
                action=data.action,
                resource=data.resource,
                resourceId=data.resourceId,
                changes=data.changes,
                ipAddress=data.ipAddress,
                userAgent=data.userAgent
            )

            self.db.add(audit_log)
            self.db.commit()
            self.db.refresh(audit_log)

            logger.info(f"Audit log created: {audit_log.id}, action: {audit_log.action}, "
                       f"resource: {audit_log.resource}, resourceId: {audit_log.resourceId}")

            return AuditLogResponse.from_orm(audit_log)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create audit log: {e}")
            raise Exception("创建审计日志失败")

    def create_audit_logs(self, logs: List[CreateAuditLogDto]) -> None:
        """
        批量创建审计日志
        用于需要记录多个操作的场景
        """
        try:
            audit_logs = [
                AuditLog(
                    id=str(uuid.uuid4()),
                    userId=log.userId,
                    username=log.username,
                    action=log.action,
                    resource=log.resource,
                    resourceId=log.resourceId,
                    changes=log.changes,
                    ipAddress=log.ipAddress,
                    userAgent=log.userAgent
                )
                for log in logs
            ]

            self.db.bulk_save_objects(audit_logs)
            self.db.commit()

            logger.info(f"Batch audit logs created: {len(logs)} logs")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create batch audit logs: {e}")
            raise Exception("批量创建审计日志失败")

    def list_audit_logs(self, query: AuditLogQuery) -> PaginatedAuditLogsResponse:
        """
        查询审计日志列表
        支持多条件过滤和分页
        """
        try:
            # 构建查询条件
            filters = []

            if query.userId:
                filters.append(AuditLog.userId == query.userId)

            if query.username:
                filters.append(AuditLog.username.ilike(f"%{query.username}%"))

            if query.action:
                filters.append(AuditLog.action == query.action)

            if query.resource:
                filters.append(AuditLog.resource == query.resource)

            if query.resourceId:
                filters.append(AuditLog.resourceId == query.resourceId)

            # 时间范围过滤
            if query.startDate:
                filters.append(AuditLog.timestamp >= query.startDate)

            if query.endDate:
                filters.append(AuditLog.timestamp <= query.endDate)

            # 构建基础查询
            base_query = self.db.query(AuditLog)
            if filters:
                base_query = base_query.filter(and_(*filters))

            # 查询总数
            total = base_query.count()

            # 分页查询
            logs = base_query.order_by(AuditLog.timestamp.desc()) \
                .offset((query.page - 1) * query.pageSize) \
                .limit(query.pageSize) \
                .all()

            total_pages = (total + query.pageSize - 1) // query.pageSize

            return PaginatedAuditLogsResponse(
                items=[AuditLogResponse.from_orm(log) for log in logs],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
        except Exception as e:
            logger.error(f"Failed to list audit logs: {e}")
            raise Exception("查询审计日志失败")

    def get_audit_log(self, log_id: str) -> Optional[AuditLogResponse]:
        """获取单个审计日志详情"""
        try:
            audit_log = self.db.query(AuditLog).filter(AuditLog.id == log_id).first()

            if not audit_log:
                return None

            return AuditLogResponse.from_orm(audit_log)
        except Exception as e:
            logger.error(f"Failed to get audit log: {e}")
            raise Exception("获取审计日志失败")

    def get_resource_audit_history(
        self, resource: str, resource_id: str
    ) -> List[AuditLogResponse]:
        """
        获取资源的审计历史
        返回特定资源的所有操作记录
        """
        try:
            logs = self.db.query(AuditLog) \
                .filter(AuditLog.resource == resource, AuditLog.resourceId == resource_id) \
                .order_by(AuditLog.timestamp.desc()) \
                .all()

            return [AuditLogResponse.from_orm(log) for log in logs]
        except Exception as e:
            logger.error(f"Failed to get resource audit history: {e}")
            raise Exception("获取资源审计历史失败")

    def get_user_audit_history(
        self, user_id: str, limit: int = 100
    ) -> List[AuditLogResponse]:
        """
        获取用户的操作历史
        返回特定用户的所有操作记录
        """
        try:
            logs = self.db.query(AuditLog) \
                .filter(AuditLog.userId == user_id) \
                .order_by(AuditLog.timestamp.desc()) \
                .limit(limit) \
                .all()

            return [AuditLogResponse.from_orm(log) for log in logs]
        except Exception as e:
            logger.error(f"Failed to get user audit history: {e}")
            raise Exception("获取用户操作历史失败")

    def get_audit_statistics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> AuditStatistics:
        """
        统计审计日志
        按操作类型、资源类型等维度统计
        """
        try:
            # 构建时间过滤条件
            filters = []
            if start_date:
                filters.append(AuditLog.timestamp >= start_date)
            if end_date:
                filters.append(AuditLog.timestamp <= end_date)

            base_query = self.db.query(AuditLog)
            if filters:
                base_query = base_query.filter(and_(*filters))

            # 按操作类型统计
            action_stats = self.db.query(
                AuditLog.action,
                func.count(AuditLog.action).label('count')
            ).filter(and_(*filters) if filters else True) \
                .group_by(AuditLog.action) \
                .all()

            # 按资源类型统计
            resource_stats = self.db.query(
                AuditLog.resource,
                func.count(AuditLog.resource).label('count')
            ).filter(and_(*filters) if filters else True) \
                .group_by(AuditLog.resource) \
                .all()

            # 按用户统计（前10名）
            user_stats = self.db.query(
                AuditLog.userId,
                AuditLog.username,
                func.count(AuditLog.userId).label('count')
            ).filter(and_(*filters) if filters else True) \
                .group_by(AuditLog.userId, AuditLog.username) \
                .order_by(func.count(AuditLog.userId).desc()) \
                .limit(10) \
                .all()

            return AuditStatistics(
                byAction=[{"action": stat[0], "count": stat[1]} for stat in action_stats],
                byResource=[{"resource": stat[0], "count": stat[1]} for stat in resource_stats],
                topUsers=[
                    {"userId": stat[0], "username": stat[1], "count": stat[2]}
                    for stat in user_stats
                ]
            )
        except Exception as e:
            logger.error(f"Failed to get audit statistics: {e}")
            raise Exception("获取审计统计失败")

    def archive_audit_logs(self, before_date: datetime) -> int:
        """
        归档旧的审计日志
        将指定日期之前的日志移动到归档表
        """
        try:
            # 查询需要归档的日志
            logs_to_archive = self.db.query(AuditLog) \
                .filter(AuditLog.timestamp < before_date) \
                .all()

            if not logs_to_archive:
                logger.info("No audit logs to archive")
                return 0

            # 创建归档记录
            archived_logs = [
                ArchivedAuditLog(
                    id=log.id,
                    userId=log.userId,
                    username=log.username,
                    action=log.action,
                    resource=log.resource,
                    resourceId=log.resourceId,
                    changes=log.changes,
                    ipAddress=log.ipAddress,
                    userAgent=log.userAgent,
                    timestamp=log.timestamp
                )
                for log in logs_to_archive
            ]

            # 批量插入归档表
            self.db.bulk_save_objects(archived_logs)

            # 删除原表中的记录
            self.db.query(AuditLog).filter(AuditLog.timestamp < before_date).delete()

            self.db.commit()

            logger.info(f"Audit logs archived successfully: {len(logs_to_archive)} logs, "
                       f"before date: {before_date}")

            return len(logs_to_archive)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to archive audit logs: {e}")
            raise Exception("归档审计日志失败")

    def list_archived_audit_logs(self, query: AuditLogQuery) -> PaginatedAuditLogsResponse:
        """
        查询归档的审计日志
        支持多条件过滤和分页
        """
        try:
            # 构建查询条件
            filters = []

            if query.userId:
                filters.append(ArchivedAuditLog.userId == query.userId)

            if query.username:
                filters.append(ArchivedAuditLog.username.ilike(f"%{query.username}%"))

            if query.action:
                filters.append(ArchivedAuditLog.action == query.action)

            if query.resource:
                filters.append(ArchivedAuditLog.resource == query.resource)

            if query.resourceId:
                filters.append(ArchivedAuditLog.resourceId == query.resourceId)

            # 时间范围过滤
            if query.startDate:
                filters.append(ArchivedAuditLog.timestamp >= query.startDate)

            if query.endDate:
                filters.append(ArchivedAuditLog.timestamp <= query.endDate)

            # 构建基础查询
            base_query = self.db.query(ArchivedAuditLog)
            if filters:
                base_query = base_query.filter(and_(*filters))

            # 查询总数
            total = base_query.count()

            # 分页查询
            logs = base_query.order_by(ArchivedAuditLog.timestamp.desc()) \
                .offset((query.page - 1) * query.pageSize) \
                .limit(query.pageSize) \
                .all()

            total_pages = (total + query.pageSize - 1) // query.pageSize

            return PaginatedAuditLogsResponse(
                items=[AuditLogResponse.from_orm(log) for log in logs],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
        except Exception as e:
            logger.error(f"Failed to list archived audit logs: {e}")
            raise Exception("查询归档审计日志失败")

    def get_archive_statistics(self) -> ArchiveStatistics:
        """获取归档统计信息"""
        try:
            # 活跃日志数量
            active_count = self.db.query(func.count(AuditLog.id)).scalar()

            # 归档日志数量
            archived_count = self.db.query(func.count(ArchivedAuditLog.id)).scalar()

            # 最旧的活跃日志
            oldest_active = self.db.query(func.min(AuditLog.timestamp)).scalar()

            # 最旧的归档日志
            oldest_archived = self.db.query(func.min(ArchivedAuditLog.timestamp)).scalar()

            return ArchiveStatistics(
                activeCount=active_count or 0,
                archivedCount=archived_count or 0,
                oldestActive=oldest_active,
                oldestArchived=oldest_archived
            )
        except Exception as e:
            logger.error(f"Failed to get archive statistics: {e}")
            raise Exception("获取归档统计失败")
