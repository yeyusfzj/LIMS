"""
质量判定服务

此模块实现质量判定的业务逻辑，包括：
- 判定规则管理
- 自动质量判定
- 人工复核判定
- 判定历史管理
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List, Dict, Any, Tuple
import json
from datetime import datetime

from app.models.judgment import (
    JudgmentRule,
    QualityJudgment,
    JudgmentHistory,
    JudgmentResult as JudgmentResultEnum
)
from app.models.sample import Sample, SampleStatus
from app.models.result import Result
from app.schemas.judgment import (
    JudgmentRuleCreate,
    JudgmentRuleUpdate,
    JudgmentRuleQuery,
    JudgmentRuleResponse,
    JudgmentRuleListResponse,
    PerformJudgmentRequest,
    JudgmentResponse,
    JudgmentBasisDetail,
    ReviewJudgmentRequest,
    BatchJudgmentRequest,
    BatchJudgmentResponse,
    BatchJudgmentItemResult,
    JudgmentHistoryQuery,
    JudgmentHistoryListResponse,
    JudgmentHistoryResponse,
    JudgmentRuleType,
    JudgmentRuleCondition
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)
from app.core.logging import logger


class JudgmentService:
    """质量判定服务类"""

    # ============================================
    # 判定规则管理
    # ============================================

    async def create_judgment_rule(
        self,
        db: AsyncSession,
        data: JudgmentRuleCreate,
        created_by: str
    ) -> JudgmentRuleResponse:
        """创建判定规则"""
        try:
            # 验证判定条件
            self._validate_judgment_conditions(data.conditions)

            # 创建规则
            rule = JudgmentRule(
                name=data.name,
                description=data.description,
                testItemType=data.testItemType,
                conditions=json.dumps([c.model_dump() for c in data.conditions]),
                priority=data.priority or 0,
                createdBy=created_by
            )

            db.add(rule)
            await db.commit()
            await db.refresh(rule)

            logger.info(f"创建判定规则成功: {rule.id} - {rule.name}")
            return self._format_judgment_rule(rule)

        except Exception as e:
            await db.rollback()
            logger.error(f"创建判定规则失败: {str(e)}")
            raise

    async def update_judgment_rule(
        self,
        db: AsyncSession,
        rule_id: str,
        data: JudgmentRuleUpdate
    ) -> JudgmentRuleResponse:
        """更新判定规则"""
        try:
            # 查询规则
            result = await db.execute(
                select(JudgmentRule).where(JudgmentRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()

            if not rule:
                raise NotFoundException(message="判定规则不存在")

            # 如果更新条件，需要验证
            if data.conditions:
                self._validate_judgment_conditions(data.conditions)
                rule.conditions = json.dumps([c.model_dump() for c in data.conditions])

            # 更新其他字段
            if data.name is not None:
                rule.name = data.name
            if data.description is not None:
                rule.description = data.description
            if data.priority is not None:
                rule.priority = data.priority
            if data.isActive is not None:
                rule.isActive = data.isActive

            await db.commit()
            await db.refresh(rule)

            logger.info(f"更新判定规则成功: {rule.id}")
            return self._format_judgment_rule(rule)

        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"更新判定规则失败: {str(e)}")
            raise

    async def list_judgment_rules(
        self,
        db: AsyncSession,
        query: JudgmentRuleQuery
    ) -> JudgmentRuleListResponse:
        """查询判定规则列表"""
        try:
            # 构建查询条件
            conditions = []
            if query.testItemType:
                conditions.append(JudgmentRule.testItemType == query.testItemType)
            if query.isActive is not None:
                conditions.append(JudgmentRule.isActive == query.isActive)

            # 查询总数
            count_stmt = select(func.count(JudgmentRule.id))
            if conditions:
                count_stmt = count_stmt.where(and_(*conditions))
            total_result = await db.execute(count_stmt)
            total = total_result.scalar()

            # 查询列表
            stmt = select(JudgmentRule)
            if conditions:
                stmt = stmt.where(and_(*conditions))
            stmt = stmt.order_by(
                JudgmentRule.priority.desc(),
                JudgmentRule.createdAt.desc()
            ).offset((query.page - 1) * query.pageSize).limit(query.pageSize)

            result = await db.execute(stmt)
            rules = result.scalars().all()

            return JudgmentRuleListResponse(
                items=[self._format_judgment_rule(rule) for rule in rules],
                total=total,
                page=query.page,
                pageSize=query.pageSize
            )

        except Exception as e:
            logger.error(f"查询判定规则列表失败: {str(e)}")
            raise

    async def get_judgment_rule(
        self,
        db: AsyncSession,
        rule_id: str
    ) -> JudgmentRuleResponse:
        """获取判定规则详情"""
        try:
            result = await db.execute(
                select(JudgmentRule).where(JudgmentRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()

            if not rule:
                raise NotFoundException(message="判定规则不存在")

            return self._format_judgment_rule(rule)

        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"获取判定规则详情失败: {str(e)}")
            raise

    async def delete_judgment_rule(
        self,
        db: AsyncSession,
        rule_id: str
    ) -> None:
        """删除判定规则"""
        try:
            result = await db.execute(
                select(JudgmentRule).where(JudgmentRule.id == rule_id)
            )
            rule = result.scalar_one_or_none()

            if not rule:
                raise NotFoundException(message="判定规则不存在")

            await db.delete(rule)
            await db.commit()

            logger.info(f"删除判定规则成功: {rule_id}")

        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"删除判定规则失败: {str(e)}")
            raise

    # ============================================
    # 质量判定
    # ============================================

    async def perform_quality_judgment(
        self,
        db: AsyncSession,
        sample_id: str,
        rule_ids: Optional[List[str]],
        performed_by: str
    ) -> JudgmentResponse:
        """执行质量判定"""
        try:
            # 获取样品信息和检测结果
            sample_result = await db.execute(
                select(Sample).where(Sample.id == sample_id)
            )
            sample = sample_result.scalar_one_or_none()

            if not sample:
                raise NotFoundException(message="样品不存在")

            # 检查样品状态
            if sample.status != SampleStatus.AUDIT_COMPLETE:
                raise ValidationException(
                    message="只有审核完成的样品才能进行质量判定"
                )

            # 检查是否已有判定结果
            existing_result = await db.execute(
                select(QualityJudgment).where(QualityJudgment.sampleId == sample_id)
            )
            existing_judgment = existing_result.scalar_one_or_none()

            if existing_judgment:
                raise ConflictException(
                    message="该样品已有判定结果，请使用复核功能修改"
                )

            # 获取检测结果
            results_query = await db.execute(
                select(Result).where(Result.sampleId == sample_id)
            )
            results = results_query.scalars().all()

            if not results:
                raise ValidationException(message="样品没有检测结果，无法进行判定")

            # 获取适用的判定规则
            rules = await self._get_applicable_rules(db, sample, rule_ids)

            if not rules:
                raise ValidationException(message="没有找到适用的判定规则")

            # 执行判定逻辑
            judgment_result, basis_details = await self._evaluate_judgment(
                sample, results, rules
            )

            # 保存判定结果
            judgment = QualityJudgment(
                sampleId=sample_id,
                result=judgment_result,
                basis=json.dumps([d.model_dump() for d in basis_details]),
                isAutomatic=True,
                judgedBy=performed_by
            )

            db.add(judgment)
            await db.commit()
            await db.refresh(judgment)

            logger.info(
                f"质量判定完成: 样品={sample_id}, 结果={judgment_result}, "
                f"规则数={len(rules)}"
            )

            return self._format_judgment_response(judgment, basis_details)

        except (NotFoundException, ValidationException, ConflictException):
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"执行质量判定失败: {str(e)}")
            raise

    async def review_judgment(
        self,
        db: AsyncSession,
        judgment_id: str,
        data: ReviewJudgmentRequest,
        reviewed_by: str
    ) -> JudgmentResponse:
        """人工复核判定结果"""
        try:
            # 获取原判定结果
            result = await db.execute(
                select(QualityJudgment).where(QualityJudgment.id == judgment_id)
            )
            judgment = result.scalar_one_or_none()

            if not judgment:
                raise NotFoundException(message="判定结果不存在")

            # 记录判定历史
            history = JudgmentHistory(
                judgmentId=judgment_id,
                sampleId=judgment.sampleId,
                previousResult=judgment.result,
                newResult=data.newResult,
                changeReason=data.reason,
                changedBy=reviewed_by
            )
            db.add(history)

            # 更新判定结果
            judgment.result = data.newResult
            judgment.reviewedBy = reviewed_by
            judgment.reviewedAt = datetime.utcnow()

            await db.commit()
            await db.refresh(judgment)

            logger.info(
                f"判定结果复核完成: 判定ID={judgment_id}, "
                f"原结果={history.previousResult}, 新结果={data.newResult}"
            )

            basis_details = json.loads(judgment.basis)
            basis_detail_objs = [
                JudgmentBasisDetail(**d) for d in basis_details
            ]
            return self._format_judgment_response(judgment, basis_detail_objs)

        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"复核判定结果失败: {str(e)}")
            raise

    async def get_judgment(
        self,
        db: AsyncSession,
        sample_id: str
    ) -> Optional[JudgmentResponse]:
        """获取判定结果"""
        try:
            result = await db.execute(
                select(QualityJudgment).where(QualityJudgment.sampleId == sample_id)
            )
            judgment = result.scalar_one_or_none()

            if not judgment:
                return None

            basis_details = json.loads(judgment.basis)
            basis_detail_objs = [
                JudgmentBasisDetail(**d) for d in basis_details
            ]
            return self._format_judgment_response(judgment, basis_detail_objs)

        except Exception as e:
            logger.error(f"获取判定结果失败: {str(e)}")
            raise

    async def batch_judgment(
        self,
        db: AsyncSession,
        sample_ids: List[str],
        performed_by: str
    ) -> BatchJudgmentResponse:
        """批量判定"""
        results: List[BatchJudgmentItemResult] = []

        for sample_id in sample_ids:
            try:
                judgment = await self.perform_quality_judgment(
                    db, sample_id, None, performed_by
                )
                results.append(
                    BatchJudgmentItemResult(
                        sampleId=sample_id,
                        success=True,
                        judgment=judgment
                    )
                )
            except Exception as e:
                results.append(
                    BatchJudgmentItemResult(
                        sampleId=sample_id,
                        success=False,
                        error=str(e)
                    )
                )

        successful = sum(1 for r in results if r.success)
        failed = sum(1 for r in results if not r.success)

        logger.info(
            f"批量判定完成: 总数={len(sample_ids)}, "
            f"成功={successful}, 失败={failed}"
        )

        return BatchJudgmentResponse(
            total=len(sample_ids),
            successful=successful,
            failed=failed,
            results=results
        )

    # ============================================
    # 判定历史
    # ============================================

    async def list_judgment_history(
        self,
        db: AsyncSession,
        query: JudgmentHistoryQuery
    ) -> JudgmentHistoryListResponse:
        """查询判定历史"""
        try:
            # 构建查询条件
            conditions = []
            if query.sampleId:
                conditions.append(JudgmentHistory.sampleId == query.sampleId)
            if query.judgmentId:
                conditions.append(JudgmentHistory.judgmentId == query.judgmentId)

            # 查询总数
            count_stmt = select(func.count(JudgmentHistory.id))
            if conditions:
                count_stmt = count_stmt.where(and_(*conditions))
            total_result = await db.execute(count_stmt)
            total = total_result.scalar()

            # 查询列表
            stmt = select(JudgmentHistory)
            if conditions:
                stmt = stmt.where(and_(*conditions))
            stmt = stmt.order_by(
                JudgmentHistory.changedAt.desc()
            ).offset((query.page - 1) * query.pageSize).limit(query.pageSize)

            result = await db.execute(stmt)
            history_list = result.scalars().all()

            return JudgmentHistoryListResponse(
                items=[
                    JudgmentHistoryResponse.model_validate(h)
                    for h in history_list
                ],
                total=total,
                page=query.page,
                pageSize=query.pageSize
            )

        except Exception as e:
            logger.error(f"查询判定历史失败: {str(e)}")
            raise

    # ============================================
    # 私有辅助方法
    # ============================================

    async def _get_applicable_rules(
        self,
        db: AsyncSession,
        sample: Sample,
        rule_ids: Optional[List[str]]
    ) -> List[JudgmentRule]:
        """获取适用的判定规则"""
        if rule_ids:
            # 使用指定的规则
            result = await db.execute(
                select(JudgmentRule).where(
                    and_(
                        JudgmentRule.id.in_(rule_ids),
                        JudgmentRule.isActive == True
                    )
                ).order_by(JudgmentRule.priority.desc())
            )
        else:
            # 自动匹配规则（这里简化处理，实际应根据样品的检测项类型匹配）
            result = await db.execute(
                select(JudgmentRule).where(
                    JudgmentRule.isActive == True
                ).order_by(JudgmentRule.priority.desc())
            )

        return list(result.scalars().all())

    async def _evaluate_judgment(
        self,
        sample: Sample,
        results: List[Result],
        rules: List[JudgmentRule]
    ) -> Tuple[JudgmentResultEnum, List[JudgmentBasisDetail]]:
        """评估判定结果"""
        basis_details: List[JudgmentBasisDetail] = []
        all_conditions_passed = True

        # 遍历所有规则
        for rule in rules:
            conditions_data = json.loads(rule.conditions)
            conditions = [
                JudgmentRuleCondition(**c) for c in conditions_data
            ]

            # 评估规则的所有条件（AND 关系）
            for condition in conditions:
                evaluation_result = self._evaluate_condition(
                    condition, results, rule
                )
                basis_details.append(evaluation_result)

                if not evaluation_result.evaluationResult:
                    all_conditions_passed = False

        # 根据评估结果确定判定结果
        result = (
            JudgmentResultEnum.QUALIFIED
            if all_conditions_passed
            else JudgmentResultEnum.UNQUALIFIED
        )

        return result, basis_details

    def _evaluate_condition(
        self,
        condition: JudgmentRuleCondition,
        results: List[Result],
        rule: JudgmentRule
    ) -> JudgmentBasisDetail:
        """评估单个判定条件"""
        if condition.type == JudgmentRuleType.RANGE:
            return self._evaluate_range_condition(condition, results, rule)
        elif condition.type == JudgmentRuleType.FORMULA:
            return self._evaluate_formula_condition(condition, results, rule)
        elif condition.type == JudgmentRuleType.LOGIC:
            return self._evaluate_logic_condition(condition, results, rule)
        else:
            raise ValidationException(
                message=f"不支持的判定条件类型: {condition.type}"
            )

    def _evaluate_range_condition(
        self,
        condition: JudgmentRuleCondition,
        results: List[Result],
        rule: JudgmentRule
    ) -> JudgmentBasisDetail:
        """评估范围条件"""
        parameter = condition.parameter
        min_value = condition.minValue
        max_value = condition.maxValue

        # 查找对应参数的检测结果
        result = next(
            (r for r in results if r.parameter == parameter),
            None
        )

        if not result or result.value is None:
            return JudgmentBasisDetail(
                ruleId=rule.id,
                ruleName=rule.name,
                conditionType=JudgmentRuleType.RANGE,
                parameter=parameter,
                evaluationResult=False,
                message=f"未找到参数 {parameter} 的检测结果"
            )

        actual_value = result.value
        passed = True
        message = f"参数 {parameter} 的值为 {actual_value}"

        if min_value is not None and actual_value < min_value:
            passed = False
            message += f"，低于最小值 {min_value}"

        if max_value is not None and actual_value > max_value:
            passed = False
            message += f"，超过最大值 {max_value}"

        if passed:
            min_str = str(min_value) if min_value is not None else "-∞"
            max_str = str(max_value) if max_value is not None else "+∞"
            message += f"，在合格范围内 [{min_str}, {max_str}]"

        return JudgmentBasisDetail(
            ruleId=rule.id,
            ruleName=rule.name,
            conditionType=JudgmentRuleType.RANGE,
            parameter=parameter,
            actualValue=actual_value,
            expectedRange={"min": min_value, "max": max_value},
            evaluationResult=passed,
            message=message
        )

    def _evaluate_formula_condition(
        self,
        condition: JudgmentRuleCondition,
        results: List[Result],
        rule: JudgmentRule
    ) -> JudgmentBasisDetail:
        """评估公式条件"""
        formula = condition.formula

        if not formula:
            raise ValidationException(message="公式条件缺少公式表达式")

        try:
            # 构建变量映射
            variables = {r.parameter: r.value for r in results if r.value is not None}

            # 使用 eval 计算公式（生产环境应使用更安全的表达式解析器）
            # 这里简化处理，实际应使用 sympy 或其他安全的数学表达式库
            calculated_value = eval(formula, {"__builtins__": {}}, variables)
            passed = calculated_value > 0  # 公式结果 > 0 表示合格

            return JudgmentBasisDetail(
                ruleId=rule.id,
                ruleName=rule.name,
                conditionType=JudgmentRuleType.FORMULA,
                formula=formula,
                calculatedValue=float(calculated_value),
                evaluationResult=passed,
                message=f"公式 {formula} 计算结果为 {calculated_value}，{'合格' if passed else '不合格'}"
            )
        except Exception as e:
            return JudgmentBasisDetail(
                ruleId=rule.id,
                ruleName=rule.name,
                conditionType=JudgmentRuleType.FORMULA,
                formula=formula,
                evaluationResult=False,
                message=f"公式计算失败: {str(e)}"
            )

    def _evaluate_logic_condition(
        self,
        condition: JudgmentRuleCondition,
        results: List[Result],
        rule: JudgmentRule
    ) -> JudgmentBasisDetail:
        """评估逻辑表达式条件"""
        logic_expression = condition.logicExpression

        if not logic_expression:
            raise ValidationException(message="逻辑条件缺少逻辑表达式")

        try:
            # 构建变量映射
            variables = {r.parameter: r.value for r in results if r.value is not None}

            # 评估逻辑表达式
            passed = bool(eval(logic_expression, {"__builtins__": {}}, variables))

            return JudgmentBasisDetail(
                ruleId=rule.id,
                ruleName=rule.name,
                conditionType=JudgmentRuleType.LOGIC,
                logicExpression=logic_expression,
                evaluationResult=passed,
                message=f"逻辑表达式 {logic_expression} 评估结果为 {'真' if passed else '假'}"
            )
        except Exception as e:
            return JudgmentBasisDetail(
                ruleId=rule.id,
                ruleName=rule.name,
                conditionType=JudgmentRuleType.LOGIC,
                logicExpression=logic_expression,
                evaluationResult=False,
                message=f"逻辑表达式评估失败: {str(e)}"
            )

    def _validate_judgment_conditions(
        self,
        conditions: List[JudgmentRuleCondition]
    ) -> None:
        """验证判定条件"""
        if not conditions:
            raise ValidationException(message="判定条件不能为空")

        for condition in conditions:
            if condition.type == JudgmentRuleType.RANGE:
                if not condition.parameter:
                    raise ValidationException(
                        message="范围判定条件必须指定参数名称"
                    )
                if condition.minValue is None and condition.maxValue is None:
                    raise ValidationException(
                        message="范围判定条件必须指定最小值或最大值"
                    )
            elif condition.type == JudgmentRuleType.FORMULA:
                if not condition.formula:
                    raise ValidationException(
                        message="公式判定条件必须指定公式表达式"
                    )
            elif condition.type == JudgmentRuleType.LOGIC:
                if not condition.logicExpression:
                    raise ValidationException(
                        message="逻辑判定条件必须指定逻辑表达式"
                    )
            else:
                raise ValidationException(
                    message=f"不支持的判定条件类型: {condition.type}"
                )

    def _format_judgment_rule(self, rule: JudgmentRule) -> JudgmentRuleResponse:
        """格式化判定规则"""
        conditions = json.loads(rule.conditions)
        return JudgmentRuleResponse(
            id=rule.id,
            name=rule.name,
            description=rule.description,
            testItemType=rule.testItemType,
            conditions=conditions,
            priority=rule.priority,
            isActive=rule.isActive,
            createdBy=rule.createdBy,
            createdAt=rule.createdAt,
            updatedAt=rule.updatedAt
        )

    def _format_judgment_response(
        self,
        judgment: QualityJudgment,
        basis_details: List[JudgmentBasisDetail]
    ) -> JudgmentResponse:
        """格式化判定响应"""
        return JudgmentResponse(
            id=judgment.id,
            sampleId=judgment.sampleId,
            result=judgment.result,
            basis=judgment.basis,
            basisDetails=basis_details,
            isAutomatic=judgment.isAutomatic,
            judgedBy=judgment.judgedBy,
            judgedAt=judgment.judgedAt,
            reviewedBy=judgment.reviewedBy,
            reviewedAt=judgment.reviewedAt
        )


# 创建服务实例
judgment_service = JudgmentService()
