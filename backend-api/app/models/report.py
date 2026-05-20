"""
Report and ReportTemplate models for SQLAlchemy ORM.

This module defines the Report and ReportTemplate models that are compatible 
with the Prisma schema. Uses snake_case naming convention to match the database schema.
"""

import uuid
import enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base


class ReportStatus(str, enum.Enum):
    """Report status enumeration - matches Prisma schema"""
    DRAFT = "DRAFT"
    PENDING_SIGNATURE = "PENDING_SIGNATURE"
    SIGNED = "SIGNED"
    DISTRIBUTED = "DISTRIBUTED"
    RECALLED = "RECALLED"


class ReportType(str, enum.Enum):
    """Report type enumeration - 参考审核任务级别"""
    ANALYSIS_REPORT = "ANALYSIS_REPORT"  # 分析报告
    SAMPLE_REPORT = "SAMPLE_REPORT"  # 样品报告
    TECHNICAL_REPORT = "TECHNICAL_REPORT"  # 技术报告
    QUALITY_REPORT = "QUALITY_REPORT"  # 质量报告
    COMPREHENSIVE_REPORT = "COMPREHENSIVE_REPORT"  # 综合报告


class ReportTemplate(Base):
    """
    ReportTemplate model - compatible with Prisma schema.
    
    Represents a report template with content, variables, and version control.
    """
    __tablename__ = "report_templates"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Template information
    name = Column(String, nullable=False)
    description = Column(String)
    category = Column(String, nullable=False)
    
    # Template content
    content = Column(Text, nullable=False)  # HTML template content
    variables = Column(JSON, nullable=False)  # JSON for variables definition
    
    # Version control
    version = Column(Integer, default=1, nullable=False)
    isActive = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now(), nullable=False)
    updatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    reports = relationship('Report', back_populates='template')
    
    def __repr__(self):
        return f"<ReportTemplate(id={self.id}, name={self.name}, version={self.version})>"


class Report(Base):
    """
    Report model - compatible with Prisma schema.
    
    Represents a generated report with content, status, and version control.
    """
    __tablename__ = "reports"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Report identification
    reportNumber = Column(String, unique=True, nullable=False, index=True)
    
    # Foreign keys
    sampleId = Column(String, ForeignKey("samples.id"), nullable=False, index=True)
    templateId = Column(String, ForeignKey("report_templates.id"), nullable=False)
    
    # Report content
    content = Column(Text, nullable=False)  # Generated report content
    
    # Status and version
    status = Column(
        SQLEnum(ReportStatus, name="ReportStatus"),
        default=ReportStatus.DRAFT,
        nullable=False,
        index=True
    )
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Audit fields
    generatedBy = Column(String, nullable=False)
    generatedAt = Column(DateTime, server_default=func.now(), nullable=False)
    approvedAt = Column(DateTime)
    
    # Recall information
    recalledAt = Column(DateTime)
    recallReason = Column(String)
    
    # Relationships
    sample = relationship('Sample', back_populates='reports')
    template = relationship('ReportTemplate', back_populates='reports')
    signatures = relationship('Signature', back_populates='report', cascade='all, delete-orphan')
    distributions = relationship('Distribution', back_populates='report', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Report(id={self.id}, reportNumber={self.reportNumber}, status={self.status})>"
