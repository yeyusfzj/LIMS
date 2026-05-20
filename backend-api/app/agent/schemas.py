"""
API 请求/响应模型 - 本地轻量化 AI 智能体

定义所有 API 端点的请求和响应模型，使用 Pydantic 进行数据验证。
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


# ==================== 请求模型 ====================

class ParseRequest(BaseModel):
    """解析请求"""
    text: str = Field(..., min_length=1, max_length=5000, description="实验需求文本")
    
    @validator('text')
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('文本不能为空')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "我需要检测水样中的重金属含量，包括铅、汞、镉"
            }
        }


class PlanRequest(BaseModel):
    """计划生成请求"""
    parsed_fields: Dict[str, Any] = Field(..., description="解析后的结构化字段")
    format: str = Field(default="detailed", description="输出格式：detailed（详细）或 simple（简洁）")
    
    @validator('parsed_fields')
    def fields_valid(cls, v):
        if not v.get('purpose') or not v.get('sample_type'):
            raise ValueError('必须包含实验目的和样品类型')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "parsed_fields": {
                    "purpose": "检测水样重金属含量",
                    "sample_type": "水样",
                    "indicators": ["铅", "汞", "镉"],
                    "equipment": [],
                    "materials": [],
                    "steps": [],
                    "estimated_time": "",
                    "confidence": 0.85
                }
            }
        }


class QARequest(BaseModel):
    """问答请求"""
    question: str = Field(..., min_length=1, max_length=1000, description="用户问题")
    context: Optional[Dict[str, Any]] = Field(None, description="上下文信息（可选）")
    
    @validator('question')
    def question_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('问题不能为空')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "水质检测需要什么设备？"
            }
        }


class AnalysisRequest(BaseModel):
    """分析请求"""
    result_data: Dict[str, float] = Field(..., description="实验结果数据")
    experiment_type: Optional[str] = Field(None, description="实验类型（可选）")
    
    @validator('result_data')
    def data_valid(cls, v):
        if not v:
            raise ValueError('结果数据不能为空')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "result_data": {
                    "铅含量": 0.005,
                    "汞含量": 0.0001,
                    "镉含量": 0.003
                },
                "experiment_type": "water_heavy_metal"
            }
        }


# ==================== 响应模型 ====================

class APIResponse(BaseModel):
    """统一 API 响应"""
    success: bool = Field(..., description="请求是否成功")
    data: Optional[Dict[str, Any]] = Field(None, description="响应数据")
    error: Optional[str] = Field(None, description="错误信息")
    error_code: Optional[str] = Field(None, description="错误代码")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="时间戳")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "purpose": "检测水样重金属含量",
                    "sample_type": "水样",
                    "indicators": ["铅", "汞", "镉"]
                },
                "error": None,
                "error_code": None,
                "timestamp": "2026-05-06T10:30:00"
            }
        }


class ParseResponse(BaseModel):
    """解析响应"""
    purpose: str = Field("", description="实验目的")
    sample_type: str = Field("", description="样品类型")
    indicators: List[str] = Field(default_factory=list, description="检测指标")
    equipment: List[str] = Field(default_factory=list, description="所需设备")
    materials: List[str] = Field(default_factory=list, description="所需材料")
    steps: List[str] = Field(default_factory=list, description="实验步骤")
    estimated_time: str = Field("", description="预计时间")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="解析置信度")
    
    class Config:
        json_schema_extra = {
            "example": {
                "purpose": "检测水样重金属含量",
                "sample_type": "水样",
                "indicators": ["铅", "汞", "镉"],
                "equipment": [],
                "materials": [],
                "steps": [],
                "estimated_time": "",
                "confidence": 0.85
            }
        }


class PlanResponse(BaseModel):
    """计划生成响应"""
    id: str = Field(..., description="计划ID")
    purpose: str = Field(..., description="实验目的")
    sample_type: str = Field(..., description="样品类型")
    indicators: List[Dict[str, Any]] = Field(..., description="检测指标列表")
    equipment: List[Dict[str, Any]] = Field(..., description="设备列表")
    materials: List[Dict[str, Any]] = Field(..., description="材料列表")
    steps: List[Dict[str, Any]] = Field(..., description="步骤列表")
    estimated_time: str = Field(..., description="预计时间")
    safety_notes: List[str] = Field(default_factory=list, description="安全注意事项")
    markdown: str = Field(..., description="Markdown 格式的计划")
    created_at: str = Field(..., description="创建时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "plan_001",
                "purpose": "检测水样重金属含量",
                "sample_type": "水样",
                "indicators": [
                    {"id": "ind_001", "name": "铅含量", "unit": "mg/L"}
                ],
                "equipment": [
                    {"id": "eq_001", "name": "原子吸收光谱仪"}
                ],
                "materials": [
                    {"id": "mat_001", "name": "硝酸", "concentration": "65%"}
                ],
                "steps": [
                    {"id": "step_001", "order": 1, "title": "样品预处理"}
                ],
                "estimated_time": "2小时",
                "safety_notes": ["注意酸性试剂的使用"],
                "markdown": "# 实验计划\n\n...",
                "created_at": "2026-05-06T10:30:00"
            }
        }


class QAResponse(BaseModel):
    """问答响应"""
    question: str = Field(..., description="用户问题")
    answer: str = Field(..., description="回答内容")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="回答置信度")
    sources: List[str] = Field(default_factory=list, description="信息来源")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question": "水质检测需要什么设备？",
                "answer": "进行水质检测需要以下设备：\n1. 原子吸收光谱仪\n2. pH计\n3. 浊度仪",
                "confidence": 0.9,
                "sources": ["knowledge_graph"]
            }
        }


class AnalysisResponse(BaseModel):
    """分析响应"""
    result_id: str = Field(..., description="结果ID")
    status: str = Field(..., description="状态：normal/warning/error")
    anomalies: List[Dict[str, Any]] = Field(default_factory=list, description="异常列表")
    summary: str = Field("", description="分析摘要")
    analyzed_at: str = Field(..., description="分析时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "result_id": "result_001",
                "status": "warning",
                "anomalies": [
                    {
                        "indicator": "铅含量",
                        "value": 0.05,
                        "threshold_max": 0.01,
                        "severity": "high",
                        "message": "铅含量超标",
                        "suggestion": "建议重新采样检测"
                    }
                ],
                "summary": "检测到1项异常指标",
                "analyzed_at": "2026-05-06T10:30:00"
            }
        }


# ==================== 错误响应模型 ====================

class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = Field(False, description="请求失败")
    error: str = Field(..., description="错误信息")
    error_code: str = Field(..., description="错误代码")
    details: Optional[Dict[str, Any]] = Field(None, description="错误详情")
    suggestion: Optional[str] = Field(None, description="建议的解决方案")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="时间戳")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "输入文本不能为空",
                "error_code": "INVALID_INPUT",
                "details": {
                    "field": "text",
                    "constraint": "not_empty"
                },
                "suggestion": "请提供有效的实验需求文本",
                "timestamp": "2026-05-06T10:30:00"
            }
        }
