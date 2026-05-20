"""
Instrument model for SQLAlchemy ORM.

This module defines the Instrument model compatible with the database schema.
Uses snake_case naming convention to match the database schema.
"""

import uuid
import enum
from sqlalchemy import Column, String, Float, DateTime, Integer, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from app.models.base import Base


class InstrumentStatus(str, enum.Enum):
    """Instrument status enumeration"""
    IN_USE = "IN_USE"
    STANDBY = "STANDBY"
    MAINTENANCE = "MAINTENANCE"
    CALIBRATING = "CALIBRATING"
    PENDING_DISPOSAL = "PENDING_DISPOSAL"
    DISPOSED = "DISPOSED"


class Instrument(Base):
    """
    Instrument model - represents laboratory instruments.
    
    Represents a laboratory instrument with all its attributes including
    basic information, technical parameters, current status, and audit fields.
    """
    __tablename__ = "instruments"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Unique identifier
    code = Column(String, unique=True, nullable=False, index=True)
    
    # Basic information
    name = Column(String(200), nullable=False, index=True)
    model = Column(String(100))
    manufacturer = Column(String(200))
    serial_number = Column("serialNumber", String(100))
    
    # Purchase information
    purchase_date = Column("purchaseDate", DateTime)
    purchase_price = Column("purchasePrice", Float)
    
    # Technical parameters (JSON format)
    technical_params = Column("technicalParams", JSON)
    
    # Current status
    status = Column(
        SQLEnum(InstrumentStatus, name="InstrumentStatus"),
        default=InstrumentStatus.IN_USE,
        nullable=False,
        index=True
    )
    current_location = Column("currentLocation", String(200))
    current_department = Column("currentDepartment", String(200), index=True)
    current_responsible = Column("currentResponsible", String(100))
    
    # Usage information
    usage_years = Column("usageYears", Integer)
    warranty_expiry = Column("warrantyExpiry", DateTime)
    
    # Description
    description = Column(String)
    remarks = Column(String)
    
    # Version control (optimistic locking) - 暂时注释掉，数据库表中没有此字段
    # version = Column(Integer, default=1, nullable=False)
    
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
    
    def __repr__(self):
        return f"<Instrument(id={self.id}, code={self.code}, name={self.name}, status={self.status})>"
