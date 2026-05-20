"""
测试统计数据可视化接口

验证图表数据格式化和 API 端点功能
"""

import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.sample import Sample, SampleStatus
from app.models.user import User
from app.services.statistics_service import StatisticsService


@pytest.fixture
async def sample_data(db_session: AsyncSession, test_user: User):
    """创建测试样品数据"""
    samples = []
    
    # 创建不同类型和状态的样品
    sample_types = ["水质样品", "土壤样品", "空气样品"]
    statuses = [SampleStatus.REGISTERED, SampleStatus.TESTING, SampleStatus.COMPLETED, SampleStatus.RELEASED]
    
    for i in range(30):
        sample = Sample(
            barcode=f"TEST{i:06d}",
            sample_number=f"SN{i:06d}",
            client_name=f"客户{i % 5}",
            sample_name=f"样品{i}",
            sample_type=sample_types[i % len(sample_types)],
            quantity=100.0,
            unit="ml",
            status=statuses[i % len(statuses)],
            received_date=datetime.utcnow() - timedelta(days=i),
            created_by=test_user.id,
            created_at=datetime.utcnow() - timedelta(days=i)
        )
        db_session.add(sample)
        samples.append(sample)
    
    await db_session.commit()
    return samples


class TestChartVisualization:
    """测试图表可视化功能"""
    
    @pytest.mark.asyncio
    async def test_format_trend_chart(self, db_session: AsyncSession, sample_data):
        """测试趋势图数据格式化"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="trend",
            granularity="day",
            use_cache=False
        )
        
        # 验证数据结构
        assert "type" in chart_data
        assert chart_data["type"] == "line"
        assert "xAxis" in chart_data
        assert "yAxis" in chart_data
        assert "series" in chart_data
        
        # 验证 x 轴数据
        assert chart_data["xAxis"]["type"] == "category"
        assert isinstance(chart_data["xAxis"]["data"], list)
        assert len(chart_data["xAxis"]["data"]) > 0
        
        # 验证 y 轴数据
        assert chart_data["yAxis"]["type"] == "value"
        
        # 验证系列数据
        assert len(chart_data["series"]) > 0
        assert chart_data["series"][0]["type"] == "line"
        assert isinstance(chart_data["series"][0]["data"], list)
    
    @pytest.mark.asyncio
    async def test_format_type_distribution_chart(self, db_session: AsyncSession, sample_data):
        """测试类型分布图数据格式化"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="type_distribution",
            use_cache=False
        )
        
        # 验证数据结构
        assert "type" in chart_data
        assert chart_data["type"] == "pie"
        assert "series" in chart_data
        
        # 验证系列数据
        assert len(chart_data["series"]) > 0
        assert chart_data["series"][0]["type"] == "pie"
        assert "data" in chart_data["series"][0]
        
        # 验证饼图数据格式
        pie_data = chart_data["series"][0]["data"]
        assert isinstance(pie_data, list)
        assert len(pie_data) > 0
        
        for item in pie_data:
            assert "name" in item
            assert "value" in item
            assert isinstance(item["value"], int)
    
    @pytest.mark.asyncio
    async def test_format_status_distribution_chart(self, db_session: AsyncSession, sample_data):
        """测试状态分布图数据格式化"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="status_distribution",
            use_cache=False
        )
        
        # 验证数据结构
        assert "type" in chart_data
        assert chart_data["type"] == "bar"
        assert "xAxis" in chart_data
        assert "yAxis" in chart_data
        assert "series" in chart_data
        
        # 验证 x 轴数据（状态）
        assert chart_data["xAxis"]["type"] == "category"
        assert isinstance(chart_data["xAxis"]["data"], list)
        
        # 验证系列数据
        assert len(chart_data["series"]) > 0
        assert chart_data["series"][0]["type"] == "bar"
    
    @pytest.mark.asyncio
    async def test_format_quality_rate_chart(self, db_session: AsyncSession, sample_data):
        """测试合格率图数据格式化"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="quality_rate",
            granularity="day",
            use_cache=False
        )
        
        # 验证数据结构
        assert "type" in chart_data
        assert chart_data["type"] == "line"
        assert "xAxis" in chart_data
        assert "yAxis" in chart_data
        assert "series" in chart_data
        
        # 验证 y 轴范围（合格率 0-100）
        assert chart_data["yAxis"]["min"] == 0
        assert chart_data["yAxis"]["max"] == 100
        
        # 验证系列数据
        series_data = chart_data["series"][0]["data"]
        for rate in series_data:
            assert 0 <= rate <= 100
    
    @pytest.mark.asyncio
    async def test_chart_data_with_filters(self, db_session: AsyncSession, sample_data):
        """测试带过滤条件的图表数据"""
        # 测试样品类型过滤
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="trend",
            sample_type="水质样品",
            granularity="day",
            use_cache=False
        )
        
        assert "series" in chart_data
        assert len(chart_data["series"]) > 0
        
        # 测试时间范围过滤
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)
        
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="trend",
            start_date=start_date,
            end_date=end_date,
            granularity="day",
            use_cache=False
        )
        
        assert "xAxis" in chart_data
        # 验证时间范围内的数据点数量
        assert len(chart_data["xAxis"]["data"]) <= 8  # 最多8天
    
    @pytest.mark.asyncio
    async def test_chart_data_granularity(self, db_session: AsyncSession, sample_data):
        """测试不同时间粒度的图表数据"""
        granularities = ["day", "week", "month", "year"]
        
        for granularity in granularities:
            chart_data = await StatisticsService.format_chart_data(
                db=db_session,
                chart_type="trend",
                granularity=granularity,
                use_cache=False
            )
            
            assert "xAxis" in chart_data
            assert "data" in chart_data["xAxis"]
            
            # 验证时间格式
            time_data = chart_data["xAxis"]["data"]
            if len(time_data) > 0:
                if granularity == "day":
                    assert "-" in time_data[0]  # YYYY-MM-DD
                elif granularity == "week":
                    assert "W" in time_data[0]  # YYYY-WXX
                elif granularity == "month":
                    assert len(time_data[0].split("-")) == 2  # YYYY-MM
                elif granularity == "year":
                    assert len(time_data[0]) == 4  # YYYY
    
    @pytest.mark.asyncio
    async def test_invalid_chart_type(self, db_session: AsyncSession):
        """测试无效的图表类型"""
        with pytest.raises(ValueError, match="不支持的图表类型"):
            await StatisticsService.format_chart_data(
                db=db_session,
                chart_type="invalid_type",
                use_cache=False
            )


class TestChartAPI:
    """测试图表 API 端点"""
    
    @pytest.mark.asyncio
    async def test_get_chart_data_trend(self, auth_headers, sample_data):
        """测试获取趋势图数据 API"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/trend",
                params={
                    "granularity": "day",
                    "use_cache": False
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["message"] == "获取图表数据成功"
            assert "data" in data
            
            chart_data = data["data"]
            assert chart_data["type"] == "line"
            assert "xAxis" in chart_data
            assert "yAxis" in chart_data
            assert "series" in chart_data
    
    @pytest.mark.asyncio
    async def test_get_chart_data_type_distribution(self, auth_headers, sample_data):
        """测试获取类型分布图数据 API"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/type_distribution",
                params={"use_cache": False},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            
            chart_data = data["data"]
            assert chart_data["type"] == "pie"
            assert "series" in chart_data
    
    @pytest.mark.asyncio
    async def test_get_chart_data_with_filters(self, auth_headers, sample_data):
        """测试带过滤条件的图表数据 API"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/trend",
                params={
                    "granularity": "day",
                    "sample_type": "水质样品",
                    "use_cache": False
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
    
    @pytest.mark.asyncio
    async def test_get_chart_data_invalid_type(self, auth_headers):
        """测试无效的图表类型"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/invalid_type",
                headers=auth_headers
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "error" in data or "detail" in data
    
    @pytest.mark.asyncio
    async def test_get_chart_data_invalid_granularity(self, auth_headers):
        """测试无效的时间粒度"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/trend",
                params={"granularity": "invalid"},
                headers=auth_headers
            )
            
            assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_get_chart_data_unauthorized(self, sample_data):
        """测试未授权访问"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/statistics/charts/trend"
            )
            
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_chart_data_caching(self, auth_headers, sample_data):
        """测试图表数据缓存"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            # 第一次请求（不使用缓存）
            response1 = await client.get(
                "/api/v1/statistics/charts/trend",
                params={
                    "granularity": "day",
                    "use_cache": True
                },
                headers=auth_headers
            )
            assert response1.status_code == 200
            
            # 第二次请求（应该从缓存获取）
            response2 = await client.get(
                "/api/v1/statistics/charts/trend",
                params={
                    "granularity": "day",
                    "use_cache": True
                },
                headers=auth_headers
            )
            assert response2.status_code == 200
            
            # 验证数据一致性
            assert response1.json()["data"] == response2.json()["data"]


class TestChartDataFormat:
    """测试图表数据格式兼容性"""
    
    @pytest.mark.asyncio
    async def test_echarts_line_chart_format(self, db_session: AsyncSession, sample_data):
        """测试 ECharts 折线图格式兼容性"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="trend",
            granularity="day",
            use_cache=False
        )
        
        # 验证 ECharts 必需字段
        assert "xAxis" in chart_data
        assert "yAxis" in chart_data
        assert "series" in chart_data
        
        # 验证 xAxis 格式
        x_axis = chart_data["xAxis"]
        assert x_axis["type"] in ["category", "value", "time"]
        assert "data" in x_axis
        
        # 验证 series 格式
        for series in chart_data["series"]:
            assert "type" in series
            assert "data" in series
            assert isinstance(series["data"], list)
    
    @pytest.mark.asyncio
    async def test_echarts_pie_chart_format(self, db_session: AsyncSession, sample_data):
        """测试 ECharts 饼图格式兼容性"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="type_distribution",
            use_cache=False
        )
        
        # 验证饼图格式
        assert "series" in chart_data
        pie_series = chart_data["series"][0]
        
        assert pie_series["type"] == "pie"
        assert "data" in pie_series
        
        # 验证饼图数据项格式
        for item in pie_series["data"]:
            assert "name" in item
            assert "value" in item
    
    @pytest.mark.asyncio
    async def test_echarts_bar_chart_format(self, db_session: AsyncSession, sample_data):
        """测试 ECharts 柱状图格式兼容性"""
        chart_data = await StatisticsService.format_chart_data(
            db=db_session,
            chart_type="status_distribution",
            use_cache=False
        )
        
        # 验证柱状图格式
        assert "xAxis" in chart_data
        assert "yAxis" in chart_data
        assert "series" in chart_data
        
        bar_series = chart_data["series"][0]
        assert bar_series["type"] == "bar"
        assert "data" in bar_series
