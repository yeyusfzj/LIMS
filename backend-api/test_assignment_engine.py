"""
测试自动分配引擎的基本功能
"""
import sys
sys.path.insert(0, 'app')

try:
    from app.schemas.assignment import (
        AssignmentStrategy,
        AssignmentRule,
        AssignmentCondition,
        ConditionOperator
    )
    print("✓ 成功导入 assignment schemas")
    
    # 测试创建规则
    rule = AssignmentRule(
        id="test-1",
        name="测试规则",
        nodeType="test",
        strategy=AssignmentStrategy.SKILL_BASED,
        priority=100,
        isActive=True
    )
    print(f"✓ 成功创建规则: {rule.name}")
    
    from app.services.assignment_engine import AssignmentEngine
    print("✓ 成功导入 AssignmentEngine")
    
    engine = AssignmentEngine()
    print("✓ 成功创建引擎实例")
    
    engine.load_default_rules()
    print(f"✓ 成功加载默认规则，共 {len(engine.rules)} 条")
    
    print("\n所有测试通过！")
    
except Exception as e:
    print(f"✗ 错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
