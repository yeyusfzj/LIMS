"""
样品状态管理单元测试

测试样品状态更新功能，包括：
- 状态枚举值验证
- 状态变更时间记录
- 放行状态特殊逻辑
- 乐观锁并发控制
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from uuid import uuid4

from app.services.sample_service import SampleService
from app.models.sample import Sample, SampleStatus
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    db = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def mock_sample_repo():
    """模拟样品仓库"""
    return AsyncMock()


@pytest.fixture
def mock_barcode_service():
    """模拟条码服务"""
    return AsyncMock()


@pytest.fixture
def sample_service(mock_db, mock_sample_repo, mock_barcode_service):
    """创建样品服务实例"""
    return SampleService(mock_db, mock_sample_repo, mock_barcode_service)


def create_mock_sample(
    sample_id: str = None,
    status: SampleStatus = SampleStatus.REGISTERED,
    version: int = 1,
    released_at=None,
    released_by=None
):
    """创建模拟样品对象"""
    sample = MagicMock(spec=Sample)
    sample.id = sample_id or str(uuid4())
    sample.barcode = "SP20260409000001"
    sample.sample_number = "2026000001"
    sample.client_name = "测试客户"
    sample.client_contact = "13800138000"
    sample.sample_name = "水样"
    sample.sample_type = "环境样品"
    sample.sample_category = "水质"
    sample.quantity = 500.0
    sample.unit = "mL"
    sample.received_date = datetime.now()
    sample.status = status
    sample.priority = "NORMAL"
    sample.created_by = "user123"
    sample.created_at = datetime.now()
    sample.updated_at = datetime.now()
    sample.version = version
    sample.released_at = released_at
    sample.released_by = released_by
    return sample


@pytest.mark.asyncio
async def test_update_sample_status_success(
    sample_service,
    mock_sample_repo
):
    """测试成功更新样品状态"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    updated_sample = create_mock_sample(
        sample_id=sample_id,
        status=new_status,
        version=2
    )
    mock_sample_repo.update.return_value = updated_sample
    
    # 执行测试
    result = await sample_service.update_sample_status(
        sample_id=sample_id,
        new_status=new_status,
        updated_by=updated_by
    )
    
    # 验证结果
    assert result.status == new_status
    assert result.version == 2
    
    # 验证调用
    mock_sample_repo.get_by_id.assert_called_once_with(sample_id)
    mock_sample_repo.update.assert_called_once()
    
    # 验证更新参数
    update_call_args = mock_sample_repo.update.call_args
    assert update_call_args.kwargs["id"] == sample_id
    assert update_call_args.kwargs["obj_in"]["status"] == new_status


@pytest.mark.asyncio
async def test_update_sample_status_to_released(
    sample_service,
    mock_sample_repo
):
    """测试更新样品状态为 RELEASED（放行）"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.RELEASED
    updated_by = "user456"
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    released_time = datetime.utcnow()
    updated_sample = create_mock_sample(
        sample_id=sample_id,
        status=new_status,
        version=2,
        released_at=released_time,
        released_by=updated_by
    )
    mock_sample_repo.update.return_value = updated_sample
    
    # 执行测试
    result = await sample_service.update_sample_status(
        sample_id=sample_id,
        new_status=new_status,
        updated_by=updated_by
    )
    
    # 验证结果
    assert result.status == SampleStatus.RELEASED
    assert result.released_at is not None
    assert result.released_by == updated_by
    
    # 验证更新参数包含放行信息
    update_call_args = mock_sample_repo.update.call_args
    update_dict = update_call_args.kwargs["obj_in"]
    assert update_dict["status"] == SampleStatus.RELEASED
    assert "released_at" in update_dict
    assert update_dict["released_by"] == updated_by


@pytest.mark.asyncio
async def test_update_sample_status_with_optimistic_lock(
    sample_service,
    mock_sample_repo
):
    """测试使用乐观锁更新样品状态"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    current_version = 1
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    updated_sample = create_mock_sample(
        sample_id=sample_id,
        status=new_status,
        version=2
    )
    mock_sample_repo.update.return_value = updated_sample
    
    # 执行测试
    result = await sample_service.update_sample_status(
        sample_id=sample_id,
        new_status=new_status,
        updated_by=updated_by,
        check_version=True,
        current_version=current_version
    )
    
    # 验证结果
    assert result.status == new_status
    assert result.version == 2
    
    # 验证调用包含版本检查参数
    update_call_args = mock_sample_repo.update.call_args
    assert update_call_args.kwargs["check_version"] is True
    assert update_call_args.kwargs["current_version"] == current_version


@pytest.mark.asyncio
async def test_update_sample_status_sample_not_found(
    sample_service,
    mock_sample_repo
):
    """测试更新不存在的样品状态"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    
    # 模拟样品不存在
    mock_sample_repo.get_by_id.return_value = None
    
    # 执行测试并验证异常
    with pytest.raises(NotFoundException) as exc_info:
        await sample_service.update_sample_status(
            sample_id=sample_id,
            new_status=new_status,
            updated_by=updated_by
        )
    
    assert "样品不存在" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_update_sample_status_version_conflict(
    sample_service,
    mock_sample_repo,
    mock_db
):
    """测试版本冲突时的处理"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    current_version = 1
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    # 模拟版本冲突
    mock_sample_repo.update.side_effect = ConflictException("版本冲突")
    
    # 执行测试并验证异常
    with pytest.raises(ConflictException):
        await sample_service.update_sample_status(
            sample_id=sample_id,
            new_status=new_status,
            updated_by=updated_by,
            check_version=True,
            current_version=current_version
        )
    
    # 验证回滚被调用
    mock_db.rollback.assert_called_once()


@pytest.mark.asyncio
async def test_update_sample_status_invalid_enum(
    sample_service,
    mock_sample_repo
):
    """测试无效的状态枚举值"""
    # 准备测试数据
    sample_id = str(uuid4())
    invalid_status = "INVALID_STATUS"  # 无效的状态值
    updated_by = "user456"
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    # 执行测试并验证异常
    with pytest.raises(ValidationException) as exc_info:
        await sample_service.update_sample_status(
            sample_id=sample_id,
            new_status=invalid_status,  # type: ignore
            updated_by=updated_by
        )
    
    assert "无效的状态值" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_update_sample_status_all_valid_statuses(
    sample_service,
    mock_sample_repo
):
    """测试所有有效的状态枚举值"""
    # 准备测试数据
    sample_id = str(uuid4())
    updated_by = "user456"
    
    # 测试所有有效状态
    valid_statuses = [
        SampleStatus.REGISTERED,
        SampleStatus.IN_TESTING,
        SampleStatus.TESTING_COMPLETE,
        SampleStatus.IN_AUDIT,
        SampleStatus.AUDIT_COMPLETE,
        SampleStatus.RELEASED,
        SampleStatus.ARCHIVED
    ]
    
    for status in valid_statuses:
        # 重置模拟
        existing_sample = create_mock_sample(sample_id=sample_id)
        mock_sample_repo.get_by_id.return_value = existing_sample
        
        updated_sample = create_mock_sample(
            sample_id=sample_id,
            status=status,
            version=2
        )
        if status == SampleStatus.RELEASED:
            updated_sample.released_at = datetime.utcnow()
            updated_sample.released_by = updated_by
        mock_sample_repo.update.return_value = updated_sample
        
        # 执行测试
        result = await sample_service.update_sample_status(
            sample_id=sample_id,
            new_status=status,
            updated_by=updated_by
        )
        
        # 验证结果
        assert result.status == status
        
        # 验证放行状态的特殊处理
        if status == SampleStatus.RELEASED:
            assert result.released_at is not None
            assert result.released_by == updated_by


@pytest.mark.asyncio
async def test_update_sample_status_database_error(
    sample_service,
    mock_sample_repo,
    mock_db
):
    """测试数据库错误时的处理"""
    # 准备测试数据
    sample_id = str(uuid4())
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(sample_id=sample_id)
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    # 模拟数据库错误
    mock_sample_repo.update.side_effect = Exception("数据库连接失败")
    
    # 执行测试并验证异常
    with pytest.raises(ValidationException) as exc_info:
        await sample_service.update_sample_status(
            sample_id=sample_id,
            new_status=new_status,
            updated_by=updated_by
        )
    
    assert "样品状态更新失败" in str(exc_info.value.detail)
    
    # 验证回滚被调用
    mock_db.rollback.assert_called_once()


@pytest.mark.asyncio
async def test_update_sample_status_logs_state_change(
    sample_service,
    mock_sample_repo,
    caplog
):
    """测试状态变更日志记录"""
    import logging
    caplog.set_level(logging.INFO)
    
    # 准备测试数据
    sample_id = str(uuid4())
    old_status = SampleStatus.REGISTERED
    new_status = SampleStatus.IN_TESTING
    updated_by = "user456"
    
    # 模拟仓库返回
    existing_sample = create_mock_sample(
        sample_id=sample_id,
        status=old_status
    )
    mock_sample_repo.get_by_id.return_value = existing_sample
    
    updated_sample = create_mock_sample(
        sample_id=sample_id,
        status=new_status,
        version=2
    )
    mock_sample_repo.update.return_value = updated_sample
    
    # 执行测试
    await sample_service.update_sample_status(
        sample_id=sample_id,
        new_status=new_status,
        updated_by=updated_by
    )
    
    # 验证日志记录
    assert "开始更新样品状态" in caplog.text
    assert "状态变更" in caplog.text
    assert f"旧状态={old_status}" in caplog.text
    assert f"新状态={new_status}" in caplog.text
    assert "样品状态更新成功" in caplog.text
