"""
样品 Pydantic 模型

定义样品相关的请求和响应模型，包括数据验证规则。
"""
from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import re

from app.schemas.response import PaginationInfo


class SampleStatus(str, Enum):
    """样品状态枚举"""
    REGISTERED = "REGISTERED"
    IN_TESTING = "IN_TESTING"
    TESTING_COMPLETE = "TESTING_COMPLETE"
    IN_AUDIT = "IN_AUDIT"
    AUDIT_COMPLETE = "AUDIT_COMPLETE"
    RELEASED = "RELEASED"
    ARCHIVED = "ARCHIVED"


class Priority(str, Enum):
    """优先级枚举"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class SampleBase(BaseModel):
    """样品基础模型"""
    client_name: str = Field(..., min_length=1, max_length=200, description="客户名称")
    client_contact: Optional[str] = Field(None, max_length=100, description="客户联系方式")
    sample_name: str = Field(..., min_length=1, max_length=200, description="样品名称")
    sample_type: str = Field(..., min_length=1, max_length=100, description="样品类型")
    sample_category: str = Field(..., min_length=1, max_length=100, description="样品类别")
    quantity: float = Field(..., gt=0, description="样品数量")
    unit: str = Field(..., min_length=1, max_length=20, description="单位")
    received_date: datetime = Field(..., description="接收日期")
    sampling_date: Optional[datetime] = Field(None, description="采样日期")
    sampling_location: Optional[str] = Field(None, max_length=200, description="采样地点")
    sampling_person: Optional[str] = Field(None, max_length=100, description="采样人")
    storage_location: Optional[str] = Field(None, max_length=200, description="存储位置")
    storage_condition: Optional[str] = Field(None, max_length=200, description="存储条件")
    priority: Priority = Field(default=Priority.NORMAL, description="优先级")
    description: Optional[str] = Field(None, description="描述")
    remarks: Optional[str] = Field(None, description="备注")

    @field_validator('client_name', 'sample_name', 'sample_type', 'sample_category', 'unit', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('client_contact', 'sampling_location', 'sampling_person', 
                     'storage_location', 'storage_condition', 'description', 'remarks', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class SampleCreate(SampleBase):
    """创建样品请求模型"""
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "client_name": "某某检测公司",
                    "client_contact": "张三 13800138000",
                    "sample_name": "饮用水样品",
                    "sample_type": "水质",
                    "sample_category": "环境检测",
                    "quantity": 500.0,
                    "unit": "mL",
                    "received_date": "2024-01-15T09:00:00",
                    "sampling_date": "2024-01-14T14:30:00",
                    "sampling_location": "某某水厂取水口",
                    "sampling_person": "李四",
                    "storage_location": "冷藏室A-01",
                    "storage_condition": "4℃冷藏",
                    "priority": "NORMAL",
                    "description": "常规水质检测",
                    "remarks": "需在3天内完成检测"
                }
            ]
        }
    }


class SampleUpdate(BaseModel):
    """更新样品请求模型（所有字段可选）"""
    client_name: Optional[str] = Field(None, min_length=1, max_length=200, description="客户名称")
    client_contact: Optional[str] = Field(None, max_length=100, description="客户联系方式")
    sample_name: Optional[str] = Field(None, min_length=1, max_length=200, description="样品名称")
    sample_type: Optional[str] = Field(None, min_length=1, max_length=100, description="样品类型")
    sample_category: Optional[str] = Field(None, min_length=1, max_length=100, description="样品类别")
    quantity: Optional[float] = Field(None, gt=0, description="样品数量")
    unit: Optional[str] = Field(None, min_length=1, max_length=20, description="单位")
    sampling_date: Optional[datetime] = Field(None, description="采样日期")
    sampling_location: Optional[str] = Field(None, max_length=200, description="采样地点")
    sampling_person: Optional[str] = Field(None, max_length=100, description="采样人")
    storage_location: Optional[str] = Field(None, max_length=200, description="存储位置")
    storage_condition: Optional[str] = Field(None, max_length=200, description="存储条件")
    priority: Optional[Priority] = Field(None, description="优先级")
    description: Optional[str] = Field(None, description="描述")
    remarks: Optional[str] = Field(None, description="备注")
    status: Optional[SampleStatus] = Field(None, description="状态")

    @field_validator('client_name', 'sample_name', 'sample_type', 'sample_category', 'unit', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('client_contact', 'sampling_location', 'sampling_person', 
                     'storage_location', 'storage_condition', 'description', 'remarks', mode='before')
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
                    "storage_location": "冷藏室B-05",
                    "storage_condition": "常温保存",
                    "priority": "HIGH",
                    "remarks": "客户要求加急处理"
                }
            ]
        }
    }


class RetentionInfo(BaseModel):
    """留样信息模型"""
    location: Optional[str] = Field(None, description="留样位置")
    expiryDate: Optional[datetime] = Field(None, description="留样到期日期")
    status: str = Field(default="active", description="留样状态: active, extended, disposed")


class SampleResponse(SampleBase):
    """样品响应模型"""
    id: str = Field(..., description="样品 ID")
    barcode: str = Field(..., description="条码")
    sample_number: str = Field(..., description="样品编号")
    status: SampleStatus = Field(..., description="状态")
    version: int = Field(..., description="版本号")
    parent_sample_id: Optional[str] = Field(None, description="母样品 ID")
    merged_from_ids: Optional[List[str]] = Field(None, description="合样来源 ID 列表")
    workflow_instance_id: Optional[str] = Field(None, description="工作流实例 ID")
    created_by: str = Field(..., description="创建人")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    released_at: Optional[datetime] = Field(None, description="放行时间")
    released_by: Optional[str] = Field(None, description="放行人")
    
    @computed_field
    @property
    def retentionInfo(self) -> Optional[RetentionInfo]:
        """
        从描述和备注中提取留样信息
        
        留样信息存储在 description 字段中，格式为：
        【留样期限】
        - 留样到期日期：YYYY年MM月DD日
        """
        if not self.description:
            return None
        
        # 从 description 中提取留样到期日期
        expiry_date = None
        if "留样到期日期：" in self.description:
            # 匹配格式: 留样到期日期：2026年11月14日
            match = re.search(r'留样到期日期：(\d{4})年(\d{1,2})月(\d{1,2})日', self.description)
            if match:
                year, month, day = match.groups()
                try:
                    expiry_date = datetime(int(year), int(month), int(day))
                except ValueError:
                    pass
        
        # 确定留样状态
        retention_status = "active"
        if self.remarks and "已销毁" in self.remarks:
            retention_status = "disposed"
        elif self.remarks and "延期" in self.remarks:
            retention_status = "extended"
        
        # 如果有留样相关信息，返回 RetentionInfo 对象
        if expiry_date or (self.storage_location and "留样" in self.storage_location):
            return RetentionInfo(
                location=self.storage_location,
                expiryDate=expiry_date,
                status=retention_status
            )
        
        return None
    
    model_config = {
        "from_attributes": True,  # Pydantic v2 使用 from_attributes 替代 orm_mode
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "barcode": "BC20240115001",
                    "sample_number": "SN20240115001",
                    "client_name": "某某检测公司",
                    "client_contact": "张三 13800138000",
                    "sample_name": "饮用水样品",
                    "sample_type": "水质",
                    "sample_category": "环境检测",
                    "quantity": 500.0,
                    "unit": "mL",
                    "status": "REGISTERED",
                    "priority": "NORMAL",
                    "received_date": "2024-01-15T09:00:00",
                    "sampling_date": "2024-01-14T14:30:00",
                    "sampling_location": "某某水厂取水口",
                    "sampling_person": "李四",
                    "storage_location": "冷藏室A-01",
                    "storage_condition": "4℃冷藏",
                    "description": "常规水质检测",
                    "remarks": "需在3天内完成检测",
                    "version": 1,
                    "parent_sample_id": None,
                    "merged_from_ids": [],
                    "workflow_instance_id": None,
                    "created_by": "550e8400-e29b-41d4-a716-446655440001",
                    "created_at": "2024-01-15T09:00:00",
                    "updated_at": "2024-01-15T09:00:00",
                    "released_at": None,
                    "released_by": None
                }
            ]
        }
    }


class SampleListResponse(BaseModel):
    """样品列表响应模型"""
    items: List[SampleResponse] = Field(..., description="样品列表")
    pagination: PaginationInfo = Field(..., description="分页信息")



class SampleSplitRequest(BaseModel):
    """分样请求模型"""
    sub_samples: List[dict] = Field(..., min_length=2, description="子样品列表")
    
    @field_validator('sub_samples')
    @classmethod
    def validate_sub_samples(cls, v):
        """验证子样品数据"""
        if len(v) < 2:
            raise ValueError("至少需要 2 个子样品")
        
        for sub in v:
            if 'quantity' not in sub or 'unit' not in sub:
                raise ValueError("每个子样品必须包含 quantity 和 unit 字段")
            if not isinstance(sub['quantity'], (int, float)) or sub['quantity'] <= 0:
                raise ValueError("子样品数量必须大于 0")
        
        return v


class SampleMergeRequest(BaseModel):
    """合样请求模型"""
    source_sample_ids: List[str] = Field(..., min_length=2, description="来源样品 ID 列表")
    merged_sample: SampleCreate = Field(..., description="合并后的样品信息")
    
    @field_validator('source_sample_ids')
    @classmethod
    def validate_source_samples(cls, v):
        """验证来源样品列表"""
        if len(v) < 2:
            raise ValueError("至少需要 2 个来源样品")
        if len(v) != len(set(v)):
            raise ValueError("来源样品 ID 不能重复")
        return v



class SampleStatusUpdate(BaseModel):
    """样品状态更新请求模型"""
    status: SampleStatus = Field(..., description="新状态")
    released_by: Optional[str] = Field(None, description="放行人（状态为 RELEASED 时必填）")
    released_at: Optional[datetime] = Field(None, description="放行时间（可选，默认当前时间）")
    
    @field_validator('released_by')
    @classmethod
    def validate_released_by(cls, v, info):
        """验证放行人字段"""
        # 获取 status 字段的值
        status = info.data.get('status')
        if status == SampleStatus.RELEASED and not v:
            raise ValueError("状态为 RELEASED 时必须提供 released_by")
        return v


class BatchDeleteRequest(BaseModel):
    """批量删除请求模型"""
    sample_ids: List[str] = Field(..., min_length=1, description="样品 ID 列表")
    
    @field_validator('sample_ids')
    @classmethod
    def validate_sample_ids(cls, v):
        """验证样品 ID 列表"""
        if not v:
            raise ValueError("样品 ID 列表不能为空")
        if len(v) != len(set(v)):
            raise ValueError("样品 ID 不能重复")
        return v


class BatchDeleteFailedDetail(BaseModel):
    """批量删除失败详情"""
    id: str = Field(..., description="样品 ID")
    error: str = Field(..., description="错误信息")


class BatchDeleteResponse(BaseModel):
    """批量删除响应模型"""
    total: int = Field(..., description="总数")
    success: int = Field(..., description="成功数量")
    failed: int = Field(..., description="失败数量")
    success_ids: List[str] = Field(..., description="成功的样品 ID 列表")
    failed_details: List[BatchDeleteFailedDetail] = Field(..., description="失败详情列表")
