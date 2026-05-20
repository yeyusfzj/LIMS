"""
规则引擎基础测试

测试规则引擎的基本功能：
- 初始化
- 加载规则配置
- 评估规则
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agent.rule_engine import RuleEngine, Rule, Threshold, RuleType, SeverityLevel


def test_rule_engine_initialization():
    """测试规则引擎初始化"""
    print("\n=== 测试 1: 规则引擎初始化 ===")
    
    try:
        engine = RuleEngine()
        print(f"✓ 规则引擎初始化成功")
        print(f"  加载的规则数量: {len(engine.get_all_rules())}")
        return True
    except Exception as e:
        print(f"✗ 规则引擎初始化失败: {str(e)}")
        return False


def test_add_threshold_rule():
    """测试添加阈值规则"""
    print("\n=== 测试 2: 添加阈值规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 创建一个阈值规则
        threshold = Threshold(min=0.0, max=0.01, unit="mg/L")
        rule = Rule(
            id="test_rule_001",
            name="铅含量阈值检查",
            indicator="铅含量",
            type=RuleType.THRESHOLD,
            threshold=threshold,
            severity=SeverityLevel.HIGH,
            message="铅含量超标",
            suggestion="建议重新采样检测，确认是否存在污染源"
        )
        
        # 添加规则
        success = engine.add_rule(rule)
        
        if success:
            print(f"✓ 成功添加规则: {rule.name}")
            
            # 验证规则是否被添加
            retrieved_rule = engine.get_rule(rule.id)
            if retrieved_rule:
                print(f"✓ 成功检索规则: {retrieved_rule.name}")
                return True
            else:
                print(f"✗ 无法检索已添加的规则")
                return False
        else:
            print(f"✗ 添加规则失败")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_evaluate_threshold_rule():
    """测试评估阈值规则"""
    print("\n=== 测试 3: 评估阈值规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 添加测试规则
        threshold = Threshold(min=0.0, max=0.01, unit="mg/L")
        rule = Rule(
            id="test_rule_002",
            name="铅含量阈值检查",
            indicator="铅含量",
            type=RuleType.THRESHOLD,
            threshold=threshold,
            severity=SeverityLevel.HIGH,
            message="铅含量超标",
            suggestion="建议重新采样检测"
        )
        engine.add_rule(rule)
        
        # 测试正常值
        print("\n  测试正常值 (0.005 mg/L):")
        data_normal = {"铅含量": 0.005}
        result_normal = engine.evaluate(data_normal, rule.id)
        print(f"    结果: {'通过' if result_normal.passed else '未通过'}")
        print(f"    消息: {result_normal.message}")
        
        # 测试超标值
        print("\n  测试超标值 (0.05 mg/L):")
        data_exceed = {"铅含量": 0.05}
        result_exceed = engine.evaluate(data_exceed, rule.id)
        print(f"    结果: {'通过' if result_exceed.passed else '未通过'}")
        print(f"    消息: {result_exceed.message}")
        print(f"    建议: {result_exceed.details.get('suggestion', '')}")
        
        # 验证结果
        if result_normal.passed and not result_exceed.passed:
            print("\n✓ 阈值规则评估正确")
            return True
        else:
            print("\n✗ 阈值规则评估结果不正确")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_evaluate_range_rule():
    """测试评估范围规则"""
    print("\n=== 测试 4: 评估范围规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 添加范围规则
        rule = Rule(
            id="test_rule_003",
            name="pH 值范围检查",
            indicator="pH",
            type=RuleType.RANGE,
            range_config={"min": 6.5, "max": 8.5},
            severity=SeverityLevel.MEDIUM,
            message="pH 值异常",
            suggestion="检查样品保存条件和测量仪器校准"
        )
        engine.add_rule(rule)
        
        # 测试正常值
        print("\n  测试正常值 (pH=7.0):")
        data_normal = {"pH": 7.0}
        result_normal = engine.evaluate(data_normal, rule.id)
        print(f"    结果: {'通过' if result_normal.passed else '未通过'}")
        
        # 测试异常值
        print("\n  测试异常值 (pH=5.0):")
        data_abnormal = {"pH": 5.0}
        result_abnormal = engine.evaluate(data_abnormal, rule.id)
        print(f"    结果: {'通过' if result_abnormal.passed else '未通过'}")
        print(f"    消息: {result_abnormal.message}")
        
        # 验证结果
        if result_normal.passed and not result_abnormal.passed:
            print("\n✓ 范围规则评估正确")
            return True
        else:
            print("\n✗ 范围规则评估结果不正确")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_evaluate_enum_rule():
    """测试评估枚举规则"""
    print("\n=== 测试 5: 评估枚举规则 ===")
    
    try:
        engine = RuleEngine()
        
        # 添加枚举规则
        rule = Rule(
            id="test_rule_004",
            name="样品状态检查",
            indicator="样品状态",
            type=RuleType.ENUM,
            enum_values=["正常", "合格", "良好"],
            severity=SeverityLevel.LOW,
            message="样品状态异常",
            suggestion="检查样品质量"
        )
        engine.add_rule(rule)
        
        # 测试有效值
        print("\n  测试有效值 (状态=正常):")
        data_valid = {"样品状态": "正常"}
        result_valid = engine.evaluate(data_valid, rule.id)
        print(f"    结果: {'通过' if result_valid.passed else '未通过'}")
        
        # 测试无效值
        print("\n  测试无效值 (状态=异常):")
        data_invalid = {"样品状态": "异常"}
        result_invalid = engine.evaluate(data_invalid, rule.id)
        print(f"    结果: {'通过' if result_invalid.passed else '未通过'}")
        print(f"    消息: {result_invalid.message}")
        
        # 验证结果
        if result_valid.passed and not result_invalid.passed:
            print("\n✓ 枚举规则评估正确")
            return True
        else:
            print("\n✗ 枚举规则评估结果不正确")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("规则引擎基础测试")
    print("=" * 60)
    
    tests = [
        test_rule_engine_initialization,
        test_add_threshold_rule,
        test_evaluate_threshold_rule,
        test_evaluate_range_rule,
        test_evaluate_enum_rule
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
