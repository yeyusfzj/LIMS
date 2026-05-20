"""
报告管理路由
"""

from fastapi import APIRouter, Depends, Response, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from io import BytesIO

from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.security import JWTPayload
from app.models.user import User
from app.services.report_service import report_service
from app.services.distribution_service import distribution_service
from app.schemas.report import (
    ReportGenerate,
    ReportGenerationResult,
    ReportUpdate,
    ReportQuery,
    ReportListResponse,
    ReportResponse,
    ReportPDFResponse,
    ReportRecall,
    ReportDistribute,
    DistributionQuery,
    DistributionListResponse
)
from app.core.logging import logger


router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.post("/generate", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def generate_report(
    data: ReportGenerate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    生成报告
    
    - **sampleId**: 样品ID
    - **templateId**: 模板ID
    - **preview**: 是否预览模式（预览模式不创建报告记录）
    """
    try:
        result = await report_service.generate_report(db, data, current_user.user_id)
        
        await db.commit()
        
        return {
            "message": "报告预览生成成功" if result.preview else "报告生成成功",
            "data": result.model_dump()
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "生成报告失败",
            extra={"error": str(e), "user_id": current_user.user_id, "data": data.model_dump()}
        )
        raise


@router.get("", response_model=Dict[str, Any])
async def list_reports(
    sampleId: str = None,
    status: str = None,
    startDate: str = None,
    endDate: str = None,
    search: str = None,
    page: int = 1,
    pageSize: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询报告列表
    
    - **sampleId**: 样品ID（可选）
    - **status**: 报告状态（可选）
    - **startDate**: 开始日期（可选）
    - **endDate**: 结束日期（可选）
    - **search**: 搜索关键词（报告编号）（可选）
    - **page**: 页码（默认1
    - **pageSize**: 每页数量（默认20
    """
    try:
        from datetime import datetime
        
        # 构建查询参数
        query = ReportQuery(
            sampleId=sampleId,
            status=status,
            startDate=datetime.fromisoformat(startDate) if startDate else None,
            endDate=datetime.fromisoformat(endDate) if endDate else None,
            search=search,
            page=page,
            pageSize=pageSize
        )
        
        result = await report_service.list_reports(db, query)
        
        return {
            "message": "查询成功",
            "data": result.model_dump()
        }
    except Exception as e:
        logger.error(
            "查询报告列表失败",
            extra={"error": str(e), "user_id": current_user.user_id}
        )
        raise


@router.get("/{report_id}", response_model=Dict[str, Any])
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    获取报告详情
    
    - **report_id**: 报告ID
    """
    try:
        report = await report_service.get_report(db, report_id)
        
        return {
            "message": "查询成功",
            "data": ReportResponse.model_validate(report).model_dump()
        }
    except Exception as e:
        logger.error(
            "获取报告详情失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.put("/{report_id}", response_model=Dict[str, Any])
async def update_report(
    report_id: str,
    data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    更新报告
    
    - **report_id**: 报告ID
    - **content**: 报告内容
    """
    try:
        report = await report_service.update_report(db, report_id, data, current_user.user_id)
        
        await db.commit()
        
        return {
            "message": "报告更新成功",
            "data": ReportResponse.model_validate(report).model_dump()
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "更新报告失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    删除报告
    
    - **report_id**: 报告ID
    
    注意：只能删除草稿状态的报告
    """
    try:
        await report_service.delete_report(db, report_id, current_user.user_id)
        
        await db.commit()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        await db.rollback()
        logger.error(
            "删除报告失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.get("/{report_id}/pdf")
async def export_report_pdf(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    导出报告为PDF
    
    - **report_id**: 报告ID
    
    返回 PDF 文件名
    """
    try:
        # 获取报告信息
        report = await report_service.get_report(db, report_id)
        
        # 生成 PDF
        pdf_bytes = await report_service.export_report_pdf(db, report_id)
        
        # 创建文件名
        filename = f"{report.report_number}.pdf"
        
        # 返回 PDF 文件名
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except Exception as e:
        logger.error(
            "导出报告 PDF 失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.get("/distributions/history", response_model=Dict[str, Any])
async def get_distribution_history(
    reportId: Optional[str] = Query(None, description="报告ID"),
    method: Optional[str] = Query(None, description="分发方式"),
    status: Optional[str] = Query(None, description="分发状态"),
    startDate: Optional[str] = Query(None, description="开始日期"),
    endDate: Optional[str] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询分发历史
    
    - **reportId**: 报告ID（可选）
    - **method**: 分发方式（可选）
    - **status**: 分发状态（可选）
    - **startDate**: 开始日期（可选）
    - **endDate**: 结束日期（可选）
    - **page**: 页码（默认1
    - **pageSize**: 每页数量（默认20
    """
    try:
        from datetime import datetime
        
        # 构建查询参数
        query = DistributionQuery(
            reportId=reportId,
            method=method,
            status=status,
            startDate=datetime.fromisoformat(startDate) if startDate else None,
            endDate=datetime.fromisoformat(endDate) if endDate else None,
            page=page,
            pageSize=pageSize
        )
        
        result = await distribution_service.get_distribution_history(db, query)
        
        return {
            "data": [item.model_dump() for item in result.items],
            "pagination": {
                "total": result.total,
                "page": result.page,
                "pageSize": result.pageSize,
                "totalPages": result.totalPages
            }
        }
    except Exception as e:
        logger.error(
            "查询分发历史失败",
            extra={"error": str(e), "user_id": current_user.user_id}
        )
        raise


@router.post("/{report_id}/recall", response_model=Dict[str, Any])
async def recall_report(
    report_id: str,
    data: ReportRecall,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    撤回报告
    
    - **report_id**: 报告ID
    - **reason**: 撤回原因
    
    注意：只能撤回已签名或已分发的报告
    """
    try:
        report = await report_service.recall_report(
            db,
            report_id,
            data.reason,
            current_user.user_id
        )
        
        await db.commit()
        
        return {
            "message": "报告撤回成功",
            "data": ReportResponse.model_validate(report).model_dump()
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "撤回报告失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.post("/{report_id}/distribute", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def distribute_report(
    report_id: str,
    data: ReportDistribute,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    分发报告
    
    - **report_id**: 报告ID
    - **method**: 分发方式（EMAIL/DOWNLOAD/PRINT)
    - **recipient**: 接收人
    - **recipientEmail**: 接收人邮箱（邮件分发时必填）
    
    注意：只能分发已签名的报告
    """
    try:
        result = await distribution_service.distribute_report(
            db,
            report_id,
            data,
            current_user.user_id
        )
        
        await db.commit()
        
        return {
            "message": "报告分发成功",
            "data": result
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "分发报告失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.get("/{report_id}/distributions", response_model=Dict[str, Any])
async def get_report_distributions(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询报告的分发记录
    
    - **report_id**: 报告ID
    
    返回该报告的所有分发记录
    """
    try:
        distributions = await distribution_service.get_report_distributions(
            db,
            report_id
        )
        
        return {
            "data": [d.model_dump() for d in distributions]
        }
    except Exception as e:
        logger.error(
            "查询报告分发记录失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


@router.get("/{report_id}/distribution-history", response_model=Dict[str, Any])
async def get_report_distribution_history(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询报告的分发历史（别名端点)
    
    - **report_id**: 报告ID
    
    返回该报告的所有分发记录
    """
    try:
        distributions = await distribution_service.get_report_distributions(
            db,
            report_id
        )
        
        return {
            "data": [d.model_dump() for d in distributions]
        }
    except Exception as e:
        logger.error(
            "查询报告分发历史失败",
            extra={"error": str(e), "report_id": report_id, "user_id": current_user.user_id}
        )
        raise


