"""
任务相关的 Pydantic 模型

定义任务的请求/响应模型
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class Priority(str, Enum):
    """优先级枚举"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


# ============================================
# 任务请求模型
# ============================================

class TaskCreate(BaseModel):
    """创建任务请求"""
    instanceId: str = Field(..., description="工作流实例 ID")
    nodeId: str = Field(..., description="节点 ID")
    nodeName: str = Field(..., description="节点名称")
    nodeType: str = Field(..., description="节点类型")
    assignedTo: Optional[str] = Field(default=None, description="分配给用户 ID")
    priority: Optional[Priority] = Field(default=Priority.NORMAL, description="优先级")

    class Config:
        json_schema_extra = {
            "example": {
                "instanceId": "123e4567-e89b-12d3-a456-426614174000",
                "nodeId": "task1",
                "nodeName": "样品登记",
                "nodeType": "TASK",
                "assignedTo": "user123",
                "priority": "NORMAL"
            }
        }


class TaskUpdate(BaseModel):
    """更新任务请求"""
    assignedTo: Optional[str] = Field(default=None, description="分配给用户 ID")
    status: Optional[TaskStatus] = Field(default=None, description="任务状态")
    priority: Optional[Priority] = Field(default=None, description="优先级")
    result: Optional[Dict[str, Any]] = Field(default=None, description="任务结果")


class AssignTaskRequest(BaseModel):
    """分配任务请求"""
    userId: str = Field(..., description="用户 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "userId": "user123"
            }
        }


class CompleteTaskRequest(BaseModel):
    """完成任务请求"""
    result: Optional[Dict[str, Any]] = Field(default=None, description="任务执行结果")

    class Config:
        json_schema_extra = {
            "example": {
                "result": {
                    "status": "success",
                    "data": {
                        "testResult": "合格"
                    }
                }
            }
        }


class RejectTaskRequest(BaseModel):
    """拒绝任务请求"""
    reason: str = Field(..., description="拒绝原因")

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "样品信息不完整"
            }
        }


class BatchAssignRequest(BaseModel):
    """批量分配任务请求"""
    taskIds: List[str] = Field(..., description="任务 ID 列表")
    userId: str = Field(..., description="用户 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "taskIds": ["task1", "task2", "task3"],
                "userId": "user123"
            }
        }


class TaskQuery(BaseModel):
    """查询任务列表请求"""
    instanceId: Optional[str] = Field(default=None, description="工作流实例 ID")
    assignedTo: Optional[str] = Field(default=None, description="分配给用户 ID")
    status: Optional[TaskStatus] = Field(default=None, description="任务状态")
    priority: Optional[Priority] = Field(default=None, description="优先级")
    nodeType: Optional[str] = Field(default=None, description="节点类型")
    page: int = Field(default=1, ge=1, description="页码")
    pageSize: int = Field(default=20, ge=1, le=100, description="每页数量")


# ============================================
# 任务响应模型
# ============================================

class TaskResponse(BaseModel):
    """任务响应"""
    id: str
    instanceId: str
    nodeId: str
    nodeName: str
    nodeType: str
    assignedTo: Optional[str]
    assignedAt: Optional[datetime]
    status: TaskStatus
    priority: Priority
    result: Optional[Dict[str, Any]]
    completedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class TaskDetailResponse(BaseModel):
    """任务详情响应（包含关联数据）"""
    id: str
    instanceId: str
    nodeId: str
    nodeName: str
    nodeType: str
    assignedTo: Optional[str]
    assignedAt: Optional[datetime]
    status: TaskStatus
    priority: Priority
    result: Optional[Dict[str, Any]]
    completedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime
    instance: Optional[Dict[str, Any]] = None  # 工作流实例信息（简化版）

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    """任务列表响应"""
    items: List[TaskResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int


class TaskStatisticsResponse(BaseModel):
    """任务统计响应"""
    total: int = Field(..., description="总任务数")
    pending: int = Field(..., description="待分配任务数")
    assigned: int = Field(..., description="已分配任务数")
    inProgress: int = Field(..., description="进行中任务数")
    completed: int = Field(..., description="已完成任务数")
    rejected: int = Field(..., description="已拒绝任务数")


class BatchAssignResponse(BaseModel):
    """批量分配响应"""
    count: int = Field(..., description="成功分配的任务数")
    message: str = Field(..., description="提示消息")


class AssignmentCandidateResponse(BaseModel):
    """派工候选人响应"""
    taskId: str
    candidates: List[Dict[str, Any]] = Field(default_factory=list, description="候选人列表")
    recommendedUser: Optional[Dict[str, Any]] = Field(default=None, description="推荐用户")


class AutoAssignmentResponse(BaseModel):
    """自动派工响应"""
    success: bool = Field(..., description="是否成功")
    assignedTo: Optional[str] = Field(default=None, description="分配给用户 ID")
    assignedUser: Optional[Dict[str, Any]] = Field(default=None, description="分配的用户信息")
    reason: Optional[str] = Field(default=None, description="失败原因")
    candidates: Optional[List[Dict[str, Any]]] = Field(default=None, description="候选人列表")
