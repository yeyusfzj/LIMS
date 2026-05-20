"""
TestItem model for SQLAlchemy ORM.

This module defines the TestItem model that is compatible with the Prisma schema.
Represents individual test items associated with samples.
"""

import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class TestItemStatus(str, enum.Enum):
    """Test item status enumeration - matches Prisma schema"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ABNORMAL = "ABNORMAL"


class TestItem(Base):
    """
    TestItem model - compatible with Prisma schema.
    
    Represents a test item associated with a sample, including test method,
    parameters, status, and assignment information.
    """
    __tablename__ = "test_items"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key to sample
    sampleId = Column(String, ForeignKey('samples.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Test information
    testMethod = Column(String(200), nullable=False)
    testStandard = Column(String(200))
    testParameters = Column(JSON, nullable=False)  # Test parameters configuration
    
    # Status
    status = Column(
        SQLEnum(TestItemStatus, name='TestItemStatus'),
        default=TestItemStatus.PENDING,
        nullable=False,
        index=True
    )
    
    # Assignment information
    assignedTo = Column(String)
    assignedAt = Column(DateTime)
    completedAt = Column(DateTime)
    
    # Audit fields
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # 关系
    sample = relationship('Sample', back_populates='test_items')
    
    def __repr__(self):
        return f"<TestItem(id={self.id}, sampleId={self.sampleId}, testMethod={self.testMethod}, status={self.status})>"
