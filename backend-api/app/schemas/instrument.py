"""
仪器 Pydantic 模型

定义仪器相关的请求和响应模型，包括数据验证规则。
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

from app.schemas.response import PaginationInfo


class InstrumentStatus(str, Enum):
    """仪器状态枚举"""
    IN_USE = "IN_USE"
    STANDBY = "STANDBY"
    MAINTENANCE = "MAINTENANCE"
    CALIBRATING = "CALIBRATING"
    PENDING_DISPOSAL = "PENDING_DISPOSAL"
    DISPOSED = "DISPOSED"


class InstrumentBase(BaseModel):
    """仪器基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="仪器名称")
    model: Optional[str] = Field(None, max_length=100, description="型号")
    manufacturer: Optional[str] = Field(None, max_length=200, description="制造商")
    serial_number: Optional[str] = Field(None, max_length=100, description="序列号")
    purchase_date: Optional[datetime] = Field(None, description="购置日期")
    purchase_price: Optional[float] = Field(None, ge=0, description="购置价格")
    technical_params: Optional[Dict[str, Any]] = Field(None, description="技术参数")
    current_location: Optional[str] = Field(None, max_length=200, description="当前位置")
    current_department: Optional[str] = Field(None, max_length=200, description="当前部门")
    current_responsible: Optional[str] = Field(None, max_length=100, description="当前负责人")
    usage_years: Optional[int] = Field(None, ge=0, description="使用年限")
    warranty_expiry: Optional[datetime] = Field(None, description="保修到期日期")
    description: Optional[str] = Field(None, description="描述")
    remarks: Optional[str] = Field(None, description="备注")

    @field_validator('name', 'model', 'manufacturer', 'serial_number', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('current_location', 'current_department', 'current_responsible', 
                     'description', 'remarks', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class InstrumentCreate(InstrumentBase):
    """创建仪器请求模型"""
    code: str = Field(..., min_length=1, max_length=100, description="仪器编码")
    status: InstrumentStatus = Field(default=InstrumentStatus.IN_USE, description="状态")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "code": "INS-2024-001",
                    "name": "高效液相色谱仪",
                    "model": "LC-2030C",
                    "manufacturer": "岛津",
                    "serial_number": "C12345678",
                    "purchase_date": "2024-01-15T00:00:00",
                    "purchase_price": 350000.0,
                    "technical_params": {
                        "measurementRange": "190-800nm",
                        "precision": "±0.5%",
                        "resolution": "0.1nm"
                    },
                    "status": "IN_USE",
                    "current_location": "检测室A",
                    "current_department": "理化检测部",
                    "current_responsible": "张三",
                    "description": "用于水质检测",
                    "remarks": "新购设备"
                }
            ]
        }
    }


class InstrumentUpdate(BaseModel):
    """更新仪器请求模型（所有字段可选）"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="仪器名称")
    model: Optional[str] = Field(None, max_length=100, description="型号")
    manufacturer: Optional[str] = Field(None, max_length=200, description="制造商")
    serial_number: Optional[str] = Field(None, max_length=100, description="序列号")
    purchase_date: Optional[datetime] = Field(None, description="购置日期")
    purchase_price: Optional[float] = Field(None, ge=0, description="购置价格")
    technical_params: Optional[Dict[str, Any]] = Field(None, description="技术参数")
    status: Optional[InstrumentStatus] = Field(None, description="状态")
    current_location: Optional[str] = Field(None, max_length=200, description="当前位置")
    current_department: Optional[str] = Field(None, max_length=200, description="当前部门")
    current_responsible: Optional[str] = Field(None, max_length=100, description="当前负责人")
    usage_years: Optional[int] = Field(None, ge=0, description="使用年限")
    warranty_expiry: Optional[datetime] = Field(None, description="保修到期日期")
    description: Optional[str] = Field(None, description="描述")
    remarks: Optional[str] = Field(None, description="备注")

    @field_validator('name', 'model', 'manufacturer', 'serial_number', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('current_location', 'current_department', 'current_responsible', 
                     'description', 'remarks', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "current_location": "检测室B",
                    "current_department": "微生物检测部",
                    "status": "MAINTENANCE",
                    "remarks": "设备维护中"
                }
            ]
        }
    }


class InstrumentResponse(InstrumentBase):
    """仪器响应模型"""
    id: str = Field(..., description="仪器 ID")
    code: str = Field(..., description="仪器编码")
    status: InstrumentStatus = Field(..., description="状态")
    version: int = Field(..., description="版本号")
    created_by: str = Field(..., description="创建人")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "code": "INS-2024-001",
                    "name": "高效液相色谱仪",
                    "model": "LC-2030C",
                    "manufacturer": "岛津",
                    "serial_number": "C12345678",
                    "purchase_date": "2024-01-15T00:00:00",
                    "purchase_price": 350000.0,
                    "technical_params": {
                        "measurementRange": "190-800nm",
                        "precision": "±0.5%",
                        "resolution": "0.1nm"
                    },
                    "status": "IN_USE",
                    "current_location": "检测室A",
                    "current_department": "理化检测部",
                    "current_responsible": "张三",
                    "usage_years": 0,
                    "warranty_expiry": "2027-01-15T00:00:00",
                    "description": "用于水质检测",
                    "remarks": "新购设备",
                    "version": 1,
                    "created_by": "550e8400-e29b-41d4-a716-446655440001",
                    "created_at": "2024-01-15T09:00:00",
                    "updated_at": "2024-01-15T09:00:00"
                }
            ]
        }
    }


class InstrumentListResponse(BaseModel):
    """仪器列表响应模型"""
    items: list[InstrumentResponse] = Field(..., description="仪器列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class InstrumentStatusUpdate(BaseModel):
    """仪器状态更新请求模型"""
    status: InstrumentStatus = Field(..., description="新状态")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": "MAINTENANCE"
                }
            ]
        }
    }
