"""
测试报告生成API
验证后端API是否正常工作
"""

import requests
import json

# API配置
BASE_URL = "http://localhost:8001/api/v1"
LOGIN_URL = f"{BASE_URL}/auth/login"
REPORT_URL = f"{BASE_URL}/reports/generate"

def test_report_api():
    """测试报告生成API"""
    
    print("=" * 60)
    print("测试报告生成API")
    print("=" * 60)
    
    # 1. 登录获取token
    print("\n1. 正在登录...")
    try:
        login_response = requests.post(
            LOGIN_URL,
            json={
                "username": "admin",
                "password": "admin123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("data", {}).get("accessToken")
            print(f"✅ 登录成功，获取到token: {token[:20]}...")
        else:
            print(f"❌ 登录失败: {login_response.status_code}")
            print(f"响应: {login_response.text}")
            return
    except Exception as e:
        print(f"❌ 登录请求失败: {str(e)}")
        return
    
    # 2. 测试报告生成API（预览模式）
    print("\n2. 测试报告生成API（预览模式）...")
    try:
        report_response = requests.post(
            REPORT_URL,
            json={
                "sampleId": "679e65c4-923d-490e-bae3-81ebf77abc03",  # 化学样品X的ID
                "templateId": "test-template-id",
                "preview": True
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        print(f"状态码: {report_response.status_code}")
        
        if report_response.status_code == 201:
            result = report_response.json()
            print("✅ 报告生成成功（预览模式）")
            print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}...")
        elif report_response.status_code == 401:
            print("❌ 认证失败: token无效或已过期")
        elif report_response.status_code == 404:
            print("❌ 样品或模板不存在")
            print(f"响应: {report_response.text}")
        else:
            print(f"❌ 请求失败: {report_response.status_code}")
            print(f"响应: {report_response.text}")
    except Exception as e:
        print(f"❌ 报告生成请求失败: {str(e)}")
    
    # 3. 测试获取报告列表
    print("\n3. 测试获取报告列表...")
    try:
        list_response = requests.get(
            f"{BASE_URL}/reports",
            params={"page": 1, "pageSize": 10},
            headers={
                "Authorization": f"Bearer {token}"
            }
        )
        
        print(f"状态码: {list_response.status_code}")
        
        if list_response.status_code == 200:
            result = list_response.json()
            print("✅ 获取报告列表成功")
            print(f"响应数据: {json.dumps(result, indent=2, ensure_ascii=False)[:500]}...")
        else:
            print(f"❌ 请求失败: {list_response.status_code}")
            print(f"响应: {list_response.text}")
    except Exception as e:
        print(f"❌ 获取报告列表请求失败: {str(e)}")
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_report_api()
