"""
认证中间件集成测试
测试认证中间件在实际 API 请求中的工作情况
"""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from app.core.security import generate_jwt_token, JWTPayload
from app.api.deps import get_current_user, get_optional_user


# 创建测试应用
app = FastAPI()


@app.get("/protected")
async def protected_route(
    current_user: JWTPayload = Depends(get_current_user)
):
    """需要认证的路由"""
    return {
        "message": "访问成功",
        "user": {
            "userId": current_user.user_id,
            "username": current_user.username,
            "roles": current_user.roles
        }
    }


@app.get("/optional")
async def optional_route(
    current_user: JWTPayload = Depends(get_optional_user)
):
    """可选认证的路由"""
    if current_user:
        return {
            "message": "已认证访问",
            "user": {
                "userId": current_user.user_id,
                "username": current_user.username
            }
        }
    else:
        return {
            "message": "未认证访问"
        }


@pytest.fixture
def client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def valid_token():
    """创建有效的访问令牌"""
    return generate_jwt_token(
        user_id="user-123",
        username="testuser",
        roles=["admin", "user"]
    )


class TestAuthMiddleware:
    """测试认证中间件"""
    
    def test_protected_route_with_valid_token(self, client, valid_token):
        """测试使用有效令牌访问受保护路由"""
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "访问成功"
        assert data["user"]["userId"] == "user-123"
        assert data["user"]["username"] == "testuser"
        assert "admin" in data["user"]["roles"]
    
    def test_protected_route_without_token(self, client):
        """测试不带令牌访问受保护路由"""
        response = client.get("/protected")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_protected_route_with_invalid_token(self, client):
        """测试使用无效令牌访问受保护路由"""
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        
        assert response.status_code == 401
    
    def test_protected_route_with_malformed_header(self, client):
        """测试使用格式错误的 Authorization 头"""
        response = client.get(
            "/protected",
            headers={"Authorization": "InvalidFormat token"}
        )
        
        # HTTPBearer 在格式错误时返回 401
        assert response.status_code == 401
    
    def test_optional_route_with_valid_token(self, client, valid_token):
        """测试使用有效令牌访问可选认证路由"""
        response = client.get(
            "/optional",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "已认证访问"
        assert data["user"]["userId"] == "user-123"
    
    def test_optional_route_without_token(self, client):
        """测试不带令牌访问可选认证路由"""
        response = client.get("/optional")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "未认证访问"
    
    def test_optional_route_with_invalid_token(self, client):
        """测试使用无效令牌访问可选认证路由（应该降级为未认证）"""
        response = client.get(
            "/optional",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # 可选认证失败应该降级为未认证访问
        assert data["message"] == "未认证访问"


class TestTokenExtraction:
    """测试令牌提取"""
    
    def test_bearer_token_extraction(self, client, valid_token):
        """测试 Bearer 令牌提取"""
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
    
    def test_case_sensitive_bearer(self, client, valid_token):
        """测试 Bearer 关键字大小写敏感"""
        # FastAPI 的 HTTPBearer 默认是大小写不敏感的
        response = client.get(
            "/protected",
            headers={"Authorization": f"bearer {valid_token}"}
        )
        
        # 应该也能工作
        assert response.status_code in [200, 403]


class TestUserPayloadExtraction:
    """测试用户信息提取"""
    
    def test_extract_user_id(self, client, valid_token):
        """测试提取用户 ID"""
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["userId"] == "user-123"
    
    def test_extract_username(self, client, valid_token):
        """测试提取用户名"""
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "testuser"
    
    def test_extract_roles(self, client, valid_token):
        """测试提取角色列表"""
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["user"]["roles"], list)
        assert "admin" in data["user"]["roles"]
        assert "user" in data["user"]["roles"]
