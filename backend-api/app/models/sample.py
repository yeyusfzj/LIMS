"""
Sample model for SQLAlchemy ORM.

This module defines the Sample model that is compatible with the Prisma schema.
Uses snake_case naming convention to match the database schema.
"""

import uuid
import enum
from sqlalchemy import Column, String, Float, DateTime, Integer, Enum as SQLEnum, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class SampleStatus(str, enum.Enum):
    """Sample status enumeration - matches Prisma schema"""
    REGISTERED = "REGISTERED"
    IN_TESTING = "IN_TESTING"
    TESTING_COMPLETE = "TESTING_COMPLETE"
    IN_AUDIT = "IN_AUDIT"
    AUDIT_COMPLETE = "AUDIT_COMPLETE"
    RELEASED = "RELEASED"
    ARCHIVED = "ARCHIVED"


class Priority(str, enum.Enum):
    """Priority enumeration - matches Prisma schema"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Sample(Base):
    """
    Sample model - compatible with Prisma schema.
    
    Represents a laboratory sample with all its attributes including
    client information, sample details, storage information, and audit fields.
    """
    __tablename__ = "samples"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Unique identifiers
    barcode = Column(String, unique=True, nullable=False, index=True)
    sample_number = Column("sampleNumber", String, unique=True, nullable=False, index=True)
    
    # Client information
    client_name = Column("clientName", String(200), nullable=False, index=True)
    client_contact = Column("clientContact", String(100))
    
    # Sample information
    sample_name = Column("sampleName", String(200), nullable=False)
    sample_type = Column("sampleType", String(100), nullable=False)
    sample_category = Column("sampleCategory", String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    
    # Date information
    received_date = Column("receivedDate", DateTime, nullable=False)
    sampling_date = Column("samplingDate", DateTime)
    sampling_location = Column("samplingLocation", String(200))
    sampling_person = Column("samplingPerson", String(100))
    
    # Storage information
    storage_location = Column("storageLocation", String(200))
    storage_condition = Column("storageCondition", String(200))
    
    # Status and priority
    status = Column(
        SQLEnum(SampleStatus, name="SampleStatus"),
        default=SampleStatus.REGISTERED,
        nullable=False,
        index=True
    )
    priority = Column(
        SQLEnum(Priority, name="Priority"),
        default=Priority.NORMAL,
        nullable=False
    )
    
    # Description and remarks
    description = Column(String)
    remarks = Column(String)
    
    # Version control (optimistic locking)
    version = Column(Integer, default=1, nullable=False)
    
    # Split/merge relationships
    parent_sample_id = Column("parentSampleId", String, nullable=True)
    merged_from_ids = Column("mergedFromIds", ARRAY(String), default=list)
    
    # Workflow relationship
    workflow_instance_id = Column("workflowInstanceId", String, unique=True, nullable=True)
    
    # Audit fields
    created_by = Column("createdBy", String, nullable=False)
    created_at = Column("createdAt", DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        "updatedAt",
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    released_at = Column("releasedAt", DateTime)
    released_by = Column("releasedBy", String)
    
    # 关系
    test_items = relationship('TestItem', back_populates='sample', cascade='all, delete-orphan')
    results = relationship('Result', back_populates='sample', cascade='all, delete-orphan')
    # 注意：audit_tasks 关联到 Task 表，而不是直接关联到 Sample
    # 可以通过 workflow_instance.tasks 访问审核任务
    workflow_instance = relationship('WorkflowInstance', back_populates='sample', uselist=False)
    quality_judgment = relationship('QualityJudgment', back_populates='sample', uselist=False, cascade='all, delete-orphan')
    reports = relationship('Report', back_populates='sample')
    transfers = relationship('Transfer', back_populates='sample', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Sample(id={self.id}, barcode={self.barcode}, status={self.status})>"
