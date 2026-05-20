"""
测试审核API端点
"""
import requests
import json

# API基础URL
BASE_URL = "http://localhost:8000"

# 审核任务ID
TASK_ID = "67f2d198-f44e-4e36-be0c-b5f1c6bac890"

print(f"\n{'='*60}")
print(f"测试审核任务API")
print(f"{'='*60}\n")

# 测试获取审核任务详情
url = f"{BASE_URL}/api/v1/audits/{TASK_ID}"
print(f"请求URL: {url}\n")

try:
    response = requests.get(url)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ API响应成功\n")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # 验证数据结构
        print(f"\n{'='*60}")
        print("数据结构验证:")
        print(f"{'='*60}\n")
        
        has_task = 'task' in data
        print(f"✅ 有 'task' 字段: {has_task}")
        
        if has_task:
            has_instance = 'instance' in data.get('task', {})
            print(f"✅ 有 'task.instance' 字段: {has_instance}")
            
            if has_instance:
                has_sample = 'sample' in data.get('task', {}).get('instance', {})
                print(f"✅ 有 'task.instance.sample' 字段: {has_sample}")
                
                if has_sample:
                    results = data.get('task', {}).get('instance', {}).get('sample', {}).get('results', [])
                    print(f"✅ 有 'task.instance.sample.results' 字段: {len(results)} 条检测结果")
                    
                    if results:
                        print(f"\n检测结果示例:")
                        print(json.dumps(results[0], indent=2, ensure_ascii=False))
                else:
                    print(f"❌ 缺少 'task.instance.sample' 字段")
            else:
                print(f"❌ 缺少 'task.instance' 字段")
        else:
            print(f"❌ 缺少 'task' 字段")
            
            # 检查是否有扁平的sample字段
            has_flat_sample = 'sample' in data
            print(f"\n检查扁平结构:")
            print(f"   有 'sample' 字段: {has_flat_sample}")
            if has_flat_sample:
                sample = data.get('sample', {})
                has_results = 'results' in sample
                print(f"   有 'sample.results' 字段: {has_results}")
                if has_results:
                    results = sample.get('results', [])
                    print(f"   检测结果数量: {len(results)}")
    else:
        print(f"\n❌ API请求失败")
        print(f"响应内容: {response.text}")
        
except Exception as e:
    print(f"\n❌ 请求出错: {e}")

print(f"\n{'='*60}\n")
