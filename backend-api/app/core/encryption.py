"""
数据加密工具模块
提供数据加密/解密、敏感字段加密等功能
"""

import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from app.core.logging import logger


class EncryptionConfig:
    """加密配置"""
    ALGORITHM = "AES-256-GCM"
    IV_LENGTH = 12  # GCM 推荐使用 12 字节 IV
    KEY_LENGTH = 32  # 256 bits
    
    # 环境变量键名
    ENCRYPTION_KEY_ENV = "ENCRYPTION_KEY"
    SIGNATURE_KEY_ENV = "SIGNATURE_ENCRYPTION_KEY"


class EncryptionUtils:
    """加密工具类"""
    
    @staticmethod
    def _get_encryption_key(env_key: str = EncryptionConfig.ENCRYPTION_KEY_ENV) -> bytes:
        """
        获取加密密钥
        优先从环境变量获取，如果不存在则使用默认值（仅用于开发环境）
        """
        key = os.getenv(env_key)
        
        if not key:
            logger.warning(f"未配置 {env_key}，使用默认密钥（仅用于开发环境）")
            # 默认密钥（32字节）- 生产环境必须配置环境变量
            key = "12345678901234567890123456789012"
        
        # 确保密钥长度为32字节
        key_bytes = key.encode('utf-8')
        if len(key_bytes) < EncryptionConfig.KEY_LENGTH:
            key_bytes = key_bytes.ljust(EncryptionConfig.KEY_LENGTH, b'0')
        elif len(key_bytes) > EncryptionConfig.KEY_LENGTH:
            key_bytes = key_bytes[:EncryptionConfig.KEY_LENGTH]
        
        return key_bytes
    
    @staticmethod
    def encrypt(data: str, env_key: str = None) -> str:
        """
        使用 AES-256-GCM 加密数据
        
        Args:
            data: 要加密的数据
            env_key: 环境变量键名（可选）
            
        Returns:
            加密后的数据，格式: base64(iv):base64(encrypted_data)
        """
        try:
            key = EncryptionUtils._get_encryption_key(env_key or EncryptionConfig.ENCRYPTION_KEY_ENV)
            
            # 生成随机 IV
            iv = os.urandom(EncryptionConfig.IV_LENGTH)
            
            # 创建 AESGCM 实例
            aesgcm = AESGCM(key)
            
            # 加密数据
            encrypted = aesgcm.encrypt(iv, data.encode('utf-8'), None)
            
            # 返回格式: base64(iv):base64(encrypted_data)
            iv_b64 = base64.b64encode(iv).decode('utf-8')
            encrypted_b64 = base64.b64encode(encrypted).decode('utf-8')
            
            return f"{iv_b64}:{encrypted_b64}"
        except Exception as e:
            logger.error(f"加密数据失败: {str(e)}")
            raise ValueError("加密数据失败")
    
    @staticmethod
    def decrypt(encrypted_data: str, env_key: str = None) -> str:
        """
        使用 AES-256-GCM 解密数据
        
        Args:
            encrypted_data: 加密的数据，格式: base64(iv):base64(encrypted_data)
            env_key: 环境变量键名（可选）
            
        Returns:
            解密后的数据
        """
        try:
            key = EncryptionUtils._get_encryption_key(env_key or EncryptionConfig.ENCRYPTION_KEY_ENV)
            
            # 解析加密数据
            parts = encrypted_data.split(':')
            if len(parts) != 2:
                raise ValueError("加密数据格式错误")
            
            iv = base64.b64decode(parts[0])
            encrypted = base64.b64decode(parts[1])
            
            # 创建 AESGCM 实例
            aesgcm = AESGCM(key)
            
            # 解密数据
            decrypted = aesgcm.decrypt(iv, encrypted, None)
            
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"解密数据失败: {str(e)}")
            raise ValueError("解密数据失败")
    
    @staticmethod
    def encrypt_sensitive_field(value: str = None) -> str:
        """
        加密敏感字段
        用于加密数据库中的敏感字段（如身份证号、手机号等）
        
        Args:
            value: 要加密的值
            
        Returns:
            加密后的值，如果输入为空则返回 None
        """
        if not value:
            return None
        
        try:
            return EncryptionUtils.encrypt(value)
        except Exception as e:
            logger.error(f"敏感字段加密失败: {str(e)}")
            raise ValueError("敏感字段加密失败")
    
    @staticmethod
    def decrypt_sensitive_field(encrypted_value: str = None) -> str:
        """
        解密敏感字段
        
        Args:
            encrypted_value: 加密的值
            
        Returns:
            解密后的值，如果输入为空则返回 None
        """
        if not encrypted_value:
            return None
        
        try:
            return EncryptionUtils.decrypt(encrypted_value)
        except Exception as e:
            logger.error(f"敏感字段解密失败: {str(e)}")
            raise ValueError("敏感字段解密失败")


class SignatureEncryption:
    """
    签名数据加密工具
    专门用于电子签名数据的加密，使用独立的环境变量配置
    """
    
    @staticmethod
    def encrypt(data: str) -> str:
        """
        加密签名数据
        
        Args:
            data: 签名数据
            
        Returns:
            加密后的签名数据
        """
        return EncryptionUtils.encrypt(data, EncryptionConfig.SIGNATURE_KEY_ENV)
    
    @staticmethod
    def decrypt(encrypted_data: str) -> str:
        """
        解密签名数据
        
        Args:
            encrypted_data: 加密的签名数据
            
        Returns:
            解密后的签名数据
        """
        return EncryptionUtils.decrypt(encrypted_data, EncryptionConfig.SIGNATURE_KEY_ENV)
