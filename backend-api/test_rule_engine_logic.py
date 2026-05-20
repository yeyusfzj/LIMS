"""
规则引擎逻辑组合规则测试

测试规则引擎的逻辑组合功能：
- AND 逻辑
- OR 逻辑
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agent.rule_engine import RuleEngine, Rule, Threshold, RuleType, SeverityLevel


def test_logic_and_rule():
    """测试 AND 逻辑组合规则"""
    print("\n=== 测试 1: AND 逻辑组合规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 添加两个基础规则
        rule1 = Rule(
            id="logic_test_rule_001",
            name="铅含量检查",
            indicator="铅含量",
            type=RuleType.THRESHOLD,
            threshold=Threshold(min=0.0, max=0.01, unit="mg/L"),
            severity=SeverityLevel.HIGH,
            message="铅含量超标",
            suggestion="检查污染源"
        )
        engine.add_rule(rule1)
        
        rule2 = Rule(
            id="logic_test_rule_002",
            name="pH 值检查",
            indicator="pH",
            type=RuleType.RANGE,
            range_config={"min": 6.5, "max": 8.5},
            severity=SeverityLevel.MEDIUM,
            message="pH 值异常",
            suggestion="检查样品"
        )
        engine.add_rule(rule2)
        
        # 添加 AND 逻辑组合规则
        logic_rule = Rule(
            id="logic_test_rule_and",
            name="水质综合检查（AND）",
            indicator="综合评估",
            type=RuleType.LOGIC,
            logic_config={
                "operator": "and",
                "rules": ["logic_test_rule_001", "logic_test_rule_002"]
            },
            severity=SeverityLevel.HIGH,
            message="水质检测不合格",
            suggestion="需要进一步处理"
        )
        engine.add_rule(logic_rule)
        
        # 测试：两个规则都通过
        print("\n  测试场景 1: 两个规则都通过")
        data1 = {"铅含量": 0.005, "pH": 7.0}
        result1 = engine.evaluate(data1, logic_rule.id)
        print(f"    铅含量: 0.005 mg/L (正常)")
        print(f"    pH: 7.0 (正常)")
        print(f"    AND 结果: {'通过' if result1.passed else '未通过'}")
        
        # 测试：一个规则通过，一个规则失败
        print("\n  测试场景 2: 铅含量正常，pH 异常")
        data2 = {"铅含量": 0.005, "pH": 5.0}
        result2 = engine.evaluate(data2, logic_rule.id)
        print(f"    铅含量: 0.005 mg/L (正常)")
        print(f"    pH: 5.0 (异常)")
        print(f"    AND 结果: {'通过' if result2.passed else '未通过'}")
        
        # 测试：两个规则都失败
        print("\n  测试场景 3: 两个规则都失败")
        data3 = {"铅含量": 0.05, "pH": 5.0}
        result3 = engine.evaluate(data3, logic_rule.id)
        print(f"    铅含量: 0.05 mg/L (超标)")
        print(f"    pH: 5.0 (异常)")
        print(f"    AND 结果: {'通过' if result3.passed else '未通过'}")
        
        # 验证 AND 逻辑：只有所有规则都通过时才通过
        if result1.passed and not result2.passed and not result3.passed:
            print("\n✓ AND 逻辑组合规则评估正确")
            return True
        else:
            print("\n✗ AND 逻辑组合规则评估结果不正确")
            print(f"  预期: result1=True, result2=False, result3=False")
            print(f"  实际: result1={result1.passed}, result2={result2.passed}, result3={result3.passed}")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_logic_or_rule():
    """测试 OR 逻辑组合规则"""
    print("\n=== 测试 2: OR 逻辑组合规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 添加两个基础规则
        rule1 = Rule(
            id="logic_test_rule_003",
            name="铅含量检查",
            indicator="铅含量",
            type=RuleType.THRESHOLD,
            threshold=Threshold(min=0.0, max=0.01, unit="mg/L"),
            severity=SeverityLevel.HIGH,
            message="铅含量超标",
            suggestion="检查污染源"
        )
        engine.add_rule(rule1)
        
        rule2 = Rule(
            id="logic_test_rule_004",
            name="pH 值检查",
            indicator="pH",
            type=RuleType.RANGE,
            range_config={"min": 6.5, "max": 8.5},
            severity=SeverityLevel.MEDIUM,
            message="pH 值异常",
            suggestion="检查样品"
        )
        engine.add_rule(rule2)
        
        # 添加 OR 逻辑组合规则
        logic_rule = Rule(
            id="logic_test_rule_or",
            name="水质综合检查（OR）",
            indicator="综合评估",
            type=RuleType.LOGIC,
            logic_config={
                "operator": "or",
                "rules": ["logic_test_rule_003", "logic_test_rule_004"]
            },
            severity=SeverityLevel.MEDIUM,
            message="水质检测存在问题",
            suggestion="至少一项指标异常"
        )
        engine.add_rule(logic_rule)
        
        # 测试：两个规则都通过
        print("\n  测试场景 1: 两个规则都通过")
        data1 = {"铅含量": 0.005, "pH": 7.0}
        result1 = engine.evaluate(data1, logic_rule.id)
        print(f"    铅含量: 0.005 mg/L (正常)")
        print(f"    pH: 7.0 (正常)")
        print(f"    OR 结果: {'通过' if result1.passed else '未通过'}")
        
        # 测试：一个规则通过，一个规则失败
        print("\n  测试场景 2: 铅含量正常，pH 异常")
        data2 = {"铅含量": 0.005, "pH": 5.0}
        result2 = engine.evaluate(data2, logic_rule.id)
        print(f"    铅含量: 0.005 mg/L (正常)")
        print(f"    pH: 5.0 (异常)")
        print(f"    OR 结果: {'通过' if result2.passed else '未通过'}")
        
        # 测试：两个规则都失败
        print("\n  测试场景 3: 两个规则都失败")
        data3 = {"铅含量": 0.05, "pH": 5.0}
        result3 = engine.evaluate(data3, logic_rule.id)
        print(f"    铅含量: 0.05 mg/L (超标)")
        print(f"    pH: 5.0 (异常)")
        print(f"    OR 结果: {'通过' if result3.passed else '未通过'}")
        
        # 验证 OR 逻辑：只要有一个规则通过就通过
        if result1.passed and result2.passed and not result3.passed:
            print("\n✓ OR 逻辑组合规则评估正确")
            return True
        else:
            print("\n✗ OR 逻辑组合规则评估结果不正确")
            print(f"  预期: result1=True, result2=True, result3=False")
            print(f"  实际: result1={result1.passed}, result2={result2.passed}, result3={result3.passed}")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("规则引擎逻辑组合规则测试")
    print("=" * 60)
    
    tests = [
        test_logic_and_rule,
        test_logic_or_rule
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"\n✗ 测试执行异常: {str(e)}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"通过: {passed}/{total}")
    print(f"失败: {total - passed}/{total}")
    
    if passed == total:
        print("\n✓ 所有测试通过！")
        return 0
    else:
        print("\n✗ 部分测试失败")
        return 1


if __name__ == "__main__":
    exit(main())
