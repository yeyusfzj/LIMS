"""
验证审核任务数据
检查数据库中的审核任务、样品和检测结果数据
"""
import asyncio
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.audit import AuditTask
from app.models.task import Task
from app.models.workflow import WorkflowInstance
from app.models.sample import Sample
from app.models.result import Result
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


async def verify_audit_task():
    """验证审核任务数据"""
    # 从环境变量获取数据库URL
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lims")
    
    # 创建数据库连接
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # 查询审核任务
        task_id = "67f2d198-f44e-4e36-be0c-b5f1c6bac890"
        print(f"\n{'='*60}")
        print(f"验证审核任务: {task_id}")
        print(f"{'='*60}\n")
        
        # 1. 查询 AuditTask
        result = await db.execute(
            select(AuditTask).where(AuditTask.id == task_id)
        )
        audit_task = result.scalar_one_or_none()
        
        if not audit_task:
            print(f"❌ 审核任务不存在: {task_id}")
            return
        
        print(f"✅ 找到审核任务:")
        print(f"   ID: {audit_task.id}")
        print(f"   Level: {audit_task.level}")
        print(f"   Status: {audit_task.status}")
        print(f"   Auditor: {audit_task.auditorId}")
        print(f"   Task ID: {audit_task.taskId}")
        
        # 2. 查询 Task
        task_obj = await db.get(Task, audit_task.taskId)
        if not task_obj:
            print(f"\n❌ 关联的Task不存在: {audit_task.taskId}")
            return
        
        print(f"\n✅ 找到关联的Task:")
        print(f"   ID: {task_obj.id}")
        print(f"   Node Name: {task_obj.nodeName}")
        print(f"   Instance ID: {task_obj.instanceId}")
        
        # 3. 查询 WorkflowInstance
        if not task_obj.instanceId:
            print(f"\n❌ Task没有关联的WorkflowInstance")
            return
        
        instance = await db.get(WorkflowInstance, task_obj.instanceId)
        if not instance:
            print(f"\n❌ WorkflowInstance不存在: {task_obj.instanceId}")
            return
        
        print(f"\n✅ 找到WorkflowInstance:")
        print(f"   ID: {instance.id}")
        print(f"   Workflow ID: {instance.workflowId}")
        print(f"   Sample ID: {instance.sampleId}")
        print(f"   Status: {instance.status}")
        
        # 4. 查询 Sample
        if not instance.sampleId:
            print(f"\n❌ WorkflowInstance没有关联的Sample")
            return
        
        sample = await db.get(Sample, instance.sampleId)
        if not sample:
            print(f"\n❌ Sample不存在: {instance.sampleId}")
            return
        
        print(f"\n✅ 找到Sample:")
        print(f"   ID: {sample.id}")
        print(f"   Barcode: {sample.barcode}")
        print(f"   Sample Name: {sample.sample_name}")
        print(f"   Sample Type: {sample.sample_type}")
        print(f"   Client Name: {sample.client_name}")
        print(f"   Status: {sample.status}")
        
        # 5. 查询 Results
        results_query = await db.execute(
            select(Result).where(Result.sampleId == sample.id)
        )
        test_results = results_query.scalars().all()
        
        print(f"\n✅ 找到检测结果: {len(test_results)} 条")
        for i, result in enumerate(test_results, 1):
            print(f"\n   结果 {i}:")
            print(f"      ID: {result.id}")
            print(f"      Parameter: {result.parameter}")
            print(f"      Value: {result.value}")
            print(f"      Text Value: {result.textValue}")
            print(f"      Unit: {result.unit}")
            print(f"      Method: {result.method}")
            print(f"      Source: {result.source}")
            print(f"      Is Abnormal: {result.isAbnormal}")
            print(f"      Entered By: {result.enteredBy}")
        
        # 6. 构建完整的响应数据结构（模拟后端）
        print(f"\n{'='*60}")
        print("模拟后端响应数据结构:")
        print(f"{'='*60}\n")
        
        # 格式化检测结果
        results_list = []
        for test_result in test_results:
            results_list.append({
                "id": test_result.id,
                "sampleId": test_result.sampleId,
                "parameter": test_result.parameter,
                "value": test_result.value,
                "textValue": test_result.textValue,
                "unit": test_result.unit,
                "method": test_result.method,
                "source": test_result.source.value if test_result.source else None,
                "isAbnormal": test_result.isAbnormal,
                "enteredBy": test_result.enteredBy,
            })
        
        sample_dict = {
            "id": sample.id,
            "barcode": sample.barcode,
            "sampleName": sample.sample_name,
            "sampleType": sample.sample_type,
            "clientName": sample.client_name,
            "status": sample.status.value,
            "results": results_list
        }
        
        instance_dict = {
            "id": instance.id,
            "sampleId": instance.sampleId,
            "sample": sample_dict
        }
        
        task_dict = {
            "id": task_obj.id,
            "nodeName": task_obj.nodeName,
            "instance": instance_dict
        }
        
        response_data = {
            "id": audit_task.id,
            "level": audit_task.level,
            "status": audit_task.status.value,
            "task": task_dict
        }
        
        print(json.dumps(response_data, indent=2, ensure_ascii=False, default=str))
        
        print(f"\n{'='*60}")
        print("数据路径验证:")
        print(f"{'='*60}\n")
        print(f"✅ response.task: {response_data.get('task') is not None}")
        print(f"✅ response.task.instance: {response_data.get('task', {}).get('instance') is not None}")
        print(f"✅ response.task.instance.sample: {response_data.get('task', {}).get('instance', {}).get('sample') is not None}")
        print(f"✅ response.task.instance.sample.results: {len(response_data.get('task', {}).get('instance', {}).get('sample', {}).get('results', []))} 条")
        
        print(f"\n{'='*60}")
        print("✅ 数据验证完成！所有数据都存在且结构正确。")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(verify_audit_task())
