"""
质量判定 Pydantic Schemas

此模块定义了质量判定相关的请求和响应模型。
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class JudgmentResult(str, Enum):
    """判定结果枚举"""
    QUALIFIED = "QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"
    PENDING = "PENDING"


class JudgmentRuleType(str, Enum):
    """判定规则类型枚举"""
    RANGE = "RANGE"  # 范围判定
    FORMULA = "FORMULA"  # 公式判定
    LOGIC = "LOGIC"  # 逻辑判定


# ============================================
# 判定规则相关 Schemas
# ============================================

class JudgmentRuleCondition(BaseModel):
    """判定规则条件"""
    type: JudgmentRuleType = Field(..., description="条件类型")
    parameter: Optional[str] = Field(None, description="参数名称（范围判定）")
    minValue: Optional[float] = Field(None, description="最小值（范围判定）")
    maxValue: Optional[float] = Field(None, description="最大值（范围判定）")
    formula: Optional[str] = Field(None, description="公式表达式（公式判定）")
    expectedResult: Optional[float] = Field(None, description="期望结果（公式判定）")
    logicExpression: Optional[str] = Field(None, description="逻辑表达式（逻辑判定）")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "RANGE",
                "parameter": "pH",
                "minValue": 6.5,
                "maxValue": 8.5
            }
        }


class JudgmentRuleCreate(BaseModel):
    """创建判定规则请求"""
    name: str = Field(..., min_length=1, max_length=200, description="规则名称")
    description: Optional[str] = Field(None, max_length=1000, description="规则描述")
    testItemType: str = Field(..., min_length=1, max_length=100, description="检测项类型")
    conditions: List[JudgmentRuleCondition] = Field(..., min_items=1, description="判定条件列表")
    priority: Optional[int] = Field(0, ge=0, description="优先级")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "水质pH值判定规则",
                "description": "检测水质pH值是否在合格范围内",
                "testItemType": "水质检测",
                "conditions": [
                    {
                        "type": "RANGE",
                        "parameter": "pH",
                        "minValue": 6.5,
                        "maxValue": 8.5
                    }
                ],
                "priority": 10
            }
        }


class JudgmentRuleUpdate(BaseModel):
    """更新判定规则请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="规则名称")
    description: Optional[str] = Field(None, max_length=1000, description="规则描述")
    conditions: Optional[List[JudgmentRuleCondition]] = Field(None, min_items=1, description="判定条件列表")
    priority: Optional[int] = Field(None, ge=0, description="优先级")
    isActive: Optional[bool] = Field(None, description="是否启用")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "水质pH值判定规则（更新）",
                "isActive": True
            }
        }


class JudgmentRuleResponse(BaseModel):
    """判定规则响应"""
    id: str = Field(..., description="规则ID")
    name: str = Field(..., description="规则名称")
    description: Optional[str] = Field(None, description="规则描述")
    testItemType: str = Field(..., description="检测项类型")
    conditions: List[Dict[str, Any]] = Field(..., description="判定条件列表")
    priority: int = Field(..., description="优先级")
    isActive: bool = Field(..., description="是否启用")
    createdBy: str = Field(..., description="创建人ID")
    createdAt: datetime = Field(..., description="创建时间")
    updatedAt: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "rule-123",
                "name": "水质pH值判定规则",
                "description": "检测水质pH值是否在合格范围内",
                "testItemType": "水质检测",
                "conditions": [
                    {
                        "type": "RANGE",
                        "parameter": "pH",
                        "minValue": 6.5,
                        "maxValue": 8.5
                    }
                ],
                "priority": 10,
                "isActive": True,
                "createdBy": "user-123",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
        }


class JudgmentRuleQuery(BaseModel):
    """判定规则查询参数"""
    testItemType: Optional[str] = Field(None, description="检测项类型")
    isActive: Optional[bool] = Field(None, description="是否启用")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class JudgmentRuleListResponse(BaseModel):
    """判定规则列表响应"""
    items: List[JudgmentRuleResponse] = Field(..., description="规则列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页数量")


# ============================================
# 质量判定相关 Schemas
# ============================================

class PerformJudgmentRequest(BaseModel):
    """执行质量判定请求"""
    sampleId: str = Field(..., description="样品ID")
    ruleIds: Optional[List[str]] = Field(None, description="指定的规则ID列表（可选）")

    class Config:
        json_schema_extra = {
            "example": {
                "sampleId": "sample-123",
                "ruleIds": ["rule-1", "rule-2"]
            }
        }


class JudgmentBasisDetail(BaseModel):
    """判定依据详情"""
    ruleId: str = Field(..., description="规则ID")
    ruleName: str = Field(..., description="规则名称")
    conditionType: JudgmentRuleType = Field(..., description="条件类型")
    parameter: Optional[str] = Field(None, description="参数名称")
    actualValue: Optional[float] = Field(None, description="实际值")
    expectedRange: Optional[Dict[str, Optional[float]]] = Field(None, description="期望范围")
    formula: Optional[str] = Field(None, description="公式")
    calculatedValue: Optional[float] = Field(None, description="计算值")
    logicExpression: Optional[str] = Field(None, description="逻辑表达式")
    evaluationResult: bool = Field(..., description="评估结果")
    message: str = Field(..., description="评估消息")

    class Config:
        json_schema_extra = {
            "example": {
                "ruleId": "rule-123",
                "ruleName": "pH值范围判定",
                "conditionType": "RANGE",
                "parameter": "pH",
                "actualValue": 7.2,
                "expectedRange": {"min": 6.5, "max": 8.5},
                "evaluationResult": True,
                "message": "参数 pH 的值为 7.2，在合格范围内 [6.5, 8.5]"
            }
        }


class JudgmentResponse(BaseModel):
    """判定结果响应"""
    id: str = Field(..., description="判定ID")
    sampleId: str = Field(..., description="样品ID")
    result: JudgmentResult = Field(..., description="判定结果")
    basis: str = Field(..., description="判定依据（JSON字符串）")
    basisDetails: List[JudgmentBasisDetail] = Field(..., description="判定依据详情")
    isAutomatic: bool = Field(..., description="是否自动判定")
    judgedBy: str = Field(..., description="判定人ID")
    judgedAt: datetime = Field(..., description="判定时间")
    reviewedBy: Optional[str] = Field(None, description="复核人ID")
    reviewedAt: Optional[datetime] = Field(None, description="复核时间")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "judgment-123",
                "sampleId": "sample-123",
                "result": "QUALIFIED",
                "basis": "[{...}]",
                "basisDetails": [
                    {
                        "ruleId": "rule-123",
                        "ruleName": "pH值范围判定",
                        "conditionType": "RANGE",
                        "parameter": "pH",
                        "actualValue": 7.2,
                        "expectedRange": {"min": 6.5, "max": 8.5},
                        "evaluationResult": True,
                        "message": "参数 pH 的值为 7.2，在合格范围内 [6.5, 8.5]"
                    }
                ],
                "isAutomatic": True,
                "judgedBy": "user-123",
                "judgedAt": "2024-01-01T00:00:00Z",
                "reviewedBy": None,
                "reviewedAt": None
            }
        }


class ReviewJudgmentRequest(BaseModel):
    """复核判定结果请求"""
    newResult: JudgmentResult = Field(..., description="新的判定结果")
    reason: str = Field(..., min_length=1, max_length=1000, description="复核原因")

    class Config:
        json_schema_extra = {
            "example": {
                "newResult": "UNQUALIFIED",
                "reason": "经复核，发现检测数据存在异常，判定为不合格"
            }
        }


class BatchJudgmentRequest(BaseModel):
    """批量判定请求"""
    sampleIds: List[str] = Field(..., min_items=1, description="样品ID列表")

    class Config:
        json_schema_extra = {
            "example": {
                "sampleIds": ["sample-1", "sample-2", "sample-3"]
            }
        }


class BatchJudgmentItemResult(BaseModel):
    """批量判定单项结果"""
    sampleId: str = Field(..., description="样品ID")
    success: bool = Field(..., description="是否成功")
    judgment: Optional[JudgmentResponse] = Field(None, description="判定结果")
    error: Optional[str] = Field(None, description="错误信息")


class BatchJudgmentResponse(BaseModel):
    """批量判定响应"""
    total: int = Field(..., description="总数")
    successful: int = Field(..., description="成功数")
    failed: int = Field(..., description="失败数")
    results: List[BatchJudgmentItemResult] = Field(..., description="详细结果")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 3,
                "successful": 2,
                "failed": 1,
                "results": [
                    {
                        "sampleId": "sample-1",
                        "success": True,
                        "judgment": {"id": "judgment-1", "result": "QUALIFIED"}
                    },
                    {
                        "sampleId": "sample-2",
                        "success": False,
                        "error": "样品不存在"
                    }
                ]
            }
        }


# ============================================
# 判定历史相关 Schemas
# ============================================

class JudgmentHistoryResponse(BaseModel):
    """判定历史响应"""
    id: str = Field(..., description="历史记录ID")
    judgmentId: str = Field(..., description="判定ID")
    sampleId: str = Field(..., description="样品ID")
    previousResult: JudgmentResult = Field(..., description="原判定结果")
    newResult: JudgmentResult = Field(..., description="新判定结果")
    changeReason: str = Field(..., description="变更原因")
    changedBy: str = Field(..., description="变更人ID")
    changedAt: datetime = Field(..., description="变更时间")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "history-123",
                "judgmentId": "judgment-123",
                "sampleId": "sample-123",
                "previousResult": "QUALIFIED",
                "newResult": "UNQUALIFIED",
                "changeReason": "经复核，发现检测数据存在异常",
                "changedBy": "user-456",
                "changedAt": "2024-01-02T00:00:00Z"
            }
        }


class JudgmentHistoryQuery(BaseModel):
    """判定历史查询参数"""
    sampleId: Optional[str] = Field(None, description="样品ID")
    judgmentId: Optional[str] = Field(None, description="判定ID")
    page: int = Field(1, ge=1, description="页码")
    pageSize: int = Field(20, ge=1, le=100, description="每页数量")


class JudgmentHistoryListResponse(BaseModel):
    """判定历史列表响应"""
    items: List[JudgmentHistoryResponse] = Field(..., description="历史记录列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    pageSize: int = Field(..., description="每页数量")
