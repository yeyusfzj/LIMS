"""
配置管理
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用配置
    APP_NAME: str = "FastAPI Sample Management"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory"
    DATABASE_POOL_SIZE: int = 50  # 连接池大小（优化：增加到 50 以支持高并发）
    DATABASE_MAX_OVERFLOW: int = 20  # 最大溢出连接数（优化：增加到 20）
    DATABASE_POOL_TIMEOUT: int = 30  # 获取连接超时时间（秒）
    DATABASE_POOL_RECYCLE: int = 3600  # 连接回收时间（秒，1小时）
    DATABASE_POOL_PRE_PING: bool = True  # 连接前检查（确保连接有效）
    
    # JWT 配置
    JWT_SECRET_KEY: str = "dev-secret-key-12345"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 15  # 15 分钟（访问令牌）
    JWT_REFRESH_EXPIRE_DAYS: int = 7  # 7 天（刷新令牌）
    
    # CORS 配置
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """将 CORS_ORIGINS 字符串转换为列表"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    # Redis 配置（可选）
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # 限流配置
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # 测试模式
    TESTING: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略额外的环境变量


# 创建全局配置实例
settings = Settings()
