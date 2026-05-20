"""
查询优化工具模块

提供常见的查询优化模式和最佳实践，包括：
- 分页查询优化
- 批量操作优化
- 预加载关联数据
- 慢查询监控
- 查询性能分析

与 Node.js 后端的 queryOptimizer.ts 保持功能一致。
"""
from typing import Any, Dict, List, Optional, TypeVar, Generic, Callable
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime
import logging
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')


class PaginationResult(Generic[T]):
    """分页查询结果"""
    
    def __init__(
        self,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ):
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size
        self.total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        self.has_next = page < self.total_pages
        self.has_prev = page > 1
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "items": self.items,
            "pagination": {
                "total": self.total,
                "page": self.page,
                "pageSize": self.page_size,
                "totalPages": self.total_pages,
                "hasNext": self.has_next,
                "hasPrev": self.has_prev
            }
        }


class CursorPaginationResult(Generic[T]):
    """游标分页查询结果"""
    
    def __init__(
        self,
        items: List[T],
        has_more: bool,
        next_cursor: Optional[str] = None
    ):
        self.items = items
        self.has_more = has_more
        self.next_cursor = next_cursor
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "items": self.items,
            "hasMore": self.has_more,
            "nextCursor": self.next_cursor
        }


class QueryOptimizer:
    """
    查询优化工具类
    提供常见的查询优化模式和最佳实践
    """
    
    @staticmethod
    def build_offset_pagination(page: int, page_size: int) -> Dict[str, int]:
        """
        构建偏移分页参数
        适用于小到中等数据量的分页查询
        
        Args:
            page: 页码（从 1 开始）
            page_size: 每页大小
            
        Returns:
            包含 offset 和 limit 的字典
        """
        offset = (page - 1) * page_size
        return {
            "offset": offset,
            "limit": page_size
        }
    
    @staticmethod
    async def paginate_query(
        db: AsyncSession,
        query: Any,
        page: int,
        page_size: int
    ) -> PaginationResult:
        """
        执行分页查询
        
        Args:
            db: 数据库会话
            query: SQLAlchemy 查询对象
            page: 页码
            page_size: 每页大小
            
        Returns:
            分页结果
        """
        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # 获取分页数据
        pagination = QueryOptimizer.build_offset_pagination(page, page_size)
        paginated_query = query.offset(pagination["offset"]).limit(pagination["limit"])
        result = await db.execute(paginated_query)
        items = result.scalars().all()
        
        return PaginationResult(
            items=items,
            total=total,
            page=page,
            page_size=page_size
        )
    
    @staticmethod
    def build_cursor_pagination(
        cursor: Optional[str],
        page_size: int
    ) -> Dict[str, Any]:
        """
        构建游标分页参数
        适用于大数据量的分页查询，性能更好
        
        Args:
            cursor: 游标（上一页最后一条记录的 ID）
            page_size: 每页大小
            
        Returns:
            游标分页参数
        """
        return {
            "cursor": cursor,
            "limit": page_size + 1,  # 多取一条用于判断是否有下一页
            "skip": 1 if cursor else 0  # 跳过游标本身
        }
    
    @staticmethod
    def process_cursor_pagination_result(
        items: List[Any],
        page_size: int,
        id_field: str = "id"
    ) -> CursorPaginationResult:
        """
        处理游标分页结果
        
        Args:
            items: 查询结果
            page_size: 每页大小
            id_field: ID 字段名
            
        Returns:
            游标分页结果
        """
        has_more = len(items) > page_size
        result_items = items[:page_size] if has_more else items
        next_cursor = getattr(result_items[-1], id_field) if has_more and result_items else None
        
        return CursorPaginationResult(
            items=result_items,
            has_more=has_more,
            next_cursor=next_cursor
        )
    
    @staticmethod
    def build_date_range_filter(
        field: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        构建日期范围查询条件
        
        Args:
            field: 日期字段名
            start_date: 开始日期
            end_date: 结束日期
            
        Returns:
            查询条件字典
        """
        filters = {}
        if start_date:
            filters[f"{field}_gte"] = start_date
        if end_date:
            filters[f"{field}_lte"] = end_date
        return filters
    
    @staticmethod
    def split_into_batches(items: List[T], batch_size: int = 1000) -> List[List[T]]:
        """
        将列表分批处理
        自动分批处理大量数据，避免 SQL 参数过多
        
        Args:
            items: 数据列表
            batch_size: 每批大小，默认 1000
            
        Returns:
            分批后的列表数组
        """
        batches = []
        for i in range(0, len(items), batch_size):
            batches.append(items[i:i + batch_size])
        return batches
    
    @staticmethod
    def log_slow_query(
        query_name: str,
        duration: float,
        params: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        记录慢查询
        慢查询阈值：1000ms（与 Node.js 后端一致）
        
        Args:
            query_name: 查询名称
            duration: 执行时间（毫秒）
            params: 查询参数
        """
        if duration > 1000:
            logger.warning(
                f"Slow query detected: {query_name}",
                extra={
                    "queryName": query_name,
                    "duration": f"{duration:.2f}ms",
                    "params": params
                }
            )
    
    @staticmethod
    async def execute_with_monitoring(
        query_name: str,
        query_fn: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        执行带性能监控的查询
        
        Args:
            query_name: 查询名称
            query_fn: 查询函数
            *args: 位置参数
            **kwargs: 关键字参数
            
        Returns:
            查询结果
        """
        start_time = time.time()
        try:
            result = await query_fn(*args, **kwargs)
            duration = (time.time() - start_time) * 1000  # 转换为毫秒
            QueryOptimizer.log_slow_query(query_name, duration)
            return result
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(
                f"Query execution error: {query_name}",
                extra={
                    "queryName": query_name,
                    "duration": f"{duration:.2f}ms",
                    "error": str(e)
                }
            )
            raise
    
    @staticmethod
    def build_preload_options(relationships: List[str], strategy: str = "selectinload"):
        """
        构建预加载选项
        使用预加载避免 N+1 查询问题
        
        Args:
            relationships: 关系字段列表
            strategy: 加载策略，"selectinload" 或 "joinedload"
            
        Returns:
            预加载选项列表
        """
        load_strategy = selectinload if strategy == "selectinload" else joinedload
        return [load_strategy(getattr(model, rel)) for rel in relationships]
    
    @staticmethod
    async def batch_create(
        db: AsyncSession,
        model_class: Any,
        data_list: List[Dict[str, Any]]
    ) -> List[Any]:
        """
        批量创建记录
        优化数据库写入性能
        
        Args:
            db: 数据库会话
            model_class: 模型类
            data_list: 数据字典列表
            
        Returns:
            创建的对象列表
        """
        objects = [model_class(**data) for data in data_list]
        db.add_all(objects)
        await db.flush()
        return objects
    
    @staticmethod
    async def batch_update(
        db: AsyncSession,
        model_class: Any,
        updates: List[Dict[str, Any]],
        id_field: str = "id"
    ) -> int:
        """
        批量更新记录
        
        Args:
            db: 数据库会话
            model_class: 模型类
            updates: 更新数据列表，每项包含 id 和要更新的字段
            id_field: ID 字段名
            
        Returns:
            更新的记录数
        """
        count = 0
        for update_data in updates:
            record_id = update_data.pop(id_field)
            stmt = (
                model_class.__table__.update()
                .where(getattr(model_class, id_field) == record_id)
                .values(**update_data)
            )
            result = await db.execute(stmt)
            count += result.rowcount
        return count
    
    @staticmethod
    def build_order_by(
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Optional[str]:
        """
        构建排序参数
        
        Args:
            sort_by: 排序字段
            sort_order: 排序方向，"asc" 或 "desc"
            
        Returns:
            排序参数
        """
        if not sort_by:
            return None
        return f"{sort_by} {sort_order}"
    
    @staticmethod
    async def execute_in_batches(
        db: AsyncSession,
        items: List[Any],
        process_fn: Callable,
        batch_size: int = 1000
    ) -> List[Any]:
        """
        分批执行操作
        
        Args:
            db: 数据库会话
            items: 数据列表
            process_fn: 处理函数
            batch_size: 批次大小
            
        Returns:
            处理结果列表
        """
        results = []
        batches = QueryOptimizer.split_into_batches(items, batch_size)
        
        for batch in batches:
            batch_result = await process_fn(db, batch)
            results.extend(batch_result)
        
        return results


class QueryAnalyzer:
    """
    查询性能分析器
    用于分析和优化查询性能
    """
    
    _query_stats: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def record_query(cls, query_name: str, duration: float) -> None:
        """
        记录查询统计
        
        Args:
            query_name: 查询名称
            duration: 执行时间（毫秒）
        """
        if query_name not in cls._query_stats:
            cls._query_stats[query_name] = {
                "count": 0,
                "total_duration": 0.0,
                "max_duration": 0.0,
                "min_duration": float('inf')
            }
        
        stats = cls._query_stats[query_name]
        stats["count"] += 1
        stats["total_duration"] += duration
        stats["max_duration"] = max(stats["max_duration"], duration)
        stats["min_duration"] = min(stats["min_duration"], duration)
    
    @classmethod
    def get_report(cls) -> List[Dict[str, Any]]:
        """
        获取查询统计报告
        
        Returns:
            统计报告列表
        """
        report = []
        
        for query_name, stats in cls._query_stats.items():
            avg_duration = stats["total_duration"] / stats["count"] if stats["count"] > 0 else 0
            report.append({
                "queryName": query_name,
                "count": stats["count"],
                "avgDuration": round(avg_duration, 2),
                "maxDuration": round(stats["max_duration"], 2),
                "minDuration": round(stats["min_duration"], 2) if stats["min_duration"] != float('inf') else 0
            })
        
        # 按平均执行时间降序排序
        report.sort(key=lambda x: x["avgDuration"], reverse=True)
        return report
    
    @classmethod
    def reset(cls) -> None:
        """重置统计数据"""
        cls._query_stats.clear()
    
    @classmethod
    def get_slow_queries(cls, threshold: float = 1000.0) -> List[Dict[str, Any]]:
        """
        获取慢查询列表
        
        Args:
            threshold: 慢查询阈值（毫秒），默认 1000ms
            
        Returns:
            慢查询列表
        """
        report = cls.get_report()
        return [stat for stat in report if stat["avgDuration"] > threshold]


# 导出主要类和函数
__all__ = [
    "QueryOptimizer",
    "QueryAnalyzer",
    "PaginationResult",
    "CursorPaginationResult"
]
