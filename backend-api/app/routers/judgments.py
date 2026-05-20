"""
质量判定路由

此模块定义了质量判定相关的 API 端点。
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.judgment_service import judgment_service
from app.schemas.judgment import (
    JudgmentRuleCreate,
    JudgmentRuleUpdate,
    JudgmentRuleResponse,
    JudgmentRuleQuery,
    JudgmentRuleListResponse,
    PerformJudgmentRequest,
    JudgmentResponse,
    ReviewJudgmentRequest,
    BatchJudgmentRequest,
    BatchJudgmentResponse,
    JudgmentHistoryQuery,
    JudgmentHistoryListResponse
)
from app.schemas.response import SuccessResponse
from app.core.permissions import PermissionChecker

router = APIRouter(prefix="/api/v1", tags=["质量判定"])


# ============================================
# 判定规则管理
# ============================================

@router.post(
    "/judgment-rules",
    response_model=SuccessResponse[JudgmentRuleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建判定规则",
    description="创建新的质量判定规则"
)
async def create_judgment_rule(
    data: JudgmentRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "create"))
):
    """
    创建判定规则
    
    - **name**: 规则名称
    - **description**: 规则描述（可选）
    - **testItemType**: 检测项类型
    - **conditions**: 判定条件列表
    - **priority**: 优先级（可选，默认为0）
    """
    rule = await judgment_service.create_judgment_rule(
        db, data, current_user.id
    )
    return SuccessResponse(
        message="创建判定规则成功",
        data=rule
    )


@router.put(
    "/judgment-rules/{rule_id}",
    response_model=SuccessResponse[JudgmentRuleResponse],
    summary="更新判定规则",
    description="更新指定的质量判定规则"
)
async def update_judgment_rule(
    rule_id: str,
    data: JudgmentRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "update"))
):
    """
    更新判定规则
    
    - **rule_id**: 规则ID
    - **name**: 规则名称（可选）
    - **description**: 规则描述（可选）
    - **conditions**: 判定条件列表（可选）
    - **priority**: 优先级（可选）
    - **isActive**: 是否启用（可选）
    """
    rule = await judgment_service.update_judgment_rule(db, rule_id, data)
    return SuccessResponse(
        message="更新判定规则成功",
        data=rule
    )


@router.get(
    "/judgment-rules",
    response_model=SuccessResponse[JudgmentRuleListResponse],
    summary="查询判定规则列表",
    description="查询质量判定规则列表，支持分页和筛选"
)
async def list_judgment_rules(
    testItemType: Optional[str] = None,
    isActive: Optional[bool] = None,
    page: int = 1,
    pageSize: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "read"))
):
    """
    查询判定规则列表
    
    - **testItemType**: 检测项类型（可选）
    - **isActive**: 是否启用（可选）
    - **page**: 页码（默认为1）
    - **pageSize**: 每页数量（默认为20）
    """
    query = JudgmentRuleQuery(
        testItemType=testItemType,
        isActive=isActive,
        page=page,
        pageSize=pageSize
    )
    result = await judgment_service.list_judgment_rules(db, query)
    return SuccessResponse(
        message="查询成功",
        data=result
    )


@router.get(
    "/judgment-rules/{rule_id}",
    response_model=SuccessResponse[JudgmentRuleResponse],
    summary="获取判定规则详情",
    description="获取指定判定规则的详细信息"
)
async def get_judgment_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "read"))
):
    """
    获取判定规则详情
    
    - **rule_id**: 规则ID
    """
    rule = await judgment_service.get_judgment_rule(db, rule_id)
    return SuccessResponse(
        message="查询成功",
        data=rule
    )


@router.delete(
    "/judgment-rules/{rule_id}",
    response_model=SuccessResponse[None],
    summary="删除判定规则",
    description="删除指定的质量判定规则"
)
async def delete_judgment_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "delete"))
):
    """
    删除判定规则
    
    - **rule_id**: 规则ID
    """
    await judgment_service.delete_judgment_rule(db, rule_id)
    return SuccessResponse(
        message="删除判定规则成功",
        data=None
    )


# ============================================
# 质量判定
# ============================================

@router.post(
    "/judgments/auto",
    response_model=SuccessResponse[JudgmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="自动质量判定",
    description="对指定样品执行自动质量判定"
)
async def perform_auto_judgment(
    data: PerformJudgmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "create"))
):
    """
    自动质量判定
    
    - **sampleId**: 样品ID
    - **ruleIds**: 指定的规则ID列表（可选，不指定则自动匹配规则）
    """
    judgment = await judgment_service.perform_quality_judgment(
        db, data.sampleId, data.ruleIds, current_user.id
    )
    return SuccessResponse(
        message="质量判定完成",
        data=judgment
    )


@router.post(
    "/judgments/manual",
    response_model=SuccessResponse[JudgmentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="手动质量判定",
    description="手动执行质量判定（与自动判定使用相同的逻辑）"
)
async def perform_manual_judgment(
    data: PerformJudgmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "create"))
):
    """
    手动质量判定
    
    - **sampleId**: 样品ID
    - **ruleIds**: 指定的规则ID列表（可选，不指定则自动匹配规则）
    
    注意：手动判定与自动判定使用相同的判定逻辑，区别在于触发方式
    """
    judgment = await judgment_service.perform_quality_judgment(
        db, data.sampleId, data.ruleIds, current_user.id
    )
    return SuccessResponse(
        message="质量判定完成",
        data=judgment
    )


@router.get(
    "/samples/{sample_id}/judgment",
    response_model=SuccessResponse[JudgmentResponse],
    summary="获取样品判定结果",
    description="获取指定样品的质量判定结果"
)
async def get_sample_judgment(
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "read"))
):
    """
    获取样品判定结果
    
    - **sample_id**: 样品ID
    """
    judgment = await judgment_service.get_judgment(db, sample_id)
    
    if not judgment:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(message="未找到判定结果")
    
    return SuccessResponse(
        message="查询成功",
        data=judgment
    )


@router.post(
    "/judgments/{judgment_id}/review",
    response_model=SuccessResponse[JudgmentResponse],
    summary="复核判定结果",
    description="人工复核并修改质量判定结果"
)
async def review_judgment(
    judgment_id: str,
    data: ReviewJudgmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "update"))
):
    """
    复核判定结果
    
    - **judgment_id**: 判定ID
    - **newResult**: 新的判定结果
    - **reason**: 复核原因
    """
    judgment = await judgment_service.review_judgment(
        db, judgment_id, data, current_user.id
    )
    return SuccessResponse(
        message="判定结果复核完成",
        data=judgment
    )


@router.post(
    "/judgments/batch",
    response_model=SuccessResponse[BatchJudgmentResponse],
    summary="批量判定",
    description="对多个样品执行批量质量判定"
)
async def batch_judgment(
    data: BatchJudgmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "create"))
):
    """
    批量判定
    
    - **sampleIds**: 样品ID列表
    """
    result = await judgment_service.batch_judgment(
        db, data.sampleIds, current_user.id
    )
    return SuccessResponse(
        message="批量判定完成",
        data=result
    )


# ============================================
# 判定历史
# ============================================

@router.get(
    "/judgment-history",
    response_model=SuccessResponse[JudgmentHistoryListResponse],
    summary="查询判定历史",
    description="查询质量判定的变更历史记录"
)
async def list_judgment_history(
    sampleId: Optional[str] = None,
    judgmentId: Optional[str] = None,
    page: int = 1,
    pageSize: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("judgment", "read"))
):
    """
    查询判定历史
    
    - **sampleId**: 样品ID（可选）
    - **judgmentId**: 判定ID（可选）
    - **page**: 页码（默认为1）
    - **pageSize**: 每页数量（默认为20）
    """
    query = JudgmentHistoryQuery(
        sampleId=sampleId,
        judgmentId=judgmentId,
        page=page,
        pageSize=pageSize
    )
    result = await judgment_service.list_judgment_history(db, query)
    return SuccessResponse(
        message="查询成功",
        data=result
    )
