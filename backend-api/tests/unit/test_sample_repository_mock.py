"""
样品仓库单元测试（使用 Mock）

使用 Mock 对象测试 SampleRepository 类的所有方法，不需要真实数据库连接。
测试覆盖：
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
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.repositories.sample_repository import SampleRepository
from app.models.sample import Sample, SampleStatus, Priority


@pytest.fixture
def mock_db():
    """创建 Mock 数据库会话"""
    return AsyncMock()


@pytest.fixture
def sample_repo(mock_db):
    """创建样品仓库实例"""
    return SampleRepository(mock_db)


@pytest.fixture
def sample_instance():
    """创建样品实例"""
    sample = Sample()
    sample.id = "test-id-123"
    sample.barcode = "SP20260409000001"
    sample.sample_number = "2026000001"
    sample.client_name = "测试客户"
    sample.client_contact = "13800138000"
    sample.sample_name = "水样"
    sample.sample_type = "环境样品"
    sample.sample_category = "水质"
    sample.quantity = 500.0
    sample.unit = "ml"
    sample.received_date = datetime(2026, 4, 9, 10, 0, 0)
    sample.status = SampleStatus.REGISTERED
    sample.priority = Priority.NORMAL
    sample.created_by = "user123"
    sample.created_at = datetime(2026, 4, 9, 10, 0, 0)
    sample.updated_at = datetime(2026, 4, 9, 10, 0, 0)
    sample.version = 1
    return sample


class TestSampleRepositoryMock:
    """样品仓库测试类（使用 Mock）"""
    
    @pytest.mark.asyncio
    async def test_get_by_barcode_found(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试根据条码查询样品 - 找到记录"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_instance
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_barcode("SP20260409000001")
        
        # 验证
        assert result is not None
        assert result.id == "test-id-123"
        assert result.barcode == "SP20260409000001"
        assert result.sample_name == "水样"
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_barcode_not_found(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试根据条码查询样品 - 未找到记录"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_barcode("SP20260409999999")
        
        # 验证
        assert result is None
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_sample_number_found(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试根据样品编号查询样品 - 找到记录"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_instance
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_sample_number("2026000001")
        
        # 验证
        assert result is not None
        assert result.id == "test-id-123"
        assert result.sample_number == "2026000001"
        assert result.client_name == "测试客户"
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_sample_number_not_found(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试根据样品编号查询样品 - 未找到记录"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_sample_number("2026999999")
        
        # 验证
        assert result is None
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_status(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试根据状态查询样品列表"""
        # 创建多个样品实例
        sample1 = sample_instance
        sample2 = Sample()
        sample2.id = "test-id-456"
        sample2.barcode = "SP20260409000002"
        sample2.status = SampleStatus.REGISTERED
        
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample1, sample2]
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_status(SampleStatus.REGISTERED)
        
        # 验证
        assert len(result) == 2
        assert result[0].id == "test-id-123"
        assert result[1].id == "test-id-456"
        
        # 验证调用
        mock_db.execute.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_by_client_name(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试根据客户名称查询样品列表（模糊查询）"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_instance]
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_client_name("测试客户")
        
        # 验证
        assert len(result) == 1
        assert result[0].client_name == "测试客户"
        
        # 验证调用
        mock_db.execute.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_by_sample_type(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试根据样品类型查询样品列表"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_instance]
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_sample_type("环境样品")
        
        # 验证
        assert len(result) == 1
        assert result[0].sample_type == "环境样品"
        
        # 验证调用
        mock_db.execute.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_active_samples(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock,
        sample_instance: Sample
    ):
        """测试获取活跃样品（排除已归档）"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_instance]
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_active_samples()
        
        # 验证
        assert len(result) == 1
        assert result[0].status != SampleStatus.ARCHIVED
        
        # 验证调用
        mock_db.execute.assert_called()
    
    @pytest.mark.asyncio
    async def test_get_by_parent_sample_id(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试根据母样品 ID 查询子样品"""
        # 创建子样品实例
        child1 = Sample()
        child1.id = "child-id-1"
        child1.barcode = "SP20260409000010"
        child1.parent_sample_id = "parent-id-123"
        
        child2 = Sample()
        child2.id = "child-id-2"
        child2.barcode = "SP20260409000011"
        child2.parent_sample_id = "parent-id-123"
        
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [child1, child2]
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_parent_sample_id("parent-id-123")
        
        # 验证
        assert len(result) == 2
        assert result[0].parent_sample_id == "parent-id-123"
        assert result[1].parent_sample_id == "parent-id-123"
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_count_by_status(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试统计指定状态的样品数量"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 5
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.count_by_status(SampleStatus.REGISTERED)
        
        # 验证
        assert result == 5
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_barcode_exists_true(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试检查条码是否存在 - 存在"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 1
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.barcode_exists("SP20260409000001")
        
        # 验证
        assert result is True
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_barcode_exists_false(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试检查条码是否存在 - 不存在"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 0
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.barcode_exists("SP20260409999999")
        
        # 验证
        assert result is False
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_sample_number_exists_true(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试检查样品编号是否存在 - 存在"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 1
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.sample_number_exists("2026000001")
        
        # 验证
        assert result is True
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_sample_number_exists_false(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试检查样品编号是否存在 - 不存在"""
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 0
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.sample_number_exists("2026999999")
        
        # 验证
        assert result is False
        
        # 验证调用
        mock_db.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_status_with_pagination(
        self,
        sample_repo: SampleRepository,
        mock_db: AsyncMock
    ):
        """测试根据状态查询样品列表（分页）"""
        # 创建样品实例
        samples = []
        for i in range(2):
            sample = Sample()
            sample.id = f"test-id-{i}"
            sample.barcode = f"SP2026040900{i:02d}"
            sample.status = SampleStatus.REGISTERED
            samples.append(sample)
        
        # 设置 Mock 返回值
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = samples
        mock_db.execute.return_value = mock_result
        
        # 执行查询
        result = await sample_repo.get_by_status(
            SampleStatus.REGISTERED,
            skip=0,
            limit=2
        )
        
        # 验证
        assert len(result) == 2
        assert result[0].id == "test-id-0"
        assert result[1].id == "test-id-1"
        
        # 验证调用
        mock_db.execute.assert_called()
