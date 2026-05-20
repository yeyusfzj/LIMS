"""
结果分析器演示脚本

展示结果分析器的完整功能：
- 正常数据分析
- 异常数据分析
- 性能测试
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.agent.result_analyzer import ResultAnalyzer


def demo_normal_analysis():
    """演示正常数据分析"""
    print("\n" + "=" * 60)
    print("演示 1: 正常数据分析")
    print("=" * 60)
    
    analyzer = ResultAnalyzer()
    
    # 准备正常数据
    data = {
        "pH": 7.2,
        "铅含量": 0.005,
        "浊度": 0.5,
        "土壤pH": 6.5,
        "镉含量": 0.2,
        "PM2.5": 50.0,
        "一氧化碳": 5.0,
        "保存温度": 4.0,
        "样品状态": "正常"
    }
    
    print("\n实验结果数据:")
    for key, value in data.items():
        print(f"  {key}: {value}")
    
    # 执行分析
    report = analyzer.analyze("demo_result_001", data)
    
    print(f"\n分析报告:")
    print(f"  结果 ID: {report.result_id}")
    print(f"  状态: {report.status}")
    print(f"  异常数量: {len(report.anomalies)}")
    print(f"  分析时间: {report.analyzed_at}")
    
    print(f"\n摘要:")
    for line in report.summary.split('\n'):
        if line.strip():
            print(f"  {line}")


def demo_abnormal_analysis():
    """演示异常数据分析"""
    print("\n" + "=" * 60)
    print("演示 2: 异常数据分析")
    print("=" * 60)
    
    analyzer = ResultAnalyzer()
    
    # 准备异常数据
    data = {
        "pH": 5.0,              # 异常：低于 6.5
        "铅含量": 0.05,         # 异常：超过 0.01
        "浊度": 2.0,            # 异常：超过 1.0
        "土壤pH": 6.5,          # 正常
        "镉含量": 0.5,          # 异常：超过 0.3
        "PM2.5": 100.0,         # 异常：超过 75
        "一氧化碳": 15.0,       # 异常：超过 10
        "保存温度": 4.0,        # 正常
        "样品状态": "异常"      # 异常：不在枚举列表中
    }
    
    print("\n实验结果数据:")
    for key, value in data.items():
        print(f"  {key}: {value}")
    
    # 执行分析
    report = analyzer.analyze("demo_result_002", data)
    
    print(f"\n分析报告:")
    print(f"  结果 ID: {report.result_id}")
    print(f"  状态: {report.status}")
    print(f"  异常数量: {len(report.anomalies)}")
    
    if report.anomalies:
        print(f"\n检测到的异常:")
        for anomaly in report.anomalies[:5]:  # 只显示前 5 个
            print(f"  - {anomaly.indicator}: {anomaly.message}")
            print(f"    值: {anomaly.value}, 严重程度: {anomaly.severity}")
            if anomaly.suggestion:
                print(f"    建议: {anomaly.suggestion}")
    
    print(f"\n摘要和建议:")
    for line in report.summary.split('\n')[:15]:  # 只显示前 15 行
        if line.strip():
            print(f"  {line}")


def demo_water_quality_analysis():
    """演示水质检测分析"""
    print("\n" + "=" * 60)
    print("演示 3: 水质检测分析")
    print("=" * 60)
    
    analyzer = ResultAnalyzer()
    
    # 准备水质检测数据
    data = {
        "pH": 8.0,
        "铅含量": 0.008,
        "浊度": 0.9
    }
    
    print("\n水质检测数据:")
    for key, value in data.items():
        print(f"  {key}: {value}")
    
    # 执行分析
    report = analyzer.analyze("water_quality_001", data)
    
    print(f"\n分析结果:")
    print(f"  状态: {report.status}")
    print(f"  异常数量: {len(report.anomalies)}")
    
    print(f"\n摘要:")
    for line in report.summary.split('\n'):
        if line.strip():
            print(f"  {line}")


def demo_air_quality_analysis():
    """演示空气质量分析"""
    print("\n" + "=" * 60)
    print("演示 4: 空气质量分析")
    print("=" * 60)
    
    analyzer = ResultAnalyzer()
    
    # 准备空气质量数据
    data = {
        "PM2.5": 120.0,         # 异常：超过 75
        "一氧化碳": 8.0         # 正常
    }
    
    print("\n空气质量数据:")
    for key, value in data.items():
        print(f"  {key}: {value}")
    
    # 执行分析
    report = analyzer.analyze("air_quality_001", data)
    
    print(f"\n分析结果:")
    print(f"  状态: {report.status}")
    print(f"  异常数量: {len(report.anomalies)}")
    
    if report.anomalies:
        print(f"\n检测到的异常:")
        for anomaly in report.anomalies:
            print(f"  - {anomaly.indicator}: {anomaly.message}")
            print(f"    建议: {anomaly.suggestion}")
    
    print(f"\n摘要:")
    for line in report.summary.split('\n'):
        if line.strip():
            print(f"  {line}")


def main():
    """运行所有演示"""
    print("=" * 60)
    print("结果分析器功能演示")
    print("=" * 60)
    
    try:
        demo_normal_analysis()
        demo_abnormal_analysis()
        demo_water_quality_analysis()
        demo_air_quality_analysis()
        
        print("\n" + "=" * 60)
        print("演示完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 演示失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

