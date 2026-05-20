"""
为化学样品X创建审核任务

此脚本会：
1. 查找名为"化学样品X"的样品
2. 创建工作流实例
3. 创建任务节点
4. 创建审核任务
"""
import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session_factory
from app.models.sample import Sample
from app.models.workflow import Workflow, WorkflowInstance, InstanceStatus
from app.models.task import Task, TaskStatus, Priority
from app.models.audit import AuditTask, AuditStatus
from datetime import datetime
import uuid


async def create_audit_task_for_chemical_sample():
    """为化学样品X创建审核任务"""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # 1. 查找化学样品X
            print("🔍 查找化学样品X...")
            result = await session.execute(
                select(Sample).where(Sample.sample_name.like('%化学样品X%'))
            )
            sample = result.scalar_one_or_none()
            
            if not sample:
                print("❌ 未找到化学样品X")
                print("提示：请确保已经在样品管理中添加了名为'化学样品X'的样品")
                return
            
            print(f"✅ 找到样品: {sample.sample_name} (ID: {sample.id}, 条码: {sample.barcode})")
            
            # 2. 检查是否已有工作流实例
            instance = None
            if sample.workflow_instance_id:
                print(f"⚠️  样品已有工作流实例: {sample.workflow_instance_id}")
                result = await session.execute(
                    select(WorkflowInstance).where(WorkflowInstance.id == sample.workflow_instance_id)
                )
                instance = result.scalar_one_or_none()
                if instance:
                    print(f"   工作流状态: {instance.status}")
            
            if not instance:
                # 3. 查找或创建默认工作流
                print("\n📋 查找默认工作流...")
                result = await session.execute(
                    select(Workflow).where(Workflow.isActive == True).limit(1)
                )
                workflow = result.scalar_one_or_none()
                
                if not workflow:
                    # 创建默认工作流
                    print("   创建默认工作流...")
                    workflow = Workflow(
                        id=str(uuid.uuid4()),
                        name="标准检测流程",
                        description="标准的样品检测审核流程",
                        version=1,
                        config={
                            "nodes": [
                                {"id": "start", "type": "start", "name": "开始"},
                                {"id": "test", "type": "task", "name": "检测"},
                                {"id": "audit", "type": "audit", "name": "审核"},
                                {"id": "end", "type": "end", "name": "结束"}
                            ],
                            "edges": [
                                {"from": "start", "to": "test"},
                                {"from": "test", "to": "audit"},
                                {"from": "audit", "to": "end"}
                            ]
                        },
                        status="ACTIVE",
                        isActive=True,
                        createdBy="system",
                        createdAt=datetime.now(),
                        updatedAt=datetime.now(),
                        activatedAt=datetime.now()
                    )
                    session.add(workflow)
                    await session.flush()
                    print(f"   ✅ 创建工作流: {workflow.name} (ID: {workflow.id})")
                else:
                    print(f"   ✅ 使用现有工作流: {workflow.name} (ID: {workflow.id})")
                
                # 4. 创建工作流实例
                print("\n🔄 创建工作流实例...")
                instance = WorkflowInstance(
                    id=str(uuid.uuid4()),
                    workflowId=workflow.id,
                    sampleId=sample.id,
                    currentNodes=["audit"],  # 当前在审核节点
                    status=InstanceStatus.RUNNING,
                    variables={
                        "sampleName": sample.sample_name,
                        "sampleBarcode": sample.barcode,
                        "sampleType": sample.sample_type
                    },
                    startedAt=datetime.now()
                )
                session.add(instance)
                
                # 先提交工作流实例，确保它存在于数据库中
                await session.commit()
                print(f"   ✅ 创建工作流实例: {instance.id}")
                
                # 然后更新样品的工作流实例ID
                sample.workflow_instance_id = instance.id
                await session.commit()
                print(f"   ✅ 更新样品的工作流实例ID")
            
            # 5. 创建任务节点
            print("\n📝 创建审核任务节点...")
            task = Task(
                id=str(uuid.uuid4()),
                instanceId=instance.id,
                nodeId="audit",
                nodeName="样品审核",
                nodeType="audit",
                assignedTo="admin",  # 分配给管理员
                assignedAt=datetime.now(),
                status=TaskStatus.ASSIGNED,
                priority=Priority.NORMAL,
                result=None,
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            session.add(task)
            await session.flush()
            print(f"   ✅ 创建任务: {task.nodeName} (ID: {task.id})")
            
            # 6. 创建审核任务
            print("\n✅ 创建审核任务...")
            audit_task = AuditTask(
                id=str(uuid.uuid4()),
                taskId=task.id,
                level=1,  # 一级审核
                auditorId="admin",  # 审核人为管理员
                status=AuditStatus.PENDING,
                decision=None,
                comments=None,
                submittedAt=datetime.now(),
                completedAt=None
            )
            session.add(audit_task)
            
            # 提交所有更改
            await session.commit()
            
            print(f"   ✅ 创建审核任务: {audit_task.id}")
            print("\n" + "="*60)
            print("🎉 审核任务创建成功！")
            print("="*60)
            print(f"样品名称: {sample.sample_name}")
            print(f"样品条码: {sample.barcode}")
            print(f"工作流实例ID: {instance.id}")
            print(f"任务ID: {task.id}")
            print(f"审核任务ID: {audit_task.id}")
            print(f"审核级别: {audit_task.level}")
            print(f"审核人: {audit_task.auditorId}")
            print(f"审核状态: {audit_task.status}")
            print("="*60)
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ 创建审核任务失败: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    print("开始为化学样品X创建审核任务...\n")
    asyncio.run(create_audit_task_for_chemical_sample())
    print("\n✅ 脚本执行完成")
