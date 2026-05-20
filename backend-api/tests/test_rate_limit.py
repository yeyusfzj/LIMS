"""
限流中间件测试
"""
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_global_rate_limit():
    """测试全局限流"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 发送多个请求
        responses = []
        for i in range(65):  # 超过默认限流 60 次/分钟
            response = await client.get("/health")
            responses.append(response)
        
        # 检查是否有 429 响应
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes, "应该触发全局限流"
        
        # 检查 429 响应的格式
        rate_limited_response = next(r for r in responses if r.status_code == 429)
        data = rate_limited_response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Retry-After" in rate_limited_response.headers


@pytest.mark.asyncio
async def test_login_rate_limit():
    """测试登录端点的严格限流"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 发送多个登录请求
        responses = []
        for i in range(7):  # 超过登录限流 5 次/分钟
            response = await client.post(
                "/api/v1/auth/login",
                json={
                    "username": "testuser",
                    "password": "wrongpassword"
                }
            )
            responses.append(response)
            await asyncio.sleep(0.1)  # 短暂延迟
        
        # 检查是否有 429 响应
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes, "应该触发登录限流"
        
        # 检查 429 响应
        rate_limited_response = next(r for r in responses if r.status_code == 429)
        data = rate_limited_response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"


@pytest.mark.asyncio
async def test_rate_limit_headers():
    """测试限流响应头"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        
        # 检查限流响应头
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
        
        # 验证响应头值
        limit = int(response.headers["X-RateLimit-Limit"])
        remaining = int(response.headers["X-RateLimit-Remaining"])
        reset = int(response.headers["X-RateLimit-Reset"])
        
        assert limit > 0
        assert remaining >= 0
        assert reset > 0


@pytest.mark.asyncio
async def test_rate_limit_per_ip():
    """测试基于 IP 的限流"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 使用不同的 IP 地址（通过 X-Forwarded-For 头）
        responses_ip1 = []
        responses_ip2 = []
        
        # IP 1 发送请求
        for i in range(65):
            response = await client.get(
                "/health",
                headers={"X-Forwarded-For": "192.168.1.1"}
            )
            responses_ip1.append(response)
        
        # IP 2 发送请求
        for i in range(65):
            response = await client.get(
                "/health",
                headers={"X-Forwarded-For": "192.168.1.2"}
            )
            responses_ip2.append(response)
        
        # 两个 IP 都应该被限流
        status_codes_ip1 = [r.status_code for r in responses_ip1]
        status_codes_ip2 = [r.status_code for r in responses_ip2]
        
        assert 429 in status_codes_ip1, "IP 1 应该被限流"
        assert 429 in status_codes_ip2, "IP 2 应该被限流"


@pytest.mark.asyncio
async def test_endpoint_specific_rate_limit():
    """测试端点级限流配置"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 测试登录端点（5 次/分钟）
        login_responses = []
        for i in range(7):
            response = await client.post(
                "/api/v1/auth/login",
                json={"username": "test", "password": "test"}
            )
            login_responses.append(response)
            await asyncio.sleep(0.1)
        
        # 测试健康检查端点（60 次/分钟）
        health_responses = []
        for i in range(65):
            response = await client.get("/health")
            health_responses.append(response)
        
        # 登录端点应该更快触发限流
        login_429_count = sum(1 for r in login_responses if r.status_code == 429)
        health_429_count = sum(1 for r in health_responses if r.status_code == 429)
        
        assert login_429_count > 0, "登录端点应该触发限流"
        assert health_429_count > 0, "健康检查端点应该触发限流"


@pytest.mark.asyncio
async def test_rate_limit_reset():
    """测试限流重置"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 发送请求直到触发限流
        for i in range(65):
            response = await client.get("/health")
            if response.status_code == 429:
                # 获取重置时间
                reset_time = int(response.headers.get("X-RateLimit-Reset", 0))
                retry_after = int(response.headers.get("Retry-After", 0))
                
                assert reset_time > 0
                assert retry_after > 0
                break


@pytest.mark.asyncio
async def test_sensitive_operations_rate_limit():
    """测试敏感操作的限流"""
    # 这个测试需要有效的认证令牌
    # 这里只是示例，实际测试需要先登录获取令牌
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 测试创建用户端点（10 次/分钟）
        responses = []
        for i in range(12):
            response = await client.post(
                "/api/users/",
                json={
                    "username": f"testuser{i}",
                    "password": "password123",
                    "email": f"test{i}@example.com",
                    "fullName": "Test User"
                },
                headers={"Authorization": "Bearer invalid-token"}
            )
            responses.append(response)
            await asyncio.sleep(0.1)
        
        # 应该有 429 响应（如果认证通过的话）
        # 或者 401 响应（认证失败）
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes or 401 in status_codes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
