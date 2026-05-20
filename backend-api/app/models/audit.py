"""
审核模型

此模块定义了与 Prisma schema 兼容的审核相关 SQLAlchemy 模型。
包括：AuditTask、AuditCommentTemplate、AuditWorkflowConfig、AuditHistory
"""
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, ForeignKey, Text, Boolean, ARRAY, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from app.models.base import Base


class AuditStatus(str, enum.Enum):
    """审核状态枚举 - 匹配 Prisma schema"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AuditDecision(str, enum.Enum):
    """审核决策枚举 - 匹配 Prisma schema"""
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    RETURN = "RETURN"


class CommentTemplateType(str, enum.Enum):
    """审核意见模板类型枚举 - 匹配 Prisma schema"""
    APPROVED = "APPROVED"
    NEED_REVISION = "NEED_REVISION"
    REJECTED = "REJECTED"
    OTHER = "OTHER"


class WorkflowConfigStatus(str, enum.Enum):
    """审核流程配置状态枚举 - 匹配 Prisma schema"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AuditTask(Base):
    """
    审核任务模型 - 兼容 Prisma schema
    
    表示一个审核任务，包含审核级别、审核人员、审核状态和审核决策等信息。
    注意：审核任务关联到 Task（工作流任务），而不是直接关联到 Sample。
    """
    __tablename__ = 'audit_tasks'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 任务关联（关联到工作流任务，而不是样品）
    taskId = Column(String, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # 审核信息
    level = Column(Integer, nullable=False)  # 审核级别：1, 2, 3...
    auditorId = Column(String, nullable=False, index=True)
    status = Column(
        SQLEnum(AuditStatus, name="AuditStatus"),
        default=AuditStatus.PENDING,
        nullable=False,
        index=True
    )
    decision = Column(SQLEnum(AuditDecision, name="AuditDecision"))
    comments = Column(String)
    
    # 时间戳
    submittedAt = Column(DateTime, server_default=func.now(), nullable=False)
    completedAt = Column(DateTime)
    
    # 关系（关联到 Task 表）
    task = relationship('Task', back_populates='audit_tasks')
    
    def __repr__(self):
        return f"<AuditTask(id={self.id}, level={self.level}, status={self.status})>"


class AuditCommentTemplate(Base):
    """
    审核意见模板模型 - 兼容 Prisma schema
    
    表示预定义的审核意见模板，用于快速填写审核意见。
    """
    __tablename__ = 'audit_comment_templates'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 模板信息
    name = Column(String, unique=True, nullable=False)
    type = Column(
        SQLEnum(CommentTemplateType, name="CommentTemplateType"),
        nullable=False,
        index=True
    )
    content = Column(Text, nullable=False)
    usageCount = Column(Integer, default=0, nullable=False)
    isDefault = Column(Boolean, default=False, nullable=False, index=True)
    
    # 审计字段
    createdBy = Column(String, nullable=False, index=True)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self):
        return f"<AuditCommentTemplate(id={self.id}, name={self.name}, type={self.type})>"


class AuditWorkflowConfig(Base):
    """
    审核流程配置模型 - 兼容 Prisma schema
    
    表示审核流程的配置，包括适用的样品类型、审核级别配置和并行审核设置。
    """
    __tablename__ = 'audit_workflow_configs'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 配置信息
    name = Column(String, unique=True, nullable=False)
    sampleTypes = Column(ARRAY(String), nullable=False)  # 适用的样品类型数组
    levels = Column(JSON, nullable=False)  # 审核级别配置（JSON 格式）
    parallelAudit = Column(Boolean, default=False, nullable=False)
    status = Column(
        SQLEnum(WorkflowConfigStatus, name="WorkflowConfigStatus"),
        default=WorkflowConfigStatus.ACTIVE,
        nullable=False,
        index=True
    )
    
    # 审计字段
    createdBy = Column(String, nullable=False, index=True)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self):
        return f"<AuditWorkflowConfig(id={self.id}, name={self.name}, status={self.status})>"


class AuditHistory(Base):
    """
    审核历史记录模型 - 兼容 Prisma schema
    
    记录审核任务的所有操作历史，包括创建、更新、审批、驳回、重新分配等。
    """
    __tablename__ = 'audit_history'
    
    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 任务关联
    taskId = Column(String, nullable=False, index=True)
    
    # 操作信息
    action = Column(String, nullable=False)  # 操作类型（如：created, updated, approved, rejected, reassigned）
    changes = Column(JSON, nullable=False)  # 变更内容（JSON 格式）
    
    # 审计字段
    performedBy = Column(String, nullable=False, index=True)
    performedAt = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<AuditHistory(id={self.id}, taskId={self.taskId}, action={self.action})>"
