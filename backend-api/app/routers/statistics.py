"""
统计分析路由

提供综合统计、审核统计、工作量统计和质量统计的 API 端点
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.statistics_service import StatisticsService
from app.services.export_service import ExportService, ExportFormat
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/statistics", tags=["statistics"])


@router.get("/overview")
async def get_overview_statistics(
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    use_cache: bool = Query(True, description="是否使用缓存"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取综合统计数据
    
    包括样品数量、任务数量、报告数量等统计信息
    """
    try:
        statistics = await StatisticsService.get_overview_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
            use_cache=use_cache
        )
        
        return {
            "message": "获取综合统计成功",
            "data": statistics
        }
    except Exception as e:
        logger.error(f"Failed to get overview statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取综合统计失败"
            }
        )


@router.get("/audit")
async def get_audit_statistics(
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    auditor_id: Optional[str] = Query(None, description="审核人员ID"),
    level: Optional[int] = Query(None, ge=1, le=3, description="审核级别（1-3）"),
    use_cache: bool = Query(True, description="是否使用缓存"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取审核统计数据
    
    包括审核通过率、审核时长、问题分布等统计信息
    """
    try:
        statistics = await StatisticsService.get_audit_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
            auditor_id=auditor_id,
            level=level,
            use_cache=use_cache
        )
        
        return {
            "message": "获取审核统计成功",
            "data": statistics
        }
    except Exception as e:
        logger.error(f"Failed to get audit statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取审核统计失败"
            }
        )


@router.get("/workload")
async def get_workload_statistics(
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    user_id: Optional[str] = Query(None, description="用户ID"),
    use_cache: bool = Query(True, description="是否使用缓存"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取工作量统计数据
    
    包括人员工作量、任务完成率等统计信息
    """
    try:
        statistics = await StatisticsService.get_workload_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
            user_id=user_id,
            use_cache=use_cache
        )
        
        return {
            "message": "获取工作量统计成功",
            "data": statistics
        }
    except Exception as e:
        logger.error(f"Failed to get workload statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取工作量统计失败"
            }
        )


@router.get("/quality")
async def get_quality_statistics(
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    sample_type: Optional[str] = Query(None, description="样品类型"),
    use_cache: bool = Query(True, description="是否使用缓存"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取质量统计数据
    
    包括合格率、异常率等统计信息
    """
    try:
        statistics = await StatisticsService.get_quality_statistics(
            db=db,
            start_date=start_date,
            end_date=end_date,
            sample_type=sample_type,
            use_cache=use_cache
        )
        
        return {
            "message": "获取质量统计成功",
            "data": statistics
        }
    except Exception as e:
        logger.error(f"Failed to get quality statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取质量统计失败"
            }
        )


@router.delete("/cache")
async def clear_statistics_cache(
    pattern: Optional[str] = Query(None, description="缓存键模式"),
    current_user: User = Depends(get_current_user)
):
    """
    清除统计缓存
    
    需要管理员权限
    """
    try:
        # TODO: 添加权限检查，确保只有管理员可以清除缓存
        
        count = await StatisticsService.clear_cache(pattern)
        
        return {
            "message": f"成功清除 {count} 个缓存条目",
            "data": {
                "count": count
            }
        }
    except Exception as e:
        logger.error(f"Failed to clear statistics cache: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "清除缓存失败"
            }
        )



@router.get("/charts/{chart_type}")
async def get_chart_data(
    chart_type: str,
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    granularity: str = Query("day", description="时间粒度：day, week, month, year"),
    sample_type: Optional[str] = Query(None, description="样品类型过滤"),
    use_cache: bool = Query(True, description="是否使用缓存"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取图表数据
    
    支持的图表类型：
    - trend: 样品数量趋势图（折线图）
    - type_distribution: 样品类型分布图（饼图）
    - status_distribution: 样品状态分布图（柱状图）
    - quality_rate: 合格率趋势图（折线图）
    
    返回 ECharts 兼容的数据格式
    """
    try:
        # 验证图表类型
        valid_types = ["trend", "type_distribution", "status_distribution", "quality_rate"]
        if chart_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_PARAMETER",
                    "message": f"不支持的图表类型: {chart_type}，支持的类型: {', '.join(valid_types)}"
                }
            )
        
        # 验证时间粒度
        valid_granularities = ["day", "week", "month", "year"]
        if granularity not in valid_granularities:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_PARAMETER",
                    "message": f"不支持的时间粒度: {granularity}，支持的粒度: {', '.join(valid_granularities)}"
                }
            )
        
        # 获取图表数据
        chart_data = await StatisticsService.format_chart_data(
            db=db,
            chart_type=chart_type,
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            sample_type=sample_type,
            use_cache=use_cache
        )
        
        return {
            "message": "获取图表数据成功",
            "data": chart_data
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid chart parameter: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_PARAMETER",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Failed to get chart data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取图表数据失败"
            }
        )


@router.post("/export")
async def export_statistics(
    format: str = Query("excel", description="导出格式：excel 或 csv"),
    start_date: Optional[datetime] = Query(None, description="开始日期（ISO 8601格式）"),
    end_date: Optional[datetime] = Query(None, description="结束日期（ISO 8601格式）"),
    stat_type: str = Query("overview", description="统计类型：overview, audit, workload, quality"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    导出统计数据
    
    支持导出为 Excel 或 CSV 格式
    """
    try:
        # 根据统计类型获取数据
        if stat_type == "overview":
            statistics = await StatisticsService.get_overview_statistics(
                db=db,
                start_date=start_date,
                end_date=end_date,
                use_cache=False
            )
            data = [statistics]
            
        elif stat_type == "audit":
            statistics = await StatisticsService.get_audit_statistics(
                db=db,
                start_date=start_date,
                end_date=end_date,
                use_cache=False
            )
            data = [statistics]
            
        elif stat_type == "workload":
            statistics = await StatisticsService.get_workload_statistics(
                db=db,
                start_date=start_date,
                end_date=end_date,
                use_cache=False
            )
            data = [statistics]
            
        elif stat_type == "quality":
            statistics = await StatisticsService.get_quality_statistics(
                db=db,
                start_date=start_date,
                end_date=end_date,
                use_cache=False
            )
            data = [statistics]
            
        else:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_PARAMETER",
                    "message": f"不支持的统计类型: {stat_type}"
                }
            )
        
        # 创建导出任务
        export_format = ExportFormat.EXCEL if format.lower() == "excel" else ExportFormat.CSV
        task = await ExportService.create_export_task(
            format=export_format,
            data=data,
            filename=f"{stat_type}_statistics_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        )
        
        return {
            "message": "导出任务已创建",
            "data": task.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "导出统计数据失败"
            }
        )
