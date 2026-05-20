"""
数据库连接和会话管理

提供 SQLAlchemy 异步引擎、连接池配置和会话管理功能。
支持测试模式（使用 NullPool）和生产模式（使用连接池）。
"""
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker
)
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from sqlalchemy import event, text
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# 全局引擎和会话工厂
_engine: Optional[AsyncEngine] = None
_async_session_factory: Optional[async_sessionmaker[AsyncSession]] = None

# 为了向后兼容,提供 AsyncSessionLocal 别名
# 这样旧代码可以继续使用 AsyncSessionLocal() 创建会话
def AsyncSessionLocal() -> AsyncSession:
    """
    向后兼容的会话工厂函数
    
    注意：推荐使用 get_db() 依赖注入而不是直接创建会话
    
    Returns:
        AsyncSession: 异步数据库会话
    """
    session_factory = get_session_factory()
    return session_factory()


def get_engine() -> AsyncEngine:
    """
    获取或创建 SQLAlchemy 异步引擎
    
    根据配置创建异步引擎：
    - 测试模式：使用 NullPool（每次请求创建新连接）
    - 生产模式：使用连接池（复用连接）
    
    连接池配置（与 Node.js 后端一致）：
    - pool_size: 20（基础连接数）
    - max_overflow: 10（最大溢出连接数）
    - pool_timeout: 30秒（获取连接超时）
    - pool_recycle: 3600秒（连接回收时间）
    - pool_pre_ping: True（连接前检查）
    
    Returns:
        AsyncEngine: SQLAlchemy 异步引擎实例
    """
    global _engine
    
    if _engine is None:
        # 根据测试模式选择连接池类型
        if settings.TESTING:
            # 测试模式：使用 NullPool，每次请求创建新连接
            poolclass = NullPool
            logger.info("Creating async engine with NullPool (testing mode)")
        else:
            # 生产模式：使用连接池
            poolclass = AsyncAdaptedQueuePool
            logger.info(
                f"Creating async engine with connection pool "
                f"(pool_size={settings.DATABASE_POOL_SIZE}, "
                f"max_overflow={settings.DATABASE_MAX_OVERFLOW}, "
                f"pool_timeout={settings.DATABASE_POOL_TIMEOUT}s, "
                f"pool_recycle={settings.DATABASE_POOL_RECYCLE}s)"
            )
        
        # 创建异步引擎
        _engine = create_async_engine(
            settings.DATABASE_URL,
            poolclass=poolclass,
            pool_size=settings.DATABASE_POOL_SIZE if not settings.TESTING else 0,
            max_overflow=settings.DATABASE_MAX_OVERFLOW if not settings.TESTING else 0,
            pool_timeout=settings.DATABASE_POOL_TIMEOUT if not settings.TESTING else 30,
            pool_recycle=settings.DATABASE_POOL_RECYCLE if not settings.TESTING else 3600,
            pool_pre_ping=settings.DATABASE_POOL_PRE_PING if not settings.TESTING else True,  # 使用配置值
            echo=settings.DEBUG,  # 调试模式下打印 SQL 语句
            future=True,  # 使用 SQLAlchemy 2.0 风格
            # 性能优化：连接参数
            connect_args={
                "server_settings": {
                    "application_name": "fastapi_backend",
                    "jit": "off",  # 禁用 JIT 编译以提高小查询性能
                },
                "command_timeout": 60,  # 命令超时 60 秒
                "timeout": 10,  # 连接超时 10 秒
            } if not settings.TESTING else {},
        )
        
        # 注册事件监听器
        _register_engine_events(_engine)
    
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    获取或创建异步会话工厂
    
    Returns:
        async_sessionmaker: 异步会话工厂
    """
    global _async_session_factory
    
    if _async_session_factory is None:
        engine = get_engine()
        _async_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,  # 提交后不过期对象
            autocommit=False,  # 不自动提交
            autoflush=False,  # 不自动刷新
        )
        logger.info("Async session factory created")
    
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    依赖注入函数：提供异步数据库会话
    
    自动管理会话生命周期：
    - 创建会话
    - yield 会话供路由使用
    - 自动关闭会话（无论是否发生异常）
    
    使用示例：
        @router.get("/samples")
        async def list_samples(db: AsyncSession = Depends(get_db)):
            # 使用 db 进行数据库操作
            pass
    
    Yields:
        AsyncSession: 异步数据库会话
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception as e:
            # 发生异常时回滚事务
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            # 确保会话被关闭
            await session.close()


async def check_database_connection() -> bool:
    """
    检查数据库连接是否可用
    
    用于健康检查端点，验证数据库连接状态。
    
    Returns:
        bool: 连接可用返回 True，否则返回 False
    """
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            # 执行简单查询测试连接
            await conn.execute(text("SELECT 1"))
        logger.debug("Database connection check: OK")
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False


async def close_database_connection() -> None:
    """
    关闭数据库连接和引擎
    
    应在应用关闭时调用，清理资源。
    """
    global _engine, _async_session_factory
    
    if _engine is not None:
        await _engine.dispose()
        logger.info("Database engine disposed")
        _engine = None
        _async_session_factory = None


def _register_engine_events(engine: AsyncEngine) -> None:
    """
    注册引擎事件监听器
    
    监听连接事件，记录连接池状态和慢查询。
    与 Node.js 后端保持一致的监控策略：
    - 慢查询阈值：1000ms
    - 记录连接建立和关闭事件
    
    Args:
        engine: SQLAlchemy 异步引擎
    """
    
    @event.listens_for(engine.sync_engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        """连接建立时触发"""
        logger.debug("Database connection established")
    
    @event.listens_for(engine.sync_engine, "close")
    def receive_close(dbapi_conn, connection_record):
        """连接关闭时触发"""
        logger.debug("Database connection closed")
    
    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """查询执行前记录开始时间"""
        import time
        conn.info.setdefault('query_start_time', []).append(time.time())
    
    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """查询执行后检查是否为慢查询"""
        import time
        start_times = conn.info.get('query_start_time', [])
        if start_times:
            start_time = start_times.pop()
            duration = (time.time() - start_time) * 1000  # 转换为毫秒
            
            # 慢查询阈值：1000ms（与 Node.js 后端一致）
            if duration > 1000:
                logger.warning(
                    f"Slow query detected: {duration:.2f}ms",
                    extra={
                        "query": statement,
                        "duration": f"{duration:.2f}ms",
                        "params": parameters
                    }
                )
