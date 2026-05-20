"""创建完整的审核任务测试数据"""
import asyncio
import uuid
from datetime import datetime, timedelta
from app.core.database import get_session_factory
from app.models.audit import AuditTask, AuditStatus, AuditDecision
from app.models.task import Task, TaskStatus, Priority
from app.models.sample import Sample, SampleStatus
from app.models.workflow import WorkflowInstance, InstanceStatus
from sqlalchemy import select

async def create_complete_audit_data():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("开始创建完整的审核任务测试数据...")
        
        # 先获取一个可用的工作流 ID
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT id FROM workflows WHERE \"isActive\" = true LIMIT 1")
        )
        workflow_row = result.fetchone()
        if not workflow_row:
            print("❌ 错误：数据库中没有激活的工作流！")
            return
        
        workflow_id = workflow_row[0]
        print(f"使用工作流 ID: {workflow_id}")
        
        # 样品类型和客户列表
        sample_types = ['水质', '土壤', '空气', '食品', '药品']
        clients = ['环保监测站', '农业检测中心', '环境监测局', '自来水公司', '食品安全局', '药监局']
        auditors = ['审核员A', '审核员B', '审核员C', '审核员D', '审核员E']
        
        created_samples = 0
        created_instances = 0
        created_tasks = 0
        created_audit_tasks = 0
        
        # 创建50个完整的审核流程
        for i in range(50):
            # 1. 创建样品
            sample_type = sample_types[i % len(sample_types)]
            client = clients[i % len(clients)]
            
            sample = Sample(
                id=str(uuid.uuid4()),
                barcode=f"TEST{datetime.now().strftime('%Y%m%d')}{str(i+1).zfill(4)}",
                sample_number=f"SN-{datetime.now().strftime('%Y%m%d')}-{str(i+1).zfill(4)}",
                sample_name=f"{sample_type}样品-{i+1}",
                sample_type=sample_type,
                sample_category="常规检测",
                client_name=client,
                client_contact=f"联系人{i % 10}",
                quantity=100.0 + (i * 10),
                unit="ml" if sample_type in ['水质', '药品'] else "g",
                received_date=datetime.utcnow() - timedelta(days=i % 30),
                sampling_date=datetime.utcnow() - timedelta(days=i % 30 + 1),
                sampling_location=f"采样点{i % 20}",
                sampling_person=f"采样员{i % 5}",
                storage_location=f"冷藏室{i % 10}",
                storage_condition="4℃冷藏" if i % 2 == 0 else "常温保存",
                status=SampleStatus.IN_AUDIT if i % 3 == 0 else SampleStatus.TESTING_COMPLETE,
                priority=Priority.HIGH if i % 5 == 0 else Priority.NORMAL,
                description=f"这是第{i+1}个测试样品",
                remarks=f"测试备注{i+1}" if i % 3 == 0 else None,
                version=1,
                created_by="system",
                created_at=datetime.utcnow() - timedelta(days=i % 30),
                updated_at=datetime.utcnow()
            )
            db.add(sample)
            await db.flush()
            created_samples += 1
            
            # 2. 创建工作流实例（使用 ORM 模型）
            workflow_instance = WorkflowInstance(
                id=str(uuid.uuid4()),
                workflowId=workflow_id,  # 使用数据库中已存在的工作流 ID
                sampleId=sample.id,
                currentNodes=[],  # 空数组表示还未开始
                status=InstanceStatus.RUNNING,
                variables={},
                startedAt=datetime.utcnow() - timedelta(days=i % 20)
            )
            db.add(workflow_instance)
            await db.flush()
            created_instances += 1
            
            # 3. 为每个样品创建1-4个审核级别的任务
            num_levels = (i % 4) + 1  # 1到4个级别
            
            for level in range(1, num_levels + 1):
                # 创建工作流任务
                task = Task(
                    id=str(uuid.uuid4()),
                    instanceId=workflow_instance.id,
                    nodeId=f"audit_level_{level}",
                    nodeName=f"第{level}级审核",
                    nodeType="audit",
                    status=TaskStatus.COMPLETED if level < num_levels else (
                        TaskStatus.IN_PROGRESS if i % 3 == 0 else TaskStatus.PENDING
                    ),
                    priority=Priority.HIGH if i % 5 == 0 else Priority.NORMAL,
                    assignedTo=auditors[level % len(auditors)],
                    assignedAt=datetime.utcnow() - timedelta(days=i % 15, hours=level),
                    completedAt=datetime.utcnow() - timedelta(days=i % 10) if level < num_levels else None,
                    createdAt=datetime.utcnow() - timedelta(days=i % 20),
                    updatedAt=datetime.utcnow()
                )
                db.add(task)
                await db.flush()
                created_tasks += 1
                
                # 创建审核任务
                is_completed = level < num_levels
                audit_task = AuditTask(
                    id=str(uuid.uuid4()),
                    taskId=task.id,
                    level=level,
                    auditorId=auditors[(level + i) % len(auditors)],
                    status=AuditStatus.APPROVED if is_completed else (
                        AuditStatus.IN_PROGRESS if i % 3 == 0 else AuditStatus.PENDING
                    ),
                    decision=AuditDecision.APPROVE if is_completed else None,
                    comments=f"第{level}级审核意见：样品符合检测标准" if is_completed else None,
                    submittedAt=datetime.utcnow() - timedelta(days=i % 20, hours=level * 2),
                    completedAt=datetime.utcnow() - timedelta(days=i % 10, hours=level) if is_completed else None
                )
                db.add(audit_task)
                created_audit_tasks += 1
        
        await db.commit()
        
        print(f"\n✅ 数据创建完成！")
        print(f"   - 创建样品: {created_samples} 个")
        print(f"   - 创建工作流实例: {created_instances} 个")
        print(f"   - 创建工作流任务: {created_tasks} 个")
        print(f"   - 创建审核任务: {created_audit_tasks} 个")
        print(f"\n现在可以在前端查看完整的审核任务列表了！")

if __name__ == "__main__":
    asyncio.run(create_complete_audit_data())
