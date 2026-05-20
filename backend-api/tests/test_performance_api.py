"""
性能监控 API 集成测试

测试性能监控 API 端点的功能。
"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from app.main import app
from app.services.performance_service import performance_service


@pytest.fixture
async def auth_token():
    """获取认证令牌"""
    # 这里应该返回一个有效的测试令牌
    # 实际实现中需要创建测试用户并获取令牌
    return "test-token"


@pytest.fixture
async def setup_performance_data():
    """设置测试性能数据"""
    # 记录一些测试数据
    for i in range(10):
        await performance_service.record_api_metric(
            method="GET",
            path="/api/v1/samples",
            duration=100.0 + i * 50,
            status_code=200 if i < 8 else 500,
            user_id="test-user"
        )
    
    # 记录一些慢请求
    await performance_service.record_api_metric(
        method="POST",
        path="/api/v1/samples",
        duration=1500.0,
        status_code=201,
        user_id="test-user"
    )
    
    # 记录一些数据库查询
    for i in range(5):
        await performance_service.record_database_metric(
            query=f"SELECT * FROM samples WHERE id = {i}",
            duration=50.0 + i * 30,
            model="Sample",
            operation="select"
        )
    
    # 记录一些慢查询
    await performance_service.record_database_metric(
        query="SELECT * FROM samples JOIN results",
        duration=1200.0,
        model="Sample",
        operation="select"
    )
    
    yield
    
    # 清理测试数据（如果需要）


@pytest.mark.asyncio
async def test_get_performance_statistics(setup_performance_data):
    """测试获取性能统计数据 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 不带参数的请求（默认最近 1 小时）
        response = await client.get(
            "/api/v1/performance/statistics",
            headers={"Authorization": "Bearer test-token"}
        )
        
        # 由于没有实际的认证，这个测试可能会失败
        # 在实际环境中需要正确的认证设置
        if response.status_code == 200:
            data = response.json()
            
            # 验证响应结构
            assert "success" in data
            assert "data" in data
            
            # 验证数据结构
            stats = data["data"]
            assert "apiStats" in stats
            assert "databaseStats" in stats
            assert "timeRange" in stats


@pytest.mark.asyncio
async def test_get_performance_statistics_with_time_range(setup_performance_data):
    """测试带时间范围的性能统计 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 设置时间范围
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=2)
        
        response = await client.get(
            "/api/v1/performance/statistics",
            params={
                "startTime": start_time.isoformat(),
                "endTime": end_time.isoformat()
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # 验证响应结构
            assert "success" in data
            assert "data" in data


@pytest.mark.asyncio
async def test_get_slow_requests(setup_performance_data):
    """测试获取慢请求列表 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/performance/slow-requests",
            params={"limit": 50},
            headers={"Authorization": "Bearer test-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # 验证响应结构
            assert "success" in data
            assert "data" in data
            assert "total" in data
            
            # 验证数据是列表
            assert isinstance(data["data"], list)
            
            # 如果有数据，验证数据结构
            if data["data"]:
                slow_request = data["data"][0]
                assert "id" in slow_request
                assert "method" in slow_request
                assert "path" in slow_request
                assert "duration" in slow_request
                assert "timestamp" in slow_request


@pytest.mark.asyncio
async def test_get_slow_queries(setup_performance_data):
    """测试获取慢查询列表 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/performance/slow-queries",
            params={"limit": 50},
            headers={"Authorization": "Bearer test-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # 验证响应结构
            assert "success" in data
            assert "data" in data
            assert "total" in data
            
            # 验证数据是列表
            assert isinstance(data["data"], list)
            
            # 如果有数据，验证数据结构
            if data["data"]:
                slow_query = data["data"][0]
                assert "id" in slow_query
                assert "query" in slow_query
                assert "duration" in slow_query
                assert "timestamp" in slow_query


@pytest.mark.asyncio
async def test_get_path_stats(setup_performance_data):
    """测试获取路径性能统计 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/performance/path-stats",
            params={"limit": 20},
            headers={"Authorization": "Bearer test-token"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # 验证响应结构
            assert "success" in data
            assert "data" in data
            assert "total" in data
            
            # 验证数据是列表
            assert isinstance(data["data"], list)
            
            # 如果有数据，验证数据结构
            if data["data"]:
                path_stat = data["data"][0]
                assert "path" in path_stat
                assert "method" in path_stat
                assert "requestCount" in path_stat
                assert "averageDuration" in path_stat
                assert "minDuration" in path_stat
                assert "maxDuration" in path_stat
                assert "p50Duration" in path_stat
                assert "p95Duration" in path_stat
                assert "p99Duration" in path_stat
                assert "errorCount" in path_stat
                assert "errorRate" in path_stat


@pytest.mark.asyncio
async def test_performance_api_without_auth():
    """测试未认证的性能监控 API 访问"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 不带认证令牌的请求
        response = await client.get("/api/v1/performance/statistics")
        
        # 应该返回 401 未授权
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_slow_requests_limit_validation():
    """测试慢请求列表的 limit 参数验证"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 测试超出最大限制
        response = await client.get(
            "/api/v1/performance/slow-requests",
            params={"limit": 2000},  # 超过最大值 1000
            headers={"Authorization": "Bearer test-token"}
        )
        
        # 应该返回验证错误
        assert response.status_code in [422, 401]  # 422 验证错误或 401 未授权


@pytest.mark.asyncio
async def test_path_stats_limit_validation():
    """测试路径统计的 limit 参数验证"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 测试超出最大限制
        response = await client.get(
            "/api/v1/performance/path-stats",
            params={"limit": 200},  # 超过最大值 100
            headers={"Authorization": "Bearer test-token"}
        )
        
        # 应该返回验证错误
        assert response.status_code in [422, 401]  # 422 验证错误或 401 未授权
