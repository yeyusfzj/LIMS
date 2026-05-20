"""
测试导出服务

验证 Excel 和 CSV 导出功能
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.export_service import ExportService, ExportFormat


async def test_export_to_excel():
    """测试导出为 Excel"""
    print("\n=== 测试导出为 Excel ===")
    
    # 准备测试数据
    data = [
        {"姓名": "张三", "年龄": 25, "部门": "研发部", "职位": "工程师"},
        {"姓名": "李四", "年龄": 30, "部门": "市场部", "职位": "经理"},
        {"姓名": "王五", "年龄": 28, "部门": "人事部", "职位": "专员"},
    ]
    
    try:
        # 初始化导出服务
        ExportService.initialize()
        
        # 导出为 Excel
        file_path = await ExportService.export_to_excel(
            data=data,
            filename="test_export.xlsx"
        )
        
        print(f"✓ Excel 导出成功: {file_path}")
        
        # 验证文件存在
        if Path(file_path).exists():
            print(f"✓ 文件存在，大小: {Path(file_path).stat().st_size} 字节")
        else:
            print("✗ 文件不存在")
            
    except Exception as e:
        print(f"✗ Excel 导出失败: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_export_to_csv():
    """测试导出为 CSV"""
    print("\n=== 测试导出为 CSV ===")
    
    # 准备测试数据
    data = [
        {"姓名": "张三", "年龄": 25, "部门": "研发部", "职位": "工程师"},
        {"姓名": "李四", "年龄": 30, "部门": "市场部", "职位": "经理"},
        {"姓名": "王五", "年龄": 28, "部门": "人事部", "职位": "专员"},
    ]
    
    try:
        # 导出为 CSV
        file_path = await ExportService.export_to_csv(
            data=data,
            filename="test_export.csv"
        )
        
        print(f"✓ CSV 导出成功: {file_path}")
        
        # 验证文件存在
        if Path(file_path).exists():
            print(f"✓ 文件存在，大小: {Path(file_path).stat().st_size} 字节")
            
            # 读取并显示内容
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                content = f.read()
                print(f"✓ 文件内容:\n{content[:200]}")
        else:
            print("✗ 文件不存在")
            
    except Exception as e:
        print(f"✗ CSV 导出失败: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_export_task():
    """测试导出任务管理"""
    print("\n=== 测试导出任务管理 ===")
    
    # 准备测试数据
    data = [
        {"产品": "产品A", "销量": 100, "金额": 10000},
        {"产品": "产品B", "销量": 200, "金额": 20000},
        {"产品": "产品C", "销量": 150, "金额": 15000},
    ]
    
    try:
        # 创建 Excel 导出任务
        task = await ExportService.create_export_task(
            format=ExportFormat.EXCEL,
            data=data,
            filename="sales_report.xlsx"
        )
        
        print(f"✓ 导出任务已创建: {task.task_id}")
        print(f"  状态: {task.status}")
        print(f"  格式: {task.format}")
        print(f"  文件路径: {task.file_path}")
        print(f"  下载链接: {task.download_url}")
        
        # 获取任务状态
        retrieved_task = await ExportService.get_export_task(task.task_id)
        if retrieved_task:
            print(f"✓ 成功获取任务状态")
            print(f"  任务字典: {retrieved_task.to_dict()}")
        else:
            print("✗ 获取任务失败")
            
    except Exception as e:
        print(f"✗ 导出任务测试失败: {str(e)}")
        import traceback
        traceback.print_exc()


async def test_empty_data():
    """测试空数据导出"""
    print("\n=== 测试空数据导出 ===")
    
    try:
        # 导出空数据为 Excel
        file_path = await ExportService.export_to_excel(
            data=[],
            filename="empty_export.xlsx"
        )
        
        print(f"✓ 空数据 Excel 导出成功: {file_path}")
        
        # 导出空数据为 CSV
        file_path = await ExportService.export_to_csv(
            data=[],
            filename="empty_export.csv"
        )
        
        print(f"✓ 空数据 CSV 导出成功: {file_path}")
        
    except Exception as e:
        print(f"✗ 空数据导出失败: {str(e)}")


async def test_custom_columns():
    """测试自定义列"""
    print("\n=== 测试自定义列 ===")
    
    # 准备测试数据
    data = [
        {"name": "Alice", "age": 25, "city": "Beijing", "country": "China"},
        {"name": "Bob", "age": 30, "city": "Shanghai", "country": "China"},
    ]
    
    # 只导出部分列
    columns = ["name", "age"]
    
    try:
        # 导出为 Excel
        file_path = await ExportService.export_to_excel(
            data=data,
            columns=columns,
            filename="custom_columns.xlsx"
        )
        
        print(f"✓ 自定义列 Excel 导出成功: {file_path}")
        print(f"  指定列: {columns}")
        
        # 导出为 CSV
        file_path = await ExportService.export_to_csv(
            data=data,
            columns=columns,
            filename="custom_columns.csv"
        )
        
        print(f"✓ 自定义列 CSV 导出成功: {file_path}")
        
    except Exception as e:
        print(f"✗ 自定义列导出失败: {str(e)}")


async def main():
    """运行所有测试"""
    print("=" * 60)
    print("导出服务测试")
    print("=" * 60)
    
    await test_export_to_excel()
    await test_export_to_csv()
    await test_export_task()
    await test_empty_data()
    await test_custom_columns()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
