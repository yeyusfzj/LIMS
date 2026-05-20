"""
异常检测服务

实现异常检测规则配置、自动异常检测和复测管理
验证需求：3.6, 3.7, 3.8, 10.1, 10.2
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import uuid

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import logger


class AnomalyRuleType:
    """异常检测规则类型"""
    RANGE = "RANGE"           # 范围检测
    DEVIATION = "DEVIATION"   # 偏差检测
    TREND = "TREND"           # 趋势检测
    CUSTOM = "CUSTOM"         # 自定义规则


class AnomalyDetectionService:
    """异常检测服务类"""
    
    def __init__(self):
        # 内存中存储异常检测规则（实际应用中应该存储在数据库）
        self.rules: Dict[str, Dict[str, Any]] = {}
    
    async def create_rule(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        创建异常检测规则
        
        需求 3.6: 支持配置异常检测规则（范围、偏差、趋势等）
        
        Args:
            db: 数据库会话
            data: 规则创建数据
            
        Returns:
            创建的规则
        """
        try:
            rule_id = str(uuid.uuid4())
            rule = {
                "id": rule_id,
                "name": data["name"],
                "description": data.get("description"),
                "testMethod": data["testMethod"],
                "parameter": data["parameter"],
                "ruleType": data["ruleType"],
                "config": data["config"],
                "isActive": data.get("isActive", True),
                "priority": data.get("priority", 0),
                "createdBy": data["createdBy"],
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            
            self.rules[rule_id] = rule
            
            logger.info(
                "Anomaly detection rule created",
                extra={
                    "rule_id": rule_id,
                    "name": rule["name"],
                    "rule_type": rule["ruleType"]
                }
            )
            
            return rule
        except Exception as e:
            logger.error(f"Failed to create anomaly detection rule: {str(e)}")
            raise
    
    async def get_rule(
        self,
        db: AsyncSession,
        rule_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取规则详情
        
        Args:
            db: 数据库会话
            rule_id: 规则 ID
            
        Returns:
            规则详情
        """
        return self.rules.get(rule_id)
    
    async def list_rules(
        self,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        获取所有规则
        
        Args:
            db: 数据库会话
            
        Returns:
            规则列表
        """
        return list(self.rules.values())
    
    async def get_rules_for_test(
        self,
        db: AsyncSession,
        test_method: str,
        parameter: str
    ) -> List[Dict[str, Any]]:
        """
        获取适用于特定检测方法和参数的规则
        
        Args:
            db: 数据库会话
            test_method: 检测方法
            parameter: 检测参数
            
        Returns:
            适用的规则列表
        """
        applicable_rules = [
            rule for rule in self.rules.values()
            if rule["isActive"]
            and rule["testMethod"] == test_method
            and rule["parameter"] == parameter
        ]
        
        # 按优先级降序排序
        applicable_rules.sort(key=lambda r: r["priority"], reverse=True)
        
        return applicable_rules
    
    async def update_rule(
        self,
        db: AsyncSession,
        rule_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        更新规则
        
        Args:
            db: 数据库会话
            rule_id: 规则 ID
            data: 更新数据
            
        Returns:
            更新后的规则
        """
        rule = self.rules.get(rule_id)
        
        if not rule:
            raise NotFoundException("异常检测规则不存在")
        
        # 更新字段
        for key, value in data.items():
            if key in rule and value is not None:
                rule[key] = value
        
        rule["updatedAt"] = datetime.utcnow()
        
        logger.info(
            "Anomaly detection rule updated",
            extra={
                "rule_id": rule_id,
                "updates": list(data.keys())
            }
        )
        
        return rule
    
    async def delete_rule(
        self,
        db: AsyncSession,
        rule_id: str
    ) -> None:
        """
        删除规则
        
        Args:
            db: 数据库会话
            rule_id: 规则 ID
        """
        if rule_id not in self.rules:
            raise NotFoundException("异常检测规则不存在")
        
        del self.rules[rule_id]
        
        logger.info("Anomaly detection rule deleted", extra={"rule_id": rule_id})
    
    async def detect_anomaly(
        self,
        db: AsyncSession,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检测结果是否异常
        
        需求 3.7: 根据检测方法的范围规则自动检测异常
        
        Args:
            db: 数据库会话
            result: 检测结果
            
        Returns:
            异常检测结果
        """
        try:
            # 获取适用的规则
            rules = await self.get_rules_for_test(
                db,
                result["method"],
                result["parameter"]
            )
            
            if not rules:
                # 没有配置规则，不检测异常
                return {"isAbnormal": False}
            
            # 按优先级检查每个规则
            for rule in rules:
                detection_result = await self._check_rule(db, result, rule)
                
                if detection_result["isAbnormal"]:
                    # 找到第一个异常，立即返回
                    return detection_result
            
            # 所有规则都通过
            return {"isAbnormal": False}
        except Exception as e:
            logger.error(f"Failed to detect anomaly: {str(e)}")
            raise
    
    async def _check_rule(
        self,
        db: AsyncSession,
        result: Dict[str, Any],
        rule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检查单个规则
        
        Args:
            db: 数据库会话
            result: 检测结果
            rule: 检测规则
            
        Returns:
            检测结果
        """
        rule_type = rule["ruleType"]
        
        if rule_type == AnomalyRuleType.RANGE:
            return self._check_range_rule(result, rule)
        elif rule_type == AnomalyRuleType.DEVIATION:
            return self._check_deviation_rule(result, rule)
        elif rule_type == AnomalyRuleType.TREND:
            return await self._check_trend_rule(db, result, rule)
        elif rule_type == AnomalyRuleType.CUSTOM:
            return self._check_custom_rule(result, rule)
        else:
            return {"isAbnormal": False}
    
    def _check_range_rule(
        self,
        result: Dict[str, Any],
        rule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检查范围规则
        
        Args:
            result: 检测结果
            rule: 规则
            
        Returns:
            检测结果
        """
        config = rule["config"]
        value = result.get("value")
        
        if value is None:
            return {"isAbnormal": False}
        
        is_abnormal = False
        reason = ""
        
        min_value = config.get("min")
        max_value = config.get("max")
        
        if min_value is not None and value < min_value:
            is_abnormal = True
            reason = f"检测值 {value} 低于最小值 {min_value}"
        elif max_value is not None and value > max_value:
            is_abnormal = True
            reason = f"检测值 {value} 高于最大值 {max_value}"
        
        return {
            "isAbnormal": is_abnormal,
            "reason": reason if is_abnormal else None,
            "ruleId": rule["id"],
            "ruleName": rule["name"],
            "detectedValue": value,
            "expectedRange": {
                "min": min_value,
                "max": max_value
            }
        }
    
    def _check_deviation_rule(
        self,
        result: Dict[str, Any],
        rule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检查偏差规则
        
        Args:
            result: 检测结果
            rule: 规则
            
        Returns:
            检测结果
        """
        config = rule["config"]
        value = result.get("value")
        
        if value is None:
            return {"isAbnormal": False}
        
        reference_value = config["referenceValue"]
        max_deviation = config["maxDeviation"]
        deviation_type = config["deviationType"]
        
        is_abnormal = False
        reason = ""
        
        if deviation_type == "absolute":
            deviation = abs(value - reference_value)
            is_abnormal = deviation > max_deviation
            
            if is_abnormal:
                reason = (
                    f"检测值 {value} 与参考值 {reference_value} 的偏差 "
                    f"{deviation} 超过最大偏差 {max_deviation}"
                )
        else:  # percentage
            if reference_value != 0:
                deviation = abs((value - reference_value) / reference_value * 100)
                is_abnormal = deviation > max_deviation
                
                if is_abnormal:
                    reason = (
                        f"检测值 {value} 与参考值 {reference_value} 的偏差 "
                        f"{deviation:.2f}% 超过最大偏差 {max_deviation}%"
                    )
        
        return {
            "isAbnormal": is_abnormal,
            "reason": reason if is_abnormal else None,
            "ruleId": rule["id"],
            "ruleName": rule["name"],
            "detectedValue": value
        }
    
    async def _check_trend_rule(
        self,
        db: AsyncSession,
        result: Dict[str, Any],
        rule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检查趋势规则
        
        Args:
            db: 数据库会话
            result: 检测结果
            rule: 规则
            
        Returns:
            检测结果
        """
        from app.models.result import Result
        
        config = rule["config"]
        value = result.get("value")
        
        if value is None:
            return {"isAbnormal": False}
        
        window_size = config["windowSize"]
        max_change = config["maxChange"]
        change_type = config["changeType"]
        
        # 获取历史数据
        stmt = (
            select(Result)
            .where(
                Result.sampleId == result["sampleId"],
                Result.parameter == result["parameter"],
                Result.method == result["method"],
                Result.id != result["id"]
            )
            .order_by(Result.enteredAt.desc())
            .limit(window_size)
        )
        
        db_result = await db.execute(stmt)
        historical_results = db_result.scalars().all()
        
        if not historical_results:
            # 没有历史数据，无法判断趋势
            return {"isAbnormal": False}
        
        # 计算平均值
        historical_values = [
            r.value for r in historical_results
            if r.value is not None
        ]
        
        if not historical_values:
            return {"isAbnormal": False}
        
        avg_value = sum(historical_values) / len(historical_values)
        
        is_abnormal = False
        reason = ""
        
        if change_type == "absolute":
            change = abs(value - avg_value)
            is_abnormal = change > max_change
            
            if is_abnormal:
                reason = (
                    f"检测值 {value} 与历史平均值 {avg_value:.2f} 的变化 "
                    f"{change:.2f} 超过最大变化 {max_change}"
                )
        else:  # percentage
            if avg_value != 0:
                change = abs((value - avg_value) / avg_value * 100)
                is_abnormal = change > max_change
                
                if is_abnormal:
                    reason = (
                        f"检测值 {value} 与历史平均值 {avg_value:.2f} 的变化 "
                        f"{change:.2f}% 超过最大变化 {max_change}%"
                    )
        
        return {
            "isAbnormal": is_abnormal,
            "reason": reason if is_abnormal else None,
            "ruleId": rule["id"],
            "ruleName": rule["name"],
            "detectedValue": value
        }
    
    def _check_custom_rule(
        self,
        result: Dict[str, Any],
        rule: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        检查自定义规则
        
        Args:
            result: 检测结果
            rule: 规则
            
        Returns:
            检测结果
        """
        # 简化实现：这里应该使用安全的表达式求值器
        # 实际应用中应该使用沙箱环境
        logger.warning("Custom rule evaluation not implemented yet")
        return {"isAbnormal": False}
    
    async def mark_as_abnormal(
        self,
        db: AsyncSession,
        result_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """
        标记结果为异常
        
        需求 3.8: 存储异常信息并关联到结果
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            reason: 异常原因
            
        Returns:
            更新后的结果
        """
        from app.models.result import Result
        
        try:
            # 获取结果
            stmt = select(Result).where(Result.id == result_id)
            db_result = await db.execute(stmt)
            result = db_result.scalar_one_or_none()
            
            if not result:
                raise NotFoundException("结果不存在")
            
            # 更新结果
            result.isAbnormal = True
            result.abnormalReason = reason
            
            await db.commit()
            await db.refresh(result)
            
            logger.info(
                "Result marked as abnormal",
                extra={"result_id": result_id, "reason": reason}
            )
            
            return self._result_to_dict(result)
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to mark result as abnormal: {str(e)}")
            raise
    
    async def request_retest(
        self,
        db: AsyncSession,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        申请复测
        
        需求 10.1: 创建新的检测任务并关联到原样品
        需求 10.2: 在样品历史中记录所有异常和复测信息
        
        Args:
            db: 数据库会话
            data: 复测申请数据
            
        Returns:
            复测响应
        """
        from app.models.result import Result
        from app.models.task import Task, TaskStatus, Priority
        
        try:
            result_id = data["resultId"]
            reason = data["reason"]
            requested_by = data["requestedBy"]
            priority_str = data.get("priority", "NORMAL")
            
            # 获取原始结果
            stmt = select(Result).where(Result.id == result_id)
            db_result = await db.execute(stmt)
            original_result = db_result.scalar_one_or_none()
            
            if not original_result:
                raise NotFoundException("原始结果不存在")
            
            # 映射优先级
            priority_map = {
                "LOW": Priority.LOW,
                "NORMAL": Priority.NORMAL,
                "HIGH": Priority.HIGH,
                "URGENT": Priority.URGENT
            }
            priority = priority_map.get(priority_str, Priority.NORMAL)
            
            # 创建复测任务
            task = Task(
                id=str(uuid.uuid4()),
                instanceId="",  # 临时值
                nodeId="retest",
                nodeName="复测",
                nodeType="retest",
                priority=priority,
                status=TaskStatus.PENDING,
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow()
            )
            
            db.add(task)
            
            # 更新原始结果，标记为需要复测
            original_result.retestReason = reason
            
            await db.commit()
            await db.refresh(task)
            
            logger.info(
                "Retest requested",
                extra={
                    "task_id": task.id,
                    "original_result_id": result_id,
                    "sample_id": original_result.sampleId,
                    "reason": reason
                }
            )
            
            return {
                "taskId": task.id,
                "sampleId": original_result.sampleId,
                "originalResultId": result_id,
                "reason": reason,
                "status": task.status.value,
                "createdAt": task.createdAt
            }
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to request retest: {str(e)}")
            raise
    
    async def get_result(
        self,
        db: AsyncSession,
        result_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取结果（字典格式）
        
        Args:
            db: 数据库会话
            result_id: 结果 ID
            
        Returns:
            结果字典
        """
        from app.models.result import Result
        
        stmt = select(Result).where(Result.id == result_id)
        db_result = await db.execute(stmt)
        result = db_result.scalar_one_or_none()
        
        if not result:
            return None
        
        return self._result_to_dict(result)
    
    def _result_to_dict(self, result) -> Dict[str, Any]:
        """将结果模型转换为字典"""
        return {
            "id": result.id,
            "sampleId": result.sampleId,
            "testItemId": result.testItemId,
            "parameter": result.parameter,
            "value": result.value,
            "textValue": result.textValue,
            "unit": result.unit,
            "method": result.method,
            "source": result.source.value if result.source else None,
            "instrumentId": result.instrumentId,
            "formulaId": result.formulaId,
            "isCalculated": result.isCalculated,
            "isAbnormal": result.isAbnormal,
            "abnormalReason": result.abnormalReason,
            "isRetest": result.isRetest,
            "originalResultId": result.originalResultId,
            "retestReason": result.retestReason,
            "enteredBy": result.enteredBy,
            "enteredAt": result.enteredAt,
            "reviewedBy": result.reviewedBy,
            "reviewedAt": result.reviewedAt
        }


# 创建服务实例
anomaly_service = AnomalyDetectionService()
