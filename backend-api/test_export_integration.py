"""
审核数据导出功能集成测试脚本

这个脚本用于验证导出功能的完整性，无需运行服务器
"""
import asyncio
from pathlib import Path
from datetime import datetime


async def test_export_service():
    """测试导出服务"""
    print("=" * 60)
    print("审核数据导出功能集成测试")
    print("=" * 60)
    
    # 导入导出服务
    try:
        from app.services.export_service import ExportService
        print("✓ 导出服务导入成功")
    except Exception as e:
        print(f"✗ 导出服务导入失败: {e}")
        return False
    
    # 初始化导出目录
    try:
        ExportService.initialize()
        print(f"✓ 导出目录初始化成功: {ExportService.EXPORT_DIR}")
    except Exception as e:
        print(f"✗ 导出目录初始化失败: {e}")
        return False
    
    # 测试审核任务导出
    print("\n测试 1: 导出审核任务")
    try:
        test_data = [
            {
                "id": "task-1",
                "sampleId": "sample-1",
                "level": 1,
                "auditorId": "auditor-1",
                "status": "PENDING",
                "decision": None,
                "comments": None,
                "submittedAt": datetime(2024, 1, 1, 10, 0, 0),
                "completedAt": None,
                "sample": {
                    "sampleNumber": "S2024010001",
                    "sampleName": "测试样品1",
                    "sampleType": "水质"
                }
            },
            {
                "id": "task-2",
                "sampleId": "sample-2",
                "level": 2,
                "auditorId": "auditor-2",
                "status": "APPROVED",
                "decision": "APPROVE",
                "comments": "审核通过",
                "submittedAt": datetime(2024, 1, 1, 11, 0, 0),
                "completedAt": datetime(2024, 1, 1, 12, 0, 0),
                "sample": {
                    "sampleNumber": "S2024010002",
                    "sampleName": "测试样品2",
                    "sampleType": "土壤"
                }
            }
        ]
        
        file_path = await ExportService.export_audit_tasks_to_excel(
            test_data, 
            "test_audit_tasks.xlsx"
        )
        
        if Path(file_path).exists():
            file_size = Path(file_path).stat().st_size
            print(f"✓ 审核任务导出成功")
            print(f"  - 文件路径: {file_path}")
            print(f"  - 文件大小: {file_size} 字节")
            print(f"  - 记录数量: {len(test_data)}")
            
            # 清理测试文件
            Path(file_path).unlink()
            print(f"✓ 测试文件已清理")
        else:
            print(f"✗ 导出文件不存在: {file_path}")
            return False
            
    except Exception as e:
        print(f"✗ 审核任务导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试工作量统计导出
    print("\n测试 2: 导出工作量统计")
    try:
        test_data = [
            {
                "auditorName": "张三",
                "totalTasks": 10,
                "completedTasks": 8,
                "pendingTasks": 2
            },
            {
                "auditorName": "李四",
                "totalTasks": 15,
                "completedTasks": 12,
                "pendingTasks": 3
            }
        ]
        
        file_path = await ExportService.export_workload_to_excel(
            test_data,
            "test_workload.xlsx"
        )
        
        if Path(file_path).exists():
            file_size = Path(file_path).stat().st_size
            print(f"✓ 工作量统计导出成功")
            print(f"  - 文件路径: {file_path}")
            print(f"  - 文件大小: {file_size} 字节")
            
            Path(file_path).unlink()
            print(f"✓ 测试文件已清理")
        else:
            print(f"✗ 导出文件不存在: {file_path}")
            return False
            
    except Exception as e:
        print(f"✗ 工作量统计导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # 测试通过率统计导出
    print("\n测试 3: 导出通过率统计")
    try:
        test_data = {
            "overall": {
                "total": 100,
                "passed": 85,
                "rejected": 15,
                "passRate": 85.0
            },
            "byLevel": [
                {"level": 1, "total": 100, "passed": 90, "passRate": 90.0},
                {"level": 2, "total": 90, "passed": 85, "passRate": 94.4}
            ],
            "bySampleType": [
                {"sampleType": "水质", "total": 50, "passed": 45, "passRate": 90.0},
                {"sampleType": "土壤", "total": 50, "passed": 40, "passRate": 80.0}
            ]
        }
        
        file_path = await ExportService.export_pass_rate_to_excel(
            test_data,
            "test_pass_rate.xlsx"
        )
        
        if Path(file_path).exists():
            file_size = Path(file_path).stat().st_size
            print(f"✓ 通过率统计导出成功")
            print(f"  - 文件路径: {file_path}")
            print(f"  - 文件大小: {file_size} 字节")
            
            Path(file_path).unlink()
            print(f"✓ 测试文件已清理")
        else:
            print(f"✗ 导出文件不存在: {file_path}")
            return False
            
    except Exception as e:
        print(f"✗ 通过率统计导出失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("所有测试通过！✓")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_export_service())
    exit(0 if success else 1)

