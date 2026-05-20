"""
JWT 认证集成测试

测试 JWT 认证在实际 API 端点中的使用
"""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from datetime import timedelta
from app.api.deps import get_current_user
from app.core.security import generate_jwt_token, JWTPayload


# 创建测试应用
app = FastAPI()


@app.get("/protected")
async def protected_route(current_user: JWTPayload = Depends(get_current_user)):
    """受保护的路由，需要认证"""
    return {
        "message": "访问成功",
        "user": {
            "userId": current_user.user_id,
            "username": current_user.username,
            "roles": current_user.roles
        }
    }


@app.get("/public")
async def public_route():
    """公开路由，不需要认证"""
    return {"message": "公开访问"}


# 创建测试客户端
client = TestClient(app)


class TestJWTAuthIntegration:
    """JWT 认证集成测试"""
    
    def test_access_protected_route_with_valid_token(self):
        """测试使用有效令牌访问受保护路由"""
        # 生成有效令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        # 发送请求
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "访问成功"
        assert data["user"]["userId"] == "user123"
        assert data["user"]["username"] == "testuser"
        assert data["user"]["roles"] == ["admin"]
    
    def test_access_protected_route_without_token(self):
        """测试不带令牌访问受保护路由"""
        response = client.get("/protected")
        
        # 应该返回 401
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["code"] == "MISSING_TOKEN"
    
    def test_access_protected_route_with_expired_token(self):
        """测试使用过期令牌访问受保护路由"""
        # 生成已过期的令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"],
            expires_delta=timedelta(seconds=-1)
        )
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # 应该返回 401
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["code"] == "TOKEN_EXPIRED"
    
    def test_access_protected_route_with_invalid_token_format(self):
        """测试使用无效格式的令牌访问受保护路由"""
        response = client.get(
            "/protected",
            headers={"Authorization": "InvalidFormat token123"}
        )
        
        # 应该返回 401
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["code"] == "INVALID_TOKEN_FORMAT"
    
    def test_access_protected_route_with_malformed_token(self):
        """测试使用格式错误的令牌访问受保护路由"""
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer invalid.token.format"}
        )
        
        # 应该返回 401
        assert response.status_code == 401
        data = response.json()
        assert data["detail"]["code"] == "MALFORMED_TOKEN"
    
    def test_access_public_route_without_token(self):
        """测试不带令牌访问公开路由"""
        response = client.get("/public")
        
        # 应该成功访问
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "公开访问"
    
    def test_multiple_requests_with_same_token(self):
        """测试使用同一令牌发送多个请求"""
        # 生成令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        # 发送多个请求
        for _ in range(3):
            response = client.get(
                "/protected",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["userId"] == "user123"
    
    def test_different_users_with_different_tokens(self):
        """测试不同用户使用不同令牌"""
        # 用户1的令牌
        token1 = generate_jwt_token(
            user_id="user1",
            username="user1",
            roles=["admin"]
        )
        
        # 用户2的令牌
        token2 = generate_jwt_token(
            user_id="user2",
            username="user2",
            roles=["user"]
        )
        
        # 用户1访问
        response1 = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token1}"}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["user"]["userId"] == "user1"
        assert data1["user"]["roles"] == ["admin"]
        
        # 用户2访问
        response2 = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token2}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["user"]["userId"] == "user2"
        assert data2["user"]["roles"] == ["user"]
