"""
工作流相关的 SQLAlchemy 模型

本模块定义了工作流（Workflow）和工作流实例（WorkflowInstance）模型，
与 Prisma schema 完全兼容。
"""

import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, JSON, ForeignKey, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class WorkflowStatus(str, enum.Enum):
    """工作流状态枚举 - 与 Prisma schema 一致"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class InstanceStatus(str, enum.Enum):
    """工作流实例状态枚举 - 与 Prisma schema 一致"""
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"


class Workflow(Base):
    """
    工作流配置模型 - 与 Prisma schema 兼容
    
    表示工作流的配置，包括节点和边的定义。
    """
    __tablename__ = "workflows"

    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 基本信息
    name = Column(String, nullable=False)
    description = Column(String)
    version = Column(Integer, default=1, nullable=False)
    config = Column(JSON, nullable=False)  # 工作流配置（节点和边）
    
    # 状态
    status = Column(
        SQLEnum(WorkflowStatus, name="WorkflowStatus"),
        default=WorkflowStatus.DRAFT,
        nullable=False,
        index=True
    )
    isActive = Column(Boolean, default=False, nullable=False, index=True)
    
    # 审计字段
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    activatedAt = Column(DateTime)
    
    # 关系：一对多 - 一个工作流可以有多个实例
    instances = relationship('WorkflowInstance', back_populates='workflow')
    
    def __repr__(self):
        return f"<Workflow(id={self.id}, name={self.name}, status={self.status})>"


class WorkflowInstance(Base):
    """
    工作流实例模型 - 与 Prisma schema 兼容
    
    表示工作流的一个运行实例，关联到具体的样品。
    """
    __tablename__ = "workflow_instances"

    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键：关联到工作流配置
    workflowId = Column(
        String,
        ForeignKey('workflows.id'),
        nullable=False,
        index=True
    )
    
    # 外键：关联到样品（一对一关系）
    sampleId = Column(
        String,
        ForeignKey('samples.id'),
        unique=True,
        nullable=False,
        index=True
    )
    
    # 当前状态
    currentNodes = Column(ARRAY(String), nullable=False, default=list)  # 当前所在节点 ID 数组
    status = Column(
        SQLEnum(InstanceStatus, name="InstanceStatus"),
        default=InstanceStatus.RUNNING,
        nullable=False,
        index=True
    )
    variables = Column(JSON, default={}, nullable=False)  # 工作流变量
    
    # 时间字段
    startedAt = Column(DateTime, server_default=func.now(), nullable=False)
    completedAt = Column(DateTime)
    
    # 关系：多对一 - 多个实例属于一个工作流
    workflow = relationship('Workflow', back_populates='instances')
    
    # 关系：一对一 - 一个实例关联一个样品
    sample = relationship('Sample', back_populates='workflow_instance')
    
    # 关系：一对多 - 一个实例可以有多个任务
    tasks = relationship('Task', back_populates='instance', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<WorkflowInstance(id={self.id}, sampleId={self.sampleId}, status={self.status})>"
