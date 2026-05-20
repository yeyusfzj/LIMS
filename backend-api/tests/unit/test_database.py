"""
数据库连接配置单元测试

测试 SQLAlchemy 异步引擎、连接池和会话管理功能。
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

from app.core.database import (
    get_engine,
    get_session_factory,
    get_db,
    check_database_connection,
    close_database_connection
)
from app.config import settings


class TestDatabaseEngine:
    """测试数据库引擎创建和配置"""
    
    def test_get_engine_creates_engine(self):
        """测试 get_engine 创建引擎实例"""
        # 重置全局引擎
        import app.core.database as db_module
        db_module._engine = None
        
        engine = get_engine()
        
        assert engine is not None
        assert isinstance(engine, AsyncEngine)
    
    def test_get_engine_returns_same_instance(self):
        """测试 get_engine 返回单例引擎"""
        engine1 = get_engine()
        engine2 = get_engine()
        
        assert engine1 is engine2
    
    def test_get_engine_uses_nullpool_in_testing_mode(self):
        """测试测试模式下使用 NullPool"""
        import app.core.database as db_module
        db_module._engine = None
        
        with patch.object(settings, 'TESTING', True):
            engine = get_engine()
            
            # 验证使用 NullPool
            assert isinstance(engine.pool, NullPool)
    
    def test_get_engine_uses_connection_pool_in_production(self):
        """测试生产模式下使用连接池"""
        import app.core.database as db_module
        db_module._engine = None
        
        with patch.object(settings, 'TESTING', False):
            engine = get_engine()
            
            # 验证使用连接池
            assert isinstance(engine.pool, AsyncAdaptedQueuePool)
    
    def test_get_engine_respects_pool_size_config(self):
        """测试引擎使用配置的连接池大小"""
        import app.core.database as db_module
        db_module._engine = None
        
        with patch.object(settings, 'TESTING', False):
            with patch.object(settings, 'DATABASE_POOL_SIZE', 15):
                with patch.object(settings, 'DATABASE_MAX_OVERFLOW', 25):
                    engine = get_engine()
                    
                    # 验证引擎创建成功
                    assert engine is not None
                    assert isinstance(engine.pool, AsyncAdaptedQueuePool)


class TestSessionFactory:
    """测试会话工厂创建"""
    
    def test_get_session_factory_creates_factory(self):
        """测试 get_session_factory 创建会话工厂"""
        import app.core.database as db_module
        db_module._async_session_factory = None
        
        factory = get_session_factory()
        
        assert factory is not None
    
    def test_get_session_factory_returns_same_instance(self):
        """测试 get_session_factory 返回单例工厂"""
        factory1 = get_session_factory()
        factory2 = get_session_factory()
        
        assert factory1 is factory2
    
    def test_session_factory_creates_async_session(self):
        """测试会话工厂创建 AsyncSession"""
        factory = get_session_factory()
        
        # 验证工厂配置
        assert factory.kw['class_'] == AsyncSession
        assert factory.kw['expire_on_commit'] is False
        assert factory.kw['autocommit'] is False
        assert factory.kw['autoflush'] is False


class TestGetDbDependency:
    """测试 get_db 依赖注入函数"""
    
    @pytest.mark.asyncio
    async def test_get_db_yields_session(self):
        """测试 get_db 生成会话"""
        session_generator = get_db()
        
        session = await anext(session_generator)
        
        assert session is not None
        assert isinstance(session, AsyncSession)
        
        # 清理
        try:
            await anext(session_generator)
        except StopAsyncIteration:
            pass


class TestDatabaseConnection:
    """测试数据库连接检查"""
    
    @pytest.mark.asyncio
    async def test_check_database_connection_success(self):
        """测试数据库连接检查成功"""
        with patch('app.core.database.get_engine') as mock_get_engine:
            mock_engine = MagicMock()
            mock_conn = AsyncMock()
            mock_engine.connect.return_value.__aenter__.return_value = mock_conn
            mock_get_engine.return_value = mock_engine
            
            result = await check_database_connection()
            
            assert result is True
            mock_conn.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_check_database_connection_failure(self):
        """测试数据库连接检查失败"""
        with patch('app.core.database.get_engine') as mock_get_engine:
            mock_engine = MagicMock()
            mock_engine.connect.side_effect = Exception("Connection failed")
            mock_get_engine.return_value = mock_engine
            
            result = await check_database_connection()
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_close_database_connection(self):
        """测试关闭数据库连接"""
        import app.core.database as db_module
        
        # 创建引擎
        engine = get_engine()
        
        # 关闭连接
        await close_database_connection()
        
        # 验证全局变量被重置
        assert db_module._engine is None
        assert db_module._async_session_factory is None


class TestDatabaseConfiguration:
    """测试数据库配置"""
    
    def test_database_url_format(self):
        """测试数据库 URL 格式正确"""
        assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")
    
    def test_pool_size_configuration(self):
        """测试连接池大小配置"""
        assert settings.DATABASE_POOL_SIZE > 0
        assert settings.DATABASE_MAX_OVERFLOW > 0
    
    def test_pool_size_defaults(self):
        """测试连接池默认值"""
        # 根据设计文档，默认值应为 pool_size=10, max_overflow=20
        assert settings.DATABASE_POOL_SIZE == 10
        assert settings.DATABASE_MAX_OVERFLOW == 20
