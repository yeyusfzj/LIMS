"""
日志配置

实现结构化日志记录，支持：
- JSON 格式日志输出
- 日志轮转和归档
- 请求追踪（request_id）
- 用户追踪（user_id）
- 错误堆栈跟踪
- 性能指标记录

与 Node.js 后端的兼容性：
- 使用相同的日志级别
- 使用相同的日志格式
- 支持相同的日志字段
"""
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict, Optional
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path


class JSONFormatter(logging.Formatter):
    """
    JSON 格式日志格式化器
    
    将日志记录格式化为 JSON 格式，便于日志分析和查询。
    
    输出格式：
    {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "level": "INFO",
        "logger": "app.services.sample_service",
        "message": "样品创建成功",
        "module": "sample_service",
        "function": "create_sample",
        "line": 123,
        "request_id": "uuid",
        "user_id": "user_id",
        "exception": "堆栈跟踪信息"
    }
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        格式化日志记录为 JSON 字符串
        
        Args:
            record: 日志记录对象
        
        Returns:
            str: JSON 格式的日志字符串
        """
        # 基础日志数据
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # 添加请求 ID（如果存在）
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        # 添加用户 ID（如果存在）
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        
        # 添加额外字段（通过 extra 参数传递）
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # 添加堆栈跟踪（如果存在）
        if hasattr(record, "stack_info") and record.stack_info:
            log_data["stack_trace"] = record.stack_info
        
        return json.dumps(log_data, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """
    彩色日志格式化器（用于控制台输出）
    
    为不同日志级别添加颜色，提高可读性。
    """
    
    # ANSI 颜色代码
    COLORS = {
        'DEBUG': '\033[36m',      # 青色
        'INFO': '\033[32m',       # 绿色
        'WARNING': '\033[33m',    # 黄色
        'ERROR': '\033[31m',      # 红色
        'CRITICAL': '\033[35m',   # 紫色
        'RESET': '\033[0m'        # 重置
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """
        格式化日志记录并添加颜色
        
        Args:
            record: 日志记录对象
        
        Returns:
            str: 带颜色的日志字符串
        """
        # 获取颜色代码
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']
        
        # 格式化时间戳
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # 构建日志消息
        log_message = f"{color}[{record.levelname}]{reset} {timestamp} - {record.name} - {record.getMessage()}"
        
        # 添加异常信息
        if record.exc_info:
            log_message += f"\n{self.formatException(record.exc_info)}"
        
        return log_message


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    enable_console: bool = True,
    enable_file: bool = True,
    enable_json: bool = True,
    enable_rotation: bool = True
) -> logging.Logger:
    """
    配置日志系统
    
    Args:
        log_level: 日志级别（DEBUG, INFO, WARNING, ERROR, CRITICAL）
        log_dir: 日志文件目录
        enable_console: 是否启用控制台输出
        enable_file: 是否启用文件输出
        enable_json: 是否使用 JSON 格式（文件输出）
        enable_rotation: 是否启用日志轮转
    
    Returns:
        logging.Logger: 配置好的根日志器
    """
    # 创建日志目录
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    # 创建根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 清除现有处理器（避免重复配置）
    root_logger.handlers.clear()
    
    # 1. 控制台处理器（彩色输出）
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(ColoredFormatter())
        root_logger.addHandler(console_handler)
    
    # 2. 文件处理器 - 所有日志
    if enable_file:
        if enable_rotation:
            # 使用日志轮转（按大小）
            # 每个文件最大 10MB，保留 10 个备份文件
            all_logs_handler = RotatingFileHandler(
                filename=log_path / "combined.log",
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=10,
                encoding="utf-8"
            )
        else:
            # 不使用轮转
            all_logs_handler = logging.FileHandler(
                filename=log_path / "combined.log",
                encoding="utf-8"
            )
        
        all_logs_handler.setLevel(log_level)
        
        if enable_json:
            all_logs_handler.setFormatter(JSONFormatter())
        else:
            all_logs_handler.setFormatter(
                logging.Formatter(
                    '%(asctime)s [%(levelname)s] %(name)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S'
                )
            )
        
        root_logger.addHandler(all_logs_handler)
    
    # 3. 文件处理器 - 错误日志
    if enable_file:
        if enable_rotation:
            # 使用日志轮转（按大小）
            error_logs_handler = RotatingFileHandler(
                filename=log_path / "error.log",
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=10,
                encoding="utf-8"
            )
        else:
            error_logs_handler = logging.FileHandler(
                filename=log_path / "error.log",
                encoding="utf-8"
            )
        
        error_logs_handler.setLevel(logging.ERROR)
        
        if enable_json:
            error_logs_handler.setFormatter(JSONFormatter())
        else:
            error_logs_handler.setFormatter(
                logging.Formatter(
                    '%(asctime)s [%(levelname)s] %(name)s - %(message)s\n%(pathname)s:%(lineno)d',
                    datefmt='%Y-%m-%d %H:%M:%S'
                )
            )
        
        root_logger.addHandler(error_logs_handler)
    
    # 4. 文件处理器 - 访问日志（按天轮转）
    if enable_file and enable_rotation:
        access_logs_handler = TimedRotatingFileHandler(
            filename=log_path / "access.log",
            when="midnight",  # 每天午夜轮转
            interval=1,
            backupCount=30,  # 保留 30 天
            encoding="utf-8"
        )
        access_logs_handler.setLevel(logging.INFO)
        
        if enable_json:
            access_logs_handler.setFormatter(JSONFormatter())
        else:
            access_logs_handler.setFormatter(
                logging.Formatter(
                    '%(asctime)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S'
                )
            )
        
        # 只处理访问日志
        access_logs_handler.addFilter(lambda record: record.name == "access")
        root_logger.addHandler(access_logs_handler)
    
    # 设置第三方库日志级别（减少噪音）
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    获取指定名称的日志器
    
    Args:
        name: 日志器名称（通常使用 __name__）
    
    Returns:
        logging.Logger: 日志器实例
    
    示例：
        logger = get_logger(__name__)
        logger.info("这是一条信息日志")
        logger.error("这是一条错误日志", exc_info=True)
    """
    return logging.getLogger(name)


def log_with_context(
    logger: logging.Logger,
    level: str,
    message: str,
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **kwargs
):
    """
    记录带上下文信息的日志
    
    Args:
        logger: 日志器实例
        level: 日志级别（debug, info, warning, error, critical）
        message: 日志消息
        request_id: 请求 ID（可选）
        user_id: 用户 ID（可选）
        **kwargs: 其他额外字段
    
    示例：
        log_with_context(
            logger,
            "info",
            "样品创建成功",
            request_id="uuid",
            user_id="user123",
            sample_id="sample456"
        )
    """
    # 构建额外字段
    extra_fields = {}
    
    if request_id:
        extra_fields["request_id"] = request_id
    
    if user_id:
        extra_fields["user_id"] = user_id
    
    # 添加其他字段
    extra_fields.update(kwargs)
    
    # 获取日志方法
    log_method = getattr(logger, level.lower())
    
    # 记录日志
    log_method(message, extra={"extra_fields": extra_fields})


# 创建默认 logger 实例
logger = get_logger("app")


# 创建访问日志 logger
access_logger = get_logger("access")
