"""
流转 Pydantic 模型

定义样品流转相关的请求和响应模型，包括数据验证规则。
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class TransferStatus(str, Enum):
    """流转状态枚举"""
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class TransferCreate(BaseModel):
    """创建流转记录请求模型"""
    from_location: str = Field(..., min_length=1, max_length=200, description="起始位置")
    to_location: str = Field(..., min_length=1, max_length=200, description="目标位置")
    from_person: str = Field(..., min_length=1, max_length=100, description="交接人")
    to_person: str = Field(..., min_length=1, max_length=100, description="接收人")
    remarks: Optional[str] = Field(None, description="备注")

    @field_validator('from_location', 'to_location', 'from_person', 'to_person', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('remarks', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

    @field_validator('to_location')
    @classmethod
    def validate_different_locations(cls, v, info):
        """验证起始位置和目标位置不能相同"""
        if 'from_location' in info.data and v == info.data['from_location']:
            raise ValueError("起始位置和目标位置不能相同")
        return v


class TransferConfirm(BaseModel):
    """确认流转请求模型"""
    confirmation_type: str = Field(..., pattern="^(sender|receiver)$", description="确认类型：sender 或 receiver")


class TransferResponse(BaseModel):
    """流转记录响应模型"""
    id: str = Field(..., description="流转记录 ID")
    sample_id: str = Field(..., description="样品 ID")
    sample: Optional[dict] = Field(None, description="样品信息")
    from_location: str = Field(..., description="起始位置")
    to_location: str = Field(..., description="目标位置")
    from_person: str = Field(..., description="交接人")
    to_person: str = Field(..., description="接收人")
    transfer_date: datetime = Field(..., description="流转日期")
    received_date: Optional[datetime] = Field(None, description="接收日期")
    status: TransferStatus = Field(..., description="流转状态")
    remarks: Optional[str] = Field(None, description="备注")
    sender_confirmed: bool = Field(..., description="发送方已确认")
    receiver_confirmed: bool = Field(..., description="接收方已确认")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        from_attributes = True  # Pydantic v2 使用 from_attributes 替代 orm_mode
        
    @classmethod
    def model_validate(cls, obj):
        """自定义验证方法，处理样品关系"""
        # 先将对象转换为字典
        if hasattr(obj, '__dict__'):
            obj_dict = {
                'id': obj.id,
                'sample_id': obj.sample_id,
                'from_location': obj.from_location,
                'to_location': obj.to_location,
                'from_person': obj.from_person,
                'to_person': obj.to_person,
                'transfer_date': obj.transfer_date,
                'received_date': obj.received_date,
                'status': obj.status,
                'remarks': obj.remarks,
                'sender_confirmed': obj.sender_confirmed,
                'receiver_confirmed': obj.receiver_confirmed,
                'created_at': obj.created_at
            }
            
            # 如果有样品关系，添加样品信息
            if hasattr(obj, 'sample') and obj.sample:
                obj_dict['sample'] = {
                    'sample_number': obj.sample.sample_number,
                    'sample_name': obj.sample.sample_name
                }
            else:
                obj_dict['sample'] = None
            
            return super().model_validate(obj_dict)
        else:
            return super().model_validate(obj)


class TransferListResponse(BaseModel):
    """流转记录列表响应模型"""
    items: list[TransferResponse] = Field(..., description="流转记录列表")
    pagination: dict = Field(..., description="分页信息")

    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "pagination": {
                    "total": 100,
                    "page": 1,
                    "page_size": 20,
                    "total_pages": 5
                }
            }
        }



class TransferConfirmRequest(BaseModel):
    """流转确认请求模型"""
    confirm_type: str = Field(..., pattern="^(sender|receiver)$", description="确认类型：sender 或 receiver")
    remarks: Optional[str] = Field(None, description="确认备注")
    
    @field_validator('remarks', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class ChainOfCustodyResponse(BaseModel):
    """监管链响应模型"""
    sample_id: str = Field(..., description="样品 ID")
    transfers: list[TransferResponse] = Field(..., description="流转记录列表（按时间顺序）")
