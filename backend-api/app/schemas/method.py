"""
检测方法 Pydantic 模型

定义检测方法相关的请求和响应模型，包括数据验证规则。
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MethodStatus(str, Enum):
    """检测方法状态枚举"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Equipment(BaseModel):
    """设备信息模型"""
    name: str = Field(..., min_length=1, max_length=200, description="设备名称")
    model: str = Field(..., min_length=1, max_length=100, description="设备型号")
    accuracy: Optional[str] = Field(None, max_length=200, description="设备精度")
    calibration: Optional[str] = Field(None, max_length=200, description="校准信息")

    @field_validator('name', 'model', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v


class MethodStep(BaseModel):
    """检测方法步骤模型"""
    title: str = Field(..., min_length=1, max_length=200, description="步骤标题")
    description: str = Field(..., min_length=1, description="步骤描述")

    @field_validator('title', 'description', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v


class MethodBase(BaseModel):
    """检测方法基础模型"""
    code: str = Field(..., min_length=1, max_length=50, description="方法编号")
    name: str = Field(..., min_length=1, max_length=200, description="方法名称")
    category: str = Field(..., min_length=1, max_length=100, description="方法分类")
    version: str = Field(..., min_length=1, max_length=20, description="版本号")
    status: MethodStatus = Field(default=MethodStatus.DRAFT, description="方法状态")
    scope: Optional[str] = Field(None, max_length=500, description="适用范围")
    description: Optional[str] = Field(None, description="方法描述")
    equipment: List[Equipment] = Field(default_factory=list, description="所需设备列表")
    steps: List[MethodStep] = Field(default_factory=list, description="操作步骤列表")
    precision: Optional[str] = Field(None, max_length=200, description="精密度")
    accuracy: Optional[str] = Field(None, max_length=200, description="准确度")
    detectionLimit: Optional[str] = Field(None, max_length=200, description="检出限")
    measurementRange: Optional[str] = Field(None, max_length=200, description="测量范围")
    qualityControl: Optional[str] = Field(None, description="质量控制要求")
    safetyNotes: Optional[str] = Field(None, description="安全注意事项")
    operationNotes: Optional[str] = Field(None, description="操作注意事项")

    @field_validator('code', 'name', 'category', 'version', mode='before')
    @classmethod
    def strip_required_strings(cls, v):
        """清洗必填字符串字段"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('scope', 'precision', 'accuracy', 'detectionLimit', 'measurementRange', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class MethodCreate(MethodBase):
    """创建检测方法请求模型"""
    pass


class MethodUpdate(BaseModel):
    """更新检测方法请求模型（所有字段可选）"""
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="方法编号")
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="方法名称")
    category: Optional[str] = Field(None, min_length=1, max_length=100, description="方法分类")
    version: Optional[str] = Field(None, min_length=1, max_length=20, description="版本号")
    status: Optional[MethodStatus] = Field(None, description="方法状态")
    scope: Optional[str] = Field(None, max_length=500, description="适用范围")
    description: Optional[str] = Field(None, description="方法描述")
    equipment: Optional[List[Equipment]] = Field(None, description="所需设备列表")
    steps: Optional[List[MethodStep]] = Field(None, description="操作步骤列表")
    precision: Optional[str] = Field(None, max_length=200, description="精密度")
    accuracy: Optional[str] = Field(None, max_length=200, description="准确度")
    detectionLimit: Optional[str] = Field(None, max_length=200, description="检出限")
    measurementRange: Optional[str] = Field(None, max_length=200, description="测量范围")
    qualityControl: Optional[str] = Field(None, description="质量控制要求")
    safetyNotes: Optional[str] = Field(None, description="安全注意事项")
    operationNotes: Optional[str] = Field(None, description="操作注意事项")

    @field_validator('code', 'name', 'category', 'version', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串字段"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('scope', 'precision', 'accuracy', 'detectionLimit', 'measurementRange', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class MethodResponse(MethodBase):
    """检测方法响应模型"""
    id: str = Field(..., description="方法 ID")
    createdBy: str = Field(..., description="创建人")
    createdAt: datetime = Field(..., description="创建时间")
    updatedAt: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class PaginationInfo(BaseModel):
    """分页信息模型"""
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页数量")


class MethodListResponse(BaseModel):
    """检测方法列表响应模型"""
    data: List[MethodResponse] = Field(..., description="方法列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页数量")


class CopyMethodRequest(BaseModel):
    """复制方法请求模型"""
    version: str = Field(..., min_length=1, max_length=20, description="新版本号")

    @field_validator('version', mode='before')
    @classmethod
    def strip_version(cls, v):
        """清洗版本号字段"""
        if isinstance(v, str):
            return v.strip()
        return v
