"""
结果分析器测试

测试结果分析器的功能：
- 初始化
- 异常检测
- 建议生成
- 完整分析流程
- 性能验证
"""

import sys
import os
import time

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agent.result_analyzer import ResultAnalyzer
from app.agent.models import SeverityLevel, ReportStatus


def test_analyzer_initialization():
    """测试结果分析器初始化"""
    print("\n=== 测试 1: 结果分析器初始化 ===")
    
    try:
        analyzer = ResultAnalyzer()
        print(f"✓ 结果分析器初始化成功")
        
        # 验证规则引擎已加载
        rule_engine = analyzer.get_rule_engine()
        rules_count = len(rule_engine.get_all_rules())
        print(f"  加载的规则数量: {rules_count}")
        
        if rules_count > 0:
            print(f"✓ 规则引擎已正确加载")
            return True
        else:
            print(f"✗ 规则引擎未加载任何规则")
            return False
    
    except Exception as e:
        print(f"✗ 初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_detect_anomalies_normal():
    """测试异常检测 - 正常数据"""
    print("\n=== 测试 2: 异常检测 - 正常数据 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备正常数据
        data = {
            "pH": 7.2,
            "铅含量": 0.005,
            "浊度": 0.5,
            "土壤pH": 6.5,
            "PM2.5": 50.0,
            "保存温度": 4.0,
            "样品状态": "正常"
        }
        
        print(f"  测试数据: {data}")
        
        # 检测异常
        anomalies = analyzer.detect_anomalies(data)
        
        print(f"  检测到的异常数量: {len(anomalies)}")
        
        if len(anomalies) == 0:
            print(f"✓ 正常数据未检测到异常")
            return True
        else:
            print(f"✗ 正常数据检测到异常（不应该）")
            for anomaly in anomalies:
                print(f"    - {anomaly.indicator}: {anomaly.message}")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_detect_anomalies_abnormal():
    """测试异常检测 - 异常数据"""
    print("\n=== 测试 3: 异常检测 - 异常数据 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备异常数据
        data = {
            "pH": 5.0,              # 超出范围 (6.5-8.5)
            "铅含量": 0.05,         # 超标 (> 0.01)
            "浊度": 2.0,            # 超标 (> 1.0)
            "土壤pH": 4.0,          # 超出范围 (5.5-7.5)
            "镉含量": 0.5,          # 超标 (> 0.3)
            "PM2.5": 100.0,         # 超标 (> 75)
            "一氧化碳": 15.0,       # 超标 (> 10)
            "保存温度": 15.0,       # 超出范围 (2-8)
            "样品状态": "异常"      # 不在枚举列表中
        }
        
        print(f"  测试数据包含多项异常指标")
        
        # 检测异常
        anomalies = analyzer.detect_anomalies(data)
        
        print(f"  检测到的异常数量: {len(anomalies)}")
        
        if len(anomalies) > 0:
            print(f"✓ 成功检测到异常")
            
            # 显示检测到的异常
            for anomaly in anomalies:
                print(f"    - {anomaly.indicator}: {anomaly.message}")
                print(f"      值: {anomaly.value}, 严重程度: {anomaly.severity}")
            
            # 验证是否检测到高严重度异常
            high_severity_count = sum(1 for a in anomalies if a.severity == SeverityLevel.HIGH)
            print(f"\n  高严重度异常数量: {high_severity_count}")
            
            return True
        else:
            print(f"✗ 未检测到异常（应该检测到）")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_generate_suggestions():
    """测试建议生成"""
    print("\n=== 测试 4: 建议生成 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备异常数据
        data = {
            "pH": 5.0,
            "铅含量": 0.05,
            "PM2.5": 100.0
        }
        
        # 检测异常
        anomalies = analyzer.detect_anomalies(data)
        
        print(f"  检测到 {len(anomalies)} 项异常")
        
        # 生成建议
        suggestions = analyzer.generate_suggestions(anomalies)
        
        print(f"  生成的建议数量: {len(suggestions)}")
        print(f"\n  建议内容:")
        for suggestion in suggestions:
            print(f"    {suggestion}")
        
        if len(suggestions) > 0:
            print(f"\n✓ 成功生成建议")
            return True
        else:
            print(f"\n✗ 未生成建议")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_analyze_complete():
    """测试完整分析流程"""
    print("\n=== 测试 5: 完整分析流程 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备测试数据
        result_id = "test_result_001"
        data = {
            "pH": 7.0,
            "铅含量": 0.005,
            "浊度": 0.8,
            "土壤pH": 6.5,
            "镉含量": 0.2,
            "PM2.5": 60.0,
            "一氧化碳": 5.0,
            "保存温度": 4.0,
            "样品状态": "正常"
        }
        
        print(f"  结果 ID: {result_id}")
        print(f"  检测项数量: {len(data)}")
        
        # 执行分析
        report = analyzer.analyze(result_id, data)
        
        print(f"\n  分析报告:")
        print(f"    结果 ID: {report.result_id}")
        print(f"    状态: {report.status}")
        print(f"    异常数量: {len(report.anomalies)}")
        print(f"    分析时间: {report.analyzed_at}")
        print(f"\n  摘要:")
        print(f"    {report.summary}")
        
        if report.result_id == result_id:
            print(f"\n✓ 完整分析流程执行成功")
            return True
        else:
            print(f"\n✗ 分析报告结果 ID 不匹配")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_analyze_performance():
    """测试分析性能 - 验证分析时间 < 500ms"""
    print("\n=== 测试 6: 分析性能验证 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备大量数据
        data = {
            "pH": 7.0,
            "铅含量": 0.005,
            "浊度": 0.8,
            "土壤pH": 6.5,
            "镉含量": 0.2,
            "PM2.5": 60.0,
            "一氧化碳": 5.0,
            "保存温度": 4.0,
            "样品状态": "正常"
        }
        
        # 执行多次分析并测量时间
        iterations = 10
        total_time = 0
        
        print(f"  执行 {iterations} 次分析...")
        
        for i in range(iterations):
            start_time = time.time()
            report = analyzer.analyze(f"test_result_{i}", data)
            end_time = time.time()
            
            elapsed_time = (end_time - start_time) * 1000  # 转换为毫秒
            total_time += elapsed_time
        
        avg_time = total_time / iterations
        
        print(f"\n  性能统计:")
        print(f"    总时间: {total_time:.2f} ms")
        print(f"    平均时间: {avg_time:.2f} ms")
        print(f"    性能要求: < 500 ms")
        
        if avg_time < 500:
            print(f"\n✓ 性能测试通过 (平均 {avg_time:.2f} ms < 500 ms)")
            return True
        else:
            print(f"\n✗ 性能测试未通过 (平均 {avg_time:.2f} ms >= 500 ms)")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_analyze_with_abnormal_data():
    """测试分析异常数据"""
    print("\n=== 测试 7: 分析异常数据 ===")
    
    try:
        analyzer = ResultAnalyzer()
        
        # 准备异常数据
        result_id = "test_result_abnormal"
        data = {
            "pH": 5.0,              # 异常
            "铅含量": 0.05,         # 异常
            "浊度": 2.0,            # 异常
            "土壤pH": 6.5,          # 正常
            "镉含量": 0.5,          # 异常
            "PM2.5": 100.0,         # 异常
            "一氧化碳": 15.0,       # 异常
            "保存温度": 4.0,        # 正常
            "样品状态": "异常"      # 异常
        }
        
        print(f"  测试数据包含多项异常")
        
        # 执行分析
        report = analyzer.analyze(result_id, data)
        
        print(f"\n  分析报告:")
        print(f"    状态: {report.status}")
        print(f"    异常数量: {len(report.anomalies)}")
        
        # 显示异常详情
        if report.anomalies:
            print(f"\n  检测到的异常:")
            for anomaly in report.anomalies:
                print(f"    - {anomaly.indicator}: {anomaly.message}")
                print(f"      严重程度: {anomaly.severity}")
        
        print(f"\n  摘要:")
        for line in report.summary.split('\n'):
            if line.strip():
                print(f"    {line}")
        
        # 验证报告状态
        if report.status in [ReportStatus.WARNING, ReportStatus.ERROR]:
            print(f"\n✓ 正确识别异常数据，报告状态为 {report.status}")
            return True
        else:
            print(f"\n✗ 未正确识别异常数据，报告状态为 {report.status}")
            return False
    
    except Exception as e:
        print(f"✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("结果分析器测试")
    print("=" * 60)
    
    tests = [
        test_analyzer_initialization,
        test_detect_anomalies_normal,
        test_detect_anomalies_abnormal,
        test_generate_suggestions,
        test_analyze_complete,
        test_analyze_performance,
        test_analyze_with_abnormal_data
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

