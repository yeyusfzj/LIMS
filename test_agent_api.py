#!/usr/bin/env python3
"""
测试 AI Agent API 端点
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/agent"

def test_parse():
    """测试解析端点"""
    print("=" * 60)
    print("测试 1: 解析实验需求")
    print("=" * 60)
    
    url = f"{BASE_URL}/parse"
    data = {
        "text": "我需要检测水样中的重金属含量，包括铅、汞、镉"
    }
    
    print(f"请求: POST {url}")
    print(f"数据: {json.dumps(data, ensure_ascii=False, indent=2)}")
    
    response = requests.post(url, json=data)
    print(f"\n响应状态码: {response.status_code}")
    print(f"响应数据:")
    print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    
    return response.json()

def test_plan(parsed_fields):
    """测试计划生成端点"""
    print("\n" + "=" * 60)
    print("测试 2: 生成实验计划（详细格式）")
    print("=" * 60)
    
    url = f"{BASE_URL}/plan"
    data = {
        "parsed_fields": parsed_fields,
        "format": "detailed"
    }
    
    print(f"请求: POST {url}")
    print(f"格式: detailed")
    
    response = requests.post(url, json=data)
    print(f"\n响应状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success") and result.get("data"):
            plan_data = result["data"]
            print(f"\n计划 ID: {plan_data.get('id')}")
            print(f"实验目的: {plan_data.get('purpose')}")
            print(f"样品类型: {plan_data.get('sample_type')}")
            print(f"指标数量: {len(plan_data.get('indicators', []))}")
            print(f"设备数量: {len(plan_data.get('equipment', []))}")
            print(f"材料数量: {len(plan_data.get('materials', []))}")
            print(f"步骤数量: {len(plan_data.get('steps', []))}")
            
            if plan_data.get('markdown'):
                print(f"\nMarkdown 计划（前200字符）:")
                print(plan_data['markdown'][:200] + "...")
    else:
        print(f"错误: {response.text}")
    
    return response.json()

def test_plan_simple(parsed_fields):
    """测试计划生成端点（简洁格式）"""
    print("\n" + "=" * 60)
    print("测试 3: 生成实验计划（简洁格式）")
    print("=" * 60)
    
    url = f"{BASE_URL}/plan"
    data = {
        "parsed_fields": parsed_fields,
        "format": "simple"
    }
    
    print(f"请求: POST {url}")
    print(f"格式: simple")
    
    response = requests.post(url, json=data)
    print(f"\n响应状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success") and result.get("data"):
            plan_data = result["data"]
            print(f"\n计划 ID: {plan_data.get('id')}")
            
            if plan_data.get('simple_text'):
                print(f"\n简洁格式计划:")
                print("-" * 60)
                print(plan_data['simple_text'])
                print("-" * 60)
    else:
        print(f"错误: {response.text}")
    
    return response.json()

def main():
    """主函数"""
    try:
        # 测试 1: 解析
        parse_result = test_parse()
        
        if parse_result.get("success") and parse_result.get("data"):
            parsed_fields = parse_result["data"]
            
            # 测试 2: 生成详细计划
            test_plan(parsed_fields)
            
            # 测试 3: 生成简洁计划
            test_plan_simple(parsed_fields)
        else:
            print("\n解析失败，无法继续测试")
    
    except Exception as e:
        print(f"\n测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
