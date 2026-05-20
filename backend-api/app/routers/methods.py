"""
检测方法路由

处理检测方法相关的 HTTP 请求
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.method import (
    MethodCreate,
    MethodUpdate,
    MethodResponse,
    MethodListResponse,
    CopyMethodRequest
)
from app.schemas.response import SuccessResponse
from app.services.method_service import method_service
from app.core.exceptions import NotFoundException, ValidationException, ConflictException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/methods", tags=["methods"])


@router.post(
    "",
    response_model=SuccessResponse[MethodResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建检测方法",
    description="创建新的检测方法"
)
async def create_method(
    data: MethodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建检测方法
    
    - **code**: 方法编号（唯一）
    - **name**: 方法名称
    - **category**: 方法分类
    - **version**: 版本号
    - **status**: 方法状态（DRAFT/ACTIVE/ARCHIVED）
    - **scope**: 适用范围（可选）
    - **description**: 方法描述（可选）
    - **equipment**: 所需设备列表
    - **steps**: 操作步骤列表
    - **precision**: 精密度（可选）
    - **accuracy**: 准确度（可选）
    - **detectionLimit**: 检出限（可选）
    - **measurementRange**: 测量范围（可选）
    - **qualityControl**: 质量控制要求（可选）
    - **safetyNotes**: 安全注意事项（可选）
    - **operationNotes**: 操作注意事项（可选）
    """
    try:
        method = await method_service.create_method(db, data, current_user.id)
        return SuccessResponse(
            data=method,
            message="检测方法创建成功"
        )
    except ConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Create method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "创建检测方法失败"}
        )


@router.get(
    "",
    response_model=SuccessResponse[MethodListResponse],
    summary="查询检测方法列表",
    description="根据条件查询检测方法列表，支持分页"
)
async def list_methods(
    keyword: Optional[str] = Query(None, description="关键词（搜索编号和名称）"),
    category: Optional[str] = Query(None, description="方法分类"),
    status: Optional[str] = Query(None, description="方法状态"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(10, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询检测方法列表
    
    支持多种筛选条件：
    - 关键词搜索（方法编号、方法名称）
    - 方法分类
    - 方法状态
    """
    try:
        result = await method_service.get_method_list(
            db=db,
            keyword=keyword,
            category=category,
            status=status,
            page=page,
            page_size=pageSize
        )
        return SuccessResponse(data=result)
    except Exception as e:
        logger.error(f"List methods failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "查询检测方法列表失败"}
        )


@router.get(
    "/{id}",
    response_model=SuccessResponse[MethodResponse],
    summary="获取检测方法详情",
    description="根据 ID 获取检测方法详情"
)
async def get_method(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取检测方法详情
    
    - **id**: 方法 ID
    """
    try:
        method = await method_service.get_method_by_id(db, id)
        return SuccessResponse(data=method)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Get method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "获取检测方法详情失败"}
        )


@router.put(
    "/{id}",
    response_model=SuccessResponse[MethodResponse],
    summary="更新检测方法",
    description="更新检测方法信息"
)
async def update_method(
    id: str,
    data: MethodUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新检测方法
    
    - **id**: 方法 ID
    - 可更新所有字段（除了 id、createdBy、createdAt）
    """
    try:
        method = await method_service.update_method(db, id, data)
        return SuccessResponse(
            data=method,
            message="检测方法更新成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ConflictException as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "CONFLICT", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Update method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "更新检测方法失败"}
        )


@router.delete(
    "/{id}",
    response_model=SuccessResponse[None],
    summary="删除检测方法",
    description="删除检测方法"
)
async def delete_method(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除检测方法
    
    - **id**: 方法 ID
    """
    try:
        await method_service.delete_method(db, id)
        return SuccessResponse(
            data=None,
            message="检测方法删除成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Delete method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "删除检测方法失败"}
        )


@router.get(
    "/{id}/history",
    response_model=SuccessResponse[list[MethodResponse]],
    summary="获取检测方法版本历史",
    description="获取同一方法编号的所有版本历史"
)
async def get_method_history(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取检测方法版本历史
    
    - **id**: 方法 ID
    
    返回同一方法编号的所有版本，按创建时间倒序排列
    """
    try:
        history = await method_service.get_method_history(db, id)
        return SuccessResponse(data=history)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Get method history failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "获取版本历史失败"}
        )


@router.post(
    "/{id}/copy",
    response_model=SuccessResponse[MethodResponse],
    status_code=status.HTTP_201_CREATED,
    summary="复制检测方法",
    description="复制检测方法创建新版本"
)
async def copy_method(
    id: str,
    data: CopyMethodRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    复制检测方法
    
    - **id**: 原方法 ID
    - **version**: 新版本号
    
    复制原方法的所有信息，使用新版本号，状态设置为 DRAFT
    """
    try:
        method = await method_service.copy_method(
            db, id, data.version, current_user.id
        )
        return SuccessResponse(
            data=method,
            message="检测方法复制成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Copy method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "复制检测方法失败"}
        )


@router.post(
    "/{id}/archive",
    response_model=SuccessResponse[None],
    summary="归档检测方法",
    description="将检测方法状态设置为归档"
)
async def archive_method(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    归档检测方法
    
    - **id**: 方法 ID
    
    将方法状态设置为 ARCHIVED
    """
    try:
        await method_service.archive_method(db, id)
        return SuccessResponse(
            data=None,
            message="检测方法归档成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Archive method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "归档检测方法失败"}
        )


@router.post(
    "/{id}/activate",
    response_model=SuccessResponse[None],
    summary="激活检测方法",
    description="将检测方法状态设置为激活"
)
async def activate_method(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    激活检测方法
    
    - **id**: 方法 ID
    
    将方法状态设置为 ACTIVE
    """
    try:
        await method_service.activate_method(db, id)
        return SuccessResponse(
            data=None,
            message="检测方法激活成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Activate method failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "激活检测方法失败"}
        )
