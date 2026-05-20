"""
质量判定 API 测试脚本

测试质量判定服务和 API 的基本功能。
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.judgment_service import judgment_service
from app.schemas.judgment import (
    JudgmentRuleCreate,
    JudgmentRuleCondition,
    JudgmentRuleType,
    JudgmentRuleQuery,
    PerformJudgmentRequest
)


async def test_judgment_service():
    """测试质量判定服务"""
    print("=" * 60)
    print("质量判定服务测试")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 创建判定规则
            print("\n1. 创建判定规则...")
            rule_data = JudgmentRuleCreate(
                name="水质pH值判定规则",
                description="检测水质pH值是否在合格范围内",
                testItemType="水质检测",
                conditions=[
                    JudgmentRuleCondition(
                        type=JudgmentRuleType.RANGE,
                        parameter="pH",
                        minValue=6.5,
                        maxValue=8.5
                    )
                ],
                priority=10
            )
            
            rule = await judgment_service.create_judgment_rule(
                db, rule_data, "test-user-id"
            )
            print(f"✓ 创建判定规则成功: {rule.id} - {rule.name}")
            print(f"  检测项类型: {rule.testItemType}")
            print(f"  优先级: {rule.priority}")
            print(f"  条件数量: {len(rule.conditions)}")
            
            # 2. 查询判定规则列表
            print("\n2. 查询判定规则列表...")
            query = JudgmentRuleQuery(
                testItemType="水质检测",
                isActive=True,
                page=1,
                pageSize=10
            )
            
            result = await judgment_service.list_judgment_rules(db, query)
            print(f"✓ 查询成功: 共 {result.total} 条记录")
            for r in result.items:
                print(f"  - {r.name} (ID: {r.id})")
            
            # 3. 获取判定规则详情
            print("\n3. 获取判定规则详情...")
            rule_detail = await judgment_service.get_judgment_rule(db, rule.id)
            print(f"✓ 获取成功: {rule_detail.name}")
            print(f"  描述: {rule_detail.description}")
            print(f"  是否启用: {rule_detail.isActive}")
            
            # 4. 更新判定规则
            print("\n4. 更新判定规则...")
            from app.schemas.judgment import JudgmentRuleUpdate
            update_data = JudgmentRuleUpdate(
                description="更新后的描述：检测水质pH值是否在合格范围内（6.5-8.5）",
                priority=20
            )
            
            updated_rule = await judgment_service.update_judgment_rule(
                db, rule.id, update_data
            )
            print(f"✓ 更新成功: {updated_rule.name}")
            print(f"  新描述: {updated_rule.description}")
            print(f"  新优先级: {updated_rule.priority}")
            
            # 5. 测试判定条件验证
            print("\n5. 测试判定条件验证...")
            try:
                invalid_rule = JudgmentRuleCreate(
                    name="无效规则",
                    testItemType="测试",
                    conditions=[
                        JudgmentRuleCondition(
                            type=JudgmentRuleType.RANGE,
                            parameter="test"
                            # 缺少 minValue 和 maxValue
                        )
                    ]
                )
                await judgment_service.create_judgment_rule(
                    db, invalid_rule, "test-user-id"
                )
                print("✗ 验证失败：应该抛出异常")
            except Exception as e:
                print(f"✓ 验证成功：捕获到异常 - {str(e)}")
            
            # 6. 删除判定规则
            print("\n6. 删除判定规则...")
            await judgment_service.delete_judgment_rule(db, rule.id)
            print(f"✓ 删除成功: {rule.id}")
            
            # 验证删除
            try:
                await judgment_service.get_judgment_rule(db, rule.id)
                print("✗ 删除验证失败：规则仍然存在")
            except Exception:
                print("✓ 删除验证成功：规则已不存在")
            
            print("\n" + "=" * 60)
            print("所有测试通过！")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


async def test_judgment_models():
    """测试判定模型"""
    print("\n" + "=" * 60)
    print("质量判定模型测试")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            from app.models.judgment import JudgmentRule, QualityJudgment, JudgmentHistory
            from sqlalchemy import select
            
            # 测试模型导入
            print("\n1. 测试模型导入...")
            print(f"✓ JudgmentRule: {JudgmentRule.__tablename__}")
            print(f"✓ QualityJudgment: {QualityJudgment.__tablename__}")
            print(f"✓ JudgmentHistory: {JudgmentHistory.__tablename__}")
            
            # 测试查询
            print("\n2. 测试数据库查询...")
            result = await db.execute(select(JudgmentRule).limit(5))
            rules = result.scalars().all()
            print(f"✓ 查询到 {len(rules)} 条判定规则")
            
            result = await db.execute(select(QualityJudgment).limit(5))
            judgments = result.scalars().all()
            print(f"✓ 查询到 {len(judgments)} 条质量判定")
            
            result = await db.execute(select(JudgmentHistory).limit(5))
            history = result.scalars().all()
            print(f"✓ 查询到 {len(history)} 条判定历史")
            
            print("\n" + "=" * 60)
            print("模型测试通过！")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 模型测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


async def main():
    """主函数"""
    print("\n开始测试质量判定功能...\n")
    
    # 测试模型
    await test_judgment_models()
    
    # 测试服务
    await test_judgment_service()
    
    print("\n所有测试完成！\n")


if __name__ == "__main__":
    asyncio.run(main())
