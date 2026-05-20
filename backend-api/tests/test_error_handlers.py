"""
全局异常处理器测试

测试所有异常处理器的功能和响应格式
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from pydantic import BaseModel, Field
from app.core.exceptions import (
    APIException,
    NotFoundException,
    ValidationException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
    RateLimitException,
    InternalServerException
)
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    database_error_handler,
    generic_exception_handler
)


# 创建测试应用
app = FastAPI()

# 注册异常处理器
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, database_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# 测试路由
@app.get("/test/not-found")
async def test_not_found():
    raise NotFoundException("测试资源不存在")


@app.get("/test/validation")
async def test_validation():
    raise ValidationException("测试验证错误", details={"field": "value"})


@app.get("/test/unauthorized")
async def test_unauthorized():
    raise UnauthorizedException("测试未认证")


@app.get("/test/forbidden")
async def test_forbidden():
    raise ForbiddenException("测试权限不足")


@app.get("/test/conflict")
async def test_conflict():
    raise ConflictException("测试数据冲突")


@app.get("/test/rate-limit")
async def test_rate_limit():
    raise RateLimitException("测试限流", retry_after=30)


@app.get("/test/internal-error")
async def test_internal_error():
    raise InternalServerException("测试内部错误")


@app.get("/test/generic-exception")
async def test_generic_exception():
    raise ValueError("测试未捕获异常")


# Pydantic 模型用于测试验证
class TestModel(BaseModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=0)


@app.post("/test/pydantic-validation")
async def test_pydantic_validation(data: TestModel):
    return {"message": "success"}


# 测试客户端
client = TestClient(app)


class TestAPIExceptionHandler:
    """测试自定义 API 异常处理器"""
    
    def test_not_found_exception(self):
        """测试 NotFoundException 处理"""
        response = client.get("/test/not-found")
        
        assert response.status_code == 404
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "NOT_FOUND"
        assert data["error"]["message"] == "测试资源不存在"
    
    def test_validation_exception(self):
        """测试 ValidationException 处理"""
        response = client.get("/test/validation")
        
        assert response.status_code == 400
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert data["error"]["message"] == "测试验证错误"
        assert data["error"]["details"] == {"field": "value"}
    
    def test_unauthorized_exception(self):
        """测试 UnauthorizedException 处理"""
        response = client.get("/test/unauthorized")
        
        assert response.status_code == 401
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "UNAUTHORIZED"
        assert data["error"]["message"] == "测试未认证"
    
    def test_forbidden_exception(self):
        """测试 ForbiddenException 处理"""
        response = client.get("/test/forbidden")
        
        assert response.status_code == 403
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "FORBIDDEN"
        assert data["error"]["message"] == "测试权限不足"
    
    def test_conflict_exception(self):
        """测试 ConflictException 处理"""
        response = client.get("/test/conflict")
        
        assert response.status_code == 409
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "CONFLICT"
        assert data["error"]["message"] == "测试数据冲突"
    
    def test_rate_limit_exception(self):
        """测试 RateLimitException 处理"""
        response = client.get("/test/rate-limit")
        
        assert response.status_code == 429
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert data["error"]["message"] == "测试限流"
        assert data["error"]["details"]["retry_after"] == 30
    
    def test_internal_server_exception(self):
        """测试 InternalServerException 处理"""
        response = client.get("/test/internal-error")
        
        assert response.status_code == 500
        data = response.json()
        assert data["message"] == "操作失败"
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert data["error"]["message"] == "测试内部错误"


class TestValidationExceptionHandler:
    """测试 Pydantic 验证异常处理器"""
    
    def test_missing_required_field(self):
        """测试缺少必填字段"""
        response = client.post("/test/pydantic-validation", json={})
        
        assert response.status_code == 422
        data = response.json()
        assert data["message"] == "请求参数验证失败"
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert data["error"]["message"] == "请求参数格式不正确"
        assert "name" in data["error"]["details"]
        assert "age" in data["error"]["details"]
    
    def test_invalid_field_type(self):
        """测试字段类型错误"""
        response = client.post("/test/pydantic-validation", json={
            "name": "test",
            "age": "invalid"
        })
        
        assert response.status_code == 422
        data = response.json()
        assert data["message"] == "请求参数验证失败"
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "age" in data["error"]["details"]
    
    def test_field_constraint_violation(self):
        """测试字段约束违反"""
        response = client.post("/test/pydantic-validation", json={
            "name": "",  # 违反 min_length=1
            "age": -1    # 违反 ge=0
        })
        
        assert response.status_code == 422
        data = response.json()
        assert data["message"] == "请求参数验证失败"
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "name" in data["error"]["details"]
        assert "age" in data["error"]["details"]


class TestGenericExceptionHandler:
    """测试通用异常处理器"""
    
    def test_unhandled_exception(self):
        """测试未捕获的异常"""
        # 创建一个新的测试客户端，设置 raise_server_exceptions=False
        test_client = TestClient(app, raise_server_exceptions=False)
        response = test_client.get("/test/generic-exception")
        
        assert response.status_code == 500
        data = response.json()
        assert data["message"] == "服务器内部错误"
        assert data["error"]["code"] == "INTERNAL_ERROR"
        assert data["error"]["message"] == "服务器处理请求时发生错误"


class TestResponseFormat:
    """测试响应格式一致性"""
    
    def test_error_response_structure(self):
        """测试所有错误响应都包含必需字段"""
        test_endpoints = [
            "/test/not-found",
            "/test/validation",
            "/test/unauthorized",
            "/test/forbidden",
            "/test/conflict",
            "/test/rate-limit",
            "/test/internal-error"
        ]
        
        for endpoint in test_endpoints:
            response = client.get(endpoint)
            data = response.json()
            
            # 验证响应结构
            assert "message" in data, f"Missing 'message' in {endpoint}"
            assert "error" in data, f"Missing 'error' in {endpoint}"
            assert "code" in data["error"], f"Missing 'error.code' in {endpoint}"
            assert "message" in data["error"], f"Missing 'error.message' in {endpoint}"
    
    def test_nodejs_compatibility(self):
        """测试与 Node.js 后端的响应格式兼容性"""
        response = client.get("/test/not-found")
        data = response.json()
        
        # 验证响应格式与 Node.js 后端一致
        assert isinstance(data["message"], str)
        assert isinstance(data["error"], dict)
        assert isinstance(data["error"]["code"], str)
        assert isinstance(data["error"]["message"], str)
        # details 字段可选
        if "details" in data["error"]:
            assert data["error"]["details"] is None or isinstance(data["error"]["details"], (dict, list))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
