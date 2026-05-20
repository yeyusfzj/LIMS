"""
检测结果模型
"""
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.models.base import Base


class ResultSource(str, enum.Enum):
    """结果来源枚举"""
    MANUAL = "MANUAL"
    INSTRUMENT = "INSTRUMENT"
    CALCULATED = "CALCULATED"


class Result(Base):
    """检测结果模型"""
    __tablename__ = 'results'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sampleId = Column(String, ForeignKey('samples.id', ondelete='CASCADE'), nullable=False, index=True)
    testItemId = Column(String, nullable=False, index=True)
    parameter = Column(String, nullable=False)  # 检测参数名称
    value = Column(Float)
    textValue = Column(String)  # 文本型结果
    unit = Column(String)
    method = Column(String, nullable=False)
    version = Column(Integer, default=1, nullable=False)  # 乐观锁版本号
    
    # 结果来源
    source = Column(SQLEnum(ResultSource, name="ResultSource"), default=ResultSource.MANUAL, nullable=False)
    instrumentId = Column(String)
    
    # 计算公式
    formulaId = Column(String, ForeignKey('formulas.id'))
    isCalculated = Column(Boolean, default=False, nullable=False)
    
    # 异常检测
    isAbnormal = Column(Boolean, default=False, nullable=False)
    abnormalReason = Column(String)
    
    # 复测
    isRetest = Column(Boolean, default=False, nullable=False)
    originalResultId = Column(String)
    retestReason = Column(String)
    
    # 审计
    enteredBy = Column(String, nullable=False)
    enteredAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewedBy = Column(String)
    reviewedAt = Column(DateTime)
    
    # 关系
    sample = relationship('Sample', back_populates='results')
    formula = relationship('Formula', back_populates='results')
    
    def __repr__(self):
        return f"<Result(id={self.id}, parameter={self.parameter}, value={self.value})>"
