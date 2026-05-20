"""
流转服务单元测试

测试 TransferService 的核心业务逻辑，包括：
- 流转记录创建
- 流转确认（发送方和接收方）
- 双方确认后状态更新
- 异常处理
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import uuid

from app.services.transfer_service import TransferService
from app.models.transfer import Transfer, TransferStatus
from app.models.sample import Sample
from app.schemas.transfer import TransferCreate
from app.core.exceptions import NotFoundException, ValidationException


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    db = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture
def mock_transfer_repo():
    """模拟流转仓库"""
    return AsyncMock()


@pytest.fixture
def mock_sample_repo():
    """模拟样品仓库"""
    return AsyncMock()


@pytest.fixture
def transfer_service(mock_db, mock_transfer_repo, mock_sample_repo):
    """创建流转服务实例"""
    return TransferService(
        db=mock_db,
        transfer_repo=mock_transfer_repo,
        sample_repo=mock_sample_repo
    )


@pytest.fixture
def sample_mock():
    """模拟样品对象"""
    sample = MagicMock(spec=Sample)
    sample.id = str(uuid.uuid4())
    sample.barcode = "SP20260409000001"
    sample.storage_location = "实验室A"
    return sample


@pytest.fixture
def transfer_mock():
    """模拟流转记录对象"""
    transfer = MagicMock(spec=Transfer)
    transfer.id = str(uuid.uuid4())
    transfer.sample_id = str(uuid.uuid4())
    transfer.from_location = "实验室A"
    transfer.to_location = "实验室B"
    transfer.from_person = "张三"
    transfer.to_person = "李四"
    transfer.status = TransferStatus.PENDING
    transfer.sender_confirmed = False
    transfer.receiver_confirmed = False
    transfer.transfer_date = datetime.utcnow()
    transfer.received_date = None
    transfer.remarks = None
    transfer.created_at = datetime.utcnow()
    return transfer


class TestConfirmTransfer:
    """测试流转确认功能"""
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_sender_success(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db,
        transfer_mock
    ):
        """测试发送方确认成功"""
        # 准备测试数据
        transfer_id = transfer_mock.id
        confirmation_type = "sender"
        confirmed_by = "user123"
        
        # 配置 mock
        mock_transfer_repo.get_by_id.return_value = transfer_mock
        
        # 创建更新后的流转记录
        updated_transfer = MagicMock(spec=Transfer)
        updated_transfer.id = transfer_id
        updated_transfer.status = TransferStatus.IN_TRANSIT
        updated_transfer.sender_confirmed = True
        updated_transfer.receiver_confirmed = False
        updated_transfer.received_date = None
        
        mock_transfer_repo.update.return_value = updated_transfer
        
        # 执行测试
        result = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type=confirmation_type,
            confirmed_by=confirmed_by
        )
        
        # 验证结果
        assert result.sender_confirmed is True
        assert result.receiver_confirmed is False
        assert result.status == TransferStatus.IN_TRANSIT
        assert result.received_date is None
        
        # 验证调用
        mock_transfer_repo.get_by_id.assert_called_once_with(transfer_id)
        mock_transfer_repo.update.assert_called_once()
        
        # 验证更新数据
        update_call = mock_transfer_repo.update.call_args
        assert update_call.kwargs["id"] == transfer_id
        update_data = update_call.kwargs["obj_in"]
        assert update_data["sender_confirmed"] is True
        assert update_data["status"] == TransferStatus.IN_TRANSIT
        
        # 验证事务提交
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(updated_transfer)
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_receiver_success(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db,
        transfer_mock
    ):
        """测试接收方确认成功"""
        # 准备测试数据
        transfer_id = transfer_mock.id
        confirmation_type = "receiver"
        confirmed_by = "user456"
        
        # 配置 mock
        mock_transfer_repo.get_by_id.return_value = transfer_mock
        
        # 创建更新后的流转记录
        updated_transfer = MagicMock(spec=Transfer)
        updated_transfer.id = transfer_id
        updated_transfer.status = TransferStatus.IN_TRANSIT
        updated_transfer.sender_confirmed = False
        updated_transfer.receiver_confirmed = True
        updated_transfer.received_date = None
        
        mock_transfer_repo.update.return_value = updated_transfer
        
        # 执行测试
        result = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type=confirmation_type,
            confirmed_by=confirmed_by
        )
        
        # 验证结果
        assert result.sender_confirmed is False
        assert result.receiver_confirmed is True
        assert result.status == TransferStatus.IN_TRANSIT
        assert result.received_date is None
        
        # 验证调用
        mock_transfer_repo.get_by_id.assert_called_once_with(transfer_id)
        mock_transfer_repo.update.assert_called_once()
        
        # 验证更新数据
        update_call = mock_transfer_repo.update.call_args
        update_data = update_call.kwargs["obj_in"]
        assert update_data["receiver_confirmed"] is True
        assert update_data["status"] == TransferStatus.IN_TRANSIT
        
        # 验证事务提交
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_both_confirmed_success(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db,
        transfer_mock
    ):
        """测试双方确认后状态更新为 RECEIVED"""
        # 准备测试数据 - 发送方已确认
        transfer_id = transfer_mock.id
        transfer_mock.sender_confirmed = True
        transfer_mock.receiver_confirmed = False
        transfer_mock.status = TransferStatus.IN_TRANSIT
        
        confirmation_type = "receiver"
        confirmed_by = "user456"
        
        # 配置 mock
        mock_transfer_repo.get_by_id.return_value = transfer_mock
        
        # 创建更新后的流转记录 - 双方都确认
        updated_transfer = MagicMock(spec=Transfer)
        updated_transfer.id = transfer_id
        updated_transfer.status = TransferStatus.RECEIVED
        updated_transfer.sender_confirmed = True
        updated_transfer.receiver_confirmed = True
        updated_transfer.received_date = datetime.utcnow()
        
        mock_transfer_repo.update.return_value = updated_transfer
        
        # 执行测试
        result = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type=confirmation_type,
            confirmed_by=confirmed_by
        )
        
        # 验证结果
        assert result.sender_confirmed is True
        assert result.receiver_confirmed is True
        assert result.status == TransferStatus.RECEIVED
        assert result.received_date is not None
        
        # 验证更新数据
        update_call = mock_transfer_repo.update.call_args
        update_data = update_call.kwargs["obj_in"]
        assert update_data["receiver_confirmed"] is True
        assert update_data["status"] == TransferStatus.RECEIVED
        assert "received_date" in update_data
        assert isinstance(update_data["received_date"], datetime)
        
        # 验证事务提交
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_not_found(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db
    ):
        """测试流转记录不存在时抛出异常"""
        # 准备测试数据
        transfer_id = str(uuid.uuid4())
        confirmation_type = "sender"
        confirmed_by = "user123"
        
        # 配置 mock - 流转记录不存在
        mock_transfer_repo.get_by_id.return_value = None
        
        # 执行测试并验证异常
        with pytest.raises(NotFoundException) as exc_info:
            await transfer_service.confirm_transfer(
                transfer_id=transfer_id,
                confirmation_type=confirmation_type,
                confirmed_by=confirmed_by
            )
        
        assert f"流转记录不存在: {transfer_id}" in str(exc_info.value)
        
        # 验证事务回滚
        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_invalid_confirmation_type(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db,
        transfer_mock
    ):
        """测试无效的确认类型"""
        # 准备测试数据
        transfer_id = transfer_mock.id
        confirmation_type = "invalid_type"  # 无效的确认类型
        confirmed_by = "user123"
        
        # 配置 mock
        mock_transfer_repo.get_by_id.return_value = transfer_mock
        
        # 执行测试并验证异常
        with pytest.raises(ValidationException) as exc_info:
            await transfer_service.confirm_transfer(
                transfer_id=transfer_id,
                confirmation_type=confirmation_type,
                confirmed_by=confirmed_by
            )
        
        assert "无效的确认类型" in str(exc_info.value)
        assert "必须是 'sender' 或 'receiver'" in str(exc_info.value)
        
        # 验证事务回滚
        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
        
        # 验证没有调用更新
        mock_transfer_repo.update.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_database_error(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db,
        transfer_mock
    ):
        """测试数据库错误时事务回滚"""
        # 准备测试数据
        transfer_id = transfer_mock.id
        confirmation_type = "sender"
        confirmed_by = "user123"
        
        # 配置 mock
        mock_transfer_repo.get_by_id.return_value = transfer_mock
        mock_transfer_repo.update.side_effect = Exception("数据库连接失败")
        
        # 执行测试并验证异常
        with pytest.raises(ValidationException) as exc_info:
            await transfer_service.confirm_transfer(
                transfer_id=transfer_id,
                confirmation_type=confirmation_type,
                confirmed_by=confirmed_by
            )
        
        assert "流转确认失败" in str(exc_info.value)
        
        # 验证事务回滚
        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_sender_then_receiver(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db
    ):
        """测试先发送方确认，再接收方确认的完整流程"""
        transfer_id = str(uuid.uuid4())
        
        # 第一步：发送方确认
        transfer_pending = MagicMock(spec=Transfer)
        transfer_pending.id = transfer_id
        transfer_pending.status = TransferStatus.PENDING
        transfer_pending.sender_confirmed = False
        transfer_pending.receiver_confirmed = False
        
        transfer_sender_confirmed = MagicMock(spec=Transfer)
        transfer_sender_confirmed.id = transfer_id
        transfer_sender_confirmed.status = TransferStatus.IN_TRANSIT
        transfer_sender_confirmed.sender_confirmed = True
        transfer_sender_confirmed.receiver_confirmed = False
        transfer_sender_confirmed.received_date = None
        
        mock_transfer_repo.get_by_id.return_value = transfer_pending
        mock_transfer_repo.update.return_value = transfer_sender_confirmed
        
        result1 = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type="sender",
            confirmed_by="user123"
        )
        
        assert result1.sender_confirmed is True
        assert result1.receiver_confirmed is False
        assert result1.status == TransferStatus.IN_TRANSIT
        
        # 重置 mock
        mock_db.commit.reset_mock()
        mock_db.refresh.reset_mock()
        
        # 第二步：接收方确认
        transfer_both_confirmed = MagicMock(spec=Transfer)
        transfer_both_confirmed.id = transfer_id
        transfer_both_confirmed.status = TransferStatus.RECEIVED
        transfer_both_confirmed.sender_confirmed = True
        transfer_both_confirmed.receiver_confirmed = True
        transfer_both_confirmed.received_date = datetime.utcnow()
        
        mock_transfer_repo.get_by_id.return_value = transfer_sender_confirmed
        mock_transfer_repo.update.return_value = transfer_both_confirmed
        
        result2 = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type="receiver",
            confirmed_by="user456"
        )
        
        assert result2.sender_confirmed is True
        assert result2.receiver_confirmed is True
        assert result2.status == TransferStatus.RECEIVED
        assert result2.received_date is not None
    
    @pytest.mark.asyncio
    async def test_confirm_transfer_receiver_then_sender(
        self,
        transfer_service,
        mock_transfer_repo,
        mock_db
    ):
        """测试先接收方确认，再发送方确认的完整流程"""
        transfer_id = str(uuid.uuid4())
        
        # 第一步：接收方确认
        transfer_pending = MagicMock(spec=Transfer)
        transfer_pending.id = transfer_id
        transfer_pending.status = TransferStatus.PENDING
        transfer_pending.sender_confirmed = False
        transfer_pending.receiver_confirmed = False
        
        transfer_receiver_confirmed = MagicMock(spec=Transfer)
        transfer_receiver_confirmed.id = transfer_id
        transfer_receiver_confirmed.status = TransferStatus.IN_TRANSIT
        transfer_receiver_confirmed.sender_confirmed = False
        transfer_receiver_confirmed.receiver_confirmed = True
        transfer_receiver_confirmed.received_date = None
        
        mock_transfer_repo.get_by_id.return_value = transfer_pending
        mock_transfer_repo.update.return_value = transfer_receiver_confirmed
        
        result1 = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type="receiver",
            confirmed_by="user456"
        )
        
        assert result1.sender_confirmed is False
        assert result1.receiver_confirmed is True
        assert result1.status == TransferStatus.IN_TRANSIT
        
        # 重置 mock
        mock_db.commit.reset_mock()
        mock_db.refresh.reset_mock()
        
        # 第二步：发送方确认
        transfer_both_confirmed = MagicMock(spec=Transfer)
        transfer_both_confirmed.id = transfer_id
        transfer_both_confirmed.status = TransferStatus.RECEIVED
        transfer_both_confirmed.sender_confirmed = True
        transfer_both_confirmed.receiver_confirmed = True
        transfer_both_confirmed.received_date = datetime.utcnow()
        
        mock_transfer_repo.get_by_id.return_value = transfer_receiver_confirmed
        mock_transfer_repo.update.return_value = transfer_both_confirmed
        
        result2 = await transfer_service.confirm_transfer(
            transfer_id=transfer_id,
            confirmation_type="sender",
            confirmed_by="user123"
        )
        
        assert result2.sender_confirmed is True
        assert result2.receiver_confirmed is True
        assert result2.status == TransferStatus.RECEIVED
        assert result2.received_date is not None
