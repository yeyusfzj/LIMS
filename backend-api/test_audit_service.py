"""
审核服务测试脚本

测试审核服务的基本功能
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session_factory
from app.services.audit_service import audit_service
from app.schemas.audit import (
    SubmitAuditDto, PerformAuditDto, AuditTaskQuery,
    CreateTemplateDto, CreateWorkflowConfigDto,
    AuditDecision, CommentTemplateType, WorkflowLevel
)


async def test_audit_service():
    """测试审核服务"""
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("=" * 60)
        print("测试审核服务")
        print("=" * 60)
        
        # 测试 1: 获取审核统计信息
        print("\n1. 测试获取审核统计信息...")
        try:
            statistics = await audit_service.get_audit_statistics(db)
            print("[OK] 审核统计信息:")
            print(f"  - 待审核任务: {statistics.pending}")
            print(f"  - 今日完成: {statistics.todayCompleted}")
            print(f"  - 本周完成: {statistics.weekCompleted}")
            print(f"  - 本月完成: {statistics.monthCompleted}")
            print(f"  - 审核通过率: {statistics.approvalRate}%")
            print(f"  - 平均处理时间: {statistics.averageProcessingTime}小时")
        except Exception as e:
            print(f"[FAIL] 获取审核统计信息失败: {str(e)}")
        
        # 测试 2: 创建审核意见模板
        print("\n2. 测试创建审核意见模板...")
        try:
            template_dto = CreateTemplateDto(
                name="测试审核通过模板",
                type=CommentTemplateType.APPROVED,
                content="样品检测结果符合标准要求，审核通过。",
                isDefault=False
            )
            template = await audit_service.create_template(db, template_dto, "test_user")
            print("[OK] 创建审核意见模板成功:")
            print(f"  - ID: {template.id}")
            print(f"  - 名称: {template.name}")
            print(f"  - 类型: {template.type}")
            print(f"  - 内容: {template.content}")
        except Exception as e:
            print(f"[FAIL] 创建审核意见模板失败: {str(e)}")
        
        # 测试 3: 获取审核意见模板列表
        print("\n3. 测试获取审核意见模板列表...")
        try:
            templates = await audit_service.list_templates(db)
            print(f"[OK] 获取审核意见模板列表成功，共 {len(templates)} 个模板")
            for template in templates[:3]:  # 只显示前3个
                print(f"  - {template.name} ({template.type})")
        except Exception as e:
            print(f"[FAIL] 获取审核意见模板列表失败: {str(e)}")
        
        # 测试 4: 创建审核流程配置
        print("\n4. 测试创建审核流程配置...")
        try:
            workflow_dto = CreateWorkflowConfigDto(
                name="测试三级审核流程",
                sampleTypes=["食品", "药品"],
                levels=[
                    WorkflowLevel(
                        order=1,
                        name="初审",
                        role="auditor",
                        required=True,
                        autoAssign=True
                    ),
                    WorkflowLevel(
                        order=2,
                        name="复审",
                        role="senior_auditor",
                        required=True,
                        autoAssign=True
                    ),
                    WorkflowLevel(
                        order=3,
                        name="终审",
                        role="chief_auditor",
                        required=True,
                        autoAssign=False
                    )
                ],
                parallelAudit=False
            )
            config = await audit_service.create_workflow_config(db, workflow_dto, "test_user")
            print("[OK] 创建审核流程配置成功:")
            print(f"  - ID: {config.id}")
            print(f"  - 名称: {config.name}")
            print(f"  - 样品类型: {', '.join(config.sampleTypes)}")
            print(f"  - 审核级别数: {len(config.levels)}")
            print(f"  - 状态: {config.status}")
        except Exception as e:
            print(f"[FAIL] 创建审核流程配置失败: {str(e)}")
        
        # 测试 5: 获取审核流程配置列表
        print("\n5. 测试获取审核流程配置列表...")
        try:
            configs = await audit_service.list_workflow_configs(db)
            print(f"[OK] 获取审核流程配置列表成功，共 {len(configs)} 个配置")
            for config in configs[:3]:  # 只显示前3个
                print(f"  - {config.name} ({config.status})")
        except Exception as e:
            print(f"[FAIL] 获取审核流程配置列表失败: {str(e)}")
        
        # 测试 6: 查询审核任务列表
        print("\n6. 测试查询审核任务列表...")
        try:
            query = AuditTaskQuery(page=1, pageSize=10)
            result = await audit_service.list_audit_tasks(db, query)
            print("[OK] 查询审核任务列表成功:")
            print(f"  - 总数: {result['total']}")
            print(f"  - 当前页: {result['page']}")
            print(f"  - 每页数量: {result['pageSize']}")
            print(f"  - 任务数: {len(result['items'])}")
            
            if result['items']:
                print("\n  前3个任务:")
                for task in result['items'][:3]:
                    print(f"    - 任务 {task.id[:8]}... 级别{task.level} 状态:{task.status}")
        except Exception as e:
            print(f"[FAIL] 查询审核任务列表失败: {str(e)}")
        
        print("\n" + "=" * 60)
        print("审核服务测试完成")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_audit_service())
