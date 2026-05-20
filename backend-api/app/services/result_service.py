"""
检测结果服务

实现结果录入、查询、更新等核心功能
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from app.models.result import Result, ResultSource
from app.models.sample import Sample
from app.schemas.result import (
    ResultCreate,
    ResultUpdate,
    ResultResponse,
    ResultListResponse,
    PaginationInfo,
    ResultReview
)
from app.core.exceptions import NotFoundException, ValidationException

logger = logging.getLogger(__name__)


class ResultService:
    """检测结果服务类"""

    async def create_result(
        self,
        db: AsyncSession,
        data: ResultCreate
    ) -> ResultResponse:
        """
        创建检测结果
        
        Args:
            db: 数据库会话
            data: 结果创建数据
            
        Returns:
            创建的结果
            
        Raises:
            NotFoundException: 样品不存在
            ValidationException: 数据验证失败
        """
        try:
            # 验证样品是否存在
            sample_query = select(Sample).where(Sample.id == data.sample_id)
            sample_result = await db.execute(sample_query)
            sample = sample_result.scalar_one_or_none()
            
            if not sample:
                raise NotFoundException(message="样品不存在")
            
            # 创建结果记录
            result = Result(
                sampleId=data.sample_id,
                testItemId=data.test_item_id,
                parameter=data.parameter,
                value=data.value,
                textValue=data.text_value,
                unit=data.unit,
                method=data.method,
                source=data.source,
                instrumentId=data.instrument_id,
                formulaId=data.formula_id,
                isCalculated=data.is_calculated,
                isAbnormal=data.is_abnormal,
                abnormalReason=data.abnormal_reason,
                isRetest=data.is_retest,
                originalResultId=data.original_result_id,
                retestReason=data.retest_reason,
                enteredBy=data.entered_by
            )
            
            db.add(result)
            await db.commit()
            await db.refresh(result)
            
            logger.info(
                f"Result created: {result.id}",
                extra={
                    "result_id": result.id,
                    "sample_id": result.sampleId,
                    "parameter": result.parameter,
                    "source": result.source,
                    "entered_by": result.enteredBy
                }
            )
            
            return self._map_to_response(result)
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to create result: {str(e)}", exc_info=True)
            await db.rollback()
            raise ValidationException(message=f"创建结果失败: {str(e)}")

    async def get_result_by_id(
        self,
        db: AsyncSession,
        result_id: str
    ) -> Optional[ResultResponse]:
        """
        根据 ID 获取结果
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            
        Returns:
            结果详情，如果不存在返回 None
        """
        try:
            query = select(Result).where(Result.id == result_id)
            result = await db.execute(query)
            result_obj = result.scalar_one_or_none()
            
            if not result_obj:
                return None
            
            return self._map_to_response(result_obj)
            
        except Exception as e:
            logger.error(f"Failed to get result by id: {str(e)}", exc_info=True)
            raise

    async def list_results(
        self,
        db: AsyncSession,
        sample_id: Optional[str] = None,
        test_item_id: Optional[str] = None,
        parameter: Optional[str] = None,
        source: Optional[ResultSource] = None,
        is_abnormal: Optional[bool] = None,
        is_retest: Optional[bool] = None,
        entered_by: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> ResultListResponse:
        """
        查询结果列表
        
        Args:
            db: 数据库会话
            sample_id: 样品 ID
            test_item_id: 检测项 ID
            parameter: 参数名称（模糊匹配）
            source: 结果来源
            is_abnormal: 是否异常
            is_retest: 是否复测
            entered_by: 录入人
            start_date: 开始日期
            end_date: 结束日期
            page: 页码
            page_size: 每页数量
            
        Returns:
            分页结果列表
        """
        try:
            # 构建查询条件
            conditions = []
            
            if sample_id:
                conditions.append(Result.sampleId == sample_id)
            
            if test_item_id:
                conditions.append(Result.testItemId == test_item_id)
            
            if parameter:
                conditions.append(Result.parameter.ilike(f"%{parameter}%"))
            
            if source:
                conditions.append(Result.source == source)
            
            if is_abnormal is not None:
                conditions.append(Result.isAbnormal == is_abnormal)
            
            if is_retest is not None:
                conditions.append(Result.isRetest == is_retest)
            
            if entered_by:
                conditions.append(Result.enteredBy == entered_by)
            
            if start_date:
                conditions.append(Result.enteredAt >= start_date)
            
            if end_date:
                conditions.append(Result.enteredAt <= end_date)
            
            # 构建查询
            where_clause = and_(*conditions) if conditions else True
            
            # 计算分页参数
            skip = (page - 1) * page_size
            
            # 查询总数
            count_query = select(func.count(Result.id)).where(where_clause)
            total_result = await db.execute(count_query)
            total = total_result.scalar()
            
            # 查询数据
            query = (
                select(Result)
                .where(where_clause)
                .order_by(Result.enteredAt.desc())
                .offset(skip)
                .limit(page_size)
            )
            
            result = await db.execute(query)
            results = result.scalars().all()
            
            # 计算总页数
            total_pages = (total + page_size - 1) // page_size
            
            return ResultListResponse(
                items=[self._map_to_response(r) for r in results],
                pagination=PaginationInfo(
                    total=total,
                    page=page,
                    page_size=page_size,
                    total_pages=total_pages
                )
            )
            
        except Exception as e:
            logger.error(f"Failed to list results: {str(e)}", exc_info=True)
            raise

    async def update_result(
        self,
        db: AsyncSession,
        result_id: str,
        data: ResultUpdate
    ) -> ResultResponse:
        """
        更新结果
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            data: 更新数据
            
        Returns:
            更新后的结果
            
        Raises:
            NotFoundException: 结果不存在
        """
        try:
            # 查询结果
            query = select(Result).where(Result.id == result_id)
            result = await db.execute(query)
            result_obj = result.scalar_one_or_none()
            
            if not result_obj:
                raise NotFoundException(message="结果不存在")
            
            # 更新字段
            update_data = data.model_dump(exclude_unset=True)
            
            # 映射字段名（snake_case -> camelCase）
            field_mapping = {
                'value': 'value',
                'text_value': 'textValue',
                'unit': 'unit',
                'method': 'method',
                'source': 'source',
                'instrument_id': 'instrumentId',
                'is_abnormal': 'isAbnormal',
                'abnormal_reason': 'abnormalReason'
            }
            
            for key, value in update_data.items():
                db_field = field_mapping.get(key, key)
                if hasattr(result_obj, db_field):
                    setattr(result_obj, db_field, value)
            
            await db.commit()
            await db.refresh(result_obj)
            
            logger.info(
                f"Result updated: {result_id}",
                extra={
                    "result_id": result_id,
                    "updates": list(update_data.keys())
                }
            )
            
            return self._map_to_response(result_obj)
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to update result: {str(e)}", exc_info=True)
            await db.rollback()
            raise ValidationException(message=f"更新结果失败: {str(e)}")

    async def delete_result(
        self,
        db: AsyncSession,
        result_id: str
    ) -> None:
        """
        删除结果
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            
        Raises:
            NotFoundException: 结果不存在
        """
        try:
            # 查询结果
            query = select(Result).where(Result.id == result_id)
            result = await db.execute(query)
            result_obj = result.scalar_one_or_none()
            
            if not result_obj:
                raise NotFoundException(message="结果不存在")
            
            await db.delete(result_obj)
            await db.commit()
            
            logger.info(f"Result deleted: {result_id}")
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete result: {str(e)}", exc_info=True)
            await db.rollback()
            raise ValidationException(message=f"删除结果失败: {str(e)}")

    async def review_result(
        self,
        db: AsyncSession,
        result_id: str,
        review: ResultReview
    ) -> ResultResponse:
        """
        审核结果
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            review: 审核数据
            
        Returns:
            审核后的结果
            
        Raises:
            NotFoundException: 结果不存在
        """
        try:
            # 查询结果
            query = select(Result).where(Result.id == result_id)
            result = await db.execute(query)
            result_obj = result.scalar_one_or_none()
            
            if not result_obj:
                raise NotFoundException(message="结果不存在")
            
            # 更新审核信息
            result_obj.reviewedBy = review.reviewed_by
            result_obj.reviewedAt = datetime.utcnow()
            
            # 如果审核不通过，可以添加备注到异常原因
            if not review.is_approved and review.review_comment:
                result_obj.isAbnormal = True
                result_obj.abnormalReason = review.review_comment
            
            await db.commit()
            await db.refresh(result_obj)
            
            logger.info(
                f"Result reviewed: {result_id}",
                extra={
                    "result_id": result_id,
                    "reviewed_by": review.reviewed_by,
                    "is_approved": review.is_approved
                }
            )
            
            return self._map_to_response(result_obj)
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"Failed to review result: {str(e)}", exc_info=True)
            await db.rollback()
            raise ValidationException(message=f"审核结果失败: {str(e)}")

    async def get_results_by_sample_id(
        self,
        db: AsyncSession,
        sample_id: str
    ) -> List[ResultResponse]:
        """
        根据样品 ID 获取所有结果
        
        Args:
            db: 数据库会话
            sample_id: 样品 ID
            
        Returns:
            结果列表
        """
        try:
            query = (
                select(Result)
                .where(Result.sampleId == sample_id)
                .order_by(Result.enteredAt.desc())
            )
            
            result = await db.execute(query)
            results = result.scalars().all()
            
            return [self._map_to_response(r) for r in results]
            
        except Exception as e:
            logger.error(f"Failed to get results by sample id: {str(e)}", exc_info=True)
            raise

    def _map_to_response(self, result: Result) -> ResultResponse:
        """
        将数据库模型映射为响应 DTO
        
        Args:
            result: 数据库结果模型
            
        Returns:
            结果响应 DTO
        """
        return ResultResponse(
            id=result.id,
            sample_id=result.sampleId,
            test_item_id=result.testItemId,
            parameter=result.parameter,
            value=result.value,
            text_value=result.textValue,
            unit=result.unit,
            method=result.method,
            source=result.source,
            instrument_id=result.instrumentId,
            formula_id=result.formulaId,
            is_calculated=result.isCalculated,
            is_abnormal=result.isAbnormal,
            abnormal_reason=result.abnormalReason,
            is_retest=result.isRetest,
            original_result_id=result.originalResultId,
            retest_reason=result.retestReason,
            version=result.version,
            entered_by=result.enteredBy,
            entered_at=result.enteredAt,
            reviewed_by=result.reviewedBy,
            reviewed_at=result.reviewedAt
        )


# 创建服务实例
result_service = ResultService()
