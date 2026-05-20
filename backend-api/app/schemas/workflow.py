"""
工作流相关的 Pydantic 模型

定义工作流模板和实例的请求/响应模型
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class NodeType(str, Enum):
    """节点类型枚举"""
    START = "START"
    END = "END"
    TASK = "TASK"
    DECISION = "DECISION"
    PARALLEL = "PARALLEL"
    MERGE = "MERGE"


class WorkflowStatus(str, Enum):
    """工作流状态枚举"""
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class InstanceStatus(str, Enum):
    """工作流实例状态枚举"""
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"


# ============================================
# 工作流节点和边的配置模型
# ============================================

class WorkflowNode(BaseModel):
    """工作流节点"""
    id: str = Field(..., description="节点 ID")
    name: str = Field(..., description="节点名称")
    type: NodeType = Field(..., description="节点类型")
    config: Optional[Dict[str, Any]] = Field(default=None, description="节点配置")
    position: Optional[Dict[str, float]] = Field(default=None, description="节点位置（用于前端显示）")


class WorkflowEdge(BaseModel):
    """工作流边（连接）"""
    id: str = Field(..., description="边 ID")
    source: str = Field(..., description="源节点 ID")
    target: str = Field(..., description="目标节点 ID")
    condition: Optional[str] = Field(default=None, description="条件表达式（可选）")
    label: Optional[str] = Field(default=None, description="边标签")


class WorkflowConfig(BaseModel):
    """工作流配置"""
    nodes: List[WorkflowNode] = Field(..., description="节点列表")
    edges: List[WorkflowEdge] = Field(..., description="边列表")


# ============================================
# 工作流模板请求模型
# ============================================

class WorkflowCreate(BaseModel):
    """创建工作流模板请求"""
    name: str = Field(..., min_length=1, max_length=200, description="工作流名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="工作流描述")
    config: WorkflowConfig = Field(..., description="工作流配置")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "样品检测流程",
                "description": "标准样品检测工作流",
                "config": {
                    "nodes": [
                        {
                            "id": "start",
                            "name": "开始",
                            "type": "START"
                        },
                        {
                            "id": "task1",
                            "name": "样品登记",
                            "type": "TASK",
                            "config": {"assignee": "role:lab_technician"}
                        },
                        {
                            "id": "end",
                            "name": "结束",
                            "type": "END"
                        }
                    ],
                    "edges": [
                        {
                            "id": "e1",
                            "source": "start",
                            "target": "task1"
                        },
                        {
                            "id": "e2",
                            "source": "task1",
                            "target": "end"
                        }
                    ]
                }
            }
        }


class WorkflowUpdate(BaseModel):
    """更新工作流模板请求"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=200, description="工作流名称")
    description: Optional[str] = Field(default=None, max_length=1000, description="工作流描述")
    config: Optional[WorkflowConfig] = Field(default=None, description="工作流配置")
    status: Optional[WorkflowStatus] = Field(default=None, description="工作流状态")
    isActive: Optional[bool] = Field(default=None, description="是否激活")


class WorkflowQuery(BaseModel):
    """查询工作流列表请求"""
    status: Optional[WorkflowStatus] = Field(default=None, description="工作流状态")
    isActive: Optional[bool] = Field(default=None, description="是否激活")
    search: Optional[str] = Field(default=None, description="搜索关键词")
    page: int = Field(default=1, ge=1, description="页码")
    pageSize: int = Field(default=20, ge=1, le=100, description="每页数量")


# ============================================
# 工作流模板响应模型
# ============================================

class WorkflowResponse(BaseModel):
    """工作流模板响应"""
    id: str
    name: str
    description: Optional[str]
    version: int
    config: Dict[str, Any]  # 使用 Dict 而不是 WorkflowConfig，因为从数据库读取的是 JSON
    status: WorkflowStatus
    isActive: bool
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    activatedAt: Optional[datetime]

    class Config:
        from_attributes = True


class WorkflowListResponse(BaseModel):
    """工作流列表响应"""
    items: List[WorkflowResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int


# ============================================
# 工作流验证相关模型
# ============================================

class ValidationError(BaseModel):
    """验证错误"""
    type: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误消息")
    nodeIds: Optional[List[str]] = Field(default=None, description="相关节点 ID")
    edgeIds: Optional[List[str]] = Field(default=None, description="相关边 ID")


class ValidationResult(BaseModel):
    """验证结果"""
    isValid: bool = Field(..., description="是否有效")
    errors: List[ValidationError] = Field(default_factory=list, description="错误列表")


# ============================================
# 工作流实例请求模型
# ============================================

class WorkflowInstanceCreate(BaseModel):
    """创建工作流实例请求"""
    sampleId: str = Field(..., description="样品 ID")


class CompleteNodeRequest(BaseModel):
    """完成节点请求"""
    result: Optional[Dict[str, Any]] = Field(default=None, description="节点执行结果")


class UpdateVariablesRequest(BaseModel):
    """更新工作流变量请求"""
    variables: Dict[str, Any] = Field(..., description="变量字典")


class TerminateInstanceRequest(BaseModel):
    """终止工作流实例请求"""
    reason: Optional[str] = Field(default=None, description="终止原因")


# ============================================
# 工作流实例响应模型
# ============================================

class WorkflowInstanceResponse(BaseModel):
    """工作流实例响应"""
    id: str
    workflowId: str
    sampleId: str
    currentNodes: List[str]
    status: InstanceStatus
    variables: Dict[str, Any]
    startedAt: datetime
    completedAt: Optional[datetime]

    class Config:
        from_attributes = True


class WorkflowInstanceDetailResponse(BaseModel):
    """工作流实例详情响应（包含关联数据）"""
    id: str
    workflowId: str
    sampleId: str
    currentNodes: List[str]
    status: InstanceStatus
    variables: Dict[str, Any]
    startedAt: datetime
    completedAt: Optional[datetime]
    workflow: WorkflowResponse
    tasks: Optional[List[Dict[str, Any]]] = None  # 任务列表（简化版）

    class Config:
        from_attributes = True
