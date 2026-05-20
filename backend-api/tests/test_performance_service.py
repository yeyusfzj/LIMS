"""
性能监控服务测试

测试性能监控服务的各项功能。
"""
import pytest
from datetime import datetime, timedelta
from app.services.performance_service import performance_service


@pytest.mark.asyncio
async def test_record_api_metric():
    """测试记录 API 性能指标"""
    # 记录一个 API 请求指标
    await performance_service.record_api_metric(
        method="GET",
        path="/api/v1/samples",
        duration=150.5,
        status_code=200,
        user_id="test-user-id"
    )
    
    # 验证慢请求记录（如果超过阈值）
    slow_requests = await performance_service.get_slow_requests(limit=10)
    # 由于 150.5ms < 1000ms，不应该被记录为慢请求
    assert all(req["duration"] >= 1000 for req in slow_requests)


@pytest.mark.asyncio
async def test_record_slow_request():
    """测试记录慢请求"""
    # 记录一个慢请求
    await performance_service.record_api_metric(
        method="POST",
        path="/api/v1/samples",
        duration=1500.0,  # 超过阈值
        status_code=201,
        user_id="test-user-id"
    )
    
    # 获取慢请求列表
    slow_requests = await performance_service.get_slow_requests(limit=10)
    
    # 验证慢请求被记录
    if slow_requests:
        assert any(
            req["method"] == "POST" and 
            req["path"] == "/api/v1/samples" and 
            req["duration"] >= 1000
            for req in slow_requests
        )


@pytest.mark.asyncio
async def test_record_database_metric():
    """测试记录数据库性能指标"""
    # 记录一个数据库查询指标
    await performance_service.record_database_metric(
        query="SELECT * FROM samples WHERE id = $1",
        duration=50.0,
        model="Sample",
        operation="select"
    )
    
    # 验证慢查询记录（如果超过阈值）
    slow_queries = await performance_service.get_slow_queries(limit=10)
    # 由于 50ms < 1000ms，不应该被记录为慢查询
    assert all(query["duration"] >= 1000 for query in slow_queries)


@pytest.mark.asyncio
async def test_record_slow_query():
    """测试记录慢查询"""
    # 记录一个慢查询
    await performance_service.record_database_metric(
        query="SELECT * FROM samples JOIN results ON samples.id = results.sample_id",
        duration=1200.0,  # 超过阈值
        model="Sample",
        operation="select"
    )
    
    # 获取慢查询列表
    slow_queries = await performance_service.get_slow_queries(limit=10)
    
    # 验证慢查询被记录
    if slow_queries:
        assert any(
            query["duration"] >= 1000
            for query in slow_queries
        )


@pytest.mark.asyncio
async def test_get_performance_stats():
    """测试获取性能统计数据"""
    # 记录一些测试数据
    for i in range(5):
        await performance_service.record_api_metric(
            method="GET",
            path="/api/v1/test",
            duration=100.0 + i * 50,
            status_code=200 if i < 4 else 500,
            user_id="test-user"
        )
    
    # 获取性能统计
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)
    stats = await performance_service.get_performance_stats(start_time, end_time)
    
    # 验证统计数据结构
    assert "apiStats" in stats
    assert "databaseStats" in stats
    assert "timeRange" in stats
    
    # 验证 API 统计字段
    api_stats = stats["apiStats"]
    assert "totalRequests" in api_stats
    assert "averageDuration" in api_stats
    assert "p50Duration" in api_stats
    assert "p95Duration" in api_stats
    assert "p99Duration" in api_stats
    assert "slowRequestCount" in api_stats
    assert "errorRate" in api_stats


@pytest.mark.asyncio
async def test_get_path_stats():
    """测试获取路径性能统计"""
    # 记录一些测试数据
    for i in range(10):
        await performance_service.record_api_metric(
            method="GET",
            path="/api/v1/samples",
            duration=100.0 + i * 20,
            status_code=200,
            user_id="test-user"
        )
    
    # 获取路径统计
    path_stats = await performance_service.get_path_stats(limit=10)
    
    # 验证统计数据
    assert isinstance(path_stats, list)
    
    # 如果有数据，验证数据结构
    if path_stats:
        stat = path_stats[0]
        assert "path" in stat
        assert "method" in stat
        assert "requestCount" in stat
        assert "averageDuration" in stat
        assert "minDuration" in stat
        assert "maxDuration" in stat
        assert "p50Duration" in stat
        assert "p95Duration" in stat
        assert "p99Duration" in stat
        assert "errorCount" in stat
        assert "errorRate" in stat


@pytest.mark.asyncio
async def test_calculate_percentile():
    """测试百分位数计算"""
    # 测试数据
    values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    
    # 计算百分位数
    p50 = performance_service._calculate_percentile(values, 50)
    p95 = performance_service._calculate_percentile(values, 95)
    p99 = performance_service._calculate_percentile(values, 99)
    
    # 验证结果
    assert p50 == 50
    assert p95 == 95
    assert p99 == 99


@pytest.mark.asyncio
async def test_calculate_percentile_empty():
    """测试空列表的百分位数计算"""
    values = []
    
    # 计算百分位数
    p50 = performance_service._calculate_percentile(values, 50)
    
    # 验证结果
    assert p50 == 0


@pytest.mark.asyncio
async def test_calculate_api_stats():
    """测试 API 统计数据计算"""
    # 测试数据
    metrics = [
        {"duration": 100, "status_code": 200},
        {"duration": 200, "status_code": 200},
        {"duration": 300, "status_code": 400},
        {"duration": 1500, "status_code": 200},  # 慢请求
        {"duration": 150, "status_code": 500},
    ]
    
    # 计算统计数据
    stats = performance_service._calculate_api_stats(metrics)
    
    # 验证结果
    assert stats["totalRequests"] == 5
    assert stats["averageDuration"] == (100 + 200 + 300 + 1500 + 150) / 5
    assert stats["slowRequestCount"] == 1  # 只有一个超过 1000ms
    assert stats["errorRate"] == 2 / 5  # 2 个错误（400 和 500）


@pytest.mark.asyncio
async def test_calculate_database_stats():
    """测试数据库统计数据计算"""
    # 测试数据
    metrics = [
        {"duration": 50},
        {"duration": 100},
        {"duration": 1200},  # 慢查询
        {"duration": 80},
        {"duration": 1500},  # 慢查询
    ]
    
    # 计算统计数据
    stats = performance_service._calculate_database_stats(metrics)
    
    # 验证结果
    assert stats["totalQueries"] == 5
    assert stats["averageDuration"] == (50 + 100 + 1200 + 80 + 1500) / 5
    assert stats["slowQueryCount"] == 2  # 2 个超过 1000ms


@pytest.mark.asyncio
async def test_empty_stats():
    """测试空数据的统计计算"""
    # 测试空 API 统计
    api_stats = performance_service._calculate_api_stats([])
    assert api_stats["totalRequests"] == 0
    assert api_stats["averageDuration"] == 0
    assert api_stats["errorRate"] == 0
    
    # 测试空数据库统计
    db_stats = performance_service._calculate_database_stats([])
    assert db_stats["totalQueries"] == 0
    assert db_stats["averageDuration"] == 0
    assert db_stats["slowQueryCount"] == 0
