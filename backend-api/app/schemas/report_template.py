"""
报告模板相关的 Pydantic schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class TemplateVariableType(str, Enum):
    """模板变量类型"""
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


class TemplateVariable(BaseModel):
    """模板变量定义"""
    name: str = Field(..., description="变量名称")
    type: TemplateVariableType = Field(..., description="变量类型")
    label: Optional[str] = Field(None, description="变量标签")
    description: Optional[str] = Field(None, description="变量描述")
    required: bool = Field(False, description="是否必填")
    defaultValue: Optional[Any] = Field(None, description="默认值")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "sampleName",
                "type": "string",
                "label": "样品名称",
                "description": "检测样品的名称",
                "required": True
            }
        }


class TemplateValidationError(BaseModel):
    """模板验证错误"""
    type: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误消息")
    location: Optional[str] = Field(None, description="错误位置")


class TemplateValidationResult(BaseModel):
    """模板验证结果"""
    isValid: bool = Field(..., description="是否有效")
    errors: List[TemplateValidationError] = Field(default_factory=list, description="错误列表")


class ReportTemplateBase(BaseModel):
    """报告模板基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="模板名称")
    description: Optional[str] = Field(None, max_length=1000, description="模板描述")
    category: str = Field(..., min_length=1, max_length=100, description="模板分类")
    content: str = Field(..., min_length=1, description="模板内容（HTML）")
    variables: List[TemplateVariable] = Field(..., description="模板变量定义")


class ReportTemplateCreate(ReportTemplateBase):
    """创建报告模板请求"""
    
    @field_validator('variables')
    @classmethod
    def validate_variables(cls, v):
        """验证变量定义"""
        if not v:
            raise ValueError("至少需要定义一个变量")
        
        # 检查变量名是否重复
        names = [var.name for var in v]
        if len(names) != len(set(names)):
            raise ValueError("变量名不能重复")
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "水质检测报告模板",
                "description": "用于水质检测的标准报告模板",
                "category": "环境检测",
                "content": "<h1>{{reportTitle}}</h1><p>样品名称：{{sample.name}}</p>",
                "variables": [
                    {
                        "name": "reportTitle",
                        "type": "string",
                        "label": "报告标题",
                        "required": True
                    },
                    {
                        "name": "sample",
                        "type": "object",
                        "label": "样品信息",
                        "required": True
                    }
                ]
            }
        }


class ReportTemplateUpdate(BaseModel):
    """更新报告模板请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="模板名称")
    description: Optional[str] = Field(None, max_length=1000, description="模板描述")
    category: Optional[str] = Field(None, min_length=1, max_length=100, description="模板分类")
    content: Optional[str] = Field(None, min_length=1, description="模板内容（HTML）")
    variables: Optional[List[TemplateVariable]] = Field(None, description="模板变量定义")
    isActive: Optional[bool] = Field(None, description="是否激活")
    
    @field_validator('variables')
    @classmethod
    def validate_variables(cls, v):
        """验证变量定义"""
        if v is not None and len(v) > 0:
            # 检查变量名是否重复
            names = [var.name for var in v]
            if len(names) != len(set(names)):
                raise ValueError("变量名不能重复")
        
        return v


class ReportTemplateResponse(ReportTemplateBase):
    """报告模板响应"""
    id: str = Field(..., description="模板ID")
    version: int = Field(..., description="版本号")
    isActive: bool = Field(..., description="是否激活")
    createdBy: str = Field(..., description="创建人ID")
    createdAt: datetime = Field(..., description="创建时间")
    updatedAt: datetime = Field(..., description="更新时间")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ReportTemplateQuery(BaseModel):
    """报告模板查询参数"""
    category: Optional[str] = Field(None, description="模板分类")
    isActive: Optional[bool] = Field(None, description="是否激活")
    search: Optional[str] = Field(None, description="搜索关键词")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class ReportTemplateListResponse(BaseModel):
    """报告模板列表响应"""
    items: List[ReportTemplateResponse] = Field(..., description="模板列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页")
    pageSize: int = Field(..., description="每页数量")
    totalPages: int = Field(..., description="总页数")


class ReportTemplateVersionInfo(BaseModel):
    """报告模板版本信息"""
    templateId: str = Field(..., description="模板ID")
    currentVersion: int = Field(..., description="当前版本号")
    createdAt: datetime = Field(..., description="创建时间")
    updatedAt: datetime = Field(..., description="更新时间")
    createdBy: str = Field(..., description="创建人ID")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
