"""
AI Agent API 日志集成测试

测试 API 端点的日志记录功能
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import time

from app.main import app
from app.agent.logger import LogQuery


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def log_query():
    """创建日志查询工具"""
    return LogQuery()


class TestAgentAPILogging:
    """测试 AI Agent API 日志记录"""
    
    def test_parse_endpoint_logging(self, client, log_query):
        """测试 /parse 端点的日志记录"""
        # 发送请求
        response = client.post(
            "/api/agent/parse",
            json={"text": "我需要检测水样中的重金属含量"}
        )
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 等待日志写入
        time.sleep(0.1)
        
        # 查询日志
        logs = log_query.query_logs(operation_type="request", limit=10)
        
        # 验证请求日志存在
        assert len(logs) > 0
        request_log = logs[0]
        assert request_log["operation_type"] == "request"
        assert "/api/agent/parse" in str(request_log["data"])
        
        # 查询响应日志
        logs = log_query.query_logs(operation_type="response", limit=10)
        assert len(logs) > 0
        response_log = logs[0]
        assert response_log["operation_type"] == "response"
        assert response_log["data"]["status_code"] == 200
        assert "duration_ms" in response_log["data"]
    
    def test_parse_endpoint_error_logging(self, client, log_query):
        """测试 /parse 端点的错误日志记录"""
        # 发送空文本请求（应该触发错误）
        response = client.post(
            "/api/agent/parse",
            json={"text": ""}
        )
        
        # 验证响应为错误
        assert response.status_code == 400
        
        # 等待日志写入
        time.sleep(0.1)
        
        # 查询错误日志
        logs = log_query.query_logs(operation_type="error", limit=10)
        
        # 验证错误日志存在
        assert len(logs) > 0
        error_log = logs[0]
        assert error_log["operation_type"] == "error"
        assert error_log["level"] == "ERROR"
        assert "/api/agent/parse" in str(error_log["data"])
    
    def test_plan_endpoint_logging(self, client, log_query):
        """测试 /plan 端点的日志记录"""
        # 发送请求
        response = client.post(
            "/api/agent/plan",
            json={
                "parsed_fields": {
                    "purpose": "检测水样重金属含量",
                    "sample_type": "水样",
                    "indicators": ["铅", "汞", "镉"],
                    "equipment": [],
                    "materials": [],
                    "steps": [],
                    "estimated_time": "",
                    "confidence": 0.85
                }
            }
        )
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 等待日志写入
        time.sleep(0.1)
        
        # 查询日志
        logs = log_query.query_logs(operation_type="request", limit=10)
        
        # 验证请求日志存在
        assert len(logs) > 0
        found = False
        for log in logs:
            if "/api/agent/plan" in str(log["data"]):
                found = True
                break
        assert found
    
    def test_qa_endpoint_logging(self, client, log_query):
        """测试 /qa 端点的日志记录"""
        # 发送请求
        response = client.post(
            "/api/agent/qa",
            json={
                "question": "水质检测需要什么设备？",
                "context": {}
            }
        )
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 等待日志写入
        time.sleep(0.1)
        
        # 查询日志
        logs = log_query.query_logs(operation_type="request", limit=10)
        
        # 验证请求日志存在
        assert len(logs) > 0
        found = False
        for log in logs:
            if "/api/agent/qa" in str(log["data"]):
                found = True
                break
        assert found
    
    def test_result_analysis_endpoint_logging(self, client, log_query):
        """测试 /result-analysis 端点的日志记录"""
        # 发送请求
        response = client.post(
            "/api/agent/result-analysis",
            json={
                "result_data": {
                    "铅含量": 0.005,
                    "汞含量": 0.0001,
                    "镉含量": 0.003
                }
            }
        )
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 等待日志写入
        time.sleep(0.1)
        
        # 查询日志
        logs = log_query.query_logs(operation_type="request", limit=10)
        
        # 验证请求日志存在
        assert len(logs) > 0
        found = False
        for log in logs:
            if "/api/agent/result-analysis" in str(log["data"]):
                found = True
                break
        assert found
    
    def test_log_query_api(self, client):
        """测试日志查询 API (需求 13.10)"""
        # 查询日志
        response = client.get("/api/agent/logs?limit=10")
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 验证响应格式
        data = response.json()
        assert "total" in data
        assert "logs" in data
        assert isinstance(data["logs"], list)
    
    def test_log_query_api_with_filters(self, client):
        """测试带过滤条件的日志查询 API"""
        # 查询错误日志
        response = client.get("/api/agent/logs?level=ERROR&limit=10")
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 验证响应格式
        data = response.json()
        assert "total" in data
        assert "logs" in data
        
        # 验证所有日志都是 ERROR 级别
        for log in data["logs"]:
            assert log["level"] == "ERROR"
    
    def test_log_statistics_api(self, client):
        """测试日志统计 API"""
        # 获取统计信息
        response = client.get("/api/agent/logs/statistics")
        
        # 验证响应成功
        assert response.status_code == 200
        
        # 验证响应格式
        data = response.json()
        assert "total_logs" in data
        assert "by_level" in data
        assert "by_operation" in data
        assert "avg_duration_ms" in data
        assert "error_count" in data
        
        # 验证统计数据结构
        assert "INFO" in data["by_level"]
        assert "WARNING" in data["by_level"]
        assert "ERROR" in data["by_level"]
        assert "request" in data["by_operation"]
        assert "response" in data["by_operation"]
        assert "error" in data["by_operation"]


class TestLogFileRotation:
    """测试日志文件轮转"""
    
    def test_log_directory_exists(self):
        """测试日志目录存在"""
        log_dir = Path("logs")
        assert log_dir.exists()
        assert log_dir.is_dir()
    
    def test_log_file_exists(self):
        """测试日志文件存在"""
        log_file = Path("logs/agent.log")
        assert log_file.exists()
        assert log_file.is_file()
    
    def test_log_file_size_limit_config(self):
        """测试日志文件大小限制配置 (需求 13.8)"""
        from app.agent.logger import LOG_MAX_BYTES, LOG_BACKUP_COUNT
        
        # 验证配置值
        assert LOG_MAX_BYTES == 100 * 1024 * 1024  # 100MB
        assert LOG_BACKUP_COUNT == 30  # 保留 30 天


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
