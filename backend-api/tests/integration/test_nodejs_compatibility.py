"""
Node.js 后端兼容性测试

验证 FastAPI 服务能够正确解析和验证 Node.js 后端生成的 JWT 令牌
"""
import pytest
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.core.security import decode_jwt_token
from app.config import settings


class TestNodeJSCompatibility:
    """Node.js 后端兼容性测试"""
    
    def test_decode_nodejs_token_format(self):
        """测试解码 Node.js 后端生成的令牌格式"""
        # 模拟 Node.js 后端生成的令牌（使用相同的密钥和算法）
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "cm5ixfwvs0000108jqc0s8aqy",  # Prisma 生成的 ID 格式
            "username": "admin",
            "roles": ["管理员", "用户"],  # 中文角色名
            "jti": "abc123xyz456",  # JWT ID
            "iat": now,
            "exp": now + timedelta(minutes=15)
        }
        
        # 使用与 Node.js 相同的密钥和算法生成令牌
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        # FastAPI 应该能够解码这个令牌
        decoded = decode_jwt_token(token)
        
        assert decoded.user_id == "cm5ixfwvs0000108jqc0s8aqy"
        assert decoded.username == "admin"
        assert decoded.roles == ["管理员", "用户"]
        assert decoded.jti == "abc123xyz456"
    
    def test_decode_token_with_multiple_roles(self):
        """测试解码包含多个角色的令牌"""
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "user123",
            "username": "testuser",
            "roles": ["管理员", "审核员", "操作员"],
            "iat": now,
            "exp": now + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded = decode_jwt_token(token)
        
        assert len(decoded.roles) == 3
        assert "管理员" in decoded.roles
        assert "审核员" in decoded.roles
        assert "操作员" in decoded.roles
    
    def test_decode_token_with_long_user_id(self):
        """测试解码包含长用户 ID 的令牌（Prisma 格式）"""
        # Prisma 生成的 ID 通常是 25 个字符的 cuid
        long_user_id = "cm5ixfwvs0000108jqc0s8aqy"
        now = datetime.now(timezone.utc)
        
        payload = {
            "userId": long_user_id,
            "username": "testuser",
            "roles": ["user"],
            "exp": now + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded = decode_jwt_token(token)
        
        assert decoded.user_id == long_user_id
        assert len(decoded.user_id) == 25
    
    def test_decode_token_with_chinese_username(self):
        """测试解码包含中文用户名的令牌"""
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "user123",
            "username": "张三",
            "roles": ["管理员"],
            "exp": now + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded = decode_jwt_token(token)
        
        assert decoded.username == "张三"
    
    def test_token_expiry_15_minutes(self):
        """测试 15 分钟过期时间（Node.js 默认访问令牌过期时间）"""
        # 生成 15 分钟后过期的令牌
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "user123",
            "username": "testuser",
            "roles": ["user"],
            "iat": now,
            "exp": now + timedelta(minutes=15)
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        # 应该能够成功解码
        decoded = decode_jwt_token(token)
        assert decoded.user_id == "user123"
    
    def test_token_with_optional_fields(self):
        """测试包含可选字段的令牌"""
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "user123",
            "username": "testuser",
            "roles": ["admin"],
            "jti": "unique-token-id",
            "iat": now,
            "exp": now + timedelta(hours=1),
            # 可选字段
            "email": "test@example.com",
            "fullName": "Test User"
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded = decode_jwt_token(token)
        
        # 必需字段应该存在
        assert decoded.user_id == "user123"
        assert decoded.username == "testuser"
        assert decoded.roles == ["admin"]
        assert decoded.jti == "unique-token-id"
    
    def test_same_secret_key_as_nodejs(self):
        """验证使用与 Node.js 相同的密钥"""
        # 确保使用的密钥与 Node.js 后端一致
        assert settings.JWT_SECRET_KEY == "dev-secret-key-12345"
        assert settings.JWT_ALGORITHM == "HS256"
    
    def test_decode_token_with_empty_roles(self):
        """测试解码包含空角色列表的令牌"""
        now = datetime.now(timezone.utc)
        payload = {
            "userId": "user123",
            "username": "testuser",
            "roles": [],  # 空角色列表
            "exp": now + timedelta(hours=1)
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        decoded = decode_jwt_token(token)
        
        assert decoded.roles == []
        assert isinstance(decoded.roles, list)
