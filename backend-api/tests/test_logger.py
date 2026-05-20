"""
日志系统测试

测试日志记录、日志轮转和日志查询功能
"""

import pytest
import time
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import shutil

from app.agent.logger import AgentLogger, get_agent_logger, LogQuery


class TestAgentLogger:
    """测试 AgentLogger 类"""
    
    def test_logger_initialization(self):
        """测试日志记录器初始化"""
        logger = AgentLogger("test_logger")
        assert logger.logger is not None
        assert logger.logger.name == "test_logger"
    
    def test_log_request(self):
        """测试请求日志记录 (需求 13.1)"""
        logger = AgentLogger("test_request")
        
        # 记录请求日志
        logger.log_request(
            endpoint="/api/agent/parse",
            method="POST",
            user_id="user123",
            params={"text": "测试文本"}
        )
        
        # 验证日志文件存在
        log_file = Path("logs/agent.log")
        assert log_file.exists()
    
    def test_log_response(self):
        """测试响应日志记录 (需求 13.2, 13.7)"""
        logger = AgentLogger("test_response")
        
        # 记录响应日志
        logger.log_response(
            endpoint="/api/agent/parse",
            status_code=200,
            duration_ms=125.5,
            user_id="user123"
        )
        
        # 验证日志文件存在
        log_file = Path("logs/agent.log")
        assert log_file.exists()
    
    def test_log_error(self):
        """测试错误日志记录 (需求 13.3)"""
        logger = AgentLogger("test_error")
        
        # 记录错误日志
        logger.log_error(
            endpoint="/api/agent/parse",
            error_type="ValueError",
            error_message="输入文本不能为空",
            user_id="user123",
            stack_trace="Traceback..."
        )
        
        # 验证日志文件存在
        log_file = Path("logs/agent.log")
        assert log_file.exists()
    
    def test_get_agent_logger_singleton(self):
        """测试全局日志记录器单例模式"""
        logger1 = get_agent_logger()
        logger2 = get_agent_logger()
        
        # 应该返回同一个实例
        assert logger1 is logger2


class TestLogQuery:
    """测试 LogQuery 类"""
    
    def setup_method(self):
        """测试前准备：创建临时日志目录"""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.log_query = LogQuery(log_dir=self.temp_dir)
        
        # 创建测试日志文件
        self._create_test_logs()
    
    def teardown_method(self):
        """测试后清理：删除临时日志目录"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def _create_test_logs(self):
        """创建测试日志文件"""
        log_file = self.temp_dir / "agent.log"
        
        # 写入测试日志
        with open(log_file, 'w', encoding='utf-8') as f:
            # 请求日志
            f.write('2026-05-06 10:00:00 - ai_agent - INFO - routes - REQUEST - {"type": "request", "endpoint": "/api/agent/parse", "method": "POST", "user_id": "user123", "params": {}}\n')
            
            # 响应日志
            f.write('2026-05-06 10:00:01 - ai_agent - INFO - routes - RESPONSE - {"type": "response", "endpoint": "/api/agent/parse", "status_code": 200, "duration_ms": 125.5, "user_id": "user123"}\n')
            
            # 错误日志
            f.write('2026-05-06 10:00:02 - ai_agent - ERROR - routes - ERROR - {"type": "error", "endpoint": "/api/agent/parse", "error_type": "ValueError", "error_message": "输入文本不能为空", "user_id": "user123", "stack_trace": null}\n')
    
    def test_query_logs_all(self):
        """测试查询所有日志 (需求 13.10)"""
        logs = self.log_query.query_logs(limit=100)
        
        assert len(logs) == 3
        assert logs[0]["operation_type"] == "request"
        assert logs[1]["operation_type"] == "response"
        assert logs[2]["operation_type"] == "error"
    
    def test_query_logs_by_level(self):
        """测试按日志级别过滤 (需求 13.10)"""
        # 查询 ERROR 级别日志
        logs = self.log_query.query_logs(level="ERROR", limit=100)
        
        assert len(logs) == 1
        assert logs[0]["level"] == "ERROR"
        assert logs[0]["operation_type"] == "error"
    
    def test_query_logs_by_operation_type(self):
        """测试按操作类型过滤 (需求 13.10)"""
        # 查询请求日志
        logs = self.log_query.query_logs(operation_type="request", limit=100)
        
        assert len(logs) == 1
        assert logs[0]["operation_type"] == "request"
    
    def test_query_logs_by_time_range(self):
        """测试按时间范围查询 (需求 13.10)"""
        start_time = datetime(2026, 5, 6, 10, 0, 0)
        end_time = datetime(2026, 5, 6, 10, 0, 1)
        
        logs = self.log_query.query_logs(
            start_time=start_time,
            end_time=end_time,
            limit=100
        )
        
        # 应该只返回时间范围内的日志
        assert len(logs) == 2  # 10:00:00 和 10:00:01
    
    def test_get_statistics(self):
        """测试获取日志统计信息"""
        stats = self.log_query.get_statistics()
        
        assert stats["total_logs"] == 3
        assert stats["by_level"]["INFO"] == 2
        assert stats["by_level"]["ERROR"] == 1
        assert stats["by_operation"]["request"] == 1
        assert stats["by_operation"]["response"] == 1
        assert stats["by_operation"]["error"] == 1
        assert stats["avg_duration_ms"] == 125.5
        assert stats["error_count"] == 1
    
    def test_cleanup_old_logs(self):
        """测试清理旧日志文件 (需求 13.9)"""
        # 创建一个旧日志文件
        old_log = self.temp_dir / "agent.log.1"
        old_log.touch()
        
        # 修改文件时间为 31 天前
        old_time = time.time() - (31 * 24 * 60 * 60)
        import os
        os.utime(old_log, (old_time, old_time))
        
        # 清理旧日志
        self.log_query.cleanup_old_logs(days=30)
        
        # 验证旧日志文件已被删除
        assert not old_log.exists()


class TestLogRotation:
    """测试日志轮转功能"""
    
    def test_log_file_size_limit(self):
        """测试日志文件大小限制 (需求 13.8)"""
        # 注意：这个测试需要写入大量数据，可能比较慢
        # 在实际环境中，日志轮转由 RotatingFileHandler 自动处理
        
        # 验证日志配置
        from app.agent.logger import LOG_MAX_BYTES
        assert LOG_MAX_BYTES == 100 * 1024 * 1024  # 100MB


def test_log_format():
    """测试日志格式包含必需字段 (需求 13.4, 13.5, 13.6)"""
    from app.agent.logger import LOG_FORMAT
    
    # 验证日志格式包含时间戳、级别、模块名
    assert "%(asctime)s" in LOG_FORMAT  # 时间戳 (需求 13.4)
    assert "%(levelname)s" in LOG_FORMAT  # 日志级别
    assert "%(module)s" in LOG_FORMAT  # 模块名
    assert "%(message)s" in LOG_FORMAT  # 消息


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
