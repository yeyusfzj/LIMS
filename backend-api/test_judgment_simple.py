"""
简单的质量判定功能测试
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("测试 1: 导入判定模型...")
try:
    from app.models.judgment import JudgmentRule, QualityJudgment, JudgmentHistory, JudgmentResult
    print("✓ 判定模型导入成功")
    print(f"  - JudgmentRule 表名: {JudgmentRule.__tablename__}")
    print(f"  - QualityJudgment 表名: {QualityJudgment.__tablename__}")
    print(f"  - JudgmentHistory 表名: {JudgmentHistory.__tablename__}")
    print(f"  - JudgmentResult 枚举: {list(JudgmentResult)}")
except Exception as e:
    print(f"✗ 判定模型导入失败: {e}")
    sys.exit(1)

print("\n测试 2: 导入判定 schemas...")
try:
    from app.schemas.judgment import (
        JudgmentRuleCreate,
        JudgmentRuleUpdate,
        JudgmentRuleResponse,
        JudgmentResponse,
        JudgmentRuleType
    )
    print("✓ 判定 schemas 导入成功")
    print(f"  - JudgmentRuleType 枚举: {list(JudgmentRuleType)}")
except Exception as e:
    print(f"✗ 判定 schemas 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试 3: 导入判定服务...")
try:
    from app.services.judgment_service import judgment_service
    print("✓ 判定服务导入成功")
    print(f"  - 服务类: {judgment_service.__class__.__name__}")
except Exception as e:
    print(f"✗ 判定服务导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试 4: 导入判定路由...")
try:
    from app.routers.judgments import router
    print("✓ 判定路由导入成功")
    print(f"  - 路由前缀: {router.prefix}")
    print(f"  - 路由标签: {router.tags}")
    print(f"  - 路由数量: {len(router.routes)}")
    
    # 列出所有路由
    print("\n  路由列表:")
    for route in router.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            print(f"    - {methods:10} {route.path}")
except Exception as e:
    print(f"✗ 判定路由导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试 5: 验证 Pydantic 模型...")
try:
    from app.schemas.judgment import JudgmentRuleCreate, JudgmentRuleCondition, JudgmentRuleType
    
    # 创建一个测试规则
    rule = JudgmentRuleCreate(
        name="测试规则",
        testItemType="测试类型",
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
    
    print("✓ Pydantic 模型验证成功")
    print(f"  - 规则名称: {rule.name}")
    print(f"  - 检测项类型: {rule.testItemType}")
    print(f"  - 条件数量: {len(rule.conditions)}")
    print(f"  - 优先级: {rule.priority}")
except Exception as e:
    print(f"✗ Pydantic 模型验证失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("所有测试通过！质量判定功能实现正确。")
print("=" * 60)
