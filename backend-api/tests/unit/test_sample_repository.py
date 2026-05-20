"""
样品仓库单元测试

测试 SampleRepository 类的所有方法，包括：
- get_by_barcode() - 根据条码查询
- get_by_sample_number() - 根据样品编号查询
- get_by_status() - 根据状态查询
- get_by_client_name() - 根据客户名称查询
- get_by_sample_type() - 根据样品类型查询
- get_active_samples() - 获取活跃样品
- get_by_parent_sample_id() - 查询子样品
- count_by_status() - 统计状态数量
- barcode_exists() - 检查条码是否存在
- sample_number_exists() - 检查样品编号是否存在
"""
import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.sample_repository import SampleRepository
from app.models.sample import Sample, SampleStatus, Priority


@pytest.fixture
async def sample_repo(test_db: AsyncSession) -> SampleRepository:
    """创建样品仓库实例"""
    return SampleRepository(test_db)


@pytest.fixture
async def sample_data() -> dict:
    """样品测试数据"""
    return {
        "barcode": "SP20260409000001",
        "sample_number": "2026000001",
        "client_name": "测试客户",
        "client_contact": "13800138000",
        "sample_name": "水样",
        "sample_type": "环境样品",
        "sample_category": "水质",
        "quantity": 500.0,
        "unit": "ml",
        "received_date": datetime(2026, 4, 9, 10, 0, 0),
        "sampling_date": datetime(2026, 4, 8, 14, 0, 0),
        "sampling_location": "某河流",
        "sampling_person": "张三",
        "storage_location": "冷藏室A-01",
        "storage_condition": "4°C冷藏",
        "status": SampleStatus.REGISTERED,
        "priority": Priority.NORMAL,
        "description": "河流水质检测样品",
        "remarks": "需要尽快检测",
        "created_by": "user123"
    }


@pytest.mark.asyncio
class TestSampleRepository:
    """样品仓库测试类"""
    
    async def test_get_by_barcode_found(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据条码查询样品 - 找到记录"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        await test_db.commit()
        
        # 根据条码查询
        found_sample = await sample_repo.get_by_barcode(sample_data["barcode"])
        
        # 验证
        assert found_sample is not None
        assert found_sample.id == sample.id
        assert found_sample.barcode == sample_data["barcode"]
        assert found_sample.sample_name == sample_data["sample_name"]
        
        # 清理
        await sample_repo.delete(sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_barcode_not_found(self, sample_repo: SampleRepository):
        """测试根据条码查询样品 - 未找到记录"""
        # 查询不存在的条码
        found_sample = await sample_repo.get_by_barcode("SP20260409999999")
        
        # 验证
        assert found_sample is None
    
    async def test_get_by_sample_number_found(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据样品编号查询样品 - 找到记录"""
        # 创建样品
        sample = await sample_repo.create(sample_data)
        await test_db.commit()
        
        # 根据样品编号查询
        found_sample = await sample_repo.get_by_sample_number(sample_data["sample_number"])
        
        # 验证
        assert found_sample is not None
        assert found_sample.id == sample.id
        assert found_sample.sample_number == sample_data["sample_number"]
        assert found_sample.client_name == sample_data["client_name"]
        
        # 清理
        await sample_repo.delete(sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_sample_number_not_found(self, sample_repo: SampleRepository):
        """测试根据样品编号查询样品 - 未找到记录"""
        # 查询不存在的样品编号
        found_sample = await sample_repo.get_by_sample_number("2026999999")
        
        # 验证
        assert found_sample is None
    
    async def test_get_by_status(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据状态查询样品列表"""
        # 创建多个不同状态的样品
        sample1_data = {**sample_data, "barcode": "SP20260409000010", "sample_number": "2026000010"}
        sample2_data = {
            **sample_data,
            "barcode": "SP20260409000011",
            "sample_number": "2026000011",
            "status": SampleStatus.IN_TESTING
        }
        sample3_data = {**sample_data, "barcode": "SP20260409000012", "sample_number": "2026000012"}
        
        sample1 = await sample_repo.create(sample1_data)
        sample2 = await sample_repo.create(sample2_data)
        sample3 = await sample_repo.create(sample3_data)
        await test_db.commit()
        
        # 查询 REGISTERED 状态的样品
        registered_samples = await sample_repo.get_by_status(SampleStatus.REGISTERED)
        
        # 验证
        assert len(registered_samples) >= 2
        registered_ids = [s.id for s in registered_samples]
        assert sample1.id in registered_ids
        assert sample3.id in registered_ids
        assert sample2.id not in registered_ids
        
        # 查询 IN_TESTING 状态的样品
        testing_samples = await sample_repo.get_by_status(SampleStatus.IN_TESTING)
        
        # 验证
        assert len(testing_samples) >= 1
        testing_ids = [s.id for s in testing_samples]
        assert sample2.id in testing_ids
        
        # 清理
        await sample_repo.delete(sample1.id, soft_delete=False)
        await sample_repo.delete(sample2.id, soft_delete=False)
        await sample_repo.delete(sample3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_client_name(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据客户名称查询样品列表（模糊查询）"""
        # 创建多个不同客户的样品
        sample1_data = {
            **sample_data,
            "barcode": "SP20260409000020",
            "sample_number": "2026000020",
            "client_name": "测试客户A"
        }
        sample2_data = {
            **sample_data,
            "barcode": "SP20260409000021",
            "sample_number": "2026000021",
            "client_name": "测试客户B"
        }
        sample3_data = {
            **sample_data,
            "barcode": "SP20260409000022",
            "sample_number": "2026000022",
            "client_name": "其他公司"
        }
        
        sample1 = await sample_repo.create(sample1_data)
        sample2 = await sample_repo.create(sample2_data)
        sample3 = await sample_repo.create(sample3_data)
        await test_db.commit()
        
        # 模糊查询包含"测试客户"的样品
        samples = await sample_repo.get_by_client_name("测试客户")
        
        # 验证
        assert len(samples) >= 2
        sample_ids = [s.id for s in samples]
        assert sample1.id in sample_ids
        assert sample2.id in sample_ids
        assert sample3.id not in sample_ids
        
        # 清理
        await sample_repo.delete(sample1.id, soft_delete=False)
        await sample_repo.delete(sample2.id, soft_delete=False)
        await sample_repo.delete(sample3.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_sample_type(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据样品类型查询样品列表"""
        # 创建多个不同类型的样品
        sample1_data = {
            **sample_data,
            "barcode": "SP20260409000030",
            "sample_number": "2026000030",
            "sample_type": "环境样品"
        }
        sample2_data = {
            **sample_data,
            "barcode": "SP20260409000031",
            "sample_number": "2026000031",
            "sample_type": "食品样品"
        }
        
        sample1 = await sample_repo.create(sample1_data)
        sample2 = await sample_repo.create(sample2_data)
        await test_db.commit()
        
        # 查询环境样品
        env_samples = await sample_repo.get_by_sample_type("环境样品")
        
        # 验证
        assert len(env_samples) >= 1
        env_ids = [s.id for s in env_samples]
        assert sample1.id in env_ids
        
        # 查询食品样品
        food_samples = await sample_repo.get_by_sample_type("食品样品")
        
        # 验证
        assert len(food_samples) >= 1
        food_ids = [s.id for s in food_samples]
        assert sample2.id in food_ids
        
        # 清理
        await sample_repo.delete(sample1.id, soft_delete=False)
        await sample_repo.delete(sample2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_active_samples(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试获取活跃样品（排除已归档）"""
        # 创建活跃样品和已归档样品
        active_data = {
            **sample_data,
            "barcode": "SP20260409000040",
            "sample_number": "2026000040",
            "status": SampleStatus.REGISTERED
        }
        archived_data = {
            **sample_data,
            "barcode": "SP20260409000041",
            "sample_number": "2026000041",
            "status": SampleStatus.ARCHIVED
        }
        
        active_sample = await sample_repo.create(active_data)
        archived_sample = await sample_repo.create(archived_data)
        await test_db.commit()
        
        # 查询活跃样品
        active_samples = await sample_repo.get_active_samples()
        
        # 验证
        active_ids = [s.id for s in active_samples]
        assert active_sample.id in active_ids
        assert archived_sample.id not in active_ids
        
        # 清理
        await sample_repo.delete(active_sample.id, soft_delete=False)
        await sample_repo.delete(archived_sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_parent_sample_id(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据母样品 ID 查询子样品"""
        # 创建母样品
        parent_data = {
            **sample_data,
            "barcode": "SP20260409000050",
            "sample_number": "2026000050"
        }
        parent_sample = await sample_repo.create(parent_data)
        await test_db.commit()
        
        # 创建子样品
        child1_data = {
            **sample_data,
            "barcode": "SP20260409000051",
            "sample_number": "2026000051",
            "parent_sample_id": parent_sample.id
        }
        child2_data = {
            **sample_data,
            "barcode": "SP20260409000052",
            "sample_number": "2026000052",
            "parent_sample_id": parent_sample.id
        }
        
        child1 = await sample_repo.create(child1_data)
        child2 = await sample_repo.create(child2_data)
        await test_db.commit()
        
        # 查询子样品
        child_samples = await sample_repo.get_by_parent_sample_id(parent_sample.id)
        
        # 验证
        assert len(child_samples) == 2
        child_ids = [s.id for s in child_samples]
        assert child1.id in child_ids
        assert child2.id in child_ids
        
        # 清理
        await sample_repo.delete(child1.id, soft_delete=False)
        await sample_repo.delete(child2.id, soft_delete=False)
        await sample_repo.delete(parent_sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_count_by_status(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试统计指定状态的样品数量"""
        # 获取初始数量
        initial_count = await sample_repo.count_by_status(SampleStatus.REGISTERED)
        
        # 创建样品
        sample1_data = {
            **sample_data,
            "barcode": "SP20260409000060",
            "sample_number": "2026000060"
        }
        sample2_data = {
            **sample_data,
            "barcode": "SP20260409000061",
            "sample_number": "2026000061"
        }
        
        sample1 = await sample_repo.create(sample1_data)
        sample2 = await sample_repo.create(sample2_data)
        await test_db.commit()
        
        # 统计数量
        new_count = await sample_repo.count_by_status(SampleStatus.REGISTERED)
        
        # 验证
        assert new_count == initial_count + 2
        
        # 清理
        await sample_repo.delete(sample1.id, soft_delete=False)
        await sample_repo.delete(sample2.id, soft_delete=False)
        await test_db.commit()
    
    async def test_barcode_exists(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试检查条码是否存在"""
        # 检查不存在的条码
        exists_before = await sample_repo.barcode_exists(sample_data["barcode"])
        assert exists_before is False
        
        # 创建样品
        sample = await sample_repo.create(sample_data)
        await test_db.commit()
        
        # 检查存在的条码
        exists_after = await sample_repo.barcode_exists(sample_data["barcode"])
        assert exists_after is True
        
        # 清理
        await sample_repo.delete(sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_sample_number_exists(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试检查样品编号是否存在"""
        # 检查不存在的样品编号
        exists_before = await sample_repo.sample_number_exists(sample_data["sample_number"])
        assert exists_before is False
        
        # 创建样品
        sample = await sample_repo.create(sample_data)
        await test_db.commit()
        
        # 检查存在的样品编号
        exists_after = await sample_repo.sample_number_exists(sample_data["sample_number"])
        assert exists_after is True
        
        # 清理
        await sample_repo.delete(sample.id, soft_delete=False)
        await test_db.commit()
    
    async def test_get_by_status_with_pagination(
        self,
        sample_repo: SampleRepository,
        sample_data: dict,
        test_db: AsyncSession
    ):
        """测试根据状态查询样品列表（分页）"""
        # 创建多个样品
        samples = []
        for i in range(5):
            data = {
                **sample_data,
                "barcode": f"SP20260409000{70 + i:02d}",
                "sample_number": f"20260000{70 + i:02d}"
            }
            sample = await sample_repo.create(data)
            samples.append(sample)
        await test_db.commit()
        
        # 分页查询
        page1 = await sample_repo.get_by_status(
            SampleStatus.REGISTERED,
            skip=0,
            limit=2
        )
        page2 = await sample_repo.get_by_status(
            SampleStatus.REGISTERED,
            skip=2,
            limit=2
        )
        
        # 验证
        assert len(page1) == 2
        assert len(page2) == 2
        
        # 验证不重复
        page1_ids = {s.id for s in page1}
        page2_ids = {s.id for s in page2}
        assert len(page1_ids & page2_ids) == 0
        
        # 清理
        for sample in samples:
            await sample_repo.delete(sample.id, soft_delete=False)
        await test_db.commit()
