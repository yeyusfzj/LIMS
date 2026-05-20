"""
自动任务分配相关的 Pydantic 模型
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class AssignmentStrategy(str, Enum):
    """派工策略枚举"""
    SKILL_BASED = "SKILL_BASED"  # 基于技能
    WORKLOAD_BASED = "WORKLOAD_BASED"  # 基于工作负载
    ROUND_ROBIN = "ROUND_ROBIN"  # 轮询
    MANUAL = "MANUAL"  # 手动分配


class ConditionOperator(str, Enum):
    """条件操作符枚举"""
    EQUALS = "equals"
    CONTAINS = "contains"
    IN = "in"
    GREATER_THAN = "greaterThan"
    LESS_THAN = "lessThan"


class AssignmentCondition(BaseModel):
    """派工条件"""
    field: str = Field(..., description="条件字段（如 sampleType, priority 等）")
    operator: ConditionOperator = Field(..., description="操作符")
    value: Any = Field(..., description="条件值")


class AssignmentRule(BaseModel):
    """派工规则配置"""
    id: str = Field(..., description="规则 ID")
    name: str = Field(..., description="规则名称")
    description: Optional[str] = Field(None, description="规则描述")
    nodeType: str = Field(..., description="适用的节点类型")
    strategy: AssignmentStrategy = Field(..., description="派工策略")
    priority: int = Field(..., description="规则优先级，数字越大优先级越高")
    conditions: Optional[List[AssignmentCondition]] = Field(None, description="派工条件")
    isActive: bool = Field(True, description="是否启用")


class UserSkill(BaseModel):
    """用户技能配置"""
    userId: str = Field(..., description="用户 ID")
    skills: List[str] = Field(..., description="技能列表")
    certifications: Optional[List[str]] = Field(None, description="资质证书")
    maxConcurrentTasks: Optional[int] = Field(10, description="最大并发任务数")


class AssignmentCandidate(BaseModel):
    """派工候选人"""
    userId: str = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")
    fullName: str = Field(..., description="真实姓名")
    score: float = Field(..., description="匹配分数")
    currentWorkload: int = Field(..., description="当前工作负载")
    skills: List[str] = Field(..., description="技能列表")
    reason: str = Field(..., description="选择原因")


class AssignmentResult(BaseModel):
    """派工结果"""
    success: bool = Field(..., description="是否成功")
    taskId: str = Field(..., description="任务 ID")
    assignedTo: Optional[str] = Field(None, description="分配给用户 ID")
    assignedUser: Optional[Dict[str, str]] = Field(None, description="分配的用户信息")
    candidates: Optional[List[AssignmentCandidate]] = Field(None, description="候选人列表")
    reason: Optional[str] = Field(None, description="失败原因")
    strategy: Optional[AssignmentStrategy] = Field(None, description="使用的策略")


class WorkloadStatistics(BaseModel):
    """工作负载统计"""
    userId: str = Field(..., description="用户 ID")
    pendingTasks: int = Field(..., description="待处理任务数")
    inProgressTasks: int = Field(..., description="进行中任务数")
    totalTasks: int = Field(..., description="总任务数")
    averageCompletionTime: Optional[float] = Field(None, description="平均完成时间（分钟）")


class AssignmentContext(BaseModel):
    """派工上下文"""
    taskId: str = Field(..., description="任务 ID")
    nodeType: str = Field(..., description="节点类型")
    nodeName: str = Field(..., description="节点名称")
    priority: str = Field(..., description="优先级")
    sampleId: Optional[str] = Field(None, description="样品 ID")
    sampleType: Optional[str] = Field(None, description="样品类型")
    sampleCategory: Optional[str] = Field(None, description="样品分类")
    testMethod: Optional[str] = Field(None, description="检测方法")
    workflowId: Optional[str] = Field(None, description="工作流 ID")
    instanceId: str = Field(..., description="工作流实例 ID")


class AutoAssignRequest(BaseModel):
    """自动分配请求"""
    taskId: str = Field(..., description="任务 ID")


class AutoAssignResponse(BaseModel):
    """自动分配响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="消息")
    result: Optional[AssignmentResult] = Field(None, description="分配结果")
