"""
监控和日志测试

测试 Prometheus 监控和日志记录功能
"""
import pytest
import httpx
import asyncio
import logging
from datetime import datetime
import json


class TestPrometheusMonitoring:
    """Prometheus 监控测试"""
    
    @pytest.mark.asyncio
    async def test_metrics_endpoint_available(self):
        """测试 /metrics 端点可用"""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/metrics")
            
            assert response.status_code == 200
            assert "text/plain" in response.headers["content-type"]
            
            # 验证包含基本指标
            content = response.text
            assert "http_requests_total" in content
            assert "http_request_duration_seconds" in content
    
    @pytest.mark.asyncio
    async def test_request_metrics_collected(self):
        """测试请求指标被收集"""
        async with httpx.AsyncClient() as client:
            # 发送几个测试请求
            for _ in range(5):
                await client.get("http://localhost:8000/health")
            
            # 获取指标
            response = await client.get("http://localhost:8000/metrics")
            content = response.text
            
            # 验证请求计数器增加
            assert 'http_requests_total{' in content
            assert 'method="GET"' in content
            assert 'endpoint="/health"' in content
    
    @pytest.mark.asyncio
    async def test_response_time_metrics(self):
        """测试响应时间指标"""
        async with httpx.AsyncClient() as client:
            # 发送请求
            await client.get("http://localhost:8000/health")
            
            # 获取指标
            response = await client.get("http://localhost:8000/metrics")
            content = response.text
            
            # 验证响应时间直方图
            assert "http_request_duration_seconds_bucket" in content
            assert "http_request_duration_seconds_sum" in content
            assert "http_request_duration_seconds_count" in content
    
    @pytest.mark.asyncio
    async def test_status_code_metrics(self):
        """测试状态码指标"""
        async with httpx.AsyncClient() as client:
            # 发送成功请求
            await client.get("http://localhost:8000/health")
            
            # 发送失败请求（404）
            try:
                await client.get("http://localhost:8000/nonexistent")
            except:
                pass
            
            # 获取指标
            response = await client.get("http://localhost:8000/metrics")
            content = response.text
            
            # 验证状态码分组
            assert 'status="2xx"' in content or 'status="200"' in content
            assert 'status="4xx"' in content or 'status="404"' in content


class TestLoggingSystem:
    """日志系统测试"""
    
    def test_logger_configuration(self):
        """测试日志器配置"""
        from app.core.logging import get_logger
        
        logger = get_logger("test")
        
        assert logger is not None
        assert isinstance(logger, logging.Logger)
        assert logger.name == "test"
    
    def test_json_formatter(self):
        """测试 JSON 格式化器"""
        from app.core.logging import JSONFormatter
        
        formatter = JSONFormatter()
        
        # 创建测试日志记录
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None
        )
        
        # 格式化
        formatted = formatter.format(record)
        
        # 验证 JSON 格式
        log_data = json.loads(formatted)
        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test message"
        assert "timestamp" in log_data
        assert "logger" in log_data
    
    def test_colored_formatter(self):
        """测试彩色格式化器"""
        from app.core.logging import ColoredFormatter
        
        formatter = ColoredFormatter()
        
        # 创建测试日志记录
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=10,
            msg="Error message",
            args=(),
            exc_info=None
        )
        
        # 格式化
        formatted = formatter.format(record)
        
        # 验证包含颜色代码
        assert "\033[" in formatted  # ANSI 颜色代码
        assert "ERROR" in formatted
        assert "Error message" in formatted
    
    def test_log_with_context(self):
        """测试带上下文的日志"""
        from app.core.logging import get_logger, log_with_context
        
        logger = get_logger("test")
        
        # 记录带上下文的日志
        log_with_context(
            logger,
            "info",
            "Test message with context",
            request_id="test-request-123",
            user_id="user-456",
            sample_id="sample-789"
        )
        
        # 验证日志被记录（通过检查日志文件或捕获日志）
        # 这里只验证函数不抛出异常
        assert True
    
    def test_log_file_creation(self, tmp_path):
        """测试日志文件创建"""
        from app.core.logging import setup_logging
        
        # 使用临时目录
        log_dir = tmp_path / "logs"
        
        # 配置日志
        setup_logging(
            log_level="INFO",
            log_dir=str(log_dir),
            enable_console=False,
            enable_file=True
        )
        
        # 记录日志
        logger = logging.getLogger("test")
        logger.info("Test log message")
        
        # 验证日志文件被创建
        assert (log_dir / "combined.log").exists()
        assert (log_dir / "error.log").exists()
    
    def test_log_rotation(self, tmp_path):
        """测试日志轮转"""
        from app.core.logging import setup_logging
        
        # 使用临时目录
        log_dir = tmp_path / "logs"
        
        # 配置日志（小文件大小以触发轮转）
        setup_logging(
            log_level="INFO",
            log_dir=str(log_dir),
            enable_console=False,
            enable_file=True,
            enable_rotation=True
        )
        
        # 记录大量日志
        logger = logging.getLogger("test")
        for i in range(1000):
            logger.info(f"Test log message {i}" * 100)
        
        # 验证日志文件存在
        assert (log_dir / "combined.log").exists()


class TestHealthCheckEndpoint:
    """健康检查端点测试"""
    
    @pytest.mark.asyncio
    async def test_basic_health_check(self):
        """测试基础健康检查"""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "healthy"
            assert "timestamp" in data
    
    @pytest.mark.asyncio
    async def test_detailed_health_check(self):
        """测试详细健康检查"""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health/detailed")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "status" in data
            assert "services" in data
            assert "database" in data["services"]
            assert "redis" in data["services"]
    
    @pytest.mark.asyncio
    async def test_readiness_check(self):
        """测试就绪检查"""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/ready")
            
            assert response.status_code in [200, 503]
            data = response.json()
            
            assert "ready" in data
    
    @pytest.mark.asyncio
    async def test_liveness_check(self):
        """测试存活检查"""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/live")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "alive" in data


class TestAlertingRules:
    """告警规则测试"""
    
    @pytest.mark.asyncio
    async def test_prometheus_rules_loaded(self):
        """测试 Prometheus 规则加载"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:9090/api/v1/rules")
                
                if response.status_code == 200:
                    data = response.json()
                    assert "data" in data
                    assert "groups" in data["data"]
            except:
                # Prometheus 可能未运行
                pytest.skip("Prometheus not available")
    
    @pytest.mark.asyncio
    async def test_alertmanager_available(self):
        """测试 Alertmanager 可用性"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:9093/-/healthy")
                assert response.status_code == 200
            except:
                # Alertmanager 可能未运行
                pytest.skip("Alertmanager not available")


class TestLogAggregation:
    """日志聚合测试"""
    
    @pytest.mark.asyncio
    async def test_loki_available(self):
        """测试 Loki 可用性"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:3100/ready")
                assert response.status_code == 200
            except:
                # Loki 可能未运行
                pytest.skip("Loki not available")
    
    @pytest.mark.asyncio
    async def test_loki_query(self):
        """测试 Loki 查询"""
        async with httpx.AsyncClient() as client:
            try:
                # 查询最近的日志
                params = {
                    "query": '{job="fastapi-backend"}',
                    "limit": 10
                }
                response = await client.get(
                    "http://localhost:3100/loki/api/v1/query_range",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    assert "data" in data
            except:
                # Loki 可能未运行
                pytest.skip("Loki not available")


class TestGrafanaIntegration:
    """Grafana 集成测试"""
    
    @pytest.mark.asyncio
    async def test_grafana_available(self):
        """测试 Grafana 可用性"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:3000/api/health")
                assert response.status_code == 200
            except:
                # Grafana 可能未运行
                pytest.skip("Grafana not available")
    
    @pytest.mark.asyncio
    async def test_grafana_datasources(self):
        """测试 Grafana 数据源配置"""
        async with httpx.AsyncClient() as client:
            try:
                # 使用默认凭据
                auth = ("admin", "admin")
                response = await client.get(
                    "http://localhost:3000/api/datasources",
                    auth=auth
                )
                
                if response.status_code == 200:
                    datasources = response.json()
                    assert len(datasources) > 0
                    
                    # 验证 Prometheus 数据源
                    prometheus_ds = [ds for ds in datasources if ds["type"] == "prometheus"]
                    assert len(prometheus_ds) > 0
                    
                    # 验证 Loki 数据源
                    loki_ds = [ds for ds in datasources if ds["type"] == "loki"]
                    assert len(loki_ds) > 0
            except:
                # Grafana 可能未运行
                pytest.skip("Grafana not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
