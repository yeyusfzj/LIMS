#!/usr/bin/env python3
"""
测试审核模板和工作流配置 API

此脚本测试 FastAPI 后端的审核模板和工作流配置管理功能。
"""
import requests
import json
from datetime import datetime

# API 基础 URL
BASE_URL = "http://localhost:8000/api/v1"

# 测试用户凭证
TEST_USER = {
    "username": "admin",
    "password": "admin123"
}

def login():
    """登录并获取访问令牌"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=TEST_USER
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("accessToken")
    else:
        print(f"登录失败: {response.status_code}")
        print(response.text)
        return None

def get_headers(token):
    """获取请求头"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_create_audit_template(token):
    """测试创建审核意见模板"""
    print("\n=== 测试创建审核意见模板 ===")
    
    template_data = {
        "name": "标准通过模板",
        "type": "APPROVED",
        "content": "经审核，该样品检测结果符合标准要求，审核通过。",
        "isDefault": True
    }
    
    response = requests.post(
        f"{BASE_URL}/audits/templates",
        headers=get_headers(token),
        json=template_data
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 201:
        return response.json().get("data", {}).get("id")
    return None

def test_list_audit_templates(token):
    """测试获取审核意见模板列表"""
    print("\n=== 测试获取审核意见模板列表 ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/templates",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_get_audit_template(token, template_id):
    """测试获取单个审核意见模板"""
    print(f"\n=== 测试获取审核意见模板 (ID: {template_id}) ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/templates/{template_id}",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_update_audit_template(token, template_id):
    """测试更新审核意见模板"""
    print(f"\n=== 测试更新审核意见模板 (ID: {template_id}) ===")
    
    update_data = {
        "content": "经审核，该样品检测结果完全符合标准要求，审核通过。（已更新）",
        "isDefault": False
    }
    
    response = requests.put(
        f"{BASE_URL}/audits/templates/{template_id}",
        headers=get_headers(token),
        json=update_data
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_create_workflow_config(token):
    """测试创建审核流程配置"""
    print("\n=== 测试创建审核流程配置 ===")
    
    config_data = {
        "name": "标准三级审核流程",
        "sampleTypes": ["食品", "药品", "化妆品"],
        "levels": [
            {
                "order": 1,
                "name": "初审",
                "role": "初审员",
                "required": True,
                "autoAssign": True
            },
            {
                "order": 2,
                "name": "复审",
                "role": "复审员",
                "required": True,
                "autoAssign": True
            },
            {
                "order": 3,
                "name": "终审",
                "role": "终审员",
                "required": True,
                "autoAssign": False
            }
        ],
        "parallelAudit": False
    }
    
    response = requests.post(
        f"{BASE_URL}/audits/workflow-configs",
        headers=get_headers(token),
        json=config_data
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 201:
        return response.json().get("data", {}).get("id")
    return None

def test_list_workflow_configs(token):
    """测试获取审核流程配置列表"""
    print("\n=== 测试获取审核流程配置列表 ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/workflow-configs",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_get_workflow_config(token, config_id):
    """测试获取单个审核流程配置"""
    print(f"\n=== 测试获取审核流程配置 (ID: {config_id}) ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/workflow-configs/{config_id}",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_update_workflow_config(token, config_id):
    """测试更新审核流程配置"""
    print(f"\n=== 测试更新审核流程配置 (ID: {config_id}) ===")
    
    update_data = {
        "parallelAudit": True,
        "status": "ACTIVE"
    }
    
    response = requests.put(
        f"{BASE_URL}/audits/workflow-configs/{config_id}",
        headers=get_headers(token),
        json=update_data
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_filter_templates_by_type(token):
    """测试按类型筛选审核意见模板"""
    print("\n=== 测试按类型筛选审核意见模板 ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/templates?type=APPROVED",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def test_filter_workflow_configs_by_sample_type(token):
    """测试按样品类型筛选审核流程配置"""
    print("\n=== 测试按样品类型筛选审核流程配置 ===")
    
    response = requests.get(
        f"{BASE_URL}/audits/workflow-configs?sampleType=食品",
        headers=get_headers(token)
    )
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.status_code == 200

def main():
    """主测试函数"""
    print("=" * 60)
    print("审核模板和工作流配置 API 测试")
    print("=" * 60)
    
    # 登录
    print("\n正在登录...")
    token = login()
    if not token:
        print("登录失败，测试终止")
        return
    
    print(f"登录成功，获取到访问令牌")
    
    # 测试审核意见模板
    template_id = test_create_audit_template(token)
    if template_id:
        test_get_audit_template(token, template_id)
        test_update_audit_template(token, template_id)
    
    test_list_audit_templates(token)
    test_filter_templates_by_type(token)
    
    # 测试审核流程配置
    config_id = test_create_workflow_config(token)
    if config_id:
        test_get_workflow_config(token, config_id)
        test_update_workflow_config(token, config_id)
    
    test_list_workflow_configs(token)
    test_filter_workflow_configs_by_sample_type(token)
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    main()
