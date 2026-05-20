"""
流转仓库单元测试

测试 TransferRepository 类的所有方法，包括：
- get_by_sample_id() - 根据样品 ID 查询流转记录
- get_chain_of_custody() - 查询完整监管链
- get_by_status() - 根据状态查询
- get_pending_transfers() - 获取待处理流转记录
- get_unconfirmed_by_sender() - 获取发送方未确认的流转记录
- get_unconfirmed_by_receiver() - 获取接收方未确认的流转记录
- get_fully_confirmed() - 获取双方都已确认的流转记录
- get_by_location() - 根据位置查询
- get_by_person() - 根据人员查询
- count_by_sample_id() - 统计样品流转记录数量
- count_by_status() - 统计状态数量
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transfer_repository import TransferRepository
from app.models.transfer import Transfer, TransferStatus


@pytest.fixture
async def transfer_repo(test_db: AsyncSession) -> TransferRepository:
    """创建流转仓库实例"""
    return TransferRepository(test_db)


@pytest.fixture
def transfer_data() -> dict:
    """流转记录测试数据"""
    return {
        "sample_id": "sample_123",
        "from_location": "实验室A",
        "to_location": "实验室B",
        "from_person": "张三",
        "to_person": "李四",
        "transfer_date": datetime(2026, 4, 9, 10, 0, 0),
        "status": TransferStatus.PENDING,
        "remarks": "常规流转",
        "sender_confirmed": False,
        "receiver_confirmed": False
    }


@pytest.mark.asyncio
class TestTransferRepository:
    """流转仓库测试类"""
    
    async def test_get_by_sample_id(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据样品 ID 查询流转记录"""
        # 创建多个流转记录
        transfer1_data = {**transfer_data}
        transfer2_data = {
            **transfer_data,
            "from_location": "实验室B",
            "to_location": "实验室C",
            "transfer_date": datetime(2026, 4, 9, 11, 0, 0)
        }
        transfer3_data = {
            **transfer_data,
            "sample_id": "sample_456",  # 不同的样品
            "from_location": "实验室C",
            "to_location": "实验室D"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        transfer3 = await transfer_repo.create(transfer3_data)
        await test_db.commit()
        
        # 查询 sample_123 的流转记录
        transfers = await transfer_repo.get_by_sample_id("sample_123")
        
        # 验证
        assert len(transfers) == 2
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids
        assert transfer2.id in transfer_ids
        assert transfer3.id not in transfer_ids
        
        # 验证按时间倒序排列
        assert transfers[0].transfer_date >= transfers[1].transfer_date
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await transfer_repo.delete(transfer3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_sample_id_empty(
        self,
        transfer_repo: TransferRepository
    ):
        """测试根据样品 ID 查询流转记录 - 无记录"""
        # 查询不存在的样品
        transfers = await transfer_repo.get_by_sample_id("nonexistent_sample")
        
        # 验证
        assert len(transfers) == 0
    
    async def test_get_chain_of_custody(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试查询完整监管链（按时间顺序）"""
        # 创建多个流转记录（不同时间）
        base_time = datetime(2026, 4, 9, 10, 0, 0)
        
        transfer1_data = {
            **transfer_data,
            "from_location": "实验室A",
            "to_location": "实验室B",
            "transfer_date": base_time
        }
        transfer2_data = {
            **transfer_data,
            "from_location": "实验室B",
            "to_location": "实验室C",
            "transfer_date": base_time + timedelta(hours=1)
        }
        transfer3_data = {
            **transfer_data,
            "from_location": "实验室C",
            "to_location": "实验室D",
            "transfer_date": base_time + timedelta(hours=2)
        }
        
        # 乱序创建
        transfer2 = await transfer_repo.create(transfer2_data)
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer3 = await transfer_repo.create(transfer3_data)
        await test_db.commit()
        
        # 查询监管链
        chain = await transfer_repo.get_chain_of_custody("sample_123")
        
        # 验证
        assert len(chain) == 3
        
        # 验证按时间升序排列
        assert chain[0].id == transfer1.id
        assert chain[1].id == transfer2.id
        assert chain[2].id == transfer3.id
        
        # 验证流转路径
        assert chain[0].from_location == "实验室A"
        assert chain[0].to_location == "实验室B"
        assert chain[1].from_location == "实验室B"
        assert chain[1].to_location == "实验室C"
        assert chain[2].from_location == "实验室C"
        assert chain[2].to_location == "实验室D"
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await transfer_repo.delete(transfer3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_status(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据状态查询流转记录"""
        # 创建不同状态的流转记录
        pending_data = {
            **transfer_data,
            "sample_id": "sample_100",
            "status": TransferStatus.PENDING
        }
        in_transit_data = {
            **transfer_data,
            "sample_id": "sample_101",
            "status": TransferStatus.IN_TRANSIT
        }
        received_data = {
            **transfer_data,
            "sample_id": "sample_102",
            "status": TransferStatus.RECEIVED
        }
        
        pending = await transfer_repo.create(pending_data)
        in_transit = await transfer_repo.create(in_transit_data)
        received = await transfer_repo.create(received_data)
        await test_db.commit()
        
        # 查询 PENDING 状态
        pending_transfers = await transfer_repo.get_by_status(TransferStatus.PENDING)
        pending_ids = [t.id for t in pending_transfers]
        assert pending.id in pending_ids
        assert in_transit.id not in pending_ids
        
        # 查询 IN_TRANSIT 状态
        in_transit_transfers = await transfer_repo.get_by_status(TransferStatus.IN_TRANSIT)
        in_transit_ids = [t.id for t in in_transit_transfers]
        assert in_transit.id in in_transit_ids
        assert pending.id not in in_transit_ids
        
        # 查询 RECEIVED 状态
        received_transfers = await transfer_repo.get_by_status(TransferStatus.RECEIVED)
        received_ids = [t.id for t in received_transfers]
        assert received.id in received_ids
        
        # 清理
        await transfer_repo.delete(pending.id, soft_delete=False)
        await transfer_repo.delete(in_transit.id, soft_delete=False)
        await transfer_repo.delete(received.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_pending_transfers(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试获取待处理的流转记录"""
        # 创建待处理和已处理的流转记录
        pending_data = {
            **transfer_data,
            "sample_id": "sample_200",
            "status": TransferStatus.PENDING
        }
        received_data = {
            **transfer_data,
            "sample_id": "sample_201",
            "status": TransferStatus.RECEIVED
        }
        
        pending = await transfer_repo.create(pending_data)
        received = await transfer_repo.create(received_data)
        await test_db.commit()
        
        # 查询待处理流转记录
        pending_transfers = await transfer_repo.get_pending_transfers()
        
        # 验证
        pending_ids = [t.id for t in pending_transfers]
        assert pending.id in pending_ids
        assert received.id not in pending_ids
        
        # 清理
        await transfer_repo.delete(pending.id, soft_delete=False)
        await transfer_repo.delete(received.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_unconfirmed_by_sender(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试获取发送方未确认的流转记录"""
        # 创建不同确认状态的流转记录
        unconfirmed_data = {
            **transfer_data,
            "sample_id": "sample_300",
            "sender_confirmed": False,
            "receiver_confirmed": False
        }
        confirmed_data = {
            **transfer_data,
            "sample_id": "sample_301",
            "sender_confirmed": True,
            "receiver_confirmed": False
        }
        
        unconfirmed = await transfer_repo.create(unconfirmed_data)
        confirmed = await transfer_repo.create(confirmed_data)
        await test_db.commit()
        
        # 查询发送方未确认的流转记录
        unconfirmed_transfers = await transfer_repo.get_unconfirmed_by_sender()
        
        # 验证
        unconfirmed_ids = [t.id for t in unconfirmed_transfers]
        assert unconfirmed.id in unconfirmed_ids
        assert confirmed.id not in unconfirmed_ids
        
        # 清理
        await transfer_repo.delete(unconfirmed.id, soft_delete=False)
        await transfer_repo.delete(confirmed.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_unconfirmed_by_receiver(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试获取接收方未确认的流转记录"""
        # 创建不同确认状态的流转记录
        unconfirmed_data = {
            **transfer_data,
            "sample_id": "sample_400",
            "sender_confirmed": True,
            "receiver_confirmed": False
        }
        confirmed_data = {
            **transfer_data,
            "sample_id": "sample_401",
            "sender_confirmed": True,
            "receiver_confirmed": True
        }
        
        unconfirmed = await transfer_repo.create(unconfirmed_data)
        confirmed = await transfer_repo.create(confirmed_data)
        await test_db.commit()
        
        # 查询接收方未确认的流转记录
        unconfirmed_transfers = await transfer_repo.get_unconfirmed_by_receiver()
        
        # 验证
        unconfirmed_ids = [t.id for t in unconfirmed_transfers]
        assert unconfirmed.id in unconfirmed_ids
        assert confirmed.id not in unconfirmed_ids
        
        # 清理
        await transfer_repo.delete(unconfirmed.id, soft_delete=False)
        await transfer_repo.delete(confirmed.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_fully_confirmed(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试获取双方都已确认的流转记录"""
        # 创建不同确认状态的流转记录
        partial_confirmed_data = {
            **transfer_data,
            "sample_id": "sample_500",
            "sender_confirmed": True,
            "receiver_confirmed": False
        }
        fully_confirmed_data = {
            **transfer_data,
            "sample_id": "sample_501",
            "sender_confirmed": True,
            "receiver_confirmed": True
        }
        unconfirmed_data = {
            **transfer_data,
            "sample_id": "sample_502",
            "sender_confirmed": False,
            "receiver_confirmed": False
        }
        
        partial = await transfer_repo.create(partial_confirmed_data)
        fully = await transfer_repo.create(fully_confirmed_data)
        unconfirmed = await transfer_repo.create(unconfirmed_data)
        await test_db.commit()
        
        # 查询双方都已确认的流转记录
        confirmed_transfers = await transfer_repo.get_fully_confirmed()
        
        # 验证
        confirmed_ids = [t.id for t in confirmed_transfers]
        assert fully.id in confirmed_ids
        assert partial.id not in confirmed_ids
        assert unconfirmed.id not in confirmed_ids
        
        # 清理
        await transfer_repo.delete(partial.id, soft_delete=False)
        await transfer_repo.delete(fully.id, soft_delete=False)
        await transfer_repo.delete(unconfirmed.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_location_from(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据起始位置查询流转记录"""
        # 创建不同位置的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_600",
            "from_location": "实验室A",
            "to_location": "实验室B"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_601",
            "from_location": "实验室B",
            "to_location": "实验室A"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        await test_db.commit()
        
        # 查询从实验室A发出的流转记录
        transfers = await transfer_repo.get_by_location("实验室A", location_type="from")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids
        assert transfer2.id not in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_location_to(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据目标位置查询流转记录"""
        # 创建不同位置的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_700",
            "from_location": "实验室A",
            "to_location": "实验室B"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_701",
            "from_location": "实验室C",
            "to_location": "实验室B"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        await test_db.commit()
        
        # 查询到实验室B的流转记录
        transfers = await transfer_repo.get_by_location("实验室B", location_type="to")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids
        assert transfer2.id in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_location_both(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据任意位置查询流转记录"""
        # 创建不同位置的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_800",
            "from_location": "实验室A",
            "to_location": "实验室B"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_801",
            "from_location": "实验室B",
            "to_location": "实验室C"
        }
        transfer3_data = {
            **transfer_data,
            "sample_id": "sample_802",
            "from_location": "实验室C",
            "to_location": "实验室D"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        transfer3 = await transfer_repo.create(transfer3_data)
        await test_db.commit()
        
        # 查询涉及实验室B的所有流转记录
        transfers = await transfer_repo.get_by_location("实验室B", location_type="both")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids  # to_location = 实验室B
        assert transfer2.id in transfer_ids  # from_location = 实验室B
        assert transfer3.id not in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await transfer_repo.delete(transfer3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_person_from(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据发送人查询流转记录"""
        # 创建不同人员的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_900",
            "from_person": "张三",
            "to_person": "李四"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_901",
            "from_person": "李四",
            "to_person": "王五"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        await test_db.commit()
        
        # 查询张三作为发送人的流转记录
        transfers = await transfer_repo.get_by_person("张三", person_type="from")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids
        assert transfer2.id not in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_person_to(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据接收人查询流转记录"""
        # 创建不同人员的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_1000",
            "from_person": "张三",
            "to_person": "李四"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_1001",
            "from_person": "王五",
            "to_person": "李四"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        await test_db.commit()
        
        # 查询李四作为接收人的流转记录
        transfers = await transfer_repo.get_by_person("李四", person_type="to")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids
        assert transfer2.id in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_person_both(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据任意角色查询流转记录"""
        # 创建不同人员的流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_1100",
            "from_person": "张三",
            "to_person": "李四"
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_1101",
            "from_person": "李四",
            "to_person": "王五"
        }
        transfer3_data = {
            **transfer_data,
            "sample_id": "sample_1102",
            "from_person": "王五",
            "to_person": "赵六"
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        transfer3 = await transfer_repo.create(transfer3_data)
        await test_db.commit()
        
        # 查询李四参与的所有流转记录
        transfers = await transfer_repo.get_by_person("李四", person_type="both")
        
        # 验证
        transfer_ids = [t.id for t in transfers]
        assert transfer1.id in transfer_ids  # to_person = 李四
        assert transfer2.id in transfer_ids  # from_person = 李四
        assert transfer3.id not in transfer_ids
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await transfer_repo.delete(transfer3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_count_by_sample_id(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试统计指定样品的流转记录数量"""
        # 创建流转记录
        transfer1_data = {**transfer_data, "sample_id": "sample_1200"}
        transfer2_data = {**transfer_data, "sample_id": "sample_1200"}
        transfer3_data = {**transfer_data, "sample_id": "sample_1201"}
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        transfer3 = await transfer_repo.create(transfer3_data)
        await test_db.commit()
        
        # 统计数量
        count = await transfer_repo.count_by_sample_id("sample_1200")
        
        # 验证
        assert count == 2
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await transfer_repo.delete(transfer3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_count_by_status(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试统计指定状态的流转记录数量"""
        # 获取初始数量
        initial_count = await transfer_repo.count_by_status(TransferStatus.PENDING)
        
        # 创建流转记录
        transfer1_data = {
            **transfer_data,
            "sample_id": "sample_1300",
            "status": TransferStatus.PENDING
        }
        transfer2_data = {
            **transfer_data,
            "sample_id": "sample_1301",
            "status": TransferStatus.PENDING
        }
        
        transfer1 = await transfer_repo.create(transfer1_data)
        transfer2 = await transfer_repo.create(transfer2_data)
        await test_db.commit()
        
        # 统计数量
        new_count = await transfer_repo.count_by_status(TransferStatus.PENDING)
        
        # 验证
        assert new_count == initial_count + 2
        
        # 清理
        await transfer_repo.delete(transfer1.id, soft_delete=False)
        await transfer_repo.delete(transfer2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_sample_id_with_pagination(
        self,
        transfer_repo: TransferRepository,
        transfer_data: dict,
        test_db: AsyncSession
    ):
        """测试根据样品 ID 查询流转记录（分页）"""
        # 创建多个流转记录
        transfers = []
        for i in range(5):
            data = {
                **transfer_data,
                "sample_id": "sample_1400",
                "transfer_date": datetime(2026, 4, 9, 10 + i, 0, 0)
            }
            transfer = await transfer_repo.create(data)
            transfers.append(transfer)
        await test_db.commit()
        
        # 分页查询
        page1 = await transfer_repo.get_by_sample_id(
            "sample_1400",
            skip=0,
            limit=2
        )
        page2 = await transfer_repo.get_by_sample_id(
            "sample_1400",
            skip=2,
            limit=2
        )
        
        # 验证
        assert len(page1) == 2
        assert len(page2) == 2
        
        # 验证不重复
        page1_ids = {t.id for t in page1}
        page2_ids = {t.id for t in page2}
        assert len(page1_ids & page2_ids) == 0
        
        # 清理
        for transfer in transfers:
            await transfer_repo.delete(transfer.id, soft_delete=False)
        await test_db.commit()
