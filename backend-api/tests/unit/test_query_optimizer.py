"""
查询优化工具测试
"""
import pytest
from datetime import datetime, timedelta
from app.utils.query_optimizer import (
    QueryOptimizer,
    QueryAnalyzer,
    PaginationResult,
    CursorPaginationResult
)


class TestQueryOptimizer:
    """查询优化工具测试类"""
    
    def test_build_offset_pagination(self):
        """测试偏移分页参数构建"""
        # 第一页
        result = QueryOptimizer.build_offset_pagination(1, 20)
        assert result["offset"] == 0
        assert result["limit"] == 20
        
        # 第二页
        result = QueryOptimizer.build_offset_pagination(2, 20)
        assert result["offset"] == 20
        assert result["limit"] == 20
        
        # 第五页
        result = QueryOptimizer.build_offset_pagination(5, 10)
        assert result["offset"] == 40
        assert result["limit"] == 10
    
    def test_build_cursor_pagination(self):
        """测试游标分页参数构建"""
        # 无游标（第一页）
        result = QueryOptimizer.build_cursor_pagination(None, 20)
        assert result["cursor"] is None
        assert result["limit"] == 21  # 多取一条
        assert result["skip"] == 0
        
        # 有游标
        result = QueryOptimizer.build_cursor_pagination("cursor123", 20)
        assert result["cursor"] == "cursor123"
        assert result["limit"] == 21
        assert result["skip"] == 1
    
    def test_process_cursor_pagination_result(self):
        """测试游标分页结果处理"""
        # 创建测试数据
        class Item:
            def __init__(self, id: str):
                self.id = id
        
        # 有更多数据的情况
        items = [Item(f"id{i}") for i in range(21)]
        result = QueryOptimizer.process_cursor_pagination_result(items, 20)
        
        assert len(result.items) == 20
        assert result.has_more is True
        assert result.next_cursor == "id19"
        
        # 没有更多数据的情况
        items = [Item(f"id{i}") for i in range(15)]
        result = QueryOptimizer.process_cursor_pagination_result(items, 20)
        
        assert len(result.items) == 15
        assert result.has_more is False
        assert result.next_cursor is None
    
    def test_build_date_range_filter(self):
        """测试日期范围过滤器构建"""
        start_date = datetime(2026, 1, 1)
        end_date = datetime(2026, 12, 31)
        
        # 完整范围
        result = QueryOptimizer.build_date_range_filter(
            "created_at",
            start_date,
            end_date
        )
        assert "created_at_gte" in result
        assert "created_at_lte" in result
        assert result["created_at_gte"] == start_date
        assert result["created_at_lte"] == end_date
        
        # 仅开始日期
        result = QueryOptimizer.build_date_range_filter(
            "created_at",
            start_date=start_date
        )
        assert "created_at_gte" in result
        assert "created_at_lte" not in result
        
        # 仅结束日期
        result = QueryOptimizer.build_date_range_filter(
            "created_at",
            end_date=end_date
        )
        assert "created_at_gte" not in result
        assert "created_at_lte" in result
    
    def test_split_into_batches(self):
        """测试数据分批"""
        # 正好整除
        items = list(range(100))
        batches = QueryOptimizer.split_into_batches(items, 10)
        assert len(batches) == 10
        assert all(len(batch) == 10 for batch in batches)
        
        # 有余数
        items = list(range(105))
        batches = QueryOptimizer.split_into_batches(items, 10)
        assert len(batches) == 11
        assert len(batches[-1]) == 5
        
        # 小于批次大小
        items = list(range(5))
        batches = QueryOptimizer.split_into_batches(items, 10)
        assert len(batches) == 1
        assert len(batches[0]) == 5
    
    def test_log_slow_query(self, caplog):
        """测试慢查询日志"""
        import logging
        caplog.set_level(logging.WARNING)
        
        # 慢查询（超过 1000ms）
        QueryOptimizer.log_slow_query("test_query", 1500.0, {"param": "value"})
        assert "Slow query detected" in caplog.text
        assert "test_query" in caplog.text
        
        # 快查询（不记录）
        caplog.clear()
        QueryOptimizer.log_slow_query("fast_query", 500.0)
        assert "Slow query detected" not in caplog.text
    
    def test_build_order_by(self):
        """测试排序参数构建"""
        # 降序
        result = QueryOptimizer.build_order_by("created_at", "desc")
        assert result == "created_at desc"
        
        # 升序
        result = QueryOptimizer.build_order_by("name", "asc")
        assert result == "name asc"
        
        # 无排序字段
        result = QueryOptimizer.build_order_by(None)
        assert result is None


class TestPaginationResult:
    """分页结果测试类"""
    
    def test_pagination_result(self):
        """测试分页结果"""
        items = list(range(20))
        result = PaginationResult(items, total=100, page=2, page_size=20)
        
        assert result.items == items
        assert result.total == 100
        assert result.page == 2
        assert result.page_size == 20
        assert result.total_pages == 5
        assert result.has_next is True
        assert result.has_prev is True
    
    def test_pagination_result_first_page(self):
        """测试第一页"""
        items = list(range(20))
        result = PaginationResult(items, total=100, page=1, page_size=20)
        
        assert result.has_next is True
        assert result.has_prev is False
    
    def test_pagination_result_last_page(self):
        """测试最后一页"""
        items = list(range(20))
        result = PaginationResult(items, total=100, page=5, page_size=20)
        
        assert result.has_next is False
        assert result.has_prev is True
    
    def test_pagination_result_to_dict(self):
        """测试转换为字典"""
        items = list(range(20))
        result = PaginationResult(items, total=100, page=2, page_size=20)
        data = result.to_dict()
        
        assert "items" in data
        assert "pagination" in data
        assert data["pagination"]["total"] == 100
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["pageSize"] == 20
        assert data["pagination"]["totalPages"] == 5


class TestCursorPaginationResult:
    """游标分页结果测试类"""
    
    def test_cursor_pagination_result(self):
        """测试游标分页结果"""
        items = list(range(20))
        result = CursorPaginationResult(items, has_more=True, next_cursor="cursor123")
        
        assert result.items == items
        assert result.has_more is True
        assert result.next_cursor == "cursor123"
    
    def test_cursor_pagination_result_to_dict(self):
        """测试转换为字典"""
        items = list(range(20))
        result = CursorPaginationResult(items, has_more=True, next_cursor="cursor123")
        data = result.to_dict()
        
        assert "items" in data
        assert "hasMore" in data
        assert "nextCursor" in data
        assert data["hasMore"] is True
        assert data["nextCursor"] == "cursor123"


class TestQueryAnalyzer:
    """查询分析器测试类"""
    
    def setup_method(self):
        """每个测试前重置统计"""
        QueryAnalyzer.reset()
    
    def test_record_query(self):
        """测试记录查询统计"""
        QueryAnalyzer.record_query("test_query", 100.0)
        QueryAnalyzer.record_query("test_query", 200.0)
        QueryAnalyzer.record_query("test_query", 150.0)
        
        report = QueryAnalyzer.get_report()
        assert len(report) == 1
        
        stat = report[0]
        assert stat["queryName"] == "test_query"
        assert stat["count"] == 3
        assert stat["avgDuration"] == 150.0
        assert stat["maxDuration"] == 200.0
        assert stat["minDuration"] == 100.0
    
    def test_get_report_sorted(self):
        """测试报告按平均时间排序"""
        QueryAnalyzer.record_query("slow_query", 2000.0)
        QueryAnalyzer.record_query("fast_query", 100.0)
        QueryAnalyzer.record_query("medium_query", 500.0)
        
        report = QueryAnalyzer.get_report()
        assert len(report) == 3
        assert report[0]["queryName"] == "slow_query"
        assert report[1]["queryName"] == "medium_query"
        assert report[2]["queryName"] == "fast_query"
    
    def test_get_slow_queries(self):
        """测试获取慢查询"""
        QueryAnalyzer.record_query("slow_query_1", 1500.0)
        QueryAnalyzer.record_query("slow_query_2", 2000.0)
        QueryAnalyzer.record_query("fast_query", 500.0)
        
        slow_queries = QueryAnalyzer.get_slow_queries(threshold=1000.0)
        assert len(slow_queries) == 2
        assert all(q["avgDuration"] > 1000.0 for q in slow_queries)
    
    def test_reset(self):
        """测试重置统计"""
        QueryAnalyzer.record_query("test_query", 100.0)
        assert len(QueryAnalyzer.get_report()) == 1
        
        QueryAnalyzer.reset()
        assert len(QueryAnalyzer.get_report()) == 0
