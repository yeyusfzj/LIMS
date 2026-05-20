"""
电子签名服务
实现签名身份验证、签名数据加密存储、报告锁定机制、签名撤销和重签
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.signature import Signature
from app.models.report import Report, ReportStatus
from app.models.user import User, UserStatus
from app.schemas.signature import (
    SignReportRequest,
    VerifySignatureRequest,
    SignatureVerificationResult,
    SignatureResponse
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ForbiddenException
)
from app.core.encryption import SignatureEncryption
from app.core.logging import logger


class SignatureService:
    """电子签名服务类"""
    
    def _encrypt_signature_data(self, data: str) -> str:
        """
        加密签名数据
        使用 AES-256-GCM 算法加密
        """
        return SignatureEncryption.encrypt(data)
    
    def _decrypt_signature_data(self, encrypted_data: str) -> str:
        """
        解密签名数据
        使用 AES-256-GCM 算法解密
        """
        return SignatureEncryption.decrypt(encrypted_data)
    
    async def sign_report(
        self,
        db: AsyncSession,
        report_id: str,
        data: SignReportRequest,
        user_id: str
    ) -> Signature:
        """
        签名报告
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            data: 签名请求数据
            user_id: 签名用户ID
            
        Returns:
            签名对象
            
        Raises:
            NotFoundException: 报告或用户不存在
            ValidationException: 报告状态不允许签名或用户无权限
        """
        try:
            # 1. 验证报告是否存在
            result = await db.execute(
                select(Report)
                .options(selectinload(Report.signatures))
                .where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            # 2. 验证报告状态（已签名且锁定的报告不能再次签名）
            if report.status == ReportStatus.SIGNED:
                raise ValidationException(message="报告已完成所有签名并锁定，无法再次签名")
            
            if report.status == ReportStatus.DISTRIBUTED:
                raise ValidationException(message="报告已分发，无法签名")
            
            if report.status == ReportStatus.RECALLED:
                raise ValidationException(message="报告已回收，无法签名")
            
            # 3. 验证签名人员身份和权限
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise NotFoundException(message="用户不存在")
            
            if user.status != UserStatus.ACTIVE:
                raise ValidationException(message="用户账户未激活，无法签名")
            
            # 4. 验证用户是否有权限以该角色签名
            user_roles = [role.name for role in user.roles]
            if data.signerRole not in user_roles:
                raise ForbiddenException(
                    message=f"用户没有 {data.signerRole} 角色权限，无法签名"
                )
            
            # 5. 检查该角色是否已经签名
            existing_signature = None
            for sig in report.signatures:
                if sig.signer_role == data.signerRole:
                    existing_signature = sig
                    break
            
            if existing_signature:
                raise ValidationException(
                    message=f"{data.signerRole} 已经签名，如需重新签名请先撤销原签名"
                )
            
            # 6. 加密签名数据
            encrypted_data = self._encrypt_signature_data(data.signatureData)
            
            # 7. 创建签名记录
            signature = Signature(
                report_id=report_id,
                signer_id=user_id,
                signer_name=user.real_name or user.username,
                signer_role=data.signerRole,
                signature_data=encrypted_data
            )
            
            db.add(signature)
            await db.flush()
            await db.refresh(signature)
            
            # 8. 更新报告状态
            # 如果报告是草稿状态，更新为待签名状态
            if report.status == ReportStatus.DRAFT:
                report.status = ReportStatus.PENDING_SIGNATURE
            
            # 9. 检查是否所有必需签名都已完成
            all_signatures = list(report.signatures) + [signature]
            is_fully_signed = await self._check_signature_completion(
                db,
                report_id,
                all_signatures
            )
            
            # 10. 如果所有签名完成，锁定报告
            if is_fully_signed:
                await self._lock_report(db, report)
            
            logger.info(
                "报告签名成功",
                extra={
                    "report_id": report_id,
                    "signature_id": signature.id,
                    "signer_id": user_id,
                    "signer_role": data.signerRole,
                    "is_fully_signed": is_fully_signed
                }
            )
            
            return signature
            
        except (NotFoundException, ValidationException, ForbiddenException):
            raise
        except Exception as e:
            logger.error(
                "报告签名失败",
                extra={"error": str(e), "report_id": report_id, "user_id": user_id}
            )
            raise
    
    async def _check_signature_completion(
        self,
        db: AsyncSession,
        report_id: str,
        signatures: List[Signature]
    ) -> bool:
        """
        检查签名是否完成
        需要至少一个签名就算完成（简化版本）
        实际应用中可以根据报告类型配置不同的签名要求
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            signatures: 签名列表
            
        Returns:
            是否完成所有签名
        """
        # 至少1个签名就算完成（简化版本，方便测试）
        return len(signatures) >= 1
    
    async def _lock_report(
        self,
        db: AsyncSession,
        report: Report
    ) -> None:
        """
        锁定报告
        
        Args:
            db: 数据库会话
            report: 报告对象
        """
        try:
            report.status = ReportStatus.SIGNED
            report.approved_at = datetime.now()
            
            await db.flush()
            
            logger.info("报告已锁定", extra={"report_id": report.id})
            
        except Exception as e:
            logger.error(
                "锁定报告失败",
                extra={"error": str(e), "report_id": report.id}
            )
            raise ValidationException(message="锁定报告失败")
    
    async def verify_signature(
        self,
        db: AsyncSession,
        report_id: str,
        signature_id: str
    ) -> SignatureVerificationResult:
        """
        验证签名
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            signature_id: 签名ID
            
        Returns:
            签名验证结果
        """
        try:
            # 查询签名记录
            result = await db.execute(
                select(Signature)
                .options(selectinload(Signature.report))
                .where(Signature.id == signature_id)
            )
            signature = result.scalar_one_or_none()
            
            if not signature:
                return SignatureVerificationResult(
                    valid=False,
                    error="签名不存在"
                )
            
            if signature.report_id != report_id:
                return SignatureVerificationResult(
                    valid=False,
                    error="签名与报告不匹配"
                )
            
            # 验证签名数据完整性（尝试解密）
            try:
                self._decrypt_signature_data(signature.signature_data)
            except Exception:
                return SignatureVerificationResult(
                    valid=False,
                    error="签名数据已损坏或被篡改"
                )
            
            return SignatureVerificationResult(
                valid=True,
                signature=SignatureResponse.model_validate(signature)
            )
            
        except Exception as e:
            logger.error(
                "验证签名失败",
                extra={
                    "error": str(e),
                    "report_id": report_id,
                    "signature_id": signature_id
                }
            )
            return SignatureVerificationResult(
                valid=False,
                error="验证签名失败"
            )
    
    async def revoke_signature(
        self,
        db: AsyncSession,
        report_id: str,
        signature_id: str,
        reason: str,
        user_id: str
    ) -> None:
        """
        撤销签名
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            signature_id: 签名ID
            reason: 撤销原因
            user_id: 操作用户ID
            
        Raises:
            NotFoundException: 签名或用户不存在
            ValidationException: 报告状态不允许撤销
            ForbiddenException: 用户无权限撤销
        """
        try:
            # 1. 验证签名是否存在
            sig_result = await db.execute(
                select(Signature)
                .options(selectinload(Signature.report))
                .where(Signature.id == signature_id)
            )
            signature = sig_result.scalar_one_or_none()
            
            if not signature:
                raise NotFoundException(message="签名不存在")
            
            if signature.report_id != report_id:
                raise ValidationException(message="签名与报告不匹配")
            
            # 2. 验证报告状态
            report = signature.report
            if report.status == ReportStatus.DISTRIBUTED:
                raise ValidationException(message="报告已分发，无法撤销签名")
            
            if report.status == ReportStatus.RECALLED:
                raise ValidationException(message="报告已回收，无法撤销签名")
            
            # 3. 验证权限（只有签名人本人或管理员可以撤销）
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise NotFoundException(message="用户不存在")
            
            is_signer = signature.signer_id == user_id
            is_admin = any(role.name == "admin" for role in user.roles)
            
            if not (is_signer or is_admin):
                raise ForbiddenException(message="只有签名人本人或管理员可以撤销签名")
            
            # 4. 删除签名记录
            await db.delete(signature)
            await db.flush()
            
            # 5. 更新报告状态
            # 如果报告已签名，撤销后回到待签名状态
            if report.status == ReportStatus.SIGNED:
                report.status = ReportStatus.PENDING_SIGNATURE
                report.approved_at = None
            
            logger.info(
                "签名已撤销",
                extra={
                    "report_id": report_id,
                    "signature_id": signature_id,
                    "reason": reason,
                    "revoked_by": user_id
                }
            )
            
        except (NotFoundException, ValidationException, ForbiddenException):
            raise
        except Exception as e:
            logger.error(
                "撤销签名失败",
                extra={
                    "error": str(e),
                    "report_id": report_id,
                    "signature_id": signature_id,
                    "user_id": user_id
                }
            )
            raise
    
    async def get_report_signatures(
        self,
        db: AsyncSession,
        report_id: str
    ) -> List[Signature]:
        """
        获取报告的所有签名
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            
        Returns:
            签名列表
        """
        try:
            result = await db.execute(
                select(Signature)
                .where(Signature.report_id == report_id)
                .order_by(Signature.signed_at.asc())
            )
            signatures = result.scalars().all()
            
            return list(signatures)
            
        except Exception as e:
            logger.error(
                "获取报告签名失败",
                extra={"error": str(e), "report_id": report_id}
            )
            raise
    
    async def get_signature_detail(
        self,
        db: AsyncSession,
        signature_id: str,
        user_id: str
    ) -> Signature:
        """
        获取签名详情（包含解密后的签名数据）
        注意：此方法应该受到严格的权限控制
        
        Args:
            db: 数据库会话
            signature_id: 签名ID
            user_id: 请求用户ID
            
        Returns:
            签名对象（可能包含解密数据）
            
        Raises:
            NotFoundException: 签名或用户不存在
        """
        try:
            result = await db.execute(
                select(Signature).where(Signature.id == signature_id)
            )
            signature = result.scalar_one_or_none()
            
            if not signature:
                raise NotFoundException(message="签名不存在")
            
            # 验证权限（只有签名人本人或管理员可以查看解密数据）
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.roles))
                .where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            
            if not user:
                raise NotFoundException(message="用户不存在")
            
            is_signer = signature.signer_id == user_id
            is_admin = any(role.name == "admin" for role in user.roles)
            
            # 如果是签名人或管理员，解密签名数据
            if is_signer or is_admin:
                try:
                    decrypted_data = self._decrypt_signature_data(signature.signature_data)
                    # 将解密数据临时附加到对象上（不保存到数据库）
                    signature.decrypted_data = decrypted_data
                except Exception as e:
                    logger.warning(
                        "解密签名数据失败",
                        extra={"error": str(e), "signature_id": signature_id}
                    )
            
            return signature
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(
                "获取签名详情失败",
                extra={"error": str(e), "signature_id": signature_id, "user_id": user_id}
            )
            raise


# 创建服务实例
signature_service = SignatureService()
