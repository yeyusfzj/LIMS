"""
检测结果 Pydantic 模型

定义检测结果相关的请求和响应模型，包括数据验证规则。
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ResultSource(str, Enum):
    """结果来源枚举"""
    MANUAL = "MANUAL"
    INSTRUMENT = "INSTRUMENT"
    CALCULATED = "CALCULATED"


class ResultBase(BaseModel):
    """检测结果基础模型"""
    sample_id: str = Field(..., description="样品 ID")
    test_item_id: str = Field(..., description="检测项 ID")
    parameter: str = Field(..., min_length=1, max_length=200, description="检测参数名称")
    value: Optional[float] = Field(None, description="数值型结果")
    text_value: Optional[str] = Field(None, max_length=500, description="文本型结果")
    unit: Optional[str] = Field(None, max_length=50, description="单位")
    method: str = Field(..., min_length=1, max_length=200, description="检测方法")
    source: ResultSource = Field(default=ResultSource.MANUAL, description="结果来源")
    instrument_id: Optional[str] = Field(None, description="仪器 ID")
    formula_id: Optional[str] = Field(None, description="公式 ID")
    is_calculated: bool = Field(default=False, description="是否为计算结果")
    is_abnormal: bool = Field(default=False, description="是否异常")
    abnormal_reason: Optional[str] = Field(None, max_length=500, description="异常原因")
    is_retest: bool = Field(default=False, description="是否为复测")
    original_result_id: Optional[str] = Field(None, description="原始结果 ID（复测时）")
    retest_reason: Optional[str] = Field(None, max_length=500, description="复测原因")

    @field_validator('parameter', 'method', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('text_value', 'unit', 'abnormal_reason', 'retest_reason', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class ResultCreate(ResultBase):
    """创建检测结果请求模型"""
    entered_by: str = Field(..., description="录入人")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "sample_id": "550e8400-e29b-41d4-a716-446655440000",
                    "test_item_id": "550e8400-e29b-41d4-a716-446655440010",
                    "parameter": "pH值",
                    "value": 7.2,
                    "text_value": None,
                    "unit": "pH",
                    "method": "GB/T 5750.4-2006",
                    "source": "INSTRUMENT",
                    "instrument_id": "INS-001",
                    "formula_id": None,
                    "is_calculated": False,
                    "is_abnormal": False,
                    "abnormal_reason": None,
                    "is_retest": False,
                    "original_result_id": None,
                    "retest_reason": None,
                    "entered_by": "550e8400-e29b-41d4-a716-446655440001"
                }
            ]
        }
    }


class ResultUpdate(BaseModel):
    """更新检测结果请求模型（所有字段可选）"""
    value: Optional[float] = Field(None, description="数值型结果")
    text_value: Optional[str] = Field(None, max_length=500, description="文本型结果")
    unit: Optional[str] = Field(None, max_length=50, description="单位")
    method: Optional[str] = Field(None, min_length=1, max_length=200, description="检测方法")
    source: Optional[ResultSource] = Field(None, description="结果来源")
    instrument_id: Optional[str] = Field(None, description="仪器 ID")
    is_abnormal: Optional[bool] = Field(None, description="是否异常")
    abnormal_reason: Optional[str] = Field(None, max_length=500, description="异常原因")

    @field_validator('method', mode='before')
    @classmethod
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator('text_value', 'unit', 'abnormal_reason', mode='before')
    @classmethod
    def strip_optional_strings(cls, v):
        """清洗可选字符串字段"""
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v


class ResultReview(BaseModel):
    """审核结果请求模型"""
    reviewed_by: str = Field(..., description="审核人")
    is_approved: bool = Field(..., description="是否通过审核")
    review_comment: Optional[str] = Field(None, max_length=500, description="审核意见")


class ResultResponse(ResultBase):
    """检测结果响应模型"""
    id: str = Field(..., description="结果 ID")
    version: int = Field(..., description="版本号")
    entered_by: str = Field(..., description="录入人")
    entered_at: datetime = Field(..., description="录入时间")
    reviewed_by: Optional[str] = Field(None, description="审核人")
    reviewed_at: Optional[datetime] = Field(None, description="审核时间")

    class Config:
        from_attributes = True


class PaginationInfo(BaseModel):
    """分页信息模型"""
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")
    total_pages: int = Field(..., description="总页数")


class ResultListResponse(BaseModel):
    """检测结果列表响应模型"""
    items: List[ResultResponse] = Field(..., description="结果列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class BatchImportResult(BaseModel):
    """批量导入结果模型"""
    total: int = Field(..., description="总数")
    success: int = Field(..., description="成功数量")
    failed: int = Field(..., description="失败数量")
    errors: List[dict] = Field(default_factory=list, description="错误详情")


class FieldMapping(BaseModel):
    """字段映射配置模型"""
    parameter: str = Field(..., description="参数字段名")
    value: Optional[str] = Field(None, description="数值字段名")
    text_value: Optional[str] = Field(None, description="文本值字段名")
    unit: Optional[str] = Field(None, description="单位字段名")
    method: str = Field(..., description="方法字段名")
    sample_id: Optional[str] = Field(None, description="样品 ID 字段名")
    test_item_id: Optional[str] = Field(None, description="检测项 ID 字段名")


class RetestRequest(BaseModel):
    """复测申请请求模型"""
    reason: str = Field(..., min_length=1, max_length=500, description="复测原因")
    priority: Optional[str] = Field(None, description="优先级")
    requested_by: str = Field(..., description="申请人")

    @field_validator('reason', mode='before')
    @classmethod
    def strip_reason(cls, v):
        """清洗原因字段"""
        if isinstance(v, str):
            return v.strip()
        return v


class CalculateRequest(BaseModel):
    """公式计算请求模型"""
    formula_id: str = Field(..., description="公式 ID")
    parameters: dict = Field(default_factory=dict, description="计算参数")
    target_parameter: Optional[str] = Field(None, description="目标参数名称")
    target_unit: Optional[str] = Field(None, description="目标单位")


class CalculationResult(BaseModel):
    """计算结果模型"""
    result: ResultResponse = Field(..., description="计算后的结果")
    calculation: dict = Field(..., description="计算详情")


class ImportError(BaseModel):
    """导入错误模型"""
    row: int = Field(..., description="行号")
    field: Optional[str] = Field(None, description="字段名")
    value: Optional[str] = Field(None, description="字段值")
    message: str = Field(..., description="错误消息")


class ImportResult(BaseModel):
    """导入结果模型"""
    success: bool = Field(..., description="是否成功")
    total_records: int = Field(..., description="总记录数")
    success_count: int = Field(..., description="成功数量")
    failure_count: int = Field(..., description="失败数量")
    errors: List[ImportError] = Field(default_factory=list, description="错误列表")
    imported_results: Optional[List[ResultResponse]] = Field(None, description="导入的结果列表")


class ImportTaskStatus(str, Enum):
    """导入任务状态枚举"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ImportTaskResponse(BaseModel):
    """导入任务响应模型"""
    task_id: str = Field(..., description="任务 ID")
    status: ImportTaskStatus = Field(..., description="任务状态")
    filename: str = Field(..., description="文件名")
    total_records: Optional[int] = Field(None, description="总记录数")
    success_count: Optional[int] = Field(None, description="成功数量")
    failure_count: Optional[int] = Field(None, description="失败数量")
    errors: Optional[List[ImportError]] = Field(None, description="错误列表")
    created_at: datetime = Field(..., description="创建时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")
