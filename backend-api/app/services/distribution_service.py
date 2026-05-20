"""
报告分发服务
实现报告分发、分发记录管理和分发历史查询
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.distribution import Distribution, DistributionMethod, DistributionStatus
from app.models.report import Report, ReportStatus
from app.schemas.report import (
    ReportDistribute,
    DistributionQuery,
    DistributionListResponse,
    DistributionResponse
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException
)
from app.core.logging import logger


class DistributionService:
    """报告分发服务类"""
    
    async def distribute_report(
        self,
        db: AsyncSession,
        report_id: str,
        data: ReportDistribute,
        user_id: str
    ) -> Dict[str, Any]:
        """
        分发报告
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            data: 分发数据
            user_id: 操作用户ID
            
        Returns:
            分发结果
            
        Raises:
            NotFoundException: 报告不存在
            ValidationException: 报告状态不允许分发
        """
        try:
            # 1. 检查报告是否存在且已签名
            result = await db.execute(
                select(Report).where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            if report.status == ReportStatus.RECALLED:
                raise ValidationException(message="报告已撤回，无法分发")
            
            if report.status != ReportStatus.SIGNED:
                raise ValidationException(message="报告未签名，无法分发")
            
            # 2. 验证邮件分发时必须提供邮箱
            if data.method == DistributionMethod.EMAIL and not data.recipientEmail:
                raise ValidationException(message="邮件分发必须提供接收人邮箱")
            
            # 3. 创建分发记录
            distribution = Distribution(
                report_id=report_id,
                method=data.method,
                recipient=data.recipient,
                recipient_email=data.recipientEmail,
                status=DistributionStatus.PENDING
            )
            
            db.add(distribution)
            await db.flush()
            await db.refresh(distribution)
            
            # 4. 根据分发方式执行分发操作
            distribution_result = {}
            
            if data.method == DistributionMethod.EMAIL:
                distribution_result = await self._send_report_by_email(
                    db,
                    report,
                    data.recipientEmail,
                    distribution.id
                )
            elif data.method == DistributionMethod.DOWNLOAD:
                distribution_result = await self._generate_download_link(
                    db,
                    report,
                    distribution.id
                )
            elif data.method == DistributionMethod.PRINT:
                # 打印方式只记录分发记录，实际打印由前端处理
                distribution_result = {
                    "message": "打印分发记录已创建",
                    "distributionId": distribution.id
                }
                distribution.status = DistributionStatus.SENT
                distribution.sent_at = datetime.now()
                await db.flush()
            
            # 5. 更新报告状态为已分发
            report.status = ReportStatus.DISTRIBUTED
            await db.flush()
            
            logger.info(
                "报告分发成功",
                extra={
                    "report_id": report_id,
                    "distribution_id": distribution.id,
                    "method": data.method,
                    "recipient": data.recipient,
                    "user_id": user_id
                }
            )
            
            return {
                "distribution": DistributionResponse.model_validate(distribution).model_dump(),
                **distribution_result
            }
            
        except (NotFoundException, ValidationException):
            raise
        except Exception as e:
            logger.error(
                "报告分发失败",
                extra={
                    "error": str(e),
                    "report_id": report_id,
                    "data": data.model_dump(),
                    "user_id": user_id
                }
            )
            raise
    
    async def _send_report_by_email(
        self,
        db: AsyncSession,
        report: Report,
        recipient_email: str,
        distribution_id: str
    ) -> Dict[str, Any]:
        """
        通过邮件发送报告
        
        Args:
            db: 数据库会话
            report: 报告对象
            recipient_email: 接收人邮箱
            distribution_id: 分发记录ID
            
        Returns:
            邮件发送结果
        """
        try:
            # TODO: 集成实际的邮件服务（如 SendGrid, AWS SES 等）
            # 这里使用模拟实现
            logger.info(
                "发送报告邮件",
                extra={
                    "report_id": report.id,
                    "report_number": report.report_number,
                    "recipient_email": recipient_email,
                    "distribution_id": distribution_id
                }
            )
            
            # 模拟邮件发送
            email_sent = True  # 实际应该调用邮件服务
            
            if email_sent:
                # 更新分发记录状态
                result = await db.execute(
                    select(Distribution).where(Distribution.id == distribution_id)
                )
                distribution = result.scalar_one()
                distribution.status = DistributionStatus.SENT
                distribution.sent_at = datetime.now()
                await db.flush()
                
                return {
                    "message": "报告已通过邮件发送",
                    "email": recipient_email
                }
            else:
                # 更新为失败状态
                result = await db.execute(
                    select(Distribution).where(Distribution.id == distribution_id)
                )
                distribution = result.scalar_one()
                distribution.status = DistributionStatus.FAILED
                await db.flush()
                
                raise ValidationException(message="邮件发送失败")
                
        except ValidationException:
            raise
        except Exception as e:
            logger.error(
                "邮件发送失败",
                extra={
                    "error": str(e),
                    "report_id": report.id,
                    "recipient_email": recipient_email
                }
            )
            raise
    
    async def _generate_download_link(
        self,
        db: AsyncSession,
        report: Report,
        distribution_id: str
    ) -> Dict[str, Any]:
        """
        生成下载链接
        
        Args:
            db: 数据库会话
            report: 报告对象
            distribution_id: 分发记录ID
            
        Returns:
            下载链接信息
        """
        try:
            # 生成临时下载令牌（有效期24小时）
            token = self._generate_download_token(report.id)
            download_url = f"/api/v1/reports/{report.id}/download?token={token}"
            
            # 更新分发记录状态
            result = await db.execute(
                select(Distribution).where(Distribution.id == distribution_id)
            )
            distribution = result.scalar_one()
            distribution.status = DistributionStatus.SENT
            distribution.sent_at = datetime.now()
            await db.flush()
            
            logger.info(
                "下载链接已生成",
                extra={
                    "report_id": report.id,
                    "distribution_id": distribution_id,
                    "download_url": download_url
                }
            )
            
            return {
                "message": "下载链接已生成",
                "downloadUrl": download_url,
                "token": token,
                "expiresIn": 86400  # 24小时（秒）
            }
            
        except Exception as e:
            logger.error(
                "生成下载链接失败",
                extra={"error": str(e), "report_id": report.id}
            )
            raise
    
    def _generate_download_token(self, report_id: str) -> str:
        """
        生成下载令牌
        简单实现：实际应该使用 JWT 或其他安全令牌机制
        
        Args:
            report_id: 报告ID
            
        Returns:
            下载令牌
        """
        import base64
        import random
        import string
        
        timestamp = int(datetime.now().timestamp())
        random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=7))
        token_data = f"{report_id}:{timestamp}:{random_str}"
        return base64.b64encode(token_data.encode()).decode()
    
    async def get_distribution_history(
        self,
        db: AsyncSession,
        query: DistributionQuery
    ) -> DistributionListResponse:
        """
        获取分发历史
        
        Args:
            db: 数据库会话
            query: 查询参数
            
        Returns:
            分发历史列表
        """
        try:
            # 构建查询条件
            conditions = []
            
            if query.reportId:
                conditions.append(Distribution.report_id == query.reportId)
            
            if query.method:
                conditions.append(Distribution.method == query.method)
            
            if query.status:
                conditions.append(Distribution.status == query.status)
            
            if query.startDate:
                conditions.append(Distribution.sent_at >= query.startDate)
            
            if query.endDate:
                conditions.append(Distribution.sent_at <= query.endDate)
            
            # 查询总数
            count_query = select(func.count(Distribution.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            # 查询数据
            offset = (query.page - 1) * query.pageSize
            data_query = select(Distribution)
            if conditions:
                data_query = data_query.where(and_(*conditions))
            
            data_query = data_query.order_by(
                Distribution.sent_at.desc()
            ).offset(offset).limit(query.pageSize)
            
            data_result = await db.execute(data_query)
            items = data_result.scalars().all()
            
            total_pages = (total + query.pageSize - 1) // query.pageSize
            
            return DistributionListResponse(
                items=[DistributionResponse.model_validate(item) for item in items],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
            
        except Exception as e:
            logger.error(
                "获取分发历史失败",
                extra={"error": str(e), "query": query.model_dump()}
            )
            raise
    
    async def get_report_distributions(
        self,
        db: AsyncSession,
        report_id: str
    ) -> List[DistributionResponse]:
        """
        获取报告的分发记录
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            
        Returns:
            分发记录列表
        """
        try:
            result = await db.execute(
                select(Distribution)
                .where(Distribution.report_id == report_id)
                .order_by(Distribution.sent_at.desc())
            )
            distributions = result.scalars().all()
            
            return [DistributionResponse.model_validate(d) for d in distributions]
            
        except Exception as e:
            logger.error(
                "获取报告分发记录失败",
                extra={"error": str(e), "report_id": report_id}
            )
            raise


# 创建服务实例
distribution_service = DistributionService()
