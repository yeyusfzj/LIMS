"""
日志系统 - 本地轻量化 AI 智能体

提供统一的日志记录功能，包括：
- 请求日志记录
- 响应日志记录
- 错误日志记录
- 处理耗时记录
- 日志轮转（按大小和时间）
- 日志查询接口

验证需求：需求 13.1-13.10
"""

import logging
import logging.handlers
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from functools import wraps
import json

# 日志配置
LOG_DIR = Path("logs")
LOG_FILE = "agent.log"
LOG_MAX_BYTES = 100 * 1024 * 1024  # 100MB (需求 13.8)
LOG_BACKUP_COUNT = 30  # 保留最近 30 天的日志 (需求 13.9)
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class AgentLogger:
    """
    AI Agent 日志记录器
    
    功能：
    - 配置日志格式（时间戳、级别、模块名、消息）
    - 实现日志轮转（按大小）
    - 记录请求、响应、错误和处理耗时
    """
    
    def __init__(self, name: str = "ai_agent"):
        """
        初始化日志记录器
        
        Args:
            name: 日志记录器名称
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # 避免重复添加处理器
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """
        设置日志处理器
        
        包括：
        - 文件处理器（带轮转）
        - 控制台处理器
        """
        # 确保日志目录存在
        LOG_DIR.mkdir(exist_ok=True)
        
        # 创建格式化器 (需求 13.4)
        formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
        
        # 文件处理器 - 按大小轮转 (需求 13.8)
        file_handler = logging.handlers.RotatingFileHandler(
            LOG_DIR / LOG_FILE,
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # 控制台处理器
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
    
    def log_request(self, endpoint: str, method: str, user_id: Optional[str] = None, 
                   params: Optional[Dict[str, Any]] = None):
        """
        记录 API 请求日志 (需求 13.1)
        
        Args:
            endpoint: API 端点
            method: HTTP 方法
            user_id: 用户标识 (需求 13.5)
            params: 请求参数
        """
        log_data = {
            "type": "request",  # 需求 13.6
            "endpoint": endpoint,
            "method": method,
            "user_id": user_id or "anonymous",
            "params": params or {}
        }
        self.logger.info(f"REQUEST - {json.dumps(log_data, ensure_ascii=False)}")
    
    def log_response(self, endpoint: str, status_code: int, duration_ms: float,
                    user_id: Optional[str] = None):
        """
        记录 API 响应日志 (需求 13.2, 13.7)
        
        Args:
            endpoint: API 端点
            status_code: HTTP 状态码
            duration_ms: 处理耗时（毫秒）
            user_id: 用户标识
        """
        log_data = {
            "type": "response",  # 需求 13.6
            "endpoint": endpoint,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),  # 需求 13.7
            "user_id": user_id or "anonymous"
        }
        self.logger.info(f"RESPONSE - {json.dumps(log_data, ensure_ascii=False)}")
    
    def log_error(self, endpoint: str, error_type: str, error_message: str,
                 user_id: Optional[str] = None, stack_trace: Optional[str] = None):
        """
        记录错误日志 (需求 13.3)
        
        Args:
            endpoint: API 端点
            error_type: 错误类型
            error_message: 错误消息
            user_id: 用户标识
            stack_trace: 错误堆栈
        """
        log_data = {
            "type": "error",  # 需求 13.6
            "endpoint": endpoint,
            "error_type": error_type,
            "error_message": error_message,
            "user_id": user_id or "anonymous",
            "stack_trace": stack_trace
        }
        self.logger.error(f"ERROR - {json.dumps(log_data, ensure_ascii=False)}")
    
    def info(self, message: str):
        """记录信息日志"""
        self.logger.info(message)
    
    def warning(self, message: str):
        """记录警告日志"""
        self.logger.warning(message)
    
    def error(self, message: str, exc_info: bool = False):
        """记录错误日志"""
        self.logger.error(message, exc_info=exc_info)
    
    def debug(self, message: str):
        """记录调试日志"""
        self.logger.debug(message)


# 全局日志记录器实例
_agent_logger: Optional[AgentLogger] = None


def get_agent_logger() -> AgentLogger:
    """
    获取全局日志记录器实例（单例模式）
    
    Returns:
        AgentLogger: 日志记录器实例
    """
    global _agent_logger
    if _agent_logger is None:
        _agent_logger = AgentLogger()
    return _agent_logger


def log_api_call(func):
    """
    API 调用日志装饰器
    
    自动记录：
    - 请求日志
    - 响应日志
    - 错误日志
    - 处理耗时
    
    使用示例：
        @log_api_call
        async def my_endpoint(request: Request):
            ...
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger = get_agent_logger()
        start_time = time.time()
        
        # 提取端点信息
        endpoint = func.__name__
        
        # 记录请求日志
        logger.log_request(endpoint, "POST")
        
        try:
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 计算耗时
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录响应日志
            logger.log_response(endpoint, 200, duration_ms)
            
            return result
        
        except Exception as e:
            # 计算耗时
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录错误日志
            import traceback
            logger.log_error(
                endpoint,
                type(e).__name__,
                str(e),
                stack_trace=traceback.format_exc()
            )
            
            # 记录响应日志（错误状态）
            logger.log_response(endpoint, 500, duration_ms)
            
            # 重新抛出异常
            raise
    
    return wrapper


class LogQuery:
    """
    日志查询工具 (需求 13.10)
    
    功能：
    - 按时间范围查询
    - 按错误级别过滤
    - 按操作类型过滤
    """
    
    def __init__(self, log_dir: Path = LOG_DIR):
        """
        初始化日志查询工具
        
        Args:
            log_dir: 日志目录
        """
        self.log_dir = log_dir
    
    def query_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        level: Optional[str] = None,
        operation_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        查询日志
        
        Args:
            start_time: 开始时间
            end_time: 结束时间
            level: 日志级别（INFO, WARNING, ERROR）
            operation_type: 操作类型（request, response, error）
            limit: 返回结果数量限制
        
        Returns:
            List[Dict[str, Any]]: 日志记录列表
        """
        logs = []
        
        # 获取所有日志文件
        log_files = sorted(self.log_dir.glob("agent.log*"), reverse=True)
        
        for log_file in log_files:
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        # 解析日志行
                        log_entry = self._parse_log_line(line)
                        if log_entry is None:
                            continue
                        
                        # 应用过滤条件
                        if not self._matches_filters(
                            log_entry, start_time, end_time, level, operation_type
                        ):
                            continue
                        
                        logs.append(log_entry)
                        
                        # 达到限制数量
                        if len(logs) >= limit:
                            return logs
            
            except Exception as e:
                # 忽略读取错误，继续处理其他文件
                continue
        
        return logs
    
    def _parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        """
        解析日志行
        
        Args:
            line: 日志行文本
        
        Returns:
            Optional[Dict[str, Any]]: 解析后的日志记录，解析失败返回 None
        """
        try:
            # 日志格式: 2026-05-06 10:30:00 - ai_agent - INFO - module - message
            parts = line.split(" - ", 4)
            if len(parts) < 5:
                return None
            
            timestamp_str, logger_name, level, module, message = parts
            
            # 解析时间戳
            timestamp = datetime.strptime(timestamp_str, LOG_DATE_FORMAT)
            
            # 提取操作类型和数据
            operation_type = None
            data = {}
            
            if "REQUEST" in message:
                operation_type = "request"
                json_str = message.split("REQUEST - ", 1)[1]
                data = json.loads(json_str)
            elif "RESPONSE" in message:
                operation_type = "response"
                json_str = message.split("RESPONSE - ", 1)[1]
                data = json.loads(json_str)
            elif "ERROR" in message:
                operation_type = "error"
                json_str = message.split("ERROR - ", 1)[1]
                data = json.loads(json_str)
            
            return {
                "timestamp": timestamp.isoformat(),
                "level": level,
                "module": module,
                "operation_type": operation_type,
                "message": message.strip(),
                "data": data
            }
        
        except Exception:
            return None
    
    def _matches_filters(
        self,
        log_entry: Dict[str, Any],
        start_time: Optional[datetime],
        end_time: Optional[datetime],
        level: Optional[str],
        operation_type: Optional[str]
    ) -> bool:
        """
        检查日志记录是否匹配过滤条件
        
        Args:
            log_entry: 日志记录
            start_time: 开始时间
            end_time: 结束时间
            level: 日志级别
            operation_type: 操作类型
        
        Returns:
            bool: 是否匹配
        """
        # 时间范围过滤
        if start_time or end_time:
            timestamp = datetime.fromisoformat(log_entry["timestamp"])
            if start_time and timestamp < start_time:
                return False
            if end_time and timestamp > end_time:
                return False
        
        # 日志级别过滤
        if level and log_entry["level"] != level:
            return False
        
        # 操作类型过滤
        if operation_type and log_entry.get("operation_type") != operation_type:
            return False
        
        return True
    
    def get_statistics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        获取日志统计信息
        
        Args:
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            Dict[str, Any]: 统计信息
        """
        logs = self.query_logs(start_time, end_time, limit=10000)
        
        stats = {
            "total_logs": len(logs),
            "by_level": {"INFO": 0, "WARNING": 0, "ERROR": 0},
            "by_operation": {"request": 0, "response": 0, "error": 0},
            "avg_duration_ms": 0.0,
            "error_count": 0
        }
        
        durations = []
        
        for log in logs:
            # 按级别统计
            level = log.get("level", "INFO")
            if level in stats["by_level"]:
                stats["by_level"][level] += 1
            
            # 按操作类型统计
            op_type = log.get("operation_type")
            if op_type in stats["by_operation"]:
                stats["by_operation"][op_type] += 1
            
            # 收集响应时间
            if op_type == "response":
                data = log.get("data", {})
                duration = data.get("duration_ms")
                if duration:
                    durations.append(duration)
            
            # 错误计数
            if level == "ERROR":
                stats["error_count"] += 1
        
        # 计算平均响应时间
        if durations:
            stats["avg_duration_ms"] = round(sum(durations) / len(durations), 2)
        
        return stats
    
    def cleanup_old_logs(self, days: int = 30):
        """
        清理旧日志文件 (需求 13.9)
        
        Args:
            days: 保留天数
        """
        cutoff_time = datetime.now() - timedelta(days=days)
        
        for log_file in self.log_dir.glob("agent.log.*"):
            try:
                # 获取文件修改时间
                mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                
                # 删除超过保留期的文件
                if mtime < cutoff_time:
                    log_file.unlink()
                    print(f"已删除旧日志文件: {log_file}")
            
            except Exception as e:
                print(f"清理日志文件失败 {log_file}: {e}")


# 导出公共接口
__all__ = [
    "AgentLogger",
    "get_agent_logger",
    "log_api_call",
    "LogQuery"
]
