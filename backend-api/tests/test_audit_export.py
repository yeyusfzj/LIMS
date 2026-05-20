"""
审核数据导出功能测试
"""
import pytest
from pathlib import Path
from app.services.export_service import ExportService


@pytest.mark.asyncio
async def test_export_audit_tasks_to_excel():
    """测试导出审核任务为 Excel"""
    # 准备测试数据
    test_data = [
        {
            "id": "task-1",
            "sampleId": "sample-1",
            "level": 1,
            "auditorId": "auditor-1",
            "status": "PENDING",
            "decision": None,
            "comments": None,
            "submittedAt": "2024-01-01T10:00:00",
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
            "submittedAt": "2024-01-01T11:00:00",
            "completedAt": "2024-01-01T12:00:00",
            "sample": {
                "sampleNumber": "S2024010002",
                "sampleName": "测试样品2",
                "sampleType": "土壤"
            }
        }
    ]
    
    # 执行导出
    file_path = await ExportService.export_audit_tasks_to_excel(test_data, "test_audit_tasks.xlsx")
    
    # 验证文件存在
    assert Path(file_path).exists()
    assert Path(file_path).suffix == ".xlsx"
    
    # 清理测试文件
    Path(file_path).unlink()


@pytest.mark.asyncio
async def test_export_workload_to_excel():
    """测试导出工作量统计为 Excel"""
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
    
    file_path = await ExportService.export_workload_to_excel(test_data, "test_workload.xlsx")
    
    assert Path(file_path).exists()
    assert Path(file_path).suffix == ".xlsx"
    
    Path(file_path).unlink()


@pytest.mark.asyncio
async def test_export_pass_rate_to_excel():
    """测试导出通过率统计为 Excel"""
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
    
    file_path = await ExportService.export_pass_rate_to_excel(test_data, "test_pass_rate.xlsx")
    
    assert Path(file_path).exists()
    assert Path(file_path).suffix == ".xlsx"
    
    Path(file_path).unlink()


@pytest.mark.asyncio
async def test_export_duration_to_excel():
    """测试导出时效性统计为 Excel"""
    test_data = {
        "overall": {
            "averageDuration": 2.5,
            "medianDuration": 2.0,
            "minDuration": 0.5,
            "maxDuration": 8.0,
            "overtimeTasks": 5,
            "overtimeRate": 5.0
        },
        "distribution": [
            {"range": "0-2小时", "count": 50},
            {"range": "2-4小时", "count": 30},
            {"range": "4-8小时", "count": 15},
            {"range": "8小时以上", "count": 5}
        ]
    }
    
    file_path = await ExportService.export_duration_to_excel(test_data, "test_duration.xlsx")
    
    assert Path(file_path).exists()
    assert Path(file_path).suffix == ".xlsx"
    
    Path(file_path).unlink()


@pytest.mark.asyncio
async def test_export_issues_to_excel():
    """测试导出问题分类统计为 Excel"""
    test_data = {
        "byReason": [
            {"reason": "数据不准确", "count": 10, "percentage": 40.0},
            {"reason": "缺少必要信息", "count": 8, "percentage": 32.0},
            {"reason": "格式不规范", "count": 5, "percentage": 20.0},
            {"reason": "其他", "count": 2, "percentage": 8.0}
        ]
    }
    
    file_path = await ExportService.export_issues_to_excel(test_data, "test_issues.xlsx")
    
    assert Path(file_path).exists()
    assert Path(file_path).suffix == ".xlsx"
    
    Path(file_path).unlink()


@pytest.mark.asyncio
async def test_export_service_initialization():
    """测试导出服务初始化"""
    ExportService.initialize()
    
    assert ExportService.EXPORT_DIR.exists()
    assert ExportService.EXPORT_DIR.is_dir()

