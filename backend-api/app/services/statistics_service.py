"""
统计分析服务

提供综合统计、审核统计、工作量统计和质量统计功能
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import selectinload
import hashlib
import json

from app.models.sample import Sample, SampleStatus
from app.models.audit import AuditTask, AuditStatus
from app.models.result import Result
from app.models.report import Report, ReportStatus
from app.models.user import User
from app.core.cache import get_cache, set_cache, delete_cache_pattern
from app.core.logging import logger


class StatisticsService:
    """统计分析服务"""
    
    CACHE_TTL = 600  # 缓存10分钟
    
    @staticmethod
    async def get_overview_statistics(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        获取综合统计数据
        
        Args:
            db: 数据库会话
            start_date: 开始日期
            end_date: 结束日期
            use_cache: 是否使用缓存
            
        Returns:
            综合统计数据
        """
        # 生成缓存键
        cache_key = StatisticsService._generate_cache_key(
            "overview",
            {"start_date": start_date, "end_date": end_date}
        )
        
        # 尝试从缓存获取
        if use_cache:
            cached = await get_cache(cache_key)
            if cached:
                logger.info("Statistics retrieved from cache", extra={"key": cache_key})
                return json.loads(cached)
        
        # 构建时间过滤条件
        time_filter = StatisticsService._build_time_filter(start_date, end_date)
        
        # 样品统计
        sample_query = select(
            func.count(Sample.id).label("total"),
            func.count(case((Sample.status == SampleStatus.REGISTERED, 1))).label("registered"),
            func.count(case((Sample.status == SampleStatus.TESTING, 1))).label("testing"),
            func.count(case((Sample.status == SampleStatus.COMPLETED, 1))).label("completed"),
            func.count(case((Sample.status == SampleStatus.RELEASED, 1))).label("released")
        )
        if time_filter is not None:
            sample_query = sample_query.where(time_filter)
        
        sample_result = await db.execute(sample_query)
        sample_stats = sample_result.first()
        
        # 任务统计
        task_query = select(
            func.count(AuditTask.id).label("total"),
            func.count(case((AuditTask.status == AuditStatus.PENDING, 1))).label("pending"),
            func.count(case((AuditTask.status == AuditStatus.IN_PROGRESS, 1))).label("in_progress"),
            func.count(case((AuditTask.status == AuditStatus.APPROVED, 1))).label("approved"),
            func.count(case((AuditTask.status == AuditStatus.REJECTED, 1))).label("rejected")
        )
        if time_filter is not None:
            task_query = task_query.where(time_filter)
        
        task_result = await db.execute(task_query)
        task_stats = task_result.first()
        
        # 报告统计
        report_query = select(
            func.count(Report.id).label("total"),
            func.count(case((Report.status == ReportStatus.DRAFT, 1))).label("draft"),
            func.count(case((Report.status == ReportStatus.REVIEWING, 1))).label("reviewing"),
            func.count(case((Report.status == ReportStatus.PUBLISHED, 1))).label("published")
        )
        if time_filter is not None:
            report_query = report_query.where(time_filter)
        
        report_result = await db.execute(report_query)
        report_stats = report_result.first()
        
        # 组装结果
        statistics = {
            "samples": {
                "total": sample_stats.total or 0,
                "registered": sample_stats.registered or 0,
                "testing": sample_stats.testing or 0,
                "completed": sample_stats.completed or 0,
                "released": sample_stats.released or 0
            },
            "tasks": {
                "total": task_stats.total or 0,
                "pending": task_stats.pending or 0,
                "in_progress": task_stats.in_progress or 0,
                "approved": task_stats.approved or 0,
                "rejected": task_stats.rejected or 0
            },
            "reports": {
                "total": report_stats.total or 0,
                "draft": report_stats.draft or 0,
                "reviewing": report_stats.reviewing or 0,
                "published": report_stats.published or 0
            },
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # 缓存结果
        if use_cache:
            await set_cache(cache_key, json.dumps(statistics), StatisticsService.CACHE_TTL)
        
        return statistics
    
    @staticmethod
    async def get_audit_statistics(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        auditor_id: Optional[str] = None,
        level: Optional[int] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        获取审核统计数据
        
        Args:
            db: 数据库会话
            start_date: 开始日期
            end_date: 结束日期
            auditor_id: 审核人员ID
            level: 审核级别
            use_cache: 是否使用缓存
            
        Returns:
            审核统计数据
        """
        # 生成缓存键
        cache_key = StatisticsService._generate_cache_key(
            "audit",
            {
                "start_date": start_date,
                "end_date": end_date,
                "auditor_id": auditor_id,
                "level": level
            }
        )
        
        # 尝试从缓存获取
        if use_cache:
            cached = await get_cache(cache_key)
            if cached:
                logger.info("Audit statistics retrieved from cache", extra={"key": cache_key})
                return json.loads(cached)
        
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, AuditTask.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if auditor_id:
            filters.append(AuditTask.auditor_id == auditor_id)
        if level:
            filters.append(AuditTask.level == level)
        
        # 审核通过率统计
        pass_rate_query = select(
            func.count(AuditTask.id).label("total"),
            func.count(case((AuditTask.status == AuditStatus.APPROVED, 1))).label("approved"),
            func.count(case((AuditTask.status == AuditStatus.REJECTED, 1))).label("rejected")
        )
        if filters:
            pass_rate_query = pass_rate_query.where(and_(*filters))
        
        pass_rate_result = await db.execute(pass_rate_query)
        pass_rate_stats = pass_rate_result.first()
        
        total_tasks = pass_rate_stats.total or 0
        approved_tasks = pass_rate_stats.approved or 0
        rejected_tasks = pass_rate_stats.rejected or 0
        pass_rate = (approved_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # 审核时长统计
        duration_query = select(
            func.avg(
                func.extract('epoch', AuditTask.completed_at - AuditTask.created_at) / 3600
            ).label("avg_duration"),
            func.max(
                func.extract('epoch', AuditTask.completed_at - AuditTask.created_at) / 3600
            ).label("max_duration"),
            func.min(
                func.extract('epoch', AuditTask.completed_at - AuditTask.created_at) / 3600
            ).label("min_duration")
        ).where(
            and_(
                AuditTask.completed_at.isnot(None),
                *filters
            )
        )
        
        duration_result = await db.execute(duration_query)
        duration_stats = duration_result.first()
        
        # 问题分布统计（按退回原因）
        issue_query = select(
            AuditTask.rejection_reason,
            func.count(AuditTask.id).label("count")
        ).where(
            and_(
                AuditTask.status == AuditStatus.REJECTED,
                AuditTask.rejection_reason.isnot(None),
                *filters
            )
        ).group_by(AuditTask.rejection_reason)
        
        issue_result = await db.execute(issue_query)
        issue_distribution = [
            {"reason": row.rejection_reason, "count": row.count}
            for row in issue_result.all()
        ]
        
        # 组装结果
        statistics = {
            "pass_rate": {
                "total_tasks": total_tasks,
                "approved_tasks": approved_tasks,
                "rejected_tasks": rejected_tasks,
                "pass_rate": round(pass_rate, 2)
            },
            "duration": {
                "avg_duration": round(duration_stats.avg_duration or 0, 2),
                "max_duration": round(duration_stats.max_duration or 0, 2),
                "min_duration": round(duration_stats.min_duration or 0, 2)
            },
            "issue_distribution": issue_distribution,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # 缓存结果
        if use_cache:
            await set_cache(cache_key, json.dumps(statistics), StatisticsService.CACHE_TTL)
        
        return statistics
    
    @staticmethod
    async def get_workload_statistics(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        获取工作量统计数据
        
        Args:
            db: 数据库会话
            start_date: 开始日期
            end_date: 结束日期
            user_id: 用户ID
            use_cache: 是否使用缓存
            
        Returns:
            工作量统计数据
        """
        # 生成缓存键
        cache_key = StatisticsService._generate_cache_key(
            "workload",
            {
                "start_date": start_date,
                "end_date": end_date,
                "user_id": user_id
            }
        )
        
        # 尝试从缓存获取
        if use_cache:
            cached = await get_cache(cache_key)
            if cached:
                logger.info("Workload statistics retrieved from cache", extra={"key": cache_key})
                return json.loads(cached)
        
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, AuditTask.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if user_id:
            filters.append(AuditTask.auditor_id == user_id)
        
        # 按人员统计工作量
        workload_query = select(
            AuditTask.auditor_id,
            User.real_name,
            func.count(AuditTask.id).label("total_tasks"),
            func.count(case((AuditTask.status == AuditStatus.APPROVED, 1))).label("completed_tasks"),
            func.count(case((AuditTask.status == AuditStatus.PENDING, 1))).label("pending_tasks")
        ).join(
            User, AuditTask.auditor_id == User.id
        )
        
        if filters:
            workload_query = workload_query.where(and_(*filters))
        
        workload_query = workload_query.group_by(AuditTask.auditor_id, User.real_name)
        
        workload_result = await db.execute(workload_query)
        workload_by_auditor = [
            {
                "auditor_id": row.auditor_id,
                "auditor_name": row.real_name,
                "total_tasks": row.total_tasks,
                "completed_tasks": row.completed_tasks,
                "pending_tasks": row.pending_tasks
            }
            for row in workload_result.all()
        ]
        
        # 组装结果
        statistics = {
            "by_auditor": workload_by_auditor,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # 缓存结果
        if use_cache:
            await set_cache(cache_key, json.dumps(statistics), StatisticsService.CACHE_TTL)
        
        return statistics
    
    @staticmethod
    async def get_quality_statistics(
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        sample_type: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        获取质量统计数据
        
        Args:
            db: 数据库会话
            start_date: 开始日期
            end_date: 结束日期
            sample_type: 样品类型
            use_cache: 是否使用缓存
            
        Returns:
            质量统计数据
        """
        # 生成缓存键
        cache_key = StatisticsService._generate_cache_key(
            "quality",
            {
                "start_date": start_date,
                "end_date": end_date,
                "sample_type": sample_type
            }
        )
        
        # 尝试从缓存获取
        if use_cache:
            cached = await get_cache(cache_key)
            if cached:
                logger.info("Quality statistics retrieved from cache", extra={"key": cache_key})
                return json.loads(cached)
        
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, Sample.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if sample_type:
            filters.append(Sample.sample_type == sample_type)
        
        # 合格率统计
        # 注意：这里假设有质量判定结果，实际需要根据数据模型调整
        quality_query = select(
            func.count(Sample.id).label("total"),
            func.count(case((Sample.status == SampleStatus.RELEASED, 1))).label("qualified")
        )
        
        if filters:
            quality_query = quality_query.where(and_(*filters))
        
        quality_result = await db.execute(quality_query)
        quality_stats = quality_result.first()
        
        total_samples = quality_stats.total or 0
        qualified_samples = quality_stats.qualified or 0
        qualified_rate = (qualified_samples / total_samples * 100) if total_samples > 0 else 0
        
        # 组装结果
        statistics = {
            "total_samples": total_samples,
            "qualified_samples": qualified_samples,
            "qualified_rate": round(qualified_rate, 2),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # 缓存结果
        if use_cache:
            await set_cache(cache_key, json.dumps(statistics), StatisticsService.CACHE_TTL)
        
        return statistics
    
    @staticmethod
    async def clear_cache(pattern: Optional[str] = None) -> int:
        """
        清除统计缓存
        
        Args:
            pattern: 缓存键模式，默认清除所有统计缓存
            
        Returns:
            清除的缓存数量
        """
        cache_pattern = pattern or "stats:*"
        count = await delete_cache_pattern(cache_pattern)
        logger.info(f"Cleared {count} statistics cache entries", extra={"pattern": cache_pattern})
        return count
    
    @staticmethod
    def _generate_cache_key(stat_type: str, params: Dict[str, Any]) -> str:
        """
        生成缓存键
        
        Args:
            stat_type: 统计类型
            params: 参数字典
            
        Returns:
            缓存键
        """
        # 序列化参数
        param_str = json.dumps(params, sort_keys=True, default=str)
        # 生成哈希
        param_hash = hashlib.md5(param_str.encode()).hexdigest()
        return f"stats:{stat_type}:{param_hash}"
    
    @staticmethod
    def _build_time_filter(
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        column = None
    ):
        """
        构建时间过滤条件
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            column: 时间列，默认为 Sample.created_at
            
        Returns:
            时间过滤条件
        """
        if column is None:
            column = Sample.created_at
        
        if start_date and end_date:
            return and_(column >= start_date, column <= end_date)
        elif start_date:
            return column >= start_date
        elif end_date:
            return column <= end_date
        else:
            return None
    
    @staticmethod
    async def format_chart_data(
        db: AsyncSession,
        chart_type: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        granularity: str = "day",
        sample_type: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        格式化图表数据
        
        Args:
            db: 数据库会话
            chart_type: 图表类型 (trend, type_distribution, status_distribution, quality_rate)
            start_date: 开始日期
            end_date: 结束日期
            granularity: 时间粒度 (day, week, month, year)
            sample_type: 样品类型过滤
            use_cache: 是否使用缓存
            
        Returns:
            格式化的图表数据
        """
        # 生成缓存键
        cache_key = StatisticsService._generate_cache_key(
            f"chart_{chart_type}",
            {
                "start_date": start_date,
                "end_date": end_date,
                "granularity": granularity,
                "sample_type": sample_type
            }
        )
        
        # 尝试从缓存获取
        if use_cache:
            cached = await get_cache(cache_key)
            if cached:
                logger.info("Chart data retrieved from cache", extra={"key": cache_key})
                return json.loads(cached)
        
        # 根据图表类型生成数据
        if chart_type == "trend":
            chart_data = await StatisticsService._format_trend_chart(
                db, start_date, end_date, granularity, sample_type
            )
        elif chart_type == "type_distribution":
            chart_data = await StatisticsService._format_type_distribution_chart(
                db, start_date, end_date, sample_type
            )
        elif chart_type == "status_distribution":
            chart_data = await StatisticsService._format_status_distribution_chart(
                db, start_date, end_date, sample_type
            )
        elif chart_type == "quality_rate":
            chart_data = await StatisticsService._format_quality_rate_chart(
                db, start_date, end_date, granularity, sample_type
            )
        else:
            raise ValueError(f"不支持的图表类型: {chart_type}")
        
        # 缓存结果
        if use_cache:
            await set_cache(cache_key, json.dumps(chart_data), StatisticsService.CACHE_TTL)
        
        return chart_data
    
    @staticmethod
    async def _format_trend_chart(
        db: AsyncSession,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        granularity: str,
        sample_type: Optional[str]
    ) -> Dict[str, Any]:
        """
        格式化趋势图数据（折线图/柱状图）
        
        Returns:
            ECharts 格式的数据
        """
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, Sample.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if sample_type:
            filters.append(Sample.sample_type == sample_type)
        
        # 根据粒度确定时间分组格式
        if granularity == "day":
            time_format = func.date(Sample.created_at)
        elif granularity == "week":
            time_format = func.date_trunc('week', Sample.created_at)
        elif granularity == "month":
            time_format = func.date_trunc('month', Sample.created_at)
        elif granularity == "year":
            time_format = func.date_trunc('year', Sample.created_at)
        else:
            time_format = func.date(Sample.created_at)
        
        # 查询按时间分组的样品数量
        query = select(
            time_format.label("time_period"),
            func.count(Sample.id).label("count")
        )
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.group_by("time_period").order_by("time_period")
        
        result = await db.execute(query)
        data = result.all()
        
        # 格式化为 ECharts 数据格式
        x_axis = []
        series_data = []
        
        for row in data:
            # 格式化时间显示
            if isinstance(row.time_period, datetime):
                if granularity == "day":
                    time_str = row.time_period.strftime("%Y-%m-%d")
                elif granularity == "week":
                    time_str = row.time_period.strftime("%Y-W%W")
                elif granularity == "month":
                    time_str = row.time_period.strftime("%Y-%m")
                elif granularity == "year":
                    time_str = row.time_period.strftime("%Y")
                else:
                    time_str = row.time_period.strftime("%Y-%m-%d")
            else:
                time_str = str(row.time_period)
            
            x_axis.append(time_str)
            series_data.append(row.count)
        
        return {
            "type": "line",
            "xAxis": {
                "type": "category",
                "data": x_axis,
                "name": "时间"
            },
            "yAxis": {
                "type": "value",
                "name": "样品数量"
            },
            "series": [
                {
                    "name": "样品数量",
                    "type": "line",
                    "data": series_data,
                    "smooth": True
                }
            ]
        }
    
    @staticmethod
    async def _format_type_distribution_chart(
        db: AsyncSession,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        sample_type: Optional[str]
    ) -> Dict[str, Any]:
        """
        格式化类型分布图数据（饼图）
        
        Returns:
            ECharts 格式的数据
        """
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, Sample.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if sample_type:
            filters.append(Sample.sample_type == sample_type)
        
        # 查询按样品类型分组的数量
        query = select(
            Sample.sample_type,
            func.count(Sample.id).label("count")
        )
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.group_by(Sample.sample_type).order_by(func.count(Sample.id).desc())
        
        result = await db.execute(query)
        data = result.all()
        
        # 格式化为 ECharts 饼图数据格式
        series_data = [
            {
                "name": row.sample_type or "未分类",
                "value": row.count
            }
            for row in data
        ]
        
        return {
            "type": "pie",
            "series": [
                {
                    "name": "样品类型",
                    "type": "pie",
                    "radius": ["40%", "70%"],
                    "data": series_data,
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowOffsetX": 0,
                            "shadowColor": "rgba(0, 0, 0, 0.5)"
                        }
                    }
                }
            ]
        }
    
    @staticmethod
    async def _format_status_distribution_chart(
        db: AsyncSession,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        sample_type: Optional[str]
    ) -> Dict[str, Any]:
        """
        格式化状态分布图数据（柱状图）
        
        Returns:
            ECharts 格式的数据
        """
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, Sample.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if sample_type:
            filters.append(Sample.sample_type == sample_type)
        
        # 查询按状态分组的数量
        query = select(
            Sample.status,
            func.count(Sample.id).label("count")
        )
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.group_by(Sample.status)
        
        result = await db.execute(query)
        data = result.all()
        
        # 状态中文映射
        status_map = {
            "REGISTERED": "已登记",
            "TESTING": "检测中",
            "COMPLETED": "已完成",
            "RELEASED": "已发布"
        }
        
        # 格式化为 ECharts 柱状图数据格式
        x_axis = []
        series_data = []
        
        for row in data:
            status_name = status_map.get(row.status, row.status)
            x_axis.append(status_name)
            series_data.append(row.count)
        
        return {
            "type": "bar",
            "xAxis": {
                "type": "category",
                "data": x_axis,
                "name": "状态"
            },
            "yAxis": {
                "type": "value",
                "name": "样品数量"
            },
            "series": [
                {
                    "name": "样品数量",
                    "type": "bar",
                    "data": series_data,
                    "itemStyle": {
                        "color": "#409EFF"
                    }
                }
            ]
        }
    
    @staticmethod
    async def _format_quality_rate_chart(
        db: AsyncSession,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        granularity: str,
        sample_type: Optional[str]
    ) -> Dict[str, Any]:
        """
        格式化合格率图数据（折线图）
        
        Returns:
            ECharts 格式的数据
        """
        # 构建查询条件
        filters = []
        time_filter = StatisticsService._build_time_filter(start_date, end_date, Sample.created_at)
        if time_filter is not None:
            filters.append(time_filter)
        if sample_type:
            filters.append(Sample.sample_type == sample_type)
        
        # 根据粒度确定时间分组格式
        if granularity == "day":
            time_format = func.date(Sample.created_at)
        elif granularity == "week":
            time_format = func.date_trunc('week', Sample.created_at)
        elif granularity == "month":
            time_format = func.date_trunc('month', Sample.created_at)
        elif granularity == "year":
            time_format = func.date_trunc('year', Sample.created_at)
        else:
            time_format = func.date(Sample.created_at)
        
        # 查询按时间分组的合格率
        # 注意：这里假设 RELEASED 状态表示合格，实际应根据业务逻辑调整
        query = select(
            time_format.label("time_period"),
            func.count(Sample.id).label("total"),
            func.count(case((Sample.status == SampleStatus.RELEASED, 1))).label("qualified")
        )
        
        if filters:
            query = query.where(and_(*filters))
        
        query = query.group_by("time_period").order_by("time_period")
        
        result = await db.execute(query)
        data = result.all()
        
        # 格式化为 ECharts 数据格式
        x_axis = []
        series_data = []
        
        for row in data:
            # 格式化时间显示
            if isinstance(row.time_period, datetime):
                if granularity == "day":
                    time_str = row.time_period.strftime("%Y-%m-%d")
                elif granularity == "week":
                    time_str = row.time_period.strftime("%Y-W%W")
                elif granularity == "month":
                    time_str = row.time_period.strftime("%Y-%m")
                elif granularity == "year":
                    time_str = row.time_period.strftime("%Y")
                else:
                    time_str = row.time_period.strftime("%Y-%m-%d")
            else:
                time_str = str(row.time_period)
            
            # 计算合格率
            qualified_rate = (row.qualified / row.total * 100) if row.total > 0 else 0
            
            x_axis.append(time_str)
            series_data.append(round(qualified_rate, 2))
        
        return {
            "type": "line",
            "xAxis": {
                "type": "category",
                "data": x_axis,
                "name": "时间"
            },
            "yAxis": {
                "type": "value",
                "name": "合格率 (%)",
                "min": 0,
                "max": 100
            },
            "series": [
                {
                    "name": "合格率",
                    "type": "line",
                    "data": series_data,
                    "smooth": True,
                    "itemStyle": {
                        "color": "#67C23A"
                    }
                }
            ]
        }
