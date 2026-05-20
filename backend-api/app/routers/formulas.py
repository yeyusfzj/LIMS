"""
公式管理路由

实现公式的创建、查询、更新、删除、验证和执行功能
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.formula_service import formula_service
from app.schemas.formula import (
    FormulaCreate,
    FormulaUpdate,
    FormulaQuery,
    FormulaResponse,
    PaginatedFormulaResponse,
    FormulaCalculationInput,
    FormulaCalculationResult,
    FormulaValidationResult,
    FormulaValidateRequest
)
from app.schemas.response import SuccessResponse
from app.core.logging import logger


router = APIRouter(prefix="/api/v1/formulas", tags=["formulas"])


@router.post(
    "",
    response_model=SuccessResponse[FormulaResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建公式",
    description="创建新的计算公式配置"
)
async def create_formula(
    data: FormulaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    创建公式
    
    需求 10.1: 实现公式的创建功能
    """
    formula = await formula_service.create_formula(db, data, current_user.id)
    
    return {
        "message": "公式创建成功",
        "data": formula
    }


@router.get(
    "",
    response_model=SuccessResponse[PaginatedFormulaResponse],
    summary="查询公式列表",
    description="分页查询公式列表，支持按名称、状态等条件筛选"
)
async def list_formulas(
    name: str = None,
    isActive: bool = None,
    createdBy: str = None,
    page: int = 1,
    pageSize: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    查询公式列表
    
    需求 10.1: 实现公式的查询功能
    """
    query = FormulaQuery(
        name=name,
        isActive=isActive,
        createdBy=createdBy,
        page=page,
        pageSize=pageSize
    )
    
    result = await formula_service.list_formulas(db, query)
    
    return {
        "message": "查询成功",
        "data": result
    }


@router.get(
    "/{formula_id}",
    response_model=SuccessResponse[FormulaResponse],
    summary="获取公式详情",
    description="根据ID获取公式详细信息"
)
async def get_formula(
    formula_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取公式详情
    
    需求 10.1: 实现公式的查询功能
    """
    formula = await formula_service.get_formula_by_id(db, formula_id)
    
    return {
        "message": "查询成功",
        "data": formula
    }


@router.put(
    "/{formula_id}",
    response_model=SuccessResponse[FormulaResponse],
    summary="更新公式",
    description="更新公式配置信息"
)
async def update_formula(
    formula_id: str,
    data: FormulaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    更新公式
    
    需求 10.1: 实现公式的更新功能
    """
    formula = await formula_service.update_formula(db, formula_id, data)
    
    return {
        "message": "公式更新成功",
        "data": formula
    }


@router.delete(
    "/{formula_id}",
    status_code=status.HTTP_200_OK,
    summary="删除公式",
    description="删除指定的公式配置"
)
async def delete_formula(
    formula_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    删除公式
    
    需求 10.1: 实现公式的删除功能
    """
    await formula_service.delete_formula(db, formula_id)
    
    return {
        "message": "公式删除成功",
        "data": None
    }


@router.post(
    "/validate",
    response_model=SuccessResponse[FormulaValidationResult],
    summary="验证公式",
    description="验证公式表达式的语法和安全性"
)
async def validate_formula(
    data: FormulaValidateRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    验证公式
    
    需求 10.2: 实现公式语法验证
    """
    result = formula_service.validate_expression(data.expression, data.parameters)
    
    return {
        "message": "验证完成",
        "data": result
    }


@router.post(
    "/{formula_id}/execute",
    response_model=SuccessResponse[FormulaCalculationResult],
    summary="执行公式计算",
    description="使用指定参数执行公式计算"
)
async def execute_formula(
    formula_id: str,
    parameters: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    执行公式计算
    
    需求 10.2: 实现公式执行引擎
    """
    input_data = FormulaCalculationInput(
        formulaId=formula_id,
        parameters=parameters
    )
    
    result = await formula_service.calculate_formula(db, input_data)
    
    if result.success:
        message = "计算成功"
    else:
        message = "计算失败"
    
    return {
        "message": message,
        "data": result
    }
