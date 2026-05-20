"""
pytest 配置和 fixtures
"""
import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.core.database import get_db


# 测试数据库 URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory_test"

# 创建测试引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)

# 创建测试会话工厂
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """测试数据库会话"""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """测试数据库会话（别名）"""
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """异步 HTTP 客户端"""
    from httpx import ASGITransport
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def auth_headers() -> dict:
    """认证请求头（模拟）"""
    # TODO: 实现真实的 JWT 令牌生成
    return {
        "Authorization": "Bearer test-token"
    }
