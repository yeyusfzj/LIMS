"""
报告相关的 Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportStatusEnum(str, Enum):
    """报告状态枚举"""
    DRAFT = "DRAFT"
    PENDING_SIGNATURE = "PENDING_SIGNATURE"
    SIGNED = "SIGNED"
    DISTRIBUTED = "DISTRIBUTED"
    RECALLED = "RECALLED"


class ReportGenerate(BaseModel):
    """生成报告请求"""
    sampleId: str = Field(..., description="样品ID")
    templateId: str = Field(..., description="模板ID")
    preview: bool = Field(False, description="是否预览模式")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sampleId": "sample-123",
                "templateId": "template-456",
                "preview": False
            }
        }


class ReportData(BaseModel):
    """报告数据"""
    sample: Dict[str, Any] = Field(..., description="样品信息")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="检测结果列表")
    qualityJudgment: Optional[Dict[str, Any]] = Field(None, description="质量判定")
    auditTasks: List[Dict[str, Any]] = Field(default_factory=list, description="审核任务列表")
    generatedAt: datetime = Field(..., description="生成时间")
    generatedBy: str = Field(..., description="生成人ID")


class ReportGenerationResult(BaseModel):
    """报告生成结果"""
    reportId: Optional[str] = Field(None, description="报告ID（预览模式为空）")
    reportNumber: Optional[str] = Field(None, description="报告编号（预览模式为空）")
    content: str = Field(..., description="报告内容")
    preview: bool = Field(..., description="是否预览模式")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reportId": "report-123",
                "reportNumber": "REPORT-20260409-0001",
                "content": "<html>...</html>",
                "preview": False
            }
        }


class ReportUpdate(BaseModel):
    """更新报告请求"""
    content: Optional[str] = Field(None, description="报告内容")
    
    class Config:
        json_schema_extra = {
            "example": {
                "content": "<html>...</html>"
            }
        }


class ReportQuery(BaseModel):
    """报告查询参数"""
    sampleId: Optional[str] = Field(None, description="样品ID")
    status: Optional[ReportStatusEnum] = Field(None, description="报告状态")
    startDate: Optional[datetime] = Field(None, description="开始日期")
    endDate: Optional[datetime] = Field(None, description="结束日期")
    search: Optional[str] = Field(None, description="搜索关键词（报告编号）")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class SampleInfo(BaseModel):
    """样品信息（简化）"""
    sampleNumber: str = Field(..., description="样品编号")
    sampleName: str = Field(..., description="样品名称")
    clientName: str = Field(..., description="客户名称")


class TemplateInfo(BaseModel):
    """模板信息（简化）"""
    name: str = Field(..., description="模板名称")


class ReportResponse(BaseModel):
    """报告响应"""
    id: str = Field(..., description="报告ID")
    reportNumber: str = Field(..., description="报告编号")
    sampleId: str = Field(..., description="样品ID")
    templateId: str = Field(..., description="模板ID")
    content: str = Field(..., description="报告内容")
    status: ReportStatusEnum = Field(..., description="报告状态")
    version: int = Field(..., description="版本号")
    generatedBy: str = Field(..., description="生成人ID")
    generatedAt: datetime = Field(..., description="生成时间")
    approvedAt: Optional[datetime] = Field(None, description="审批时间")
    recalledAt: Optional[datetime] = Field(None, description="回收时间")
    recallReason: Optional[str] = Field(None, description="回收原因")
    sample: Optional[SampleInfo] = Field(None, description="样品信息")
    template: Optional[TemplateInfo] = Field(None, description="模板信息")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ReportListResponse(BaseModel):
    """报告列表响应"""
    items: List[ReportResponse] = Field(..., description="报告列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页")
    pageSize: int = Field(..., description="每页数量")
    totalPages: int = Field(..., description="总页数")


class ReportPDFResponse(BaseModel):
    """报告 PDF 响应"""
    reportId: str = Field(..., description="报告ID")
    reportNumber: str = Field(..., description="报告编号")
    filename: str = Field(..., description="文件名")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reportId": "report-123",
                "reportNumber": "REPORT-20260409-0001",
                "filename": "REPORT-20260409-0001.pdf"
            }
        }


class DistributionMethodEnum(str, Enum):
    """分发方式枚举"""
    EMAIL = "EMAIL"
    DOWNLOAD = "DOWNLOAD"
    PRINT = "PRINT"


class DistributionStatusEnum(str, Enum):
    """分发状态枚举"""
    PENDING = "PENDING"
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    FAILED = "FAILED"


class ReportRecall(BaseModel):
    """报告撤回请求"""
    reason: str = Field(..., description="撤回原因", min_length=1, max_length=500)
    
    class Config:
        json_schema_extra = {
            "example": {
                "reason": "报告数据有误，需要重新审核"
            }
        }


class ReportDistribute(BaseModel):
    """报告分发请求"""
    method: DistributionMethodEnum = Field(..., description="分发方式")
    recipient: str = Field(..., description="接收人", min_length=1, max_length=200)
    recipientEmail: Optional[str] = Field(None, description="接收人邮箱")
    
    class Config:
        json_schema_extra = {
            "example": {
                "method": "EMAIL",
                "recipient": "张三",
                "recipientEmail": "zhangsan@example.com"
            }
        }


class DistributionResponse(BaseModel):
    """分发记录响应"""
    id: str = Field(..., description="分发记录ID")
    reportId: str = Field(..., description="报告ID")
    method: DistributionMethodEnum = Field(..., description="分发方式")
    recipient: str = Field(..., description="接收人")
    recipientEmail: Optional[str] = Field(None, description="接收人邮箱")
    status: DistributionStatusEnum = Field(..., description="分发状态")
    sentAt: Optional[datetime] = Field(None, description="发送时间")
    receivedAt: Optional[datetime] = Field(None, description="接收时间")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DistributionQuery(BaseModel):
    """分发历史查询参数"""
    reportId: Optional[str] = Field(None, description="报告ID")
    method: Optional[DistributionMethodEnum] = Field(None, description="分发方式")
    status: Optional[DistributionStatusEnum] = Field(None, description="分发状态")
    startDate: Optional[datetime] = Field(None, description="开始日期")
    endDate: Optional[datetime] = Field(None, description="结束日期")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class DistributionListResponse(BaseModel):
    """分发历史列表响应"""
    items: List[DistributionResponse] = Field(..., description="分发记录列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页")
    pageSize: int = Field(..., description="每页数量")
    totalPages: int = Field(..., description="总页数")
