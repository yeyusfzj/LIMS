"""
Transfer model for SQLAlchemy ORM.

This module defines the Transfer model that is compatible with the Prisma schema.
Uses snake_case naming convention to match the database schema.
"""

import uuid
import enum
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class TransferStatus(str, enum.Enum):
    """Transfer status enumeration - matches Prisma schema"""
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class Transfer(Base):
    """
    Transfer model - compatible with Prisma schema.
    
    Represents a sample transfer record tracking the movement of samples
    between locations with sender and receiver confirmation.
    """
    __tablename__ = "transfers"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key to sample
    sample_id = Column("sampleId", String, ForeignKey("samples.id"), nullable=False, index=True)
    
    # Location information
    from_location = Column("fromLocation", String(200), nullable=False)
    to_location = Column("toLocation", String(200), nullable=False)
    
    # Personnel information
    from_person = Column("fromPerson", String(100), nullable=False)
    to_person = Column("toPerson", String(100), nullable=False)
    
    # Date information
    transfer_date = Column(
        "transferDate",
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True
    )
    received_date = Column("receivedDate", DateTime)
    
    # Status
    status = Column(
        SQLEnum(TransferStatus, name="TransferStatus"),
        default=TransferStatus.PENDING,
        nullable=False
    )
    
    # Remarks
    remarks = Column(String)
    
    # Confirmation flags
    sender_confirmed = Column("senderConfirmed", Boolean, default=False, nullable=False)
    receiver_confirmed = Column("receiverConfirmed", Boolean, default=False, nullable=False)
    
    # Audit field
    created_at = Column("createdAt", DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    sample = relationship("Sample", back_populates="transfers", lazy="joined")
    
    def __repr__(self):
        return f"<Transfer(id={self.id}, sample_id={self.sample_id}, status={self.status})>"
