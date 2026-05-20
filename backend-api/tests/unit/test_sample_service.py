"""
样品服务单元测试

测试样品服务的核心业务逻辑，包括：
- 样品创建功能
- 条码和编号生成
- 状态初始化
- 错误处理

使用 pytest 和 pytest-asyncio 进行异步测试。
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.sample_service import SampleService
from app.models.sample import Sample, SampleStatus, Priority
from app.schemas.sample import SampleCreate
from app.core.exceptions import ValidationException, ConflictException


@pytest.fixture
def sample_create_data():
    """样品创建数据 fixture"""
    return SampleCreate(
        client_name="测试客户",
        client_contact="13800138000",
        sample_name="水样",
        sample_type="环境样品",
        sample_category="水质",
        quantity=500.0,
        unit="mL",
        received_date=datetime.now(),
        sampling_date=datetime.now(),
        sampling_location="测试地点",
        sampling_person="张三",
        storage_location="冷藏室A",
        storage_condition="4°C",
        priority=Priority.NORMAL,
        description="测试样品",
        remarks="备注信息"
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
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_barcode_service():
    """模拟条码生成服务"""
    service = AsyncMock()
    service.generate_barcode = AsyncMock(return_value="SP202604100000001")
    service.generate_sample_number = AsyncMock(return_value="2026000001")
    return service


@pytest.fixture
def sample_service(mock_db, mock_sample_repo, mock_barcode_service):
    """样品服务 fixture"""
    return SampleService(
        db=mock_db,
        sample_repo=mock_sample_repo,
        barcode_service=mock_barcode_service
    )


class TestSampleServiceCreate:
    """测试样品创建功能"""
    
    @pytest.mark.asyncio
    async def test_create_sample_success(
        self,
        sample_service,
        sample_create_data,
        mock_db,
        mock_sample_repo,
        mock_barcode_service
    ):
        """测试成功创建样品"""
        # 准备模拟数据
        created_by = "user123"
        expected_barcode = "SP202604100000001"
        expected_sample_number = "2026000001"
        
        # 模拟创建的样品对象
        mock_sample = Sample(
            id="sample123",
            barcode=expected_barcode,
            sample_number=expected_sample_number,
            client_name=sample_create_data.client_name,
            client_contact=sample_create_data.client_contact,
            sample_name=sample_create_data.sample_name,
            sample_type=sample_create_data.sample_type,
            sample_category=sample_create_data.sample_category,
            quantity=sample_create_data.quantity,
            unit=sample_create_data.unit,
            received_date=sample_create_data.received_date,
            status=SampleStatus.REGISTERED,
            priority=sample_create_data.priority,
            created_by=created_by,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            version=1
        )
        
        mock_sample_repo.create.return_value = mock_sample
        
        # 执行创建操作
        result = await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证条码生成服务被调用
        mock_barcode_service.generate_barcode.assert_called_once()
        mock_barcode_service.generate_sample_number.assert_called_once()
        
        # 验证仓库创建方法被调用
        mock_sample_repo.create.assert_called_once()
        create_args = mock_sample_repo.create.call_args[0][0]
        
        # 验证传递给仓库的数据
        assert create_args["barcode"] == expected_barcode
        assert create_args["sample_number"] == expected_sample_number
        assert create_args["status"] == SampleStatus.REGISTERED
        assert create_args["created_by"] == created_by
        assert create_args["version"] == 1
        assert create_args["client_name"] == sample_create_data.client_name
        assert create_args["sample_name"] == sample_create_data.sample_name
        assert create_args["quantity"] == sample_create_data.quantity
        
        # 验证数据库事务
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_sample)
        
        # 验证返回结果
        assert result == mock_sample
        assert result.barcode == expected_barcode
        assert result.sample_number == expected_sample_number
        assert result.status == SampleStatus.REGISTERED
    
    @pytest.mark.asyncio
    async def test_create_sample_generates_unique_identifiers(
        self,
        sample_service,
        sample_create_data,
        mock_barcode_service
    ):
        """测试样品创建时生成唯一标识符"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证条码和编号生成方法被调用
        mock_barcode_service.generate_barcode.assert_called_once()
        mock_barcode_service.generate_sample_number.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_sample_initializes_status_as_registered(
        self,
        sample_service,
        sample_create_data,
        mock_sample_repo
    ):
        """测试样品创建时状态初始化为 REGISTERED"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证状态被设置为 REGISTERED
        create_args = mock_sample_repo.create.call_args[0][0]
        assert create_args["status"] == SampleStatus.REGISTERED
    
    @pytest.mark.asyncio
    async def test_create_sample_sets_created_by(
        self,
        sample_service,
        sample_create_data,
        mock_sample_repo
    ):
        """测试样品创建时设置创建人"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证创建人被正确设置
        create_args = mock_sample_repo.create.call_args[0][0]
        assert create_args["created_by"] == created_by
    
    @pytest.mark.asyncio
    async def test_create_sample_sets_initial_version(
        self,
        sample_service,
        sample_create_data,
        mock_sample_repo
    ):
        """测试样品创建时设置初始版本号"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证版本号被设置为 1
        create_args = mock_sample_repo.create.call_args[0][0]
        assert create_args["version"] == 1
    
    @pytest.mark.asyncio
    async def test_create_sample_conflict_exception(
        self,
        sample_service,
        sample_create_data,
        mock_db,
        mock_sample_repo
    ):
        """测试条码冲突时抛出异常"""
        created_by = "user123"
        
        # 模拟条码冲突
        mock_sample_repo.create.side_effect = ConflictException("条码已存在")
        
        # 验证抛出异常
        with pytest.raises(ConflictException):
            await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_sample_database_error(
        self,
        sample_service,
        sample_create_data,
        mock_db,
        mock_sample_repo
    ):
        """测试数据库错误时回滚事务"""
        created_by = "user123"
        
        # 模拟数据库错误
        mock_sample_repo.create.side_effect = Exception("数据库连接失败")
        
        # 验证抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.create_sample(sample_create_data, created_by)
        
        assert "样品创建失败" in str(exc_info.value)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_sample_preserves_all_fields(
        self,
        sample_service,
        sample_create_data,
        mock_sample_repo
    ):
        """测试样品创建时保留所有字段"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证所有字段都被传递
        create_args = mock_sample_repo.create.call_args[0][0]
        
        assert create_args["client_name"] == sample_create_data.client_name
        assert create_args["client_contact"] == sample_create_data.client_contact
        assert create_args["sample_name"] == sample_create_data.sample_name
        assert create_args["sample_type"] == sample_create_data.sample_type
        assert create_args["sample_category"] == sample_create_data.sample_category
        assert create_args["quantity"] == sample_create_data.quantity
        assert create_args["unit"] == sample_create_data.unit
        assert create_args["received_date"] == sample_create_data.received_date
        assert create_args["sampling_date"] == sample_create_data.sampling_date
        assert create_args["sampling_location"] == sample_create_data.sampling_location
        assert create_args["sampling_person"] == sample_create_data.sampling_person
        assert create_args["storage_location"] == sample_create_data.storage_location
        assert create_args["storage_condition"] == sample_create_data.storage_condition
        assert create_args["priority"] == sample_create_data.priority
        assert create_args["description"] == sample_create_data.description
        assert create_args["remarks"] == sample_create_data.remarks
    
    @pytest.mark.asyncio
    async def test_create_sample_commits_transaction(
        self,
        sample_service,
        sample_create_data,
        mock_db
    ):
        """测试样品创建成功后提交事务"""
        created_by = "user123"
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证事务被提交
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_sample_refreshes_instance(
        self,
        sample_service,
        sample_create_data,
        mock_db,
        mock_sample_repo
    ):
        """测试样品创建后刷新实例"""
        created_by = "user123"
        
        mock_sample = Sample(
            id="sample123",
            barcode="SP202604100000001",
            sample_number="2026000001",
            client_name=sample_create_data.client_name,
            sample_name=sample_create_data.sample_name,
            sample_type=sample_create_data.sample_type,
            sample_category=sample_create_data.sample_category,
            quantity=sample_create_data.quantity,
            unit=sample_create_data.unit,
            received_date=sample_create_data.received_date,
            status=SampleStatus.REGISTERED,
            priority=sample_create_data.priority,
            created_by=created_by,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            version=1
        )
        
        mock_sample_repo.create.return_value = mock_sample
        
        # 执行创建操作
        await sample_service.create_sample(sample_create_data, created_by)
        
        # 验证实例被刷新
        mock_db.refresh.assert_called_once_with(mock_sample)


class TestSampleServiceIntegration:
    """测试样品服务的集成场景"""
    
    @pytest.mark.asyncio
    async def test_create_multiple_samples_generates_different_identifiers(
        self,
        sample_service,
        sample_create_data,
        mock_barcode_service
    ):
        """测试创建多个样品时生成不同的标识符"""
        # 模拟生成不同的条码和编号
        barcodes = ["SP202604100000001", "SP202604100000002", "SP202604100000003"]
        sample_numbers = ["2026000001", "2026000002", "2026000003"]
        
        mock_barcode_service.generate_barcode.side_effect = barcodes
        mock_barcode_service.generate_sample_number.side_effect = sample_numbers
        
        # 创建多个样品
        for i in range(3):
            await sample_service.create_sample(sample_create_data, f"user{i}")
        
        # 验证生成方法被调用了3次
        assert mock_barcode_service.generate_barcode.call_count == 3
        assert mock_barcode_service.generate_sample_number.call_count == 3
