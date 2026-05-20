#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试 AI 智能体功能"""

import requests
import json
import sys

# 设置控制台编码为 UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8001/api/agent"

def test_plan_generation():
    """测试计划生成（简洁格式）"""
    print("=" * 60)
    print("测试 1: 计划生成（简洁格式）")
    print("=" * 60)
    
    data = {
        "parsed_fields": {
            "purpose": "检测水样中铅、镉、汞指标",
            "sample_type": "水样",
            "indicators": ["铅", "镉", "汞"],
            "equipment": [],
            "materials": [],
            "steps": [],
            "estimated_time": "",
            "confidence": 0.85
        },
        "format": "simple"
    }
    
    response = requests.post(f"{BASE_URL}/plan", json=data)
    result = response.json()
    
    if result["success"]:
        print("✅ 成功")
        print(f"\n计划ID: {result['data']['id']}")
        print(f"\n简洁格式输出:\n")
        print(result['data']['simple_text'])
    else:
        print("❌ 失败")
        print(f"错误: {result.get('error')}")

def test_result_analysis():
    """测试结果分析"""
    print("\n" + "=" * 60)
    print("测试 2: 结果分析（数据分析）")
    print("=" * 60)
    
    data = {
        "result_data": {
            "铅含量": 0.015,  # 超标（阈值 0.01）
            "镉含量": 0.003,  # 正常（阈值 0.005）
            "汞含量": 0.0005  # 正常（阈值 0.001）
        }
    }
    
    response = requests.post(f"{BASE_URL}/result-analysis", json=data)
    result = response.json()
    
    if result["success"]:
        print("✅ 成功")
        data = result['data']
        print(f"\n结果ID: {data['result_id']}")
        print(f"状态: {data['status']}")
        print(f"摘要: {data['summary']}")
        
        if data['anomalies']:
            print(f"\n异常检测:")
            for anomaly in data['anomalies']:
                print(f"  - {anomaly['indicator']}: {anomaly['value']} (阈值: {anomaly.get('threshold_max', 'N/A')})")
                print(f"    严重程度: {anomaly['severity']}")
                print(f"    建议: {anomaly['suggestion']}")
    else:
        print("❌ 失败")
        print(f"错误: {result.get('error')}")

def test_qa():
    """测试问答功能"""
    print("\n" + "=" * 60)
    print("测试 3: 智能问答（数据检索）")
    print("=" * 60)
    
    questions = [
        "水质检测需要什么设备？",
        "需要哪些试剂？",
        "实验步骤是什么？"
    ]
    
    for question in questions:
        print(f"\n问题: {question}")
        data = {
            "question": question,
            "context": {"experiment_type": "water_heavy_metal"}
        }
        
        response = requests.post(f"{BASE_URL}/qa", json=data)
        result = response.json()
        
        if result["success"]:
            print(f"回答: {result['data']['answer'][:200]}...")
            print(f"置信度: {result['data']['confidence']}")
        else:
            print(f"❌ 失败: {result.get('error')}")

if __name__ == "__main__":
    try:
        test_plan_generation()
        test_result_analysis()
        test_qa()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试完成！")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端正在运行")
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
