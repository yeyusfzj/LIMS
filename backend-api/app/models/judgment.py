"""
质量判定模型

此模块定义了与 Prisma schema 兼容的质量判定相关 SQLAlchemy 模型。
包括：QualityJudgment、JudgmentRule、JudgmentHistory
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.models.base import Base


class JudgmentResult(str, enum.Enum):
    """判定结果枚举 - 匹配 Prisma schema"""
    QUALIFIED = "QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"
    PENDING = "PENDING"


class QualityJudgment(Base):
    """
    质量判定模型 - 兼容 Prisma schema
    
    表示样品的质量判定结果，包括判定结果、判定依据、判定人员等信息。
    """
    __tablename__ = 'quality_judgments'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 样品关联（一对一关系）
    sampleId = Column(String, ForeignKey('samples.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # 判定信息
    result = Column(
        SQLEnum(JudgmentResult, name="JudgmentResult"),
        nullable=False,
        index=True
    )
    basis = Column(Text, nullable=False)  # 判定依据（JSON 格式）
    isAutomatic = Column(Boolean, default=True, nullable=False)
    version = Column(Integer, default=1, nullable=False)  # 乐观锁版本号
    
    # 审计字段
    judgedBy = Column(String, nullable=False)
    judgedAt = Column(DateTime, server_default=func.now(), nullable=False)
    reviewedBy = Column(String)
    reviewedAt = Column(DateTime)
    
    # 关系
    sample = relationship('Sample', back_populates='quality_judgment', uselist=False)
    history = relationship('JudgmentHistory', back_populates='judgment', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<QualityJudgment(id={self.id}, sampleId={self.sampleId}, result={self.result})>"


class JudgmentRule(Base):
    """
    判定规则配置模型 - 兼容 Prisma schema
    
    表示质量判定的规则配置，包括规则名称、检测项类型、判定条件等。
    """
    __tablename__ = 'judgment_rules'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 规则信息
    name = Column(String, nullable=False)
    description = Column(String)
    testItemType = Column(String, nullable=False, index=True)  # 检测项类型
    conditions = Column(JSON, nullable=False)  # 判定条件配置
    priority = Column(Integer, default=0, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False, index=True)
    
    # 审计字段
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self):
        return f"<JudgmentRule(id={self.id}, name={self.name}, testItemType={self.testItemType})>"


class JudgmentHistory(Base):
    """
    判定历史记录模型 - 兼容 Prisma schema
    
    记录质量判定结果的变更历史，包括变更前后的结果、变更原因等。
    """
    __tablename__ = 'judgment_history'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 判定关联
    judgmentId = Column(String, ForeignKey('quality_judgments.id', ondelete='CASCADE'), nullable=False, index=True)
    sampleId = Column(String, nullable=False, index=True)
    
    # 变更信息
    previousResult = Column(SQLEnum(JudgmentResult, name="JudgmentResult"), nullable=False)
    newResult = Column(SQLEnum(JudgmentResult, name="JudgmentResult"), nullable=False)
    changeReason = Column(Text, nullable=False)
    
    # 审计字段
    changedBy = Column(String, nullable=False)
    changedAt = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    
    # 关系
    judgment = relationship('QualityJudgment', back_populates='history')
    
    def __repr__(self):
        return f"<JudgmentHistory(id={self.id}, judgmentId={self.judgmentId}, previousResult={self.previousResult}, newResult={self.newResult})>"
