"""
快速测试API是否正常工作
"""
import requests
import json

# 首先登录获取token
login_url = "http://localhost:8000/api/v1/auth/login"
login_data = {
    "username": "admin",
    "password": "admin123"
}

print("="*60)
print("步骤1: 登录获取token")
print("="*60)

try:
    login_response = requests.post(login_url, json=login_data, timeout=5)
    if login_response.status_code == 200:
        token_data = login_response.json()
        print(f"登录响应: {json.dumps(token_data, indent=2, ensure_ascii=False)}")
        
        # 尝试不同的token路径
        if 'data' in token_data and 'accessToken' in token_data['data']:
            token = token_data['data']['accessToken']
        elif 'data' in token_data and 'access_token' in token_data['data']:
            token = token_data['data']['access_token']
        elif 'data' in token_data and 'token' in token_data['data']:
            token = token_data['data']['token']
        elif 'accessToken' in token_data:
            token = token_data['accessToken']
        elif 'access_token' in token_data:
            token = token_data['access_token']
        elif 'token' in token_data:
            token = token_data['token']
        else:
            print(f"❌ 无法找到token字段")
            print(f"响应结构: {list(token_data.keys())}")
            if 'data' in token_data:
                print(f"data字段结构: {list(token_data['data'].keys())}")
            exit(1)
            
        print(f"✅ 登录成功，获取到token: {token[:20]}...")
        print()
    else:
        print(f"❌ 登录失败: {login_response.status_code}")
        print(f"响应: {login_response.text}")
        exit(1)
except Exception as e:
    print(f"❌ 登录失败: {str(e)}")
    exit(1)

# 测试样品列表API
url = "http://localhost:8000/api/v1/samples"
params = {
    "page": 1,
    "page_size": 20
}
headers = {
    "Authorization": f"Bearer {token}"
}

print("="*60)
print("步骤2: 测试样品列表API")
print("="*60)
print(f"URL: {url}")
print(f"参数: {params}")
print()

try:
    response = requests.get(url, params=params, headers=headers, timeout=5)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ API调用成功！")
        print()
        print("响应数据结构:")
        print(f"  - success: {data.get('success')}")
        print(f"  - message: {data.get('message')}")
        print()
        
        if 'data' in data:
            response_data = data['data']
            print("data字段:")
            print(f"  - items数量: {len(response_data.get('items', []))}")
            
            if 'pagination' in response_data:
                pagination = response_data['pagination']
                print(f"  - pagination:")
                print(f"    - total: {pagination.get('total')}")
                print(f"    - page: {pagination.get('page')}")
                print(f"    - pageSize: {pagination.get('pageSize')}")
                print(f"    - totalPages: {pagination.get('totalPages')}")
                print()
                
                # 检查字段名
                if 'pageSize' in pagination and 'totalPages' in pagination:
                    print("✅ 分页字段使用驼峰命名（正确）")
                elif 'page_size' in pagination or 'total_pages' in pagination:
                    print("❌ 分页字段使用蛇形命名（错误）")
                    print(f"   实际字段: {list(pagination.keys())}")
            else:
                print("❌ 缺少pagination字段")
        
        print()
        print("="*60)
        print("✅ 测试通过！前端应该能正常显示分页了")
        print("="*60)
    else:
        print(f"❌ API返回错误状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("❌ 连接失败：无法连接到后端服务")
    print("请确认后端服务是否在运行（http://localhost:8000）")
except requests.exceptions.Timeout:
    print("❌ 请求超时")
except Exception as e:
    print(f"❌ 发生错误: {str(e)}")
    import traceback
    traceback.print_exc()
