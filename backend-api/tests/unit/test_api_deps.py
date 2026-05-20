"""
API 依赖函数单元测试
"""
import pytest
from datetime import timedelta
from app.api.deps import get_current_user, get_optional_user
from app.core.security import generate_jwt_token
from app.core.exceptions import UnauthorizedException


class TestGetCurrentUser:
    """测试 get_current_user 依赖函数"""
    
    @pytest.mark.asyncio
    async def test_valid_token(self):
        """测试有效令牌"""
        # 生成有效令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        # 构造 Authorization header
        authorization = f"Bearer {token}"
        
        # 调用依赖函数
        user = await get_current_user(authorization=authorization)
        
        assert user.user_id == "user123"
        assert user.username == "testuser"
        assert user.roles == ["admin"]
    
    @pytest.mark.asyncio
    async def test_missing_authorization_header(self):
        """测试缺少 Authorization header"""
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(authorization=None)
        
        assert exc_info.value.error_code == "MISSING_TOKEN"
        assert "缺少认证令牌" in exc_info.value.detail["message"]
    
    @pytest.mark.asyncio
    async def test_invalid_token_format(self):
        """测试无效的令牌格式（不是 Bearer token）"""
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(authorization="InvalidFormat token123")
        
        assert exc_info.value.error_code == "INVALID_TOKEN_FORMAT"
        assert "Bearer" in exc_info.value.detail["message"]
    
    @pytest.mark.asyncio
    async def test_empty_token(self):
        """测试空令牌"""
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(authorization="Bearer ")
        
        assert exc_info.value.error_code == "EMPTY_TOKEN"
        assert "为空" in exc_info.value.detail["message"]
    
    @pytest.mark.asyncio
    async def test_expired_token(self):
        """测试过期令牌"""
        # 生成已过期的令牌
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"],
            expires_delta=timedelta(seconds=-1)
        )
        
        authorization = f"Bearer {token}"
        
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(authorization=authorization)
        
        assert exc_info.value.error_code == "TOKEN_EXPIRED"
    
    @pytest.mark.asyncio
    async def test_malformed_token(self):
        """测试格式错误的令牌"""
        authorization = "Bearer invalid.token.format"
        
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(authorization=authorization)
        
        assert exc_info.value.error_code == "MALFORMED_TOKEN"
    
    @pytest.mark.asyncio
    async def test_multiple_roles(self):
        """测试多个角色"""
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin", "user", "manager"]
        )
        
        authorization = f"Bearer {token}"
        user = await get_current_user(authorization=authorization)
        
        assert len(user.roles) == 3
        assert "admin" in user.roles
        assert "user" in user.roles
        assert "manager" in user.roles


class TestGetOptionalUser:
    """测试 get_optional_user 依赖函数"""
    
    @pytest.mark.asyncio
    async def test_valid_token(self):
        """测试有效令牌"""
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"]
        )
        
        authorization = f"Bearer {token}"
        user = await get_optional_user(authorization=authorization)
        
        assert user is not None
        assert user.user_id == "user123"
        assert user.username == "testuser"
    
    @pytest.mark.asyncio
    async def test_missing_authorization_header(self):
        """测试缺少 Authorization header（应返回 None）"""
        user = await get_optional_user(authorization=None)
        assert user is None
    
    @pytest.mark.asyncio
    async def test_invalid_token_format(self):
        """测试无效的令牌格式（应返回 None）"""
        user = await get_optional_user(authorization="InvalidFormat token123")
        assert user is None
    
    @pytest.mark.asyncio
    async def test_empty_token(self):
        """测试空令牌（应返回 None）"""
        user = await get_optional_user(authorization="Bearer ")
        assert user is None
    
    @pytest.mark.asyncio
    async def test_expired_token(self):
        """测试过期令牌（应返回 None）"""
        token = generate_jwt_token(
            user_id="user123",
            username="testuser",
            roles=["admin"],
            expires_delta=timedelta(seconds=-1)
        )
        
        authorization = f"Bearer {token}"
        user = await get_optional_user(authorization=authorization)
        
        assert user is None
    
    @pytest.mark.asyncio
    async def test_malformed_token(self):
        """测试格式错误的令牌（应返回 None）"""
        authorization = "Bearer invalid.token.format"
        user = await get_optional_user(authorization=authorization)
        
        assert user is None
