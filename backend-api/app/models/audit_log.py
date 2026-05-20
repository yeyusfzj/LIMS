"""
审计日志相关的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, DateTime, JSON, Index
from datetime import datetime
from app.models.base import Base


class AuditLog(Base):
    """审计日志模型"""
    __tablename__ = 'audit_logs'
    
    id = Column(String, primary_key=True)
    userId = Column(String, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resourceId = Column(String, nullable=False)
    changes = Column(JSON)
    ipAddress = Column(String(45))  # IPv6 最大长度
    userAgent = Column(String(500))
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # 复合索引
    __table_args__ = (
        Index('idx_audit_logs_resource_resourceId', 'resource', 'resourceId'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, userId={self.userId}, action={self.action}, resource={self.resource})>"


class ArchivedAuditLog(Base):
    """归档审计日志模型"""
    __tablename__ = 'archived_audit_logs'
    
    id = Column(String, primary_key=True)
    userId = Column(String, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resourceId = Column(String, nullable=False)
    changes = Column(JSON)
    ipAddress = Column(String(45))
    userAgent = Column(String(500))
    timestamp = Column(DateTime, nullable=False, index=True)
    archivedAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # 复合索引
    __table_args__ = (
        Index('idx_archived_audit_logs_resource_resourceId', 'resource', 'resourceId'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f"<ArchivedAuditLog(id={self.id}, userId={self.userId}, action={self.action}, archivedAt={self.archivedAt})>"
