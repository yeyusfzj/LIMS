"""
审核相关的 Pydantic schemas

此模块定义了审核任务、审核意见模板、审核流程配置和审核历史的请求和响应模型。
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AuditStatus(str, Enum):
    """审核状态枚举"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AuditDecision(str, Enum):
    """审核决策枚举"""
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    RETURN = "RETURN"


class CommentTemplateType(str, Enum):
    """审核意见模板类型枚举"""
    APPROVED = "APPROVED"
    NEED_REVISION = "NEED_REVISION"
    REJECTED = "REJECTED"
    OTHER = "OTHER"


class WorkflowConfigStatus(str, Enum):
    """审核流程配置状态枚举"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


# ============================================
# 审核任务相关 Schemas
# ============================================

class AuditLevelConfig(BaseModel):
    """审核级别配置"""
    level: int = Field(..., description="审核级别")
    name: str = Field(..., description="级别名称")
    auditorIds: List[str] = Field(default_factory=list, description="审核人员 ID 列表")
    autoAssign: bool = Field(default=True, description="是否自动分配")


class AuditConfig(BaseModel):
    """审核配置"""
    levels: List[AuditLevelConfig] = Field(..., description="审核级别配置列表")


class SubmitAuditDto(BaseModel):
    """提交审核请求"""
    sampleId: str = Field(..., description="样品 ID")
    auditConfig: Optional[AuditConfig] = Field(None, description="审核配置")


class PerformAuditDto(BaseModel):
    """执行审核请求"""
    decision: AuditDecision = Field(..., description="审核决策")
    comments: Optional[str] = Field(None, description="审核意见")


class ReassignAuditDto(BaseModel):
    """审核任务转交请求"""
    toAuditorId: str = Field(..., description="目标审核人员 ID")
    reason: str = Field(..., description="转交原因")


class AuditTaskQuery(BaseModel):
    """审核任务查询参数"""
    sampleId: Optional[str] = Field(None, description="样品 ID")
    auditorId: Optional[str] = Field(None, description="审核人员 ID")
    status: Optional[AuditStatus] = Field(None, description="审核状态")
    level: Optional[int] = Field(None, description="审核级别")
    page: int = Field(default=1, ge=1, description="页码")
    pageSize: int = Field(default=20, ge=1, le=100, description="每页数量")


class AuditTaskResponse(BaseModel):
    """审核任务响应"""
    id: str
    sampleId: str
    level: int
    auditorId: str
    status: AuditStatus
    decision: Optional[AuditDecision]
    comments: Optional[str]
    submittedAt: datetime
    completedAt: Optional[datetime]
    sample: Optional[Dict[str, Any]] = None
    task: Optional[Dict[str, Any]] = None  # 添加task字段

    class Config:
        from_attributes = True


class AuditResult(BaseModel):
    """审核结果"""
    taskId: str
    sampleId: str
    level: int
    decision: AuditDecision
    nextLevel: Optional[int] = None
    isComplete: bool
    message: str


class AuditStatistics(BaseModel):
    """审核统计信息"""
    pending: int = Field(..., description="待审核任务数")
    todayCompleted: int = Field(..., description="今日完成数")
    weekCompleted: int = Field(..., description="本周完成数")
    monthCompleted: int = Field(..., description="本月完成数")
    approvalRate: float = Field(..., description="审核通过率")
    averageProcessingTime: float = Field(..., description="平均处理时间（小时）")


# ============================================
# 审核意见模板相关 Schemas
# ============================================

class CreateTemplateDto(BaseModel):
    """创建审核意见模板请求"""
    name: str = Field(..., description="模板名称")
    type: CommentTemplateType = Field(..., description="模板类型")
    content: str = Field(..., description="模板内容")
    isDefault: bool = Field(default=False, description="是否为默认模板")


class UpdateTemplateDto(BaseModel):
    """更新审核意见模板请求"""
    name: Optional[str] = Field(None, description="模板名称")
    type: Optional[CommentTemplateType] = Field(None, description="模板类型")
    content: Optional[str] = Field(None, description="模板内容")
    isDefault: Optional[bool] = Field(None, description="是否为默认模板")


class AuditCommentTemplateResponse(BaseModel):
    """审核意见模板响应"""
    id: str
    name: str
    type: CommentTemplateType
    content: str
    usageCount: int
    isDefault: bool
    createdBy: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ============================================
# 审核流程配置相关 Schemas
# ============================================

class WorkflowLevel(BaseModel):
    """工作流级别配置"""
    order: int = Field(..., description="级别顺序")
    name: str = Field(..., description="级别名称")
    role: str = Field(..., description="审核角色")
    required: bool = Field(default=True, description="是否必需")
    autoAssign: bool = Field(default=True, description="是否自动分配")


class CreateWorkflowConfigDto(BaseModel):
    """创建审核流程配置请求"""
    name: str = Field(..., description="配置名称")
    sampleTypes: List[str] = Field(..., description="适用的样品类型")
    levels: List[WorkflowLevel] = Field(..., description="审核级别配置")
    parallelAudit: bool = Field(default=False, description="是否支持并行审核")


class UpdateWorkflowConfigDto(BaseModel):
    """更新审核流程配置请求"""
    name: Optional[str] = Field(None, description="配置名称")
    sampleTypes: Optional[List[str]] = Field(None, description="适用的样品类型")
    levels: Optional[List[WorkflowLevel]] = Field(None, description="审核级别配置")
    parallelAudit: Optional[bool] = Field(None, description="是否支持并行审核")
    status: Optional[WorkflowConfigStatus] = Field(None, description="配置状态")


class AuditWorkflowConfigResponse(BaseModel):
    """审核流程配置响应"""
    id: str
    name: str
    sampleTypes: List[str]
    levels: List[Dict[str, Any]]
    parallelAudit: bool
    status: WorkflowConfigStatus
    createdBy: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ============================================
# 审核历史相关 Schemas
# ============================================

class AuditHistoryResponse(BaseModel):
    """审核历史响应"""
    id: str
    taskId: str
    action: str
    changes: Dict[str, Any]
    performedBy: str
    performedAt: datetime

    class Config:
        from_attributes = True


# ============================================
# 样品放行相关 Schemas
# ============================================

class ReleaseSampleResponse(BaseModel):
    """样品放行响应"""
    sampleId: str
    barcode: str
    sampleNumber: str
    releasedAt: datetime
    releasedBy: str
    message: str


class BatchReleaseSamplesDto(BaseModel):
    """批量样品放行请求"""
    sampleIds: List[str] = Field(..., description="样品 ID 列表")


class BatchReleaseResult(BaseModel):
    """批量放行结果"""
    sampleId: str
    success: bool
    barcode: Optional[str] = None
    sampleNumber: Optional[str] = None
    releasedAt: Optional[datetime] = None
    error: Optional[str] = None


class BatchReleaseSamplesResponse(BaseModel):
    """批量样品放行响应"""
    total: int
    successful: int
    failed: int
    results: List[BatchReleaseResult]
