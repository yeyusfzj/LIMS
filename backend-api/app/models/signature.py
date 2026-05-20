"""
Signature model for SQLAlchemy ORM.

This module defines the Signature model that is compatible with the Prisma schema.
Uses snake_case naming convention to match the database schema.
"""

import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class Signature(Base):
    """
    Signature model - compatible with Prisma schema.
    
    Represents an electronic signature applied to a report.
    """
    __tablename__ = "signatures"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key
    report_id = Column("reportId", String, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Signer information
    signer_id = Column("signerId", String, nullable=False)
    signer_name = Column("signerName", String, nullable=False)
    signer_role = Column("signerRole", String, nullable=False)
    
    # Signature data
    signature_data = Column("signatureData", Text, nullable=False)  # Encrypted signature data
    
    # Timestamp
    signed_at = Column("signedAt", DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    report = relationship('Report', back_populates='signatures')
    
    def __repr__(self):
        return f"<Signature(id={self.id}, signer_name={self.signer_name}, report_id={self.report_id})>"
