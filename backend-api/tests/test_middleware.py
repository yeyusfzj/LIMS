"""
中间件测试

测试所有中间件的功能：
1. CORS 中间件
2. 限流中间件
3. 日志中间件
4. 错误处理中间件
"""

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from fastapi.responses import JSONResponse
from app.middleware.cors import configure_cors
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    UnauthorizedException
)
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError


class TestCORSMiddleware:
    """测试 CORS 中间件"""
    
    def test_cors_headers_present(self):
        """测试 CORS 响应头是否存在"""
        app = FastAPI()
        configure_cors(app)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        response = client.get(
            "/test",
            headers={"Origin": "http://localhost:5173"}
        )
        
        assert response.status_code == 200
        # CORS 头应该存在
        assert "access-control-allow-origin" in response.headers
    
    def test_cors_preflight_request(self):
        """测试 CORS 预检请求"""
        app = FastAPI()
        configure_cors(app)
        
        @app.post("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        response = client.options(
            "/test",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers


class TestRateLimitMiddleware:
    """测试限流中间件"""
    
    def test_rate_limit_allows_requests_within_limit(self):
        """测试限流允许限制内的请求"""
        app = FastAPI()
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=5,
            window_size=60
        )
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # 发送 5 次请求，都应该成功
        for i in range(5):
            response = client.get("/test")
            assert response.status_code == 200
            assert "X-RateLimit-Limit" in response.headers
            assert "X-RateLimit-Remaining" in response.headers
    
    def test_rate_limit_blocks_excess_requests(self):
        """测试限流阻止超限请求"""
        app = FastAPI()
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=3,
            window_size=60
        )
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # 发送 3 次请求，都应该成功
        for i in range(3):
            response = client.get("/test")
            assert response.status_code == 200
        
        # 第 4 次请求应该被限流
        response = client.get("/test")
        assert response.status_code == 429
        assert "error" in response.json()
        assert response.json()["error"] == "Too Many Requests"
        assert "Retry-After" in response.headers


class TestRequestLoggingMiddleware:
    """测试请求日志中间件"""
    
    def test_logging_adds_request_id(self):
        """测试日志中间件添加请求 ID"""
        app = FastAPI()
        app.add_middleware(RequestLoggingMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        response = client.get("/test")
        
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        # 验证 request_id 是 UUID 格式
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36  # UUID 长度
        assert request_id.count("-") == 4  # UUID 有 4 个连字符


class TestErrorHandlers:
    """测试错误处理器"""
    
    def test_api_exception_handler(self):
        """测试 API 异常处理器"""
        app = FastAPI()
        app.add_exception_handler(NotFoundException, api_exception_handler)
        
        @app.get("/test")
        async def test_endpoint():
            raise NotFoundException("资源不存在")
        
        client = TestClient(app)
        response = client.get("/test")
        
        assert response.status_code == 404
        data = response.json()
        assert "message" in data
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
        assert "timestamp" in data["error"]
        assert "path" in data["error"]
    
    def test_validation_exception_handler(self):
        """测试验证异常处理器"""
        app = FastAPI()
        app.add_exception_handler(
            RequestValidationError,
            validation_exception_handler
        )
        
        class TestModel(BaseModel):
            name: str
            age: int
        
        @app.post("/test")
        async def test_endpoint(data: TestModel):
            return {"message": "success"}
        
        client = TestClient(app)
        # 发送无效数据
        response = client.post("/test", json={"name": "test"})  # 缺少 age
        
        assert response.status_code == 422
        data = response.json()
        assert "message" in data
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
    
    def test_generic_exception_handler(self):
        """测试通用异常处理器"""
        app = FastAPI()
        app.add_exception_handler(Exception, generic_exception_handler)
        
        @app.get("/test")
        async def test_endpoint():
            raise ValueError("测试错误")
        
        client = TestClient(app)
        response = client.get("/test")
        
        assert response.status_code == 500
        data = response.json()
        assert "message" in data
        assert "error" in data
        assert data["error"]["code"] == "INTERNAL_ERROR"


class TestMiddlewareIntegration:
    """测试中间件集成"""
    
    def test_all_middleware_together(self):
        """测试所有中间件一起工作"""
        app = FastAPI()
        
        # 添加所有中间件
        configure_cors(app)
        app.add_middleware(RequestLoggingMiddleware)
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=10,
            window_size=60
        )
        
        # 添加异常处理器
        app.add_exception_handler(NotFoundException, api_exception_handler)
        app.add_exception_handler(Exception, generic_exception_handler)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        @app.get("/error")
        async def error_endpoint():
            raise NotFoundException("资源不存在")
        
        client = TestClient(app)
        
        # 测试正常请求
        response = client.get("/test")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert "X-RateLimit-Limit" in response.headers
        
        # 测试错误处理
        response = client.get("/error")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "NOT_FOUND"
        assert "requestId" in data["error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
