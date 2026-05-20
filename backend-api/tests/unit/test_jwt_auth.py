"""
JWT 认证功能单元测试
"""
import pytest
from jose import jwt
from datetime import datetime, timedelta
from app.core.security import decode_jwt_token, generate_jwt_token, JWTPayload
from app.core.exceptions import UnauthorizedException
from app.config import settings


class TestJWTPayload:
    """测试 JWTPayload 类"""
    
    def test_create_payload(self):
        """测试创建载荷对象"""
        payload = JWTPayload(
            user_id="user123",
            username="testuser",
            roles=["admin", "user"]
        )
        
        assert payload.user_id == "user123"
        assert payload.username == "testuser"
        assert payload.roles == ["admin", "user"]
    
    def test_from_dict(self):
        """测试从字典创建载荷对象"""
        data = {
            "userId": "user123",
            "username": "testuser",
            "roles": ["admin"],
            "jti": "abc123",
            "iat": 1234567890,
            "exp": 1234567890
        }
        
        payload = JWTPayload.from_dict(data)
        
        assert payload.user_id == "user123"
        assert payload.username == "testuser"
        assert payload.roles == ["admin"]
        assert payload.jti == "abc123"
    
    def test_to_dict(self):
        """测试转换为字典"""
        payload = JWTPayload(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        data = payload.to_dict()
        
        assert data["userId"] == "user123"
        assert data["username"] == "testuser"
        assert data["roles"] == ["admin"]


class TestDecodeJWTToken:
    """测试 decode_jwt_token 函数"""
    
    def test_decode_valid_token(self):
        """测试解码有效令牌"""
        # 生成有效令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin", "user"]
        )
        
        # 解码令牌
        payload = decode_jwt_token(token)
        
        assert payload.user_id == "user123"
        assert payload.username == "testuser"
        assert payload.roles == ["admin", "user"]
    
    def test_decode_expired_token(self):
        """测试解码过期令牌"""
        # 生成已过期的令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"],
            expires_delta=timedelta(seconds=-1)  # 已过期
        )
        
        # 应该抛出 UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            decode_jwt_token(token)
        
        assert exc_info.value.error_code == "TOKEN_EXPIRED"
        assert "过期" in exc_info.value.detail["message"]
    
    def test_decode_invalid_signature(self):
        """测试解码签名无效的令牌"""
        # 使用错误的密钥生成令牌
        payload = {
            "userId": "user123",
            "username": "testuser",
            "roles": ["admin"],
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, "wrong-secret-key", algorithm="HS256")
        
        # 应该抛出 UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            decode_jwt_token(token)
        
        assert exc_info.value.error_code == "INVALID_SIGNATURE"
        assert "签名无效" in exc_info.value.detail["message"]
    
    def test_decode_malformed_token(self):
        """测试解码格式错误的令牌"""
        # 无效的令牌格式
        token = "invalid.token.format"
        
        # 应该抛出 UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            decode_jwt_token(token)
        
        assert exc_info.value.error_code == "MALFORMED_TOKEN"
    
    def test_decode_token_missing_user_id(self):
        """测试解码缺少 userId 字段的令牌"""
        # 生成缺少 userId 的令牌
        payload = {
            "username": "testuser",
            "roles": ["admin"],
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        # 应该抛出 UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            decode_jwt_token(token)
        
        assert exc_info.value.error_code == "MALFORMED_TOKEN"
        assert "userId" in exc_info.value.detail["message"]
    
    def test_decode_token_missing_roles(self):
        """测试解码缺少 roles 字段的令牌"""
        # 生成缺少 roles 的令牌
        payload = {
            "userId": "user123",
            "username": "testuser",
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        # 应该抛出 UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            decode_jwt_token(token)
        
        assert exc_info.value.error_code == "MALFORMED_TOKEN"
        assert "roles" in exc_info.value.detail["message"]
    
    def test_decode_token_with_nodejs_format(self):
        """测试解码 Node.js 后端生成的令牌格式"""
        # 模拟 Node.js 后端生成的令牌格式
        payload = {
            "userId": "cm5ixfwvs0000108jqc0s8aqy",
            "username": "admin",
            "roles": ["管理员"],
            "jti": "abc123xyz",
            "exp": datetime.utcnow() + timedelta(hours=1),
            "iat": datetime.utcnow()
        }
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        # 解码令牌
        decoded = decode_jwt_token(token)
        
        assert decoded.user_id == "cm5ixfwvs0000108jqc0s8aqy"
        assert decoded.username == "admin"
        assert decoded.roles == ["管理员"]
        assert decoded.jti == "abc123xyz"


class TestGenerateJWTToken:
    """测试 generate_jwt_token 函数"""
    
    def test_generate_token(self):
        """测试生成令牌"""
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        # 验证令牌可以被解码
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        assert payload["userId"] == "user123"
        assert payload["username"] == "testuser"
        assert payload["roles"] == ["admin"]
        assert "exp" in payload
        assert "iat" in payload
    
    def test_generate_token_with_custom_expiry(self):
        """测试生成自定义过期时间的令牌"""
        expires_delta = timedelta(minutes=30)
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"],
            expires_delta=expires_delta
        )
        
        # 验证过期时间
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        exp_time = datetime.fromtimestamp(payload["exp"])
        iat_time = datetime.fromtimestamp(payload["iat"])
        
        # 过期时间应该约为 30 分钟后
        time_diff = (exp_time - iat_time).total_seconds()
        assert 1790 <= time_diff <= 1810  # 允许 10 秒误差
    
    def test_generate_and_decode_token(self):
        """测试生成和解码令牌的完整流程"""
        # 生成令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin", "user"]
        )
        
        # 解码令牌
        payload = decode_jwt_token(token)
        
        assert payload.user_id == "user123"
        assert payload.username == "testuser"
        assert payload.roles == ["admin", "user"]
