"""
审核路由

实现审核任务的创建、查询、执行和统计的 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.audit_service import audit_service
from app.schemas.audit import (
    SubmitAuditDto, PerformAuditDto, ReassignAuditDto, AuditTaskQuery,
    AuditTaskResponse, AuditResult, AuditStatistics,
    CreateTemplateDto, UpdateTemplateDto, AuditCommentTemplateResponse,
    CreateWorkflowConfigDto, UpdateWorkflowConfigDto, AuditWorkflowConfigResponse,
    AuditHistoryResponse, ReleaseSampleResponse, BatchReleaseSamplesDto,
    BatchReleaseSamplesResponse, AuditStatus
)
from app.schemas.response import APIResponse, PaginatedResponse
from app.core.exceptions import APIException
from app.core.logging import logger


router = APIRouter(prefix="/api/v1/audits", tags=["审核管理"])


# ============================================
# 审核任务相关路由
# 注意：具体路径的路由必须在通配符路由 /{task_id} 之前定义
# ============================================

@router.post("", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def submit_for_audit(
    dto: SubmitAuditDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    提交样品审核
    
    根据配置创建多级审核任务
    """
    try:
        tasks = await audit_service.submit_for_audit(db, dto)
        return APIResponse(
            message="提交审核成功",
            data=tasks
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"提交审核失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="提交审核失败"
        )


@router.get("", response_model=APIResponse)
async def list_audit_tasks(
    sampleId: Optional[str] = Query(None, description="样品 ID"),
    auditorId: Optional[str] = Query(None, description="审核人员 ID"),
    status_param: Optional[AuditStatus] = Query(None, alias="status", description="审核状态"),
    level: Optional[int] = Query(None, description="审核级别"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询审核任务列表
    
    支持按样品、审核人员、状态、级别等条件筛选
    """
    try:
        query = AuditTaskQuery(
            sampleId=sampleId,
            auditorId=auditorId,
            status=status_param,
            level=level,
            page=page,
            pageSize=pageSize
        )
        result = await audit_service.list_audit_tasks(db, query)
        return APIResponse(
            message="查询成功",
            data=result
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"查询审核任务失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="查询审核任务失败"
        )


# ============================================
# 具体路径路由 - 必须在 /{task_id} 之前
# ============================================

@router.get("/statistics", response_model=APIResponse)
async def get_audit_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核统计信息
    
    包括待审核任务数、完成数、通过率、平均处理时间等
    """
    try:
        statistics = await audit_service.get_audit_statistics(db)
        return APIResponse(
            message="获取统计信息成功",
            data=statistics
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核统计信息失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核统计信息失败"
        )


@router.get("/export", response_class=FileResponse)
async def export_audit_tasks(
    sampleId: Optional[str] = Query(None, description="样品 ID"),
    auditorId: Optional[str] = Query(None, description="审核人员 ID"),
    status_param: Optional[AuditStatus] = Query(None, alias="status", description="审核状态"),
    level: Optional[int] = Query(None, description="审核级别"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    导出审核数据为 Excel 格式
    
    支持按样品、审核人员、状态、级别等条件筛选导出
    """
    try:
        query = AuditTaskQuery(
            sampleId=sampleId,
            auditorId=auditorId,
            status=status_param,
            level=level,
            page=1,
            pageSize=10000  # 导出时不限制数量
        )
        
        file_path = await audit_service.export_audit_tasks(db, query)
        
        # 返回文件
        import os
        filename = os.path.basename(file_path)
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"导出审核数据失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="导出审核数据失败"
        )


# ============================================
# 审核意见模板相关路由
# ============================================

@router.get("/templates", response_model=APIResponse)
async def list_templates(
    type: Optional[str] = Query(None, description="模板类型"),
    isDefault: Optional[bool] = Query(None, description="是否为默认模板"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核意见模板列表
    """
    try:
        templates = await audit_service.list_templates(db, type, isDefault)
        return APIResponse(
            message="获取审核意见模板列表成功",
            data=templates
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核意见模板列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核意见模板列表失败"
        )


@router.post("/templates", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    dto: CreateTemplateDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建审核意见模板
    """
    try:
        template = await audit_service.create_template(db, dto, current_user.user_id)
        return APIResponse(
            message="创建审核意见模板成功",
            data=template
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"创建审核意见模板失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建审核意见模板失败"
        )


@router.get("/templates/{template_id}", response_model=APIResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取单个审核意见模板
    """
    try:
        template = await audit_service.get_template_by_id(db, template_id)
        return APIResponse(
            message="获取审核意见模板成功",
            data=template
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核意见模板失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核意见模板失败"
        )


@router.put("/templates/{template_id}", response_model=APIResponse)
async def update_template(
    template_id: str,
    dto: UpdateTemplateDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新审核意见模板
    """
    try:
        template = await audit_service.update_template(db, template_id, dto)
        return APIResponse(
            message="更新审核意见模板成功",
            data=template
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"更新审核意见模板失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新审核意见模板失败"
        )


@router.delete("/templates/{template_id}", response_model=APIResponse)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除审核意见模板
    """
    try:
        await audit_service.delete_template(db, template_id)
        return APIResponse(
            message="删除审核意见模板成功"
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"删除审核意见模板失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除审核意见模板失败"
        )


# ============================================
# 审核流程配置相关路由
# ============================================

@router.get("/workflow-configs", response_model=APIResponse)
async def list_workflow_configs(
    status_param: Optional[str] = Query(None, alias="status", description="配置状态"),
    sampleType: Optional[str] = Query(None, description="样品类型"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核流程配置列表
    """
    try:
        configs = await audit_service.list_workflow_configs(db, status_param, sampleType)
        return APIResponse(
            message="获取审核流程配置列表成功",
            data=configs
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核流程配置列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核流程配置列表失败"
        )


@router.post("/workflow-configs", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_config(
    dto: CreateWorkflowConfigDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建审核流程配置
    """
    try:
        config = await audit_service.create_workflow_config(db, dto, current_user.user_id)
        return APIResponse(
            message="创建审核流程配置成功",
            data=config
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"创建审核流程配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建审核流程配置失败"
        )


@router.get("/workflow-configs/{config_id}", response_model=APIResponse)
async def get_workflow_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取单个审核流程配置
    """
    try:
        config = await audit_service.get_workflow_config_by_id(db, config_id)
        return APIResponse(
            message="获取审核流程配置成功",
            data=config
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核流程配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核流程配置失败"
        )


@router.put("/workflow-configs/{config_id}", response_model=APIResponse)
async def update_workflow_config(
    config_id: str,
    dto: UpdateWorkflowConfigDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新审核流程配置
    """
    try:
        config = await audit_service.update_workflow_config(db, config_id, dto)
        return APIResponse(
            message="更新审核流程配置成功",
            data=config
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"更新审核流程配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新审核流程配置失败"
        )


@router.delete("/workflow-configs/{config_id}", response_model=APIResponse)
async def delete_workflow_config(
    config_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除审核流程配置
    """
    try:
        await audit_service.delete_workflow_config(db, config_id)
        return APIResponse(
            message="删除审核流程配置成功"
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"删除审核流程配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除审核流程配置失败"
        )


# ============================================
# 样品放行相关路由
# ============================================

@router.post("/samples/batch-release", response_model=APIResponse)
async def batch_release_samples(
    dto: BatchReleaseSamplesDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    批量样品放行
    
    批量验证放行条件并执行放行操作
    """
    try:
        result = await audit_service.batch_release_samples(
            db,
            dto.sampleIds,
            current_user.user_id
        )
        return APIResponse(
            message="批量放行完成",
            data=result
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"批量样品放行失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="批量样品放行失败"
        )


@router.post("/samples/{sample_id}/release", response_model=APIResponse)
async def release_sample(
    sample_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    样品放行
    
    验证放行条件并执行放行操作
    """
    try:
        result = await audit_service.release_sample(db, sample_id, current_user.user_id)
        return APIResponse(
            message="样品放行成功",
            data=result
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"样品放行失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="样品放行失败"
        )


# ============================================
# 通配符路由 - 必须放在最后
# ============================================

@router.get("/{task_id}", response_model=APIResponse)
async def get_audit_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核任务详情
    """
    try:
        task = await audit_service.get_audit_task(db, task_id)
        return APIResponse(
            message="查询成功",
            data=task
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核任务详情失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核任务详情失败"
        )


@router.post("/{task_id}/execute", response_model=APIResponse)
async def execute_audit(
    task_id: str,
    dto: PerformAuditDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    执行审核
    
    处理审核决策并触发下一级审核
    """
    try:
        result = await audit_service.perform_audit(
            db,
            task_id,
            dto,
            current_user.user_id
        )
        return APIResponse(
            message="审核完成",
            data=result
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"执行审核失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="执行审核失败"
        )


@router.post("/{task_id}/reassign", response_model=APIResponse)
async def reassign_audit_task(
    task_id: str,
    dto: ReassignAuditDto,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    审核任务转交
    
    重新分配审核任务给其他审核人员
    """
    try:
        task = await audit_service.reassign_audit_task(
            db,
            task_id,
            current_user.user_id,
            dto
        )
        return APIResponse(
            message="审核任务转交成功",
            data=task
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"审核任务转交失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="审核任务转交失败"
        )


@router.get("/{task_id}/history", response_model=APIResponse)
async def get_audit_history(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核任务历史记录
    """
    try:
        history = await audit_service.get_audit_history(db, task_id)
        return APIResponse(
            message="获取审核历史记录成功",
            data=history
        )
    except APIException as e:
        raise e
    except Exception as e:
        logger.error(f"获取审核历史记录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取审核历史记录失败"
        )
