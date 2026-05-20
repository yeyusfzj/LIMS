"""
集成测试：监管链查询功能

测试从 API 端点到数据库的完整流程
"""

import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sample import Sample, SampleStatus
from app.models.transfer import Transfer, TransferStatus
from app.repositories.sample_repository import SampleRepository
from app.repositories.transfer_repository import TransferRepository
from app.services.transfer_service import TransferService
from app.core.exceptions import NotFoundException


@pytest.mark.asyncio
async def test_get_chain_of_custody_integration(db_session: AsyncSession):
    """
    集成测试：查询样品完整监管链
    
    测试场景：
    1. 创建一个样品
    2. 创建多条流转记录
    3. 查询监管链
    4. 验证返回的记录按时间排序
    """
    # 1. 创建样品
    sample = Sample(
        id="test_sample_chain_001",
        barcode="SP20260101000999",
        sample_number="2026000999",
        client_name="集成测试客户",
        sample_name="集成测试样品",
        sample_type="环境样品",
        sample_category="水质",
        quantity=100.0,
        unit="mL",
        received_date=datetime.utcnow(),
        status=SampleStatus.REGISTERED,
        storage_location="实验室A",
        created_by="test_user"
    )
    db_session.add(sample)
    await db_session.commit()
    
    # 2. 创建多条流转记录
    transfers_data = [
        {
            "id": "transfer_chain_001",
            "sample_id": sample.id,
            "from_location": "实验室A",
            "to_location": "实验室B",
            "from_person": "张三",
            "to_person": "李四",
            "status": TransferStatus.RECEIVED,
            "sender_confirmed": True,
            "receiver_confirmed": True,
            "remarks": "第一次流转"
        },
        {
            "id": "transfer_chain_002",
            "sample_id": sample.id,
            "from_location": "实验室B",
            "to_location": "实验室C",
            "from_person": "李四",
            "to_person": "王五",
            "status": TransferStatus.IN_TRANSIT,
            "sender_confirmed": True,
            "receiver_confirmed": False,
            "remarks": "第二次流转"
        },
        {
            "id": "transfer_chain_003",
            "sample_id": sample.id,
            "from_location": "实验室C",
            "to_location": "实验室D",
            "from_person": "王五",
            "to_person": "赵六",
            "status": TransferStatus.PENDING,
            "sender_confirmed": False,
            "receiver_confirmed": False,
            "remarks": "第三次流转"
        }
    ]
    
    for transfer_data in transfers_data:
        transfer = Transfer(**transfer_data)
        db_session.add(transfer)
    
    await db_session.commit()
    
    # 3. 创建服务实例并查询监管链
    sample_repo = SampleRepository(db_session)
    transfer_repo = TransferRepository(db_session)
    transfer_service = TransferService(db_session, transfer_repo, sample_repo)
    
    chain = await transfer_service.get_chain_of_custody(sample.id)
    
    # 4. 验证结果
    assert len(chain) == 3, "应该返回3条流转记录"
    
    # 验证记录按时间升序排列
    for i in range(len(chain) - 1):
        assert chain[i].transfer_date <= chain[i + 1].transfer_date, \
            "流转记录应该按时间升序排列"
    
    # 验证第一条记录
    assert chain[0].from_location == "实验室A"
    assert chain[0].to_location == "实验室B"
    assert chain[0].from_person == "张三"
    assert chain[0].to_person == "李四"
    assert chain[0].status == TransferStatus.RECEIVED
    assert chain[0].sender_confirmed is True
    assert chain[0].receiver_confirmed is True
    assert chain[0].remarks == "第一次流转"
    
    # 验证第二条记录
    assert chain[1].from_location == "实验室B"
    assert chain[1].to_location == "实验室C"
    assert chain[1].status == TransferStatus.IN_TRANSIT
    assert chain[1].sender_confirmed is True
    assert chain[1].receiver_confirmed is False
    
    # 验证第三条记录
    assert chain[2].from_location == "实验室C"
    assert chain[2].to_location == "实验室D"
    assert chain[2].status == TransferStatus.PENDING
    assert chain[2].sender_confirmed is False
    assert chain[2].receiver_confirmed is False
    
    # 清理测试数据
    await db_session.delete(sample)
    for transfer_data in transfers_data:
        transfer = await db_session.get(Transfer, transfer_data["id"])
        if transfer:
            await db_session.delete(transfer)
    await db_session.commit()


@pytest.mark.asyncio
async def test_get_chain_of_custody_sample_not_found(db_session: AsyncSession):
    """
    集成测试：查询不存在的样品的监管链
    
    应该抛出 NotFoundException
    """
    sample_repo = SampleRepository(db_session)
    transfer_repo = TransferRepository(db_session)
    transfer_service = TransferService(db_session, transfer_repo, sample_repo)
    
    with pytest.raises(NotFoundException) as exc_info:
        await transfer_service.get_chain_of_custody("nonexistent_sample_id")
    
    assert "样品不存在" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_chain_of_custody_empty_chain(db_session: AsyncSession):
    """
    集成测试：查询没有流转记录的样品的监管链
    
    应该返回空列表
    """
    # 创建样品但不创建流转记录
    sample = Sample(
        id="test_sample_empty_chain",
        barcode="SP20260101001000",
        sample_number="2026001000",
        client_name="测试客户",
        sample_name="无流转样品",
        sample_type="环境样品",
        sample_category="水质",
        quantity=100.0,
        unit="mL",
        received_date=datetime.utcnow(),
        status=SampleStatus.REGISTERED,
        storage_location="实验室A",
        created_by="test_user"
    )
    db_session.add(sample)
    await db_session.commit()
    
    # 查询监管链
    sample_repo = SampleRepository(db_session)
    transfer_repo = TransferRepository(db_session)
    transfer_service = TransferService(db_session, transfer_repo, sample_repo)
    
    chain = await transfer_service.get_chain_of_custody(sample.id)
    
    # 验证返回空列表
    assert chain == []
    assert isinstance(chain, list)
    
    # 清理测试数据
    await db_session.delete(sample)
    await db_session.commit()
