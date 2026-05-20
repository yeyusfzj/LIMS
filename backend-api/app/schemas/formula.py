"""
公式相关的 Pydantic schemas
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import re


class FormulaParameter(BaseModel):
    """公式参数定义"""
    name: str = Field(..., description="参数名称")
    type: str = Field(..., description="参数类型: number, string, boolean")
    description: Optional[str] = Field(None, description="参数描述")
    required: bool = Field(True, description="是否必需")
    defaultValue: Optional[Any] = Field(None, description="默认值")
    
    @validator('name')
    def validate_name(cls, v):
        """验证参数名称"""
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', v):
            raise ValueError('参数名称只能包含字母、数字和下划线，且不能以数字开头')
        return v
    
    @validator('type')
    def validate_type(cls, v):
        """验证参数类型"""
        if v not in ['number', 'string', 'boolean']:
            raise ValueError('参数类型必须是 number、string 或 boolean')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "concentration",
                "type": "number",
                "description": "浓度值",
                "required": True
            }
        }


class FormulaCreate(BaseModel):
    """创建公式请求"""
    name: str = Field(..., min_length=1, max_length=100, description="公式名称")
    description: Optional[str] = Field(None, max_length=500, description="公式描述")
    expression: str = Field(..., min_length=1, description="公式表达式")
    parameters: List[FormulaParameter] = Field(..., min_items=1, description="参数定义")
    isActive: Optional[bool] = Field(True, description="是否启用")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "浓度计算公式",
                "description": "根据吸光度计算浓度",
                "expression": "absorbance * slope + intercept",
                "parameters": [
                    {
                        "name": "absorbance",
                        "type": "number",
                        "description": "吸光度",
                        "required": True
                    },
                    {
                        "name": "slope",
                        "type": "number",
                        "description": "斜率",
                        "required": True
                    },
                    {
                        "name": "intercept",
                        "type": "number",
                        "description": "截距",
                        "required": True
                    }
                ],
                "isActive": True
            }
        }


class FormulaUpdate(BaseModel):
    """更新公式请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="公式名称")
    description: Optional[str] = Field(None, max_length=500, description="公式描述")
    expression: Optional[str] = Field(None, min_length=1, description="公式表达式")
    parameters: Optional[List[FormulaParameter]] = Field(None, min_items=1, description="参数定义")
    isActive: Optional[bool] = Field(None, description="是否启用")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "浓度计算公式（更新）",
                "isActive": False
            }
        }


class FormulaResponse(BaseModel):
    """公式响应"""
    id: str = Field(..., description="公式ID")
    name: str = Field(..., description="公式名称")
    description: Optional[str] = Field(None, description="公式描述")
    expression: str = Field(..., description="公式表达式")
    parameters: List[Dict[str, Any]] = Field(..., description="参数定义")
    isActive: bool = Field(..., description="是否启用")
    createdBy: str = Field(..., description="创建人ID")
    createdAt: datetime = Field(..., description="创建时间")
    updatedAt: datetime = Field(..., description="更新时间")
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "浓度计算公式",
                "description": "根据吸光度计算浓度",
                "expression": "absorbance * slope + intercept",
                "parameters": [
                    {
                        "name": "absorbance",
                        "type": "number",
                        "description": "吸光度",
                        "required": True
                    }
                ],
                "isActive": True,
                "createdBy": "user123",
                "createdAt": "2026-04-09T10:00:00Z",
                "updatedAt": "2026-04-09T10:00:00Z"
            }
        }


class FormulaQuery(BaseModel):
    """公式查询参数"""
    name: Optional[str] = Field(None, description="公式名称（模糊匹配）")
    isActive: Optional[bool] = Field(None, description="是否启用")
    createdBy: Optional[str] = Field(None, description="创建人ID")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "浓度",
                "isActive": True,
                "page": 1,
                "pageSize": 20
            }
        }


class PaginatedFormulaResponse(BaseModel):
    """分页公式响应"""
    items: List[FormulaResponse] = Field(..., description="公式列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页数量")
    totalPages: int = Field(..., description="总页数")
    
    class Config:
        schema_extra = {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "pageSize": 20,
                "totalPages": 5
            }
        }


class FormulaCalculationInput(BaseModel):
    """公式计算输入"""
    formulaId: str = Field(..., description="公式ID")
    parameters: Dict[str, Any] = Field(..., description="参数值")
    
    @validator('parameters')
    def validate_parameters(cls, v):
        """验证参数不为空"""
        if not v or len(v) == 0:
            raise ValueError('参数不能为空')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "formulaId": "550e8400-e29b-41d4-a716-446655440000",
                "parameters": {
                    "absorbance": 0.5,
                    "slope": 2.0,
                    "intercept": 0.1
                }
            }
        }


class FormulaCalculationResult(BaseModel):
    """公式计算结果"""
    success: bool = Field(..., description="是否成功")
    value: Optional[float] = Field(None, description="计算结果")
    error: Optional[str] = Field(None, description="错误信息")
    expression: Optional[str] = Field(None, description="公式表达式")
    parameters: Optional[Dict[str, Any]] = Field(None, description="参数值")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "value": 1.1,
                "expression": "absorbance * slope + intercept",
                "parameters": {
                    "absorbance": 0.5,
                    "slope": 2.0,
                    "intercept": 0.1
                }
            }
        }


class FormulaValidationResult(BaseModel):
    """公式验证结果"""
    valid: bool = Field(..., description="是否有效")
    errors: List[str] = Field(default_factory=list, description="错误列表")
    
    class Config:
        schema_extra = {
            "example": {
                "valid": True,
                "errors": []
            }
        }


class FormulaValidateRequest(BaseModel):
    """公式验证请求"""
    expression: str = Field(..., min_length=1, description="公式表达式")
    parameters: List[FormulaParameter] = Field(..., min_items=1, description="参数定义")
    
    class Config:
        schema_extra = {
            "example": {
                "expression": "absorbance * slope + intercept",
                "parameters": [
                    {
                        "name": "absorbance",
                        "type": "number",
                        "description": "吸光度",
                        "required": True
                    }
                ]
            }
        }
