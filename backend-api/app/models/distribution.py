"""
Distribution model for SQLAlchemy ORM.

This module defines the Distribution model that is compatible with the Prisma schema.
Uses snake_case naming convention to match the database schema.
"""

import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class DistributionMethod(str, enum.Enum):
    """Distribution method enumeration - matches Prisma schema"""
    EMAIL = "EMAIL"
    DOWNLOAD = "DOWNLOAD"
    PRINT = "PRINT"


class DistributionStatus(str, enum.Enum):
    """Distribution status enumeration - matches Prisma schema"""
    PENDING = "PENDING"
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    FAILED = "FAILED"


class Distribution(Base):
    """
    Distribution model - compatible with Prisma schema.
    
    Represents a report distribution record with method, recipient, and status.
    """
    __tablename__ = "distributions"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key
    report_id = Column("reportId", String, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Distribution information
    method = Column(
        SQLEnum(DistributionMethod, name="DistributionMethod"),
        nullable=False
    )
    recipient = Column(String, nullable=False)
    recipient_email = Column("recipientEmail", String)
    
    # Status
    status = Column(
        SQLEnum(DistributionStatus, name="DistributionStatus"),
        default=DistributionStatus.PENDING,
        nullable=False
    )
    
    # Timestamps
    sent_at = Column("sentAt", DateTime)
    received_at = Column("receivedAt", DateTime)
    
    # Relationships
    report = relationship('Report', back_populates='distributions')
    
    def __repr__(self):
        return f"<Distribution(id={self.id}, method={self.method}, recipient={self.recipient}, status={self.status})>"
