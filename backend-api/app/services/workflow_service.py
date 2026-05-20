"""
工作流服务

实现工作流模板管理、验证和版本控制
"""

from typing import Optional, List, Dict, Any, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_, func
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.workflow import Workflow, WorkflowInstance, WorkflowStatus, InstanceStatus
from app.models.task import Task, TaskStatus
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowQuery,
    WorkflowConfig,
    WorkflowNode,
    NodeType,
    ValidationResult,
    ValidationError,
    WorkflowInstanceCreate,
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
)
from app.core.logging import logger


class WorkflowService:
    """工作流服务类"""

    async def create_workflow(
        self,
        db: AsyncSession,
        data: WorkflowCreate,
        user_id: str
    ) -> Workflow:
        """创建工作流配置"""
        # 验证工作流配置
        validation = self.validate_workflow(data.config)
        if not validation.isValid:
            error_messages = [e.message for e in validation.errors]
            raise ValidationException(
                message="工作流配置验证失败",
                details="; ".join(error_messages)
            )

        # 创建工作流
        workflow = Workflow(
            name=data.name,
            description=data.description,
            config=data.config.model_dump(),  # 转换为字典
            version=1,
            status=WorkflowStatus.DRAFT,
            isActive=False,
            createdBy=user_id,
        )

        db.add(workflow)
        await db.commit()
        await db.refresh(workflow)

        logger.info(f"工作流已创建: {workflow.id}", extra={
            "workflowId": workflow.id,
            "userId": user_id
        })

        return workflow

    async def update_workflow(
        self,
        db: AsyncSession,
        workflow_id: str,
        data: WorkflowUpdate,
        user_id: str
    ) -> Workflow:
        """更新工作流配置（创建新版本）"""
        # 获取当前工作流
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise NotFoundException(message="工作流不存在")

        # 如果更新了配置，需要验证
        if data.config:
            validation = self.validate_workflow(data.config)
            if not validation.isValid:
                error_messages = [e.message for e in validation.errors]
                raise ValidationException(
                    message="工作流配置验证失败",
                    details="; ".join(error_messages)
                )

        # 如果配置有变化，创建新版本
        should_create_new_version = False
        if data.config:
            import json
            current_config_str = json.dumps(workflow.config, sort_keys=True)
            new_config_str = json.dumps(data.config.model_dump(), sort_keys=True)
            should_create_new_version = current_config_str != new_config_str

        # 更新字段
        if data.name is not None:
            workflow.name = data.name
        if data.description is not None:
            workflow.description = data.description
        if data.config is not None:
            workflow.config = data.config.model_dump()
        if data.status is not None:
            workflow.status = data.status
        if data.isActive is not None:
            workflow.isActive = data.isActive

        if should_create_new_version:
            workflow.version += 1

        workflow.updatedAt = datetime.utcnow()

        await db.commit()
        await db.refresh(workflow)

        logger.info(f"工作流已更新: {workflow.id}", extra={
            "workflowId": workflow.id,
            "userId": user_id,
            "newVersion": workflow.version
        })

        return workflow

    async def activate_workflow(
        self,
        db: AsyncSession,
        workflow_id: str,
        user_id: str
    ) -> Workflow:
        """激活工作流"""
        # 获取工作流
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise NotFoundException(message="工作流不存在")

        # 验证工作流配置
        config = WorkflowConfig(**workflow.config)
        validation = self.validate_workflow(config)
        if not validation.isValid:
            error_messages = [e.message for e in validation.errors]
            raise ValidationException(
                message="无法激活工作流，配置验证失败",
                details="; ".join(error_messages)
            )

        # 停用其他同名工作流
        await db.execute(
            update(Workflow)
            .where(
                and_(
                    Workflow.name == workflow.name,
                    Workflow.isActive == True,
                    Workflow.id != workflow_id
                )
            )
            .values(
                isActive=False,
                status=WorkflowStatus.INACTIVE
            )
        )

        # 激活当前工作流
        workflow.isActive = True
        workflow.status = WorkflowStatus.ACTIVE
        workflow.activatedAt = datetime.utcnow()

        await db.commit()
        await db.refresh(workflow)

        logger.info(f"工作流已激活: {workflow.id}", extra={
            "workflowId": workflow.id,
            "userId": user_id
        })

        return workflow

    async def deactivate_workflow(
        self,
        db: AsyncSession,
        workflow_id: str,
        user_id: str
    ) -> Workflow:
        """停用工作流"""
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise NotFoundException(message="工作流不存在")

        workflow.isActive = False
        workflow.status = WorkflowStatus.INACTIVE

        await db.commit()
        await db.refresh(workflow)

        logger.info(f"工作流已停用: {workflow.id}", extra={
            "workflowId": workflow.id,
            "userId": user_id
        })

        return workflow

    async def get_workflow(
        self,
        db: AsyncSession,
        workflow_id: str
    ) -> Optional[Workflow]:
        """获取工作流详情"""
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        return result.scalar_one_or_none()

    async def list_workflows(
        self,
        db: AsyncSession,
        query: WorkflowQuery
    ) -> Dict[str, Any]:
        """查询工作流列表"""
        # 构建查询条件
        conditions = []

        if query.status:
            conditions.append(Workflow.status == query.status)

        if query.isActive is not None:
            conditions.append(Workflow.isActive == query.isActive)

        if query.search:
            search_pattern = f"%{query.search}%"
            conditions.append(
                or_(
                    Workflow.name.ilike(search_pattern),
                    Workflow.description.ilike(search_pattern)
                )
            )

        # 计算分页
        skip = (query.page - 1) * query.pageSize

        # 查询总数
        count_query = select(func.count(Workflow.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 查询数据
        data_query = select(Workflow).order_by(Workflow.createdAt.desc())
        if conditions:
            data_query = data_query.where(and_(*conditions))
        data_query = data_query.offset(skip).limit(query.pageSize)

        result = await db.execute(data_query)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": query.page,
            "pageSize": query.pageSize,
            "totalPages": (total + query.pageSize - 1) // query.pageSize
        }

    async def delete_workflow(
        self,
        db: AsyncSession,
        workflow_id: str,
        user_id: str
    ) -> None:
        """删除工作流"""
        result = await db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise NotFoundException(message="工作流不存在")

        # 检查是否有关联的实例
        instance_result = await db.execute(
            select(func.count(WorkflowInstance.id))
            .where(WorkflowInstance.workflowId == workflow_id)
        )
        instance_count = instance_result.scalar()

        if instance_count > 0:
            raise ConflictException(
                message="无法删除工作流",
                details=f"该工作流有 {instance_count} 个关联实例"
            )

        await db.delete(workflow)
        await db.commit()

        logger.info(f"工作流已删除: {workflow_id}", extra={
            "workflowId": workflow_id,
            "userId": user_id
        })

    def validate_workflow(self, config: WorkflowConfig) -> ValidationResult:
        """
        验证工作流配置
        检测死循环、孤立节点等问题
        """
        errors: List[ValidationError] = []
        nodes = config.nodes
        edges = config.edges

        # 1. 检查是否有开始节点
        start_nodes = [n for n in nodes if n.type == NodeType.START]
        if len(start_nodes) == 0:
            errors.append(ValidationError(
                type="MISSING_START",
                message="工作流必须包含至少一个开始节点"
            ))

        # 2. 检查是否有结束节点
        end_nodes = [n for n in nodes if n.type == NodeType.END]
        if len(end_nodes) == 0:
            errors.append(ValidationError(
                type="MISSING_END",
                message="工作流必须包含至少一个结束节点"
            ))

        # 3. 检查节点 ID 是否唯一
        node_ids = [n.id for n in nodes]
        duplicate_ids = [id for id in node_ids if node_ids.count(id) > 1]
        if duplicate_ids:
            unique_duplicates = list(set(duplicate_ids))
            errors.append(ValidationError(
                type="DUPLICATE_NODE",
                message=f"存在重复的节点 ID: {', '.join(unique_duplicates)}",
                nodeIds=unique_duplicates
            ))

        # 4. 检查边的有效性（源节点和目标节点必须存在）
        node_id_set = set(node_ids)
        invalid_edges = [
            e for e in edges
            if e.source not in node_id_set or e.target not in node_id_set
        ]
        if invalid_edges:
            errors.append(ValidationError(
                type="INVALID_EDGE",
                message="存在无效的边（源节点或目标节点不存在）",
                edgeIds=[e.id for e in invalid_edges]
            ))

        # 5. 检测孤立节点（没有入边也没有出边的节点，除了开始和结束节点）
        isolated_nodes = self._find_isolated_nodes(nodes, edges)
        if isolated_nodes:
            errors.append(ValidationError(
                type="ISOLATED_NODE",
                message=f"存在孤立节点（没有连接到工作流）: {', '.join([n.name for n in isolated_nodes])}",
                nodeIds=[n.id for n in isolated_nodes]
            ))

        # 6. 检测死循环
        cycles = self._detect_cycles(nodes, edges)
        if cycles:
            cycle_strs = [' -> '.join(c) for c in cycles]
            errors.append(ValidationError(
                type="DEAD_LOOP",
                message=f"存在死循环: {'; '.join(cycle_strs)}",
                nodeIds=[node_id for cycle in cycles for node_id in cycle]
            ))

        return ValidationResult(
            isValid=len(errors) == 0,
            errors=errors
        )

    def _find_isolated_nodes(
        self,
        nodes: List[WorkflowNode],
        edges: List[Any]
    ) -> List[WorkflowNode]:
        """查找孤立节点"""
        connected_node_ids: Set[str] = set()

        # 收集所有连接的节点
        for edge in edges:
            connected_node_ids.add(edge.source)
            connected_node_ids.add(edge.target)

        # 找出未连接的节点（排除开始和结束节点）
        isolated = [
            node for node in nodes
            if node.id not in connected_node_ids
            and node.type not in [NodeType.START, NodeType.END]
        ]

        return isolated

    def _detect_cycles(
        self,
        nodes: List[WorkflowNode],
        edges: List[Any]
    ) -> List[List[str]]:
        """检测循环（使用 DFS）"""
        cycles: List[List[str]] = []
        visited: Set[str] = set()
        recursion_stack: Set[str] = set()
        path: List[str] = []

        # 构建邻接表
        adjacency_list: Dict[str, List[str]] = {node.id: [] for node in nodes}
        for edge in edges:
            adjacency_list[edge.source].append(edge.target)

        def dfs(node_id: str) -> bool:
            """深度优先搜索"""
            visited.add(node_id)
            recursion_stack.add(node_id)
            path.append(node_id)

            neighbors = adjacency_list.get(node_id, [])
            for neighbor in neighbors:
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in recursion_stack:
                    # 找到循环
                    cycle_start_index = path.index(neighbor)
                    cycle = path[cycle_start_index:] + [neighbor]
                    cycles.append(cycle)
                    return True

            recursion_stack.remove(node_id)
            path.pop()
            return False

        # 对每个节点执行 DFS
        for node in nodes:
            if node.id not in visited:
                dfs(node.id)

        return cycles

    async def get_workflow_versions(
        self,
        db: AsyncSession,
        name: str
    ) -> List[Workflow]:
        """获取工作流历史版本"""
        result = await db.execute(
            select(Workflow)
            .where(Workflow.name == name)
            .order_by(Workflow.version.desc())
        )
        return result.scalars().all()


# 创建服务实例
workflow_service = WorkflowService()
