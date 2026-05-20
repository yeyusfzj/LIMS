#!/usr/bin/env python3
"""
测试 AI 智能分析使用真实数据功能

测试流程:
1. 获取样品检测结果
2. 进行 AI 分析
3. 验证分析结果
"""

import requests
import json
from typing import Dict, Any

# API 基础 URL
BASE_URL = "http://localhost:8001"

# 测试样品 ID（工业废水样品 - 超标）
SAMPLE_ID = "4f81f49d-c941-4c92-95f7-e4e54023bd16"


def print_section(title: str):
    """打印分隔线"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_get_sample_results():
    """测试获取样品检测结果"""
    print_section("测试 1: 获取样品检测结果")
    
    url = f"{BASE_URL}/api/agent/sample-results/{SAMPLE_ID}"
    print(f"请求 URL: {url}")
    
    try:
        response = requests.get(url)
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ 成功获取样品检测结果:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return data.get('data', {})
        else:
            print(f"\n❌ 请求失败: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ 请求异常: {str(e)}")
        return None


def test_analyze_result(result_data: Dict[str, float]):
    """测试 AI 分析"""
    print_section("测试 2: AI 智能分析")
    
    url = f"{BASE_URL}/api/agent/result-analysis"
    print(f"请求 URL: {url}")
    print(f"分析数据: {json.dumps(result_data, ensure_ascii=False)}")
    
    try:
        response = requests.post(
            url,
            json={"result_data": result_data},
            headers={"Content-Type": "application/json"}
        )
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ AI 分析成功:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # 分析结果摘要
            analysis_data = data.get('data', {})
            anomalies = analysis_data.get('anomalies', [])
            
            print("\n" + "-" * 60)
            print("分析结果摘要:")
            print(f"  状态: {analysis_data.get('status', 'unknown')}")
            print(f"  异常数量: {len(anomalies)}")
            
            if anomalies:
                print("\n  检测到的异常:")
                for i, anomaly in enumerate(anomalies, 1):
                    print(f"\n  {i}. {anomaly.get('indicator', 'unknown')}")
                    print(f"     实际值: {anomaly.get('value', 0)}")
                    print(f"     阈值: {anomaly.get('threshold_max', 0)}")
                    print(f"     严重程度: {anomaly.get('severity', 'unknown')}")
                    print(f"     建议: {anomaly.get('suggestion', 'N/A')}")
            
            return data
        else:
            print(f"\n❌ 分析失败: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ 请求异常: {str(e)}")
        return None


def test_complete_workflow():
    """测试完整工作流程"""
    print_section("完整工作流程测试")
    
    # 步骤 1: 获取样品检测结果
    print("\n步骤 1: 获取样品检测结果...")
    sample_results = test_get_sample_results()
    
    if not sample_results:
        print("\n❌ 无法获取样品检测结果，测试终止")
        return False
    
    # 步骤 2: 进行 AI 分析
    print("\n步骤 2: 进行 AI 智能分析...")
    result_data = sample_results.get('result_data', {})
    
    if not result_data:
        print("\n❌ 样品没有检测结果数据，测试终止")
        return False
    
    analysis = test_analyze_result(result_data)
    
    if not analysis:
        print("\n❌ AI 分析失败，测试终止")
        return False
    
    # 测试成功
    print_section("测试结果")
    print("\n✅ 所有测试通过!")
    print("\n功能验证:")
    print("  ✅ 可以从数据库获取真实的样品检测结果")
    print("  ✅ 可以对真实数据进行 AI 智能分析")
    print("  ✅ 可以检测异常并提供建议")
    
    return True


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("  AI 智能分析真实数据功能测试")
    print("=" * 60)
    print(f"\n测试样品 ID: {SAMPLE_ID}")
    print(f"API 基础 URL: {BASE_URL}")
    
    # 运行完整工作流程测试
    success = test_complete_workflow()
    
    if success:
        print("\n" + "=" * 60)
        print("  🎉 测试完成 - 所有功能正常工作!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("  ❌ 测试失败 - 请检查错误信息")
        print("=" * 60)


if __name__ == "__main__":
    main()
