"""
公式模型
"""
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.models.base import Base


class Formula(Base):
    """公式模型"""
    __tablename__ = 'formulas'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String)
    expression = Column(String, nullable=False)  # 公式表达式
    parameters = Column(JSON, nullable=False)  # 参数定义
    isActive = Column(Boolean, default=True, nullable=False)
    
    createdBy = Column(String, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 关系
    results = relationship('Result', back_populates='formula')
    
    def __repr__(self):
        return f"<Formula(id={self.id}, name={self.name})>"
