"""
自动任务分配引擎服务

实现基于技能、工作负载等多种策略的自动任务分配
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime

from app.models.task import Task, TaskStatus, Priority
from app.models.user import User, UserStatus
from app.models.workflow import WorkflowInstance
from app.schemas.assignment import (
    AssignmentStrategy,
    AssignmentRule,
    AssignmentCondition,
    AssignmentCandidate,
    AssignmentResult,
    AssignmentContext,
    UserSkill,
    WorkloadStatistics,
    ConditionOperator,
)
from app.core.logging import logger


class AssignmentEngine:
    """自动任务分配引擎"""

    def __init__(self):
        self.rules: List[AssignmentRule] = []
        self.user_skills: Dict[str, UserSkill] = {}
        self.enable_auto_assignment: bool = True
        self.fallback_to_manual: bool = True

    async def initialize(self, db: AsyncSession):
        """初始化派工引擎"""
        # 加载默认规则
        self.load_default_rules()
        
        # 加载用户技能
        await self.load_user_skills(db)
        
        logger.info(f"派工引擎已初始化", extra={
            "rulesCount": len(self.rules),
            "usersCount": len(self.user_skills)
        })

    def load_default_rules(self):
        """加载默认派工规则"""
        self.rules = [
            AssignmentRule(
                id="rule-1",
                name="化学分析任务派工",
                nodeType="chemical_analysis",
                strategy=AssignmentStrategy.SKILL_BASED,
                priority=100,
                conditions=[
                    AssignmentCondition(
                        field="sampleCategory",
                        operator=ConditionOperator.EQUALS,
                        value="chemical"
                    )
                ],
                isActive=True
            ),
            AssignmentRule(
                id="rule-2",
                name="微生物检测任务派工",
                nodeType="microbiology_test",
                strategy=AssignmentStrategy.SKILL_BASED,
                priority=100,
                conditions=[
                    AssignmentCondition(
                        field="sampleCategory",
                        operator=ConditionOperator.EQUALS,
                        value="microbiology"
                    )
                ],
                isActive=True
            ),
            AssignmentRule(
                id="rule-3",
                name="紧急任务优先派工",
                nodeType="*",
                strategy=AssignmentStrategy.WORKLOAD_BASED,
                priority=200,
                conditions=[
                    AssignmentCondition(
                        field="priority",
                        operator=ConditionOperator.EQUALS,
                        value=Priority.URGENT.value
                    )
                ],
                isActive=True
            ),
            AssignmentRule(
                id="rule-4",
                name="默认轮询派工",
                nodeType="*",
                strategy=AssignmentStrategy.ROUND_ROBIN,
                priority=1,
                isActive=True
            ),
        ]

    async def load_user_skills(self, db: AsyncSession):
        """加载用户技能配置"""
        # 查询所有活跃用户
        result = await db.execute(
            select(User).where(User.status == UserStatus.ACTIVE)
        )
        users = result.scalars().all()

        # 根据部门和职位分配技能（示例逻辑）
        for user in users:
            skills = []

            # 根据部门分配技能
            if user.department and ("化学" in user.department or "分析" in user.department):
                skills.extend(["chemical_analysis", "sample_preparation"])

            if user.department and "微生物" in user.department:
                skills.extend(["microbiology_test", "culture_preparation"])

            # 根据职位分配技能
            if user.position and ("高级" in user.position or "主管" in user.position):
                skills.extend(["review", "approval", "quality_judgment"])

            # 如果没有特定技能，添加通用技能
            if not skills:
                skills.append("general")

            self.user_skills[user.id] = UserSkill(
                userId=user.id,
                skills=skills,
                maxConcurrentTasks=10
            )

        logger.info(f"已加载 {len(self.user_skills)} 个用户的技能配置")

    async def auto_assign(
        self,
        db: AsyncSession,
        context: AssignmentContext
    ) -> AssignmentResult:
        """自动派工"""
        try:
            logger.info(f"开始自动派工: 任务 {context.taskId}", extra={
                "context": context.model_dump()
            })

            if not self.enable_auto_assignment:
                return AssignmentResult(
                    success=False,
                    taskId=context.taskId,
                    reason="自动派工功能已禁用"
                )

            # 1. 查找匹配的派工规则
            matched_rule = self.find_matching_rule(context)
            if not matched_rule:
                logger.warning(f"未找到匹配的派工规则: 任务 {context.taskId}")
                return await self.handle_assignment_failure(
                    db, context, "未找到匹配的派工规则"
                )

            logger.info(f"使用派工规则: {matched_rule.name}", extra={
                "taskId": context.taskId,
                "ruleId": matched_rule.id,
                "strategy": matched_rule.strategy
            })

            # 2. 根据策略选择候选人
            candidates = await self.find_candidates(db, context, matched_rule)
            if not candidates:
                logger.warning(f"未找到合适的候选人: 任务 {context.taskId}")
                return await self.handle_assignment_failure(
                    db, context, "未找到合适的候选人"
                )

            # 3. 选择最佳候选人（候选人已按分数排序）
            selected_candidate = candidates[0]

            # 4. 分配任务
            await self.assign_task_to_user(db, context.taskId, selected_candidate.userId)

            logger.info(
                f"任务已自动派工: {context.taskId} -> {selected_candidate.username}",
                extra={
                    "taskId": context.taskId,
                    "userId": selected_candidate.userId,
                    "score": selected_candidate.score,
                    "strategy": matched_rule.strategy
                }
            )

            return AssignmentResult(
                success=True,
                taskId=context.taskId,
                assignedTo=selected_candidate.userId,
                assignedUser={
                    "id": selected_candidate.userId,
                    "username": selected_candidate.username,
                    "fullName": selected_candidate.fullName
                },
                candidates=candidates,
                strategy=matched_rule.strategy
            )

        except Exception as e:
            logger.error(f"自动派工失败: 任务 {context.taskId}", extra={"error": str(e)})
            return await self.handle_assignment_failure(
                db, context, f"派工异常: {str(e)}"
            )

    def find_matching_rule(self, context: AssignmentContext) -> Optional[AssignmentRule]:
        """查找匹配的派工规则"""
        # 按优先级排序规则
        sorted_rules = sorted(
            [rule for rule in self.rules if rule.isActive],
            key=lambda r: r.priority,
            reverse=True
        )

        for rule in sorted_rules:
            # 检查节点类型是否匹配
            if rule.nodeType != "*" and rule.nodeType != context.nodeType:
                continue

            # 检查条件是否满足
            if rule.conditions:
                all_conditions_met = all(
                    self.evaluate_condition(condition, context)
                    for condition in rule.conditions
                )
                if not all_conditions_met:
                    continue

            return rule

        return None

    def evaluate_condition(
        self,
        condition: AssignmentCondition,
        context: AssignmentContext
    ) -> bool:
        """评估派工条件"""
        # 获取字段值
        field_value = getattr(context, condition.field, None)

        if condition.operator == ConditionOperator.EQUALS:
            return field_value == condition.value
        elif condition.operator == ConditionOperator.CONTAINS:
            return condition.value in str(field_value)
        elif condition.operator == ConditionOperator.IN:
            return field_value in condition.value
        elif condition.operator == ConditionOperator.GREATER_THAN:
            return field_value > condition.value
        elif condition.operator == ConditionOperator.LESS_THAN:
            return field_value < condition.value
        else:
            return False

    async def find_candidates(
        self,
        db: AsyncSession,
        context: AssignmentContext,
        rule: AssignmentRule
    ) -> List[AssignmentCandidate]:
        """查找候选人"""
        if rule.strategy == AssignmentStrategy.SKILL_BASED:
            return await self.find_candidates_by_skill(db, context)
        elif rule.strategy == AssignmentStrategy.WORKLOAD_BASED:
            return await self.find_candidates_by_workload(db, context)
        elif rule.strategy == AssignmentStrategy.ROUND_ROBIN:
            return await self.find_candidates_by_round_robin(db, context)
        else:
            return []

    async def find_candidates_by_skill(
        self,
        db: AsyncSession,
        context: AssignmentContext
    ) -> List[AssignmentCandidate]:
        """基于技能查找候选人"""
        candidates = []

        # 确定所需技能
        required_skills = self.get_required_skills(context.nodeType)

        # 获取所有活跃用户
        result = await db.execute(
            select(User).where(User.status == UserStatus.ACTIVE)
        )
        users = result.scalars().all()

        for user in users:
            user_skill = self.user_skills.get(user.id)
            if not user_skill:
                continue

            # 检查用户是否具备所需技能
            has_required_skills = any(
                skill in user_skill.skills for skill in required_skills
            )

            if not has_required_skills and "general" not in user_skill.skills:
                continue

            # 获取用户当前工作负载
            workload = await self.get_user_workload(db, user.id)

            # 检查是否超过最大并发任务数
            if user_skill.maxConcurrentTasks is not None:
                if user_skill.maxConcurrentTasks == 0:
                    continue
                if workload.inProgressTasks >= user_skill.maxConcurrentTasks:
                    continue

            # 计算匹配分数
            score = self.calculate_skill_score(
                user_skill.skills,
                required_skills,
                workload
            )

            candidates.append(AssignmentCandidate(
                userId=user.id,
                username=user.username,
                fullName=user.fullName or user.username,
                score=score,
                currentWorkload=workload.totalTasks,
                skills=user_skill.skills,
                reason=f"技能匹配，当前负载: {workload.inProgressTasks} 个任务"
            ))

        # 按分数降序排序
        return sorted(candidates, key=lambda c: c.score, reverse=True)

    async def find_candidates_by_workload(
        self,
        db: AsyncSession,
        context: AssignmentContext
    ) -> List[AssignmentCandidate]:
        """基于工作负载查找候选人"""
        candidates = []

        # 获取所有活跃用户
        result = await db.execute(
            select(User).where(User.status == UserStatus.ACTIVE)
        )
        users = result.scalars().all()

        for user in users:
            user_skill = self.user_skills.get(user.id)
            if not user_skill:
                continue

            # 获取用户当前工作负载
            workload = await self.get_user_workload(db, user.id)

            # 检查是否超过最大并发任务数
            if user_skill.maxConcurrentTasks is not None:
                if user_skill.maxConcurrentTasks == 0:
                    continue
                if workload.inProgressTasks >= user_skill.maxConcurrentTasks:
                    continue

            # 计算负载分数（负载越低分数越高）
            score = self.calculate_workload_score(
                workload,
                user_skill.maxConcurrentTasks or 10
            )

            candidates.append(AssignmentCandidate(
                userId=user.id,
                username=user.username,
                fullName=user.fullName or user.username,
                score=score,
                currentWorkload=workload.totalTasks,
                skills=user_skill.skills,
                reason=f"当前负载: {workload.inProgressTasks} 个进行中任务，{workload.pendingTasks} 个待处理任务"
            ))

        # 按分数降序排序（负载低的在前）
        return sorted(candidates, key=lambda c: c.score, reverse=True)

    async def find_candidates_by_round_robin(
        self,
        db: AsyncSession,
        context: AssignmentContext
    ) -> List[AssignmentCandidate]:
        """轮询方式查找候选人"""
        candidates = []

        # 获取所有活跃用户（按 ID 排序以保证顺序一致）
        result = await db.execute(
            select(User)
            .where(User.status == UserStatus.ACTIVE)
            .order_by(User.id)
        )
        users = result.scalars().all()

        # 获取最近分配的任务，找出上次分配给谁
        last_task_result = await db.execute(
            select(Task)
            .where(
                and_(
                    Task.nodeType == context.nodeType,
                    Task.assignedTo.isnot(None)
                )
            )
            .order_by(Task.assignedAt.desc())
            .limit(1)
        )
        last_task = last_task_result.scalar_one_or_none()

        # 找到上次分配用户的索引
        start_index = 0
        if last_task and last_task.assignedTo:
            user_ids = [u.id for u in users]
            try:
                last_user_index = user_ids.index(last_task.assignedTo)
                start_index = (last_user_index + 1) % len(users)
            except ValueError:
                pass

        # 从下一个用户开始轮询
        for i in range(len(users)):
            index = (start_index + i) % len(users)
            user = users[index]

            user_skill = self.user_skills.get(user.id)
            if not user_skill:
                continue

            # 获取用户当前工作负载
            workload = await self.get_user_workload(db, user.id)

            # 检查是否超过最大并发任务数
            if user_skill.maxConcurrentTasks is not None:
                if user_skill.maxConcurrentTasks == 0:
                    continue
                if workload.inProgressTasks >= user_skill.maxConcurrentTasks:
                    continue

            candidates.append(AssignmentCandidate(
                userId=user.id,
                username=user.username,
                fullName=user.fullName or user.username,
                score=100 - i,  # 轮询顺序越靠前分数越高
                currentWorkload=workload.totalTasks,
                skills=user_skill.skills,
                reason=f"轮询分配，顺序: {i + 1}"
            ))

        return candidates

    def get_required_skills(self, node_type: str) -> List[str]:
        """获取所需技能"""
        skill_map = {
            "chemical_analysis": ["chemical_analysis"],
            "microbiology_test": ["microbiology_test"],
            "sample_preparation": ["sample_preparation"],
            "review": ["review"],
            "approval": ["approval"],
            "quality_judgment": ["quality_judgment"],
        }

        return skill_map.get(node_type, ["general"])

    def calculate_skill_score(
        self,
        user_skills: List[str],
        required_skills: List[str],
        workload: WorkloadStatistics
    ) -> float:
        """计算技能匹配分数"""
        score = 0.0

        # 技能匹配度（0-50分）
        matched_skills = [s for s in required_skills if s in user_skills]
        if required_skills:
            score += (len(matched_skills) / len(required_skills)) * 50

        # 工作负载（0-50分，负载越低分数越高）
        workload_score = max(0, 50 - workload.inProgressTasks * 5)
        score += workload_score

        return score

    def calculate_workload_score(
        self,
        workload: WorkloadStatistics,
        max_tasks: int
    ) -> float:
        """计算工作负载分数"""
        # 负载越低分数越高
        if max_tasks == 0:
            return 0.0
        
        load_ratio = workload.inProgressTasks / max_tasks
        return max(0, 100 - load_ratio * 100)

    async def get_user_workload(
        self,
        db: AsyncSession,
        user_id: str
    ) -> WorkloadStatistics:
        """获取用户工作负载"""
        # 查询待处理任务数
        pending_result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.assignedTo == user_id,
                    Task.status == TaskStatus.PENDING
                )
            )
        )
        pending_tasks = pending_result.scalar() or 0

        # 查询进行中任务数
        in_progress_result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.assignedTo == user_id,
                    Task.status == TaskStatus.IN_PROGRESS
                )
            )
        )
        in_progress_tasks = in_progress_result.scalar() or 0

        # 查询总任务数
        total_result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.assignedTo == user_id,
                    Task.status.in_([
                        TaskStatus.PENDING,
                        TaskStatus.ASSIGNED,
                        TaskStatus.IN_PROGRESS
                    ])
                )
            )
        )
        total_tasks = total_result.scalar() or 0

        return WorkloadStatistics(
            userId=user_id,
            pendingTasks=pending_tasks,
            inProgressTasks=in_progress_tasks,
            totalTasks=total_tasks
        )

    async def assign_task_to_user(
        self,
        db: AsyncSession,
        task_id: str,
        user_id: str
    ):
        """分配任务给用户"""
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if task:
            task.assignedTo = user_id
            task.assignedAt = datetime.utcnow()
            task.status = TaskStatus.ASSIGNED
            await db.commit()

    async def handle_assignment_failure(
        self,
        db: AsyncSession,
        context: AssignmentContext,
        reason: str
    ) -> AssignmentResult:
        """处理派工失败"""
        if self.fallback_to_manual:
            # 将任务标记为待分配状态
            result = await db.execute(
                select(Task).where(Task.id == context.taskId)
            )
            task = result.scalar_one_or_none()

            if task:
                task.status = TaskStatus.PENDING
                await db.commit()

            logger.info(f"任务 {context.taskId} 标记为待手动分配", extra={"reason": reason})

            return AssignmentResult(
                success=False,
                taskId=context.taskId,
                reason=f"{reason}，已标记为待手动分配"
            )

        return AssignmentResult(
            success=False,
            taskId=context.taskId,
            reason=reason
        )

    # 规则管理方法
    def add_rule(self, rule: AssignmentRule):
        """添加派工规则"""
        self.rules.append(rule)
        logger.info(f"已添加派工规则: {rule.name}", extra={"ruleId": rule.id})

    def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> bool:
        """更新派工规则"""
        for i, rule in enumerate(self.rules):
            if rule.id == rule_id:
                # 更新规则
                updated_rule = rule.model_copy(update=updates)
                self.rules[i] = updated_rule
                logger.info(f"已更新派工规则: {rule_id}", extra={"updates": updates})
                return True
        return False

    def remove_rule(self, rule_id: str) -> bool:
        """删除派工规则"""
        for i, rule in enumerate(self.rules):
            if rule.id == rule_id:
                self.rules.pop(i)
                logger.info(f"已删除派工规则: {rule_id}")
                return True
        return False

    def get_rules(self) -> List[AssignmentRule]:
        """获取所有派工规则"""
        return self.rules.copy()

    def set_user_skill(self, user_id: str, skill: UserSkill):
        """设置用户技能"""
        self.user_skills[user_id] = skill
        logger.info(f"已设置用户技能: {user_id}", extra={"skills": skill.skills})

    def get_user_skill(self, user_id: str) -> Optional[UserSkill]:
        """获取用户技能"""
        return self.user_skills.get(user_id)

    def set_auto_assignment_enabled(self, enabled: bool):
        """启用/禁用自动派工"""
        self.enable_auto_assignment = enabled
        logger.info(f"自动派工已{'启用' if enabled else '禁用'}")

    async def get_assignment_statistics(self, db: AsyncSession) -> Dict[str, Any]:
        """获取派工统计信息"""
        # 总任务数
        total_result = await db.execute(select(func.count(Task.id)))
        total_tasks = total_result.scalar() or 0

        # 已分配任务数
        assigned_result = await db.execute(
            select(func.count(Task.id)).where(Task.assignedTo.isnot(None))
        )
        assigned_tasks = assigned_result.scalar() or 0

        # 待分配任务数
        pending_result = await db.execute(
            select(func.count(Task.id)).where(Task.status == TaskStatus.PENDING)
        )
        pending_tasks = pending_result.scalar() or 0

        # 分配失败任务数
        failed_result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.status == TaskStatus.PENDING,
                    Task.assignedTo.is_(None)
                )
            )
        )
        failed_assignments = failed_result.scalar() or 0

        assignment_rate = (assigned_tasks / total_tasks * 100) if total_tasks > 0 else 0

        return {
            "totalTasks": total_tasks,
            "assignedTasks": assigned_tasks,
            "pendingTasks": pending_tasks,
            "failedAssignments": failed_assignments,
            "assignmentRate": assignment_rate
        }


# 创建全局实例
assignment_engine = AssignmentEngine()
