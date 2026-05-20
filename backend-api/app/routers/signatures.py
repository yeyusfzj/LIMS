"""
电子签名路由
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.signature_service import signature_service
from app.schemas.signature import (
    SignReportRequest,
    SignatureResponse,
    VerifySignatureRequest,
    SignatureVerificationResult,
    RevokeSignatureRequest
)
from app.core.logging import logger


router = APIRouter(prefix="/api/v1", tags=["signatures"])


@router.post(
    "/reports/{id}/sign",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED
)
async def sign_report(
    id: str,
    data: SignReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    签署报告
    
    - **id**: 报告ID
    - **signatureData**: 签名数据（Base64 编码的签名图片）
    - **signerRole**: 签名人角色
    
    签名数据将被加密存储，确保安全性。
    """
    try:
        signature = await signature_service.sign_report(
            db,
            id,
            data,
            current_user.id
        )
        
        await db.commit()
        
        return {
            "message": "报告签名成功",
            "data": SignatureResponse.model_validate(signature).model_dump()
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "签名报告失败",
            extra={"error": str(e), "user_id": current_user.id, "report_id": id}
        )
        raise


@router.get(
    "/reports/{report_id}/signatures/{signature_id}/verify",
    response_model=Dict[str, Any]
)
async def verify_signature(
    report_id: str,
    signature_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    验证签名
    
    - **report_id**: 报告ID
    - **signature_id**: 签名ID
    
    验证签名的有效性和完整性。
    """
    try:
        result = await signature_service.verify_signature(
            db,
            report_id,
            signature_id
        )
        
        if result.valid:
            return {
                "message": "签名验证成功",
                "data": {
                    "valid": True,
                    "signature": result.signature.model_dump() if result.signature else None
                }
            }
        else:
            return {
                "message": result.error or "签名验证失败",
                "data": {
                    "valid": False,
                    "error": result.error
                }
            }
    except Exception as e:
        logger.error(
            "验证签名失败",
            extra={"error": str(e), "user_id": current_user.id, "report_id": report_id, "signature_id": signature_id}
        )
        raise


@router.post(
    "/reports/{report_id}/signatures/{signature_id}/revoke",
    response_model=Dict[str, Any]
)
async def revoke_signature(
    report_id: str,
    signature_id: str,
    data: RevokeSignatureRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    撤销签名
    
    - **report_id**: 报告ID
    - **signature_id**: 签名ID
    - **reason**: 撤销原因
    
    只有签名人本人或管理员可以撤销签名。
    """
    try:
        await signature_service.revoke_signature(
            db,
            report_id,
            signature_id,
            data.reason,
            current_user.id
        )
        
        await db.commit()
        
        return {
            "message": "签名已撤销"
        }
    except Exception as e:
        await db.rollback()
        logger.error(
            "撤销签名失败",
            extra={
                "error": str(e),
                "user_id": current_user.id,
                "report_id": report_id,
                "signature_id": signature_id
            }
        )
        raise


@router.get(
    "/reports/{id}/signatures",
    response_model=Dict[str, Any]
)
async def get_report_signatures(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取报告的所有签名
    
    - **id**: 报告ID
    
    返回报告的所有签名记录，按签名时间升序排列。
    """
    try:
        signatures = await signature_service.get_report_signatures(db, id)
        
        return {
            "data": [
                SignatureResponse.model_validate(sig).model_dump()
                for sig in signatures
            ]
        }
    except Exception as e:
        logger.error(
            "获取报告签名失败",
            extra={"error": str(e), "user_id": current_user.id, "report_id": id}
        )
        raise


@router.get(
    "/signatures/{signature_id}",
    response_model=Dict[str, Any]
)
async def get_signature_detail(
    signature_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取签名详情
    
    - **signature_id**: 签名ID
    
    如果请求用户是签名人本人或管理员，将返回解密后的签名数据。
    """
    try:
        signature = await signature_service.get_signature_detail(
            db,
            signature_id,
            current_user.id
        )
        
        # 构建响应
        response_data = SignatureResponse.model_validate(signature).model_dump()
        
        # 如果有解密数据，添加到响应中
        if hasattr(signature, 'decrypted_data') and signature.decrypted_data:
            response_data['decryptedData'] = signature.decrypted_data
        
        return {
            "data": response_data
        }
    except Exception as e:
        logger.error(
            "获取签名详情失败",
            extra={"error": str(e), "user_id": current_user.id, "signature_id": signature_id}
        )
        raise
