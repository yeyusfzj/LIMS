"""
任务相关的 SQLAlchemy 模型

本模块定义了任务（Task）模型，与 Prisma schema 完全兼容。
"""

import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class TaskStatus(str, enum.Enum):
    """任务状态枚举 - 与 Prisma schema 一致"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class Priority(str, enum.Enum):
    """优先级枚举 - 与 Prisma schema 一致"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Task(Base):
    """
    任务模型 - 与 Prisma schema 兼容
    
    表示工作流实例中的一个任务节点，包含任务的分配信息、
    执行状态和结果。
    """
    __tablename__ = "tasks"

    # 主键
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键：关联到工作流实例
    instanceId = Column(
        String,
        ForeignKey('workflow_instances.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # 节点信息
    nodeId = Column(String, nullable=False)
    nodeName = Column(String, nullable=False)
    nodeType = Column(String, nullable=False)
    
    # 分配信息
    assignedTo = Column(String, index=True)
    assignedAt = Column(DateTime)
    
    # 状态和优先级
    status = Column(
        SQLEnum(TaskStatus, name="TaskStatus"),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True
    )
    priority = Column(
        SQLEnum(Priority, name="Priority"),
        default=Priority.NORMAL,
        nullable=False
    )
    
    # 执行结果（JSON 格式）
    result = Column(JSON)
    
    # 时间字段
    completedAt = Column(DateTime)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # 关系：多对一 - 多个任务属于一个工作流实例
    instance = relationship('WorkflowInstance', back_populates='tasks')
    
    # 关系：一对多 - 一个任务可以有多个审核任务
    audit_tasks = relationship('AuditTask', back_populates='task', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Task(id={self.id}, nodeName={self.nodeName}, status={self.status})>"
