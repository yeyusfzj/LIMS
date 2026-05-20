"""
基础仓库类测试

测试 BaseRepository 的所有功能：
- CRUD 操作
- 分页查询
- 条件过滤
- 批量操作
- 乐观锁
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc

from app.repositories.base_repository import BaseRepository
from app.models.sample import Sample, SampleStatus, Priority
from app.core.exceptions import NotFoundException, ConflictException
from datetime import datetime


class TestBaseRepository:
    """基础仓库类测试套件"""
    
    @pytest.fixture
    async def sample_repo(self, test_db: AsyncSession):
        """创建样品仓库实例"""
        return BaseRepository(Sample, test_db)
    
    @pytest.fixture
    async def sample_data(self):
        """测试样品数据"""
        return {
            "barcode": f"SP20260101{str(datetime.now().microsecond).zfill(6)}",
            "sample_number": f"2026{str(datetime.now().microsecond).zfill(6)}",
            "client_name": "测试客户",
            "sample_name": "测试样品",
            "sample_type": "水质",
            "sample_category": "环境",
            "quantity": 100.0,
            "unit": "ml",
            "received_date": datetime.now(),
            "status": SampleStatus.REGISTERED,
            "priority": Priority.NORMAL,
            "created_by": "test_user"
        }
    
    async def test_create(self, sample_repo: BaseRepository, sample_data: dict):
        """测试创建记录"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 验证
        assert sample.id is not None
        assert sample.barcode == sample_data["barcode"]
        assert sample.client_name == sample_data["client_name"]
        assert sample.status == SampleStatus.REGISTERED
        assert sample.version == 1
    
    async def test_get_by_id(self, sample_repo: BaseRepository, sample_data: dict):
        """测试根据 ID 获取记录"""
        # 创建样品
        created_sample = await sample_repo.create(sample_data)
        
        # 获取样品
        sample = await sample_repo.get_by_id(created_sample.id)
        
        # 验证
        assert sample is not None
        assert sample.id == created_sample.id
        assert sample.barcode == sample_data["barcode"]
    
    async def test_get_by_id_not_found(self, sample_repo: BaseRepository):
        """测试获取不存在的记录"""
        sample = await sample_repo.get_by_id("non-existent-id")
        assert sample is None
    
    async def test_get_by_id_or_404(self, sample_repo: BaseRepository, sample_data: dict):
        """测试 get_by_id_or_404 方法"""
        # 创建样品
        created_sample = await sample_repo.create(sample_data)
        
        # 获取存在的样品
        sample = await sample_repo.get_by_id_or_404(created_sample.id)
        assert sample.id == created_sample.id
        
        # 获取不存在的样品（应抛出异常）
        with pytest.raises(NotFoundException):
            await sample_repo.get_by_id_or_404("non-existent-id")
    
    async def test_get_all(self, sample_repo: BaseRepository, sample_data: dict):
        """测试获取所有记录"""
        # 创建多个样品
        for i in range(5):
            data = sample_data.copy()
            data["barcode"] = f"SP20260101{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i).zfill(6)}"
            await sample_repo.create(data)
        
        # 获取所有样品
        samples = await sample_repo.get_all(skip=0, limit=10)
        
        # 验证
        assert len(samples) >= 5
    
    async def test_get_all_with_pagination(self, sample_repo: BaseRepository, sample_data: dict):
        """测试分页查询"""
        # 创建多个样品
        for i in range(15):
            data = sample_data.copy()
            data["barcode"] = f"SP20260102{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+100).zfill(6)}"
            await sample_repo.create(data)
        
        # 第一页
        page1 = await sample_repo.get_all(skip=0, limit=10)
        assert len(page1) == 10
        
        # 第二页
        page2 = await sample_repo.get_all(skip=10, limit=10)
        assert len(page2) >= 5
    
    async def test_get_all_with_filters(self, sample_repo: BaseRepository, sample_data: dict):
        """测试条件过滤"""
        # 创建不同状态的样品
        data1 = sample_data.copy()
        data1["barcode"] = "SP20260103000001"
        data1["sample_number"] = "2026000201"
        data1["status"] = SampleStatus.REGISTERED
        await sample_repo.create(data1)
        
        data2 = sample_data.copy()
        data2["barcode"] = "SP20260103000002"
        data2["sample_number"] = "2026000202"
        data2["status"] = SampleStatus.IN_TESTING
        await sample_repo.create(data2)
        
        # 过滤 REGISTERED 状态
        samples = await sample_repo.get_all(
            filters={"status": SampleStatus.REGISTERED}
        )
        assert all(s.status == SampleStatus.REGISTERED for s in samples)
    
    async def test_get_all_with_multiple_filters(self, sample_repo: BaseRepository, sample_data: dict):
        """测试多条件过滤"""
        # 创建样品
        data = sample_data.copy()
        data["barcode"] = "SP20260104000001"
        data["sample_number"] = "2026000301"
        data["client_name"] = "特定客户"
        data["status"] = SampleStatus.REGISTERED
        await sample_repo.create(data)
        
        # 多条件过滤
        samples = await sample_repo.get_all(
            filters={
                "client_name": "特定客户",
                "status": SampleStatus.REGISTERED
            }
        )
        assert len(samples) >= 1
        assert all(s.client_name == "特定客户" for s in samples)
        assert all(s.status == SampleStatus.REGISTERED for s in samples)
    
    async def test_get_all_with_range_filters(self, sample_repo: BaseRepository, sample_data: dict):
        """测试范围过滤"""
        # 创建不同数量的样品
        for i, qty in enumerate([50.0, 100.0, 150.0]):
            data = sample_data.copy()
            data["barcode"] = f"SP20260105{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+400).zfill(6)}"
            data["quantity"] = qty
            await sample_repo.create(data)
        
        # 范围查询：quantity >= 100
        samples = await sample_repo.get_all(
            filters={"quantity__gte": 100.0}
        )
        assert all(s.quantity >= 100.0 for s in samples)
    
    async def test_get_all_with_like_filter(self, sample_repo: BaseRepository, sample_data: dict):
        """测试模糊查询"""
        # 创建样品
        data = sample_data.copy()
        data["barcode"] = "SP20260106000001"
        data["sample_number"] = "2026000501"
        data["client_name"] = "ABC公司"
        await sample_repo.create(data)
        
        # 模糊查询
        samples = await sample_repo.get_all(
            filters={"client_name__like": "%ABC%"}
        )
        assert len(samples) >= 1
        assert any("ABC" in s.client_name for s in samples)
    
    async def test_get_paginated(self, sample_repo: BaseRepository, sample_data: dict):
        """测试分页查询（带元数据）"""
        # 创建样品
        for i in range(25):
            data = sample_data.copy()
            data["barcode"] = f"SP20260107{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+600).zfill(6)}"
            await sample_repo.create(data)
        
        # 获取第一页
        items, meta = await sample_repo.get_paginated(page=1, page_size=10)
        
        # 验证
        assert len(items) == 10
        assert meta.page == 1
        assert meta.page_size == 10
        assert meta.total >= 25
        assert meta.total_pages >= 3
    
    async def test_update(self, sample_repo: BaseRepository, sample_data: dict):
        """测试更新记录"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        original_version = sample.version
        
        # 更新样品
        updated_sample = await sample_repo.update(
            sample.id,
            {"client_name": "更新后的客户"}
        )
        
        # 验证
        assert updated_sample.client_name == "更新后的客户"
        assert updated_sample.version == original_version + 1
    
    async def test_update_with_optimistic_lock(self, sample_repo: BaseRepository, sample_data: dict):
        """测试乐观锁更新"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 正确的版本号更新
        updated_sample = await sample_repo.update(
            sample.id,
            {"client_name": "更新后的客户"},
            check_version=True,
            current_version=sample.version
        )
        assert updated_sample.client_name == "更新后的客户"
        
        # 错误的版本号更新（应抛出异常）
        with pytest.raises(ConflictException):
            await sample_repo.update(
                sample.id,
                {"client_name": "再次更新"},
                check_version=True,
                current_version=1  # 旧版本号
            )
    
    async def test_update_not_found(self, sample_repo: BaseRepository):
        """测试更新不存在的记录"""
        with pytest.raises(NotFoundException):
            await sample_repo.update(
                "non-existent-id",
                {"client_name": "更新"}
            )
    
    async def test_soft_delete(self, sample_repo: BaseRepository, sample_data: dict):
        """测试软删除"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 软删除
        success = await sample_repo.delete(sample.id, soft_delete=True)
        assert success is True
        
        # 验证状态已更新为 ARCHIVED
        deleted_sample = await sample_repo.get_by_id(sample.id)
        assert deleted_sample is not None
        assert deleted_sample.status == SampleStatus.ARCHIVED
    
    async def test_hard_delete(self, sample_repo: BaseRepository, sample_data: dict):
        """测试硬删除"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 硬删除
        success = await sample_repo.delete(sample.id, soft_delete=False)
        assert success is True
        
        # 验证记录已被物理删除
        deleted_sample = await sample_repo.get_by_id(sample.id)
        assert deleted_sample is None
    
    async def test_delete_not_found(self, sample_repo: BaseRepository):
        """测试删除不存在的记录"""
        with pytest.raises(NotFoundException):
            await sample_repo.delete("non-existent-id")
    
    async def test_delete_many(self, sample_repo: BaseRepository, sample_data: dict):
        """测试批量删除"""
        # 创建多个样品
        ids = []
        for i in range(5):
            data = sample_data.copy()
            data["barcode"] = f"SP20260108{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+700).zfill(6)}"
            sample = await sample_repo.create(data)
            ids.append(sample.id)
        
        # 批量删除
        result = await sample_repo.delete_many(ids, soft_delete=True)
        
        # 验证
        assert result["success"] == 5
        assert result["failed"] == 0
    
    async def test_count(self, sample_repo: BaseRepository, sample_data: dict):
        """测试统计记录数"""
        # 创建样品
        initial_count = await sample_repo.count()
        
        for i in range(3):
            data = sample_data.copy()
            data["barcode"] = f"SP20260109{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+800).zfill(6)}"
            await sample_repo.create(data)
        
        # 统计
        new_count = await sample_repo.count()
        assert new_count == initial_count + 3
    
    async def test_count_with_filters(self, sample_repo: BaseRepository, sample_data: dict):
        """测试带过滤条件的统计"""
        # 创建不同状态的样品
        for i in range(3):
            data = sample_data.copy()
            data["barcode"] = f"SP20260110{str(i).zfill(6)}"
            data["sample_number"] = f"2026{str(i+900).zfill(6)}"
            data["status"] = SampleStatus.REGISTERED if i < 2 else SampleStatus.IN_TESTING
            await sample_repo.create(data)
        
        # 统计 REGISTERED 状态
        count = await sample_repo.count(filters={"status": SampleStatus.REGISTERED})
        assert count >= 2
    
    async def test_exists(self, sample_repo: BaseRepository, sample_data: dict):
        """测试检查记录是否存在"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 检查存在
        assert await sample_repo.exists(sample.id) is True
        
        # 检查不存在
        assert await sample_repo.exists("non-existent-id") is False
    
    async def test_exists_by_field(self, sample_repo: BaseRepository, sample_data: dict):
        """测试按字段检查记录是否存在"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        
        # 检查条码存在
        assert await sample_repo.exists_by_field("barcode", sample.barcode) is True
        
        # 检查条码不存在
        assert await sample_repo.exists_by_field("barcode", "NON_EXISTENT") is False
        
        # 排除当前记录
        assert await sample_repo.exists_by_field(
            "barcode",
            sample.barcode,
            exclude_id=sample.id
        ) is False
