"""
备份记录相关的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, DateTime, Integer, Enum as SQLEnum
from datetime import datetime
import enum
from app.models.base import Base


class BackupStatus(str, enum.Enum):
    """备份状态枚举"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    VERIFIED = "VERIFIED"


class BackupType(str, enum.Enum):
    """备份类型枚举"""
    MANUAL = "MANUAL"
    SCHEDULED = "SCHEDULED"


class BackupRecord(Base):
    """备份记录模型"""
    __tablename__ = 'backup_records'
    
    id = Column(String, primary_key=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    size = Column(Integer, nullable=False)  # 文件大小（字节）
    type = Column(SQLEnum(BackupType), nullable=False, index=True)
    status = Column(SQLEnum(BackupStatus), default=BackupStatus.PENDING, nullable=False, index=True)
    checksum = Column(String(64))  # SHA-256 校验和
    error = Column(String(1000))  # 错误信息
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completedAt = Column(DateTime)
    verifiedAt = Column(DateTime)
    
    def __repr__(self):
        return f"<BackupRecord(id={self.id}, filename={self.filename}, status={self.status}, createdAt={self.createdAt})>"
    
    __table_args__ = (
        {'extend_existing': True}
    )
