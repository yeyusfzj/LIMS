"""
检测方法相关的 SQLAlchemy 模型
"""
from sqlalchemy import Column, String, DateTime, JSON, Enum as SQLEnum, Text
from datetime import datetime
import enum
from app.models.base import Base


class MethodStatus(str, enum.Enum):
    """检测方法状态枚举"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class TestMethod(Base):
    """检测方法模型"""
    __tablename__ = 'test_methods'
    
    id = Column(String, primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    status = Column(SQLEnum(MethodStatus), default=MethodStatus.DRAFT, nullable=False, index=True)
    scope = Column(String(500))
    description = Column(Text)
    equipment = Column(JSON, nullable=False)  # 设备列表
    steps = Column(JSON, nullable=False)  # 步骤列表
    precision = Column(String(200))
    accuracy = Column(String(200))
    detectionLimit = Column(String(200))
    measurementRange = Column(String(200))
    qualityControl = Column(Text)
    safetyNotes = Column(Text)
    operationNotes = Column(Text)
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<TestMethod(id={self.id}, code={self.code}, name={self.name}, status={self.status})>"
    
    __table_args__ = (
        {'extend_existing': True}
    )
