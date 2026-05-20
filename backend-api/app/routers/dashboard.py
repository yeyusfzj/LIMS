"""
Dashboard API 路由
提供仪表盘统计数据和待办事项
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.sample import Sample
from app.models.task import Task
from app.models.result import Result
from app.schemas.response import SuccessResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=SuccessResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    获取仪表盘统计数据
    
    返回:
    - totalSamples: 样品总数
    - totalSamplesTrend: 样品总数趋势（与上周对比）
    - pendingTasks: 待处理任务数
    - pendingTasksTrend: 待处理任务趋势
    - qualityRate: 合格率
    - qualityRateTrend: 合格率趋势
    - abnormalSamples: 异常样品数
    - abnormalSamplesTrend: 异常样品趋势
    """
    try:
        # 计算时间范围
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        
        # 1. 样品总数（所有样品）
        total_samples_query = select(func.count(Sample.id))
        total_samples_result = await db.execute(total_samples_query)
        total_samples = total_samples_result.scalar() or 0
        
        # 本周新增样品数
        this_week_samples_query = select(func.count(Sample.id)).where(
            Sample.created_at >= week_ago
        )
        this_week_samples_result = await db.execute(this_week_samples_query)
        this_week_samples = this_week_samples_result.scalar() or 0
        
        # 上周新增样品数
        last_week_samples_query = select(func.count(Sample.id)).where(
            and_(
                Sample.created_at >= two_weeks_ago,
                Sample.created_at < week_ago
            )
        )
        last_week_samples_result = await db.execute(last_week_samples_query)
        last_week_samples = last_week_samples_result.scalar() or 0
        
        # 计算趋势（基于新增样品）
        if last_week_samples > 0:
            total_samples_trend = round(((this_week_samples - last_week_samples) / last_week_samples) * 100, 1)
        else:
            total_samples_trend = 0.0 if this_week_samples == 0 else 100.0
        
        # 2. 待处理任务数（暂时使用固定值，因为 Task 表结构不同）
        pending_tasks = 0
        pending_tasks_trend = 0.0
        
        # 3. 合格率（暂时使用固定值，因为 Result 表结构不同）
        quality_rate = 0.0
        quality_rate_trend = 0.0
        
        # 4. 异常样品数（所有异常样品）
        # 注意：Sample 模型中没有 'abnormal' 状态，使用 0 作为默认值
        abnormal_samples = 0
        abnormal_samples_trend = 0.0
        
        return SuccessResponse(
            data={
                "totalSamples": total_samples,
                "totalSamplesTrend": total_samples_trend,
                "pendingTasks": pending_tasks,
                "pendingTasksTrend": pending_tasks_trend,
                "qualityRate": quality_rate,
                "qualityRateTrend": quality_rate_trend,
                "abnormalSamples": abnormal_samples,
                "abnormalSamplesTrend": abnormal_samples_trend
            }
        )
        
    except Exception as e:
        # 如果查询失败，返回默认值
        return SuccessResponse(
            data={
                "totalSamples": 0,
                "totalSamplesTrend": 0.0,
                "pendingTasks": 0,
                "pendingTasksTrend": 0.0,
                "qualityRate": 0.0,
                "qualityRateTrend": 0.0,
                "abnormalSamples": 0,
                "abnormalSamplesTrend": 0.0
            }
        )


@router.get("/todos", response_model=SuccessResponse)
async def get_dashboard_todos(db: AsyncSession = Depends(get_db)):
    """
    获取仪表盘待办事项
    
    返回待办事项列表，包括：
    - 样品审核
    - 结果录入
    - 报告签发
    """
    try:
        todo_items = []
        
        # 1. 样品审核待办
        audit_pending_query = select(func.count(Sample.id)).where(
            Sample.status == 'pending_audit'
        )
        audit_pending_result = await db.execute(audit_pending_query)
        audit_pending_count = audit_pending_result.scalar() or 0
        
        if audit_pending_count > 0:
            todo_items.append({
                "type": "audit",
                "description": "样品审核",
                "count": audit_pending_count,
                "urgent": audit_pending_count > 5
            })
        
        # 2. 结果录入待办
        entry_pending_query = select(func.count(Task.id)).where(
            and_(
                Task.task_type == 'result_entry',
                Task.status == 'pending'
            )
        )
        entry_pending_result = await db.execute(entry_pending_query)
        entry_pending_count = entry_pending_result.scalar() or 0
        
        if entry_pending_count > 0:
            todo_items.append({
                "type": "entry",
                "description": "结果录入",
                "count": entry_pending_count,
                "urgent": entry_pending_count > 10
            })
        
        # 3. 报告签发待办
        report_pending_query = select(func.count(Task.id)).where(
            and_(
                Task.task_type == 'report_approval',
                Task.status == 'pending'
            )
        )
        report_pending_result = await db.execute(report_pending_query)
        report_pending_count = report_pending_result.scalar() or 0
        
        if report_pending_count > 0:
            todo_items.append({
                "type": "report",
                "description": "报告签发",
                "count": report_pending_count,
                "urgent": False
            })
        
        return SuccessResponse(
            data={
                "items": todo_items
            }
        )
        
    except Exception as e:
        # 如果查询失败，返回空列表
        return SuccessResponse(
            data={
                "items": []
            }
        )
