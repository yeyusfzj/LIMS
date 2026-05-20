"""
测试工作流 API

验证工作流模板管理的 API 端点
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session_factory
from app.services.workflow_service import workflow_service
from app.schemas.workflow import WorkflowCreate, WorkflowConfig, WorkflowNode, WorkflowEdge, NodeType


async def test_workflow_service():
    """测试工作流服务"""
    print("=" * 60)
    print("测试工作流服务")
    print("=" * 60)
    
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            # 1. 创建工作流模板
            print("\n1. 创建工作流模板...")
            workflow_data = WorkflowCreate(
                name="测试工作流",
                description="这是一个测试工作流",
                config=WorkflowConfig(
                    nodes=[
                        WorkflowNode(
                            id="start",
                            name="开始",
                            type=NodeType.START
                        ),
                        WorkflowNode(
                            id="task1",
                            name="任务1",
                            type=NodeType.TASK,
                            config={"assignee": "role:lab_technician"}
                        ),
                        WorkflowNode(
                            id="end",
                            name="结束",
                            type=NodeType.END
                        )
                    ],
                    edges=[
                        WorkflowEdge(
                            id="e1",
                            source="start",
                            target="task1"
                        ),
                        WorkflowEdge(
                            id="e2",
                            source="task1",
                            target="end"
                        )
                    ]
                )
            )
            
            workflow = await workflow_service.create_workflow(
                db,
                workflow_data,
                "test-user-id"
            )
            print(f"✓ 工作流已创建: {workflow.id}")
            print(f"  名称: {workflow.name}")
            print(f"  版本: {workflow.version}")
            print(f"  状态: {workflow.status}")
            
            # 2. 验证工作流配置
            print("\n2. 验证工作流配置...")
            validation_result = workflow_service.validate_workflow(workflow_data.config)
            if validation_result.isValid:
                print("✓ 工作流配置有效")
            else:
                print("✗ 工作流配置无效:")
                for error in validation_result.errors:
                    print(f"  - {error.message}")
            
            # 3. 获取工作流详情
            print("\n3. 获取工作流详情...")
            retrieved_workflow = await workflow_service.get_workflow(db, workflow.id)
            if retrieved_workflow:
                print(f"✓ 工作流详情获取成功")
                print(f"  ID: {retrieved_workflow.id}")
                print(f"  名称: {retrieved_workflow.name}")
            else:
                print("✗ 工作流不存在")
            
            # 4. 激活工作流
            print("\n4. 激活工作流...")
            activated_workflow = await workflow_service.activate_workflow(
                db,
                workflow.id,
                "test-user-id"
            )
            print(f"✓ 工作流已激活")
            print(f"  状态: {activated_workflow.status}")
            print(f"  isActive: {activated_workflow.isActive}")
            
            # 5. 停用工作流
            print("\n5. 停用工作流...")
            deactivated_workflow = await workflow_service.deactivate_workflow(
                db,
                workflow.id,
                "test-user-id"
            )
            print(f"✓ 工作流已停用")
            print(f"  状态: {deactivated_workflow.status}")
            print(f"  isActive: {deactivated_workflow.isActive}")
            
            # 6. 测试配置验证 - 缺少开始节点
            print("\n6. 测试配置验证 - 缺少开始节点...")
            invalid_config = WorkflowConfig(
                nodes=[
                    WorkflowNode(
                        id="task1",
                        name="任务1",
                        type=NodeType.TASK
                    ),
                    WorkflowNode(
                        id="end",
                        name="结束",
                        type=NodeType.END
                    )
                ],
                edges=[
                    WorkflowEdge(
                        id="e1",
                        source="task1",
                        target="end"
                    )
                ]
            )
            validation_result = workflow_service.validate_workflow(invalid_config)
            if not validation_result.isValid:
                print("✓ 正确检测到配置错误:")
                for error in validation_result.errors:
                    print(f"  - {error.message}")
            else:
                print("✗ 未能检测到配置错误")
            
            # 7. 测试配置验证 - 死循环
            print("\n7. 测试配置验证 - 死循环...")
            cycle_config = WorkflowConfig(
                nodes=[
                    WorkflowNode(id="start", name="开始", type=NodeType.START),
                    WorkflowNode(id="task1", name="任务1", type=NodeType.TASK),
                    WorkflowNode(id="task2", name="任务2", type=NodeType.TASK),
                    WorkflowNode(id="end", name="结束", type=NodeType.END)
                ],
                edges=[
                    WorkflowEdge(id="e1", source="start", target="task1"),
                    WorkflowEdge(id="e2", source="task1", target="task2"),
                    WorkflowEdge(id="e3", source="task2", target="task1"),  # 循环
                    WorkflowEdge(id="e4", source="task2", target="end")
                ]
            )
            validation_result = workflow_service.validate_workflow(cycle_config)
            if not validation_result.isValid:
                print("✓ 正确检测到死循环:")
                for error in validation_result.errors:
                    print(f"  - {error.message}")
            else:
                print("✗ 未能检测到死循环")
            
            print("\n" + "=" * 60)
            print("所有测试完成！")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_workflow_service())
