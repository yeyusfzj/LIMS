"""
单元测试：流转服务 - 监管链查询功能

测试 TransferService.get_chain_of_custody() 方法的各种场景：
- 样品不存在的情况
- 空监管链的情况（样品从未流转）
- 单条流转记录
- 多条流转记录的排序
- 验证返回的流转记录包含完整信息
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta

from app.services.transfer_service import TransferService
from app.models.transfer import Transfer, TransferStatus
from app.models.sample import Sample, SampleStatus
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
def sample_data():
    """样品测试数据"""
    sample = MagicMock(spec=Sample)
    sample.id = "sample_123"
    sample.barcode = "SP20260101000001"
    sample.sample_number = "2026000001"
    sample.sample_name = "测试样品"
    sample.client_name = "测试客户"
    sample.status = SampleStatus.REGISTERED
    sample.storage_location = "实验室A"
    return sample


@pytest.fixture
def transfer_data_list():
    """流转记录测试数据（多条记录）"""
    base_time = datetime(2026, 1, 1, 10, 0, 0)
    
    transfers = []
    for i in range(3):
        transfer = MagicMock(spec=Transfer)
        transfer.id = f"transfer_{i+1}"
        transfer.sample_id = "sample_123"
        transfer.from_location = f"位置{i}"
        transfer.to_location = f"位置{i+1}"
        transfer.from_person = f"张{i}"
        transfer.to_person = f"李{i}"
        transfer.transfer_date = base_time + timedelta(hours=i)
        transfer.received_date = base_time + timedelta(hours=i, minutes=30)
        transfer.status = TransferStatus.RECEIVED
        transfer.sender_confirmed = True
        transfer.receiver_confirmed = True
        transfer.remarks = f"流转备注{i+1}"
        transfers.append(transfer)
    
    return transfers


class TestGetChainOfCustody:
    """测试 get_chain_of_custody() 方法"""
    
    @pytest.mark.asyncio
    async def test_sample_not_found(
        self,
        transfer_service,
        mock_sample_repo
    ):
        """测试样品不存在的情况"""
        # 准备：样品不存在
        mock_sample_repo.get_by_id.return_value = None
        
        # 执行并验证：应该抛出 NotFoundException
        with pytest.raises(NotFoundException) as exc_info:
            await transfer_service.get_chain_of_custody("nonexistent_id")
        
        assert "样品不存在" in str(exc_info.value)
        
        # 验证：调用了 sample_repo.get_by_id
        mock_sample_repo.get_by_id.assert_called_once_with("nonexistent_id")
    
    @pytest.mark.asyncio
    async def test_empty_chain_of_custody(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data
    ):
        """测试空监管链的情况（样品从未流转）"""
        # 准备：样品存在，但没有流转记录
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = []
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：返回空列表
        assert result == []
        assert isinstance(result, list)
        
        # 验证：调用了正确的方法
        mock_sample_repo.get_by_id.assert_called_once_with("sample_123")
        mock_transfer_repo.get_chain_of_custody.assert_called_once_with("sample_123")
    
    @pytest.mark.asyncio
    async def test_single_transfer_record(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data
    ):
        """测试单条流转记录"""
        # 准备：样品存在，有一条流转记录
        transfer = MagicMock(spec=Transfer)
        transfer.id = "transfer_1"
        transfer.sample_id = "sample_123"
        transfer.from_location = "实验室A"
        transfer.to_location = "实验室B"
        transfer.from_person = "张三"
        transfer.to_person = "李四"
        transfer.transfer_date = datetime(2026, 1, 1, 10, 0, 0)
        transfer.status = TransferStatus.PENDING
        transfer.sender_confirmed = True
        transfer.receiver_confirmed = False
        
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = [transfer]
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：返回包含一条记录的列表
        assert len(result) == 1
        assert result[0].id == "transfer_1"
        assert result[0].from_location == "实验室A"
        assert result[0].to_location == "实验室B"
        assert result[0].from_person == "张三"
        assert result[0].to_person == "李四"
        assert result[0].status == TransferStatus.PENDING
        assert result[0].sender_confirmed is True
        assert result[0].receiver_confirmed is False
    
    @pytest.mark.asyncio
    async def test_multiple_transfer_records_ordered(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data,
        transfer_data_list
    ):
        """测试多条流转记录的排序（按时间升序）"""
        # 准备：样品存在，有多条流转记录
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = transfer_data_list
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：返回包含3条记录的列表
        assert len(result) == 3
        
        # 验证：记录按时间升序排列
        for i in range(len(result)):
            assert result[i].id == f"transfer_{i+1}"
            assert result[i].from_location == f"位置{i}"
            assert result[i].to_location == f"位置{i+1}"
            
            # 验证时间顺序
            if i > 0:
                assert result[i].transfer_date > result[i-1].transfer_date
    
    @pytest.mark.asyncio
    async def test_chain_includes_all_transfer_details(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data,
        transfer_data_list
    ):
        """测试监管链包含完整的流转信息"""
        # 准备
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = transfer_data_list
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：每条记录包含完整信息
        for i, transfer in enumerate(result):
            # 验证位置信息
            assert transfer.from_location == f"位置{i}"
            assert transfer.to_location == f"位置{i+1}"
            
            # 验证人员信息
            assert transfer.from_person == f"张{i}"
            assert transfer.to_person == f"李{i}"
            
            # 验证时间戳
            assert transfer.transfer_date is not None
            assert transfer.received_date is not None
            
            # 验证确认状态
            assert transfer.sender_confirmed is True
            assert transfer.receiver_confirmed is True
            
            # 验证状态
            assert transfer.status == TransferStatus.RECEIVED
            
            # 验证备注
            assert transfer.remarks == f"流转备注{i+1}"
    
    @pytest.mark.asyncio
    async def test_chain_with_different_statuses(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data
    ):
        """测试监管链包含不同状态的流转记录"""
        # 准备：创建不同状态的流转记录
        transfers = []
        statuses = [
            TransferStatus.RECEIVED,
            TransferStatus.IN_TRANSIT,
            TransferStatus.PENDING
        ]
        
        for i, status in enumerate(statuses):
            transfer = MagicMock(spec=Transfer)
            transfer.id = f"transfer_{i+1}"
            transfer.sample_id = "sample_123"
            transfer.status = status
            transfer.transfer_date = datetime(2026, 1, 1, 10, 0, 0) + timedelta(hours=i)
            transfers.append(transfer)
        
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = transfers
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：返回所有状态的流转记录
        assert len(result) == 3
        assert result[0].status == TransferStatus.RECEIVED
        assert result[1].status == TransferStatus.IN_TRANSIT
        assert result[2].status == TransferStatus.PENDING
    
    @pytest.mark.asyncio
    async def test_database_error_handling(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data
    ):
        """测试数据库错误处理"""
        # 准备：样品存在，但查询流转记录时发生错误
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.side_effect = Exception("数据库连接失败")
        
        # 执行并验证：应该抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await transfer_service.get_chain_of_custody("sample_123")
        
        assert "监管链查询失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_chain_with_partial_confirmations(
        self,
        transfer_service,
        mock_sample_repo,
        mock_transfer_repo,
        sample_data
    ):
        """测试监管链包含部分确认的流转记录"""
        # 准备：创建不同确认状态的流转记录
        transfers = []
        confirmation_states = [
            (True, True),   # 双方都确认
            (True, False),  # 只有发送方确认
            (False, True),  # 只有接收方确认
            (False, False)  # 双方都未确认
        ]
        
        for i, (sender_confirmed, receiver_confirmed) in enumerate(confirmation_states):
            transfer = MagicMock(spec=Transfer)
            transfer.id = f"transfer_{i+1}"
            transfer.sample_id = "sample_123"
            transfer.sender_confirmed = sender_confirmed
            transfer.receiver_confirmed = receiver_confirmed
            transfer.transfer_date = datetime(2026, 1, 1, 10, 0, 0) + timedelta(hours=i)
            transfers.append(transfer)
        
        mock_sample_repo.get_by_id.return_value = sample_data
        mock_transfer_repo.get_chain_of_custody.return_value = transfers
        
        # 执行
        result = await transfer_service.get_chain_of_custody("sample_123")
        
        # 验证：返回所有确认状态的流转记录
        assert len(result) == 4
        assert result[0].sender_confirmed is True and result[0].receiver_confirmed is True
        assert result[1].sender_confirmed is True and result[1].receiver_confirmed is False
        assert result[2].sender_confirmed is False and result[2].receiver_confirmed is True
        assert result[3].sender_confirmed is False and result[3].receiver_confirmed is False
