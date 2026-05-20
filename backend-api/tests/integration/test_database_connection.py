"""
数据库连接集成测试

测试实际的数据库连接和会话管理功能。
"""
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, check_database_connection


class TestDatabaseConnection:
    """测试数据库连接"""
    
    @pytest.mark.asyncio
    async def test_database_connection_check(self):
        """测试数据库连接检查功能"""
        result = await check_database_connection()
        
        # 如果数据库可用，应返回 True
        # 如果数据库不可用，应返回 False（不抛出异常）
        assert isinstance(result, bool)
    
    @pytest.mark.asyncio
    async def test_get_db_session(self):
        """测试获取数据库会话"""
        async for session in get_db():
            assert session is not None
            assert isinstance(session, AsyncSession)
            
            # 测试执行简单查询
            result = await session.execute(text("SELECT 1 as num"))
            row = result.fetchone()
            
            assert row is not None
            assert row[0] == 1
    
    @pytest.mark.asyncio
    async def test_session_transaction(self):
        """测试会话事务功能"""
        async for session in get_db():
            # 开始事务
            async with session.begin():
                # 执行查询
                result = await session.execute(text("SELECT 1 as num"))
                row = result.fetchone()
                
                assert row is not None
                assert row[0] == 1
            
            # 事务应自动提交
