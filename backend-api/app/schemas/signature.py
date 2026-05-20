"""
电子签名相关的 Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SignReportRequest(BaseModel):
    """签署报告请求"""
    signatureData: str = Field(..., description="签名数据")
    signerRole: str = Field(..., description="签名人角色")
    
    class Config:
        json_schema_extra = {
            "example": {
                "signatureData": "base64_encoded_signature_image",
                "signerRole": "检测员"
            }
        }


class VerifySignatureRequest(BaseModel):
    """验证签名请求"""
    reportId: str = Field(..., description="报告ID")
    signatureId: str = Field(..., description="签名ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reportId": "report-123",
                "signatureId": "signature-456"
            }
        }


class RevokeSignatureRequest(BaseModel):
    """撤销签名请求"""
    reason: str = Field(..., description="撤销原因")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reason": "签名错误，需要重新签名"
            }
        }


class SignatureResponse(BaseModel):
    """签名响应"""
    id: str = Field(..., description="签名ID")
    reportId: str = Field(..., description="报告ID")
    signerId: str = Field(..., description="签名人ID")
    signerName: str = Field(..., description="签名人姓名")
    signerRole: str = Field(..., description="签名人角色")
    signatureData: str = Field(..., description="签名数据（加密）")
    signedAt: datetime = Field(..., description="签名时间")
    decryptedData: Optional[str] = Field(None, description="解密后的签名数据（仅授权用户可见）")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SignatureVerificationResult(BaseModel):
    """签名验证结果"""
    valid: bool = Field(..., description="签名是否有效")
    signature: Optional[SignatureResponse] = Field(None, description="签名信息")
    error: Optional[str] = Field(None, description="错误信息")
    
    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "signature": {
                    "id": "signature-456",
                    "reportId": "report-123",
                    "signerId": "user-789",
                    "signerName": "张三",
                    "signerRole": "检测员",
                    "signatureData": "encrypted_data",
                    "signedAt": "2026-04-09T10:30:00"
                },
                "error": None
            }
        }
