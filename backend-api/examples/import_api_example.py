"""
批量导入 API 使用示例

演示如何使用批量导入 API
"""
import asyncio
import httpx
import os


# API 配置
API_BASE_URL = "http://localhost:8000"
API_TOKEN = "your_jwt_token_here"  # 替换为实际的 JWT token


async def import_results_from_file(file_path: str):
    """
    从文件导入检测结果
    
    Args:
        file_path: 文件路径（Excel 或 CSV）
    """
    print(f"正在导入文件: {file_path}")
    print("-" * 60)
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"✗ 文件不存在: {file_path}")
        return
    
    # 确定文件类型
    ext = file_path.lower().split('.')[-1]
    if ext == 'xlsx':
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif ext == 'xls':
        content_type = 'application/vnd.ms-excel'
    elif ext == 'csv':
        content_type = 'text/csv'
    else:
        print(f"✗ 不支持的文件格式: {ext}")
        return
    
    # 上传文件
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (os.path.basename(file_path), f, content_type)
                }
                
                response = await client.post(
                    f"{API_BASE_URL}/api/v1/results/import",
                    files=files,
                    headers={
                        'Authorization': f'Bearer {API_TOKEN}'
                    }
                )
            
            # 处理响应
            if response.status_code == 200:
                result = response.json()
                data = result.get('data', {})
                
                print(f"✓ 导入完成")
                print(f"  总记录数: {data.get('total_records', 0)}")
                print(f"  成功数量: {data.get('success_count', 0)}")
                print(f"  失败数量: {data.get('failure_count', 0)}")
                
                # 显示错误详情
                errors = data.get('errors', [])
                if errors:
                    print(f"\n错误详情:")
                    for error in errors[:10]:  # 最多显示 10 个错误
                        row = error.get('row', '?')
                        field = error.get('field', '')
                        message = error.get('message', '')
                        value = error.get('value', '')
                        
                        if field and value:
                            print(f"  行 {row} [{field}={value}]: {message}")
                        elif field:
                            print(f"  行 {row} [{field}]: {message}")
                        else:
                            print(f"  行 {row}: {message}")
                    
                    if len(errors) > 10:
                        print(f"  ... 还有 {len(errors) - 10} 个错误")
                
                # 显示导入的结果（前 5 条）
                imported_results = data.get('imported_results', [])
                if imported_results:
                    print(f"\n导入的结果（前 5 条）:")
                    for i, result in enumerate(imported_results[:5], 1):
                        print(f"  {i}. {result.get('parameter')}: {result.get('value') or result.get('text_value')}")
                
            else:
                print(f"✗ 导入失败")
                print(f"  状态码: {response.status_code}")
                print(f"  响应: {response.text}")
        
        except httpx.TimeoutException:
            print("✗ 请求超时")
        except httpx.RequestError as e:
            print(f"✗ 请求错误: {str(e)}")
        except Exception as e:
            print(f"✗ 未知错误: {str(e)}")


async def get_import_task_status(task_id: str):
    """
    查询导入任务状态
    
    Args:
        task_id: 任务 ID
    """
    print(f"查询任务状态: {task_id}")
    print("-" * 60)
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_BASE_URL}/api/v1/results/import/{task_id}",
                headers={
                    'Authorization': f'Bearer {API_TOKEN}'
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                data = result.get('data', {})
                
                print(f"任务 ID: {data.get('task_id')}")
                print(f"状态: {data.get('status')}")
                print(f"文件名: {data.get('filename')}")
                print(f"总记录数: {data.get('total_records', 'N/A')}")
                print(f"成功数量: {data.get('success_count', 'N/A')}")
                print(f"失败数量: {data.get('failure_count', 'N/A')}")
                print(f"创建时间: {data.get('created_at')}")
                print(f"完成时间: {data.get('completed_at', 'N/A')}")
                
            elif response.status_code == 404:
                print("✗ 任务不存在")
            else:
                print(f"✗ 查询失败")
                print(f"  状态码: {response.status_code}")
                print(f"  响应: {response.text}")
        
        except Exception as e:
            print(f"✗ 查询错误: {str(e)}")


async def main():
    """主函数"""
    print("=" * 60)
    print("批量导入 API 使用示例")
    print("=" * 60)
    print()
    
    # 示例 1: 导入 Excel 文件
    print("示例 1: 导入 Excel 文件")
    excel_path = os.path.join(
        os.path.dirname(__file__),
        "results_import_template.xlsx"
    )
    await import_results_from_file(excel_path)
    
    print()
    print("=" * 60)
    print()
    
    # 示例 2: 导入 CSV 文件
    print("示例 2: 导入 CSV 文件")
    csv_path = os.path.join(
        os.path.dirname(__file__),
        "results_import_template.csv"
    )
    await import_results_from_file(csv_path)
    
    print()
    print("=" * 60)
    print()
    
    # 示例 3: 查询任务状态（需要实际的任务 ID）
    # print("示例 3: 查询任务状态")
    # await get_import_task_status("your-task-id-here")


def sync_main():
    """同步主函数"""
    print("\n注意事项:")
    print("1. 请先启动 FastAPI 服务器")
    print("2. 替换 API_TOKEN 为实际的 JWT token")
    print("3. 确保模板文件中的 sampleId 在数据库中存在")
    print()
    
    # 运行异步主函数
    asyncio.run(main())


if __name__ == "__main__":
    sync_main()
