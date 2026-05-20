#!/usr/bin/env python3
"""
测试扩展后的 AI Agent 功能
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/agent"

test_cases = [
    {
        "name": "水样重金属检测",
        "text": "我需要检测水样中的重金属含量，包括铅、汞、镉"
    },
    {
        "name": "食品农药残留检测",
        "text": "需要检测蔬菜中的农药残留，包括有机磷和有机氯农药"
    },
    {
        "name": "水质微生物检测",
        "text": "需要对饮用水进行微生物检测，测定菌落总数和大肠菌群"
    },
    {
        "name": "药品含量测定",
        "text": "需要测定药品中主药含量和有关物质"
    },
    {
        "name": "土壤有机物检测",
        "text": "需要对土壤样品进行有机物分析，检测苯、甲苯等指标"
    },
    {
        "name": "空气质量监测",
        "text": "进行空气质量监测，测定PM2.5、PM10、SO2、NO2等指标"
    }
]

def test_case(case):
    """测试单个案例"""
    print("\n" + "=" * 80)
    print(f"测试案例: {case['name']}")
    print("=" * 80)
    
    # 1. 解析
    print(f"\n输入: {case['text']}")
    parse_url = f"{BASE_URL}/parse"
    parse_response = requests.post(parse_url, json={"text": case['text']})
    
    if parse_response.status_code != 200:
        print(f"❌ 解析失败: {parse_response.status_code}")
        return
    
    parse_result = parse_response.json()
    if not parse_result.get("success"):
        print(f"❌ 解析失败: {parse_result.get('error')}")
        return
    
    parsed_data = parse_result["data"]
    print(f"\n✅ 解析成功:")
    print(f"  - 样品类型: {parsed_data.get('sample_type')}")
    print(f"  - 检测指标: {', '.join(parsed_data.get('indicators', []))}")
    print(f"  - 置信度: {parsed_data.get('confidence') * 100:.0f}%")
    
    # 2. 生成简洁计划
    plan_url = f"{BASE_URL}/plan"
    plan_response = requests.post(plan_url, json={
        "parsed_fields": parsed_data,
        "format": "simple"
    })
    
    if plan_response.status_code != 200:
        print(f"❌ 计划生成失败: {plan_response.status_code}")
        return
    
    plan_result = plan_response.json()
    if not plan_result.get("success"):
        print(f"❌ 计划生成失败: {plan_result.get('error')}")
        return
    
    plan_data = plan_result["data"]
    print(f"\n✅ 实验计划生成成功:")
    print("-" * 80)
    print(plan_data.get('simple_text', ''))
    print("-" * 80)

def main():
    """主函数"""
    print("=" * 80)
    print("AI Agent 扩展功能测试")
    print("=" * 80)
    print(f"测试案例数量: {len(test_cases)}")
    
    success_count = 0
    for case in test_cases:
        try:
            test_case(case)
            success_count += 1
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 80)
    print(f"测试完成: {success_count}/{len(test_cases)} 个案例成功")
    print("=" * 80)

if __name__ == "__main__":
    main()
