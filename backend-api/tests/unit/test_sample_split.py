"""
样品分样功能单元测试

测试样品分样操作的核心业务逻辑，包括：
- 分样操作成功场景
- 母样品验证
- 子样品条码和编号生成
- 父子关系建立
- 信息继承
- 事务原子性
- 错误处理

使用 pytest 和 pytest-asyncio 进行异步测试。
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from app.services.sample_service import SampleService
from app.models.sample import Sample, SampleStatus, Priority
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
def mock_sample_repo():
    """模拟样品仓库"""
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_barcode_service():
    """模拟条码生成服务"""
    service = AsyncMock()
    # 模拟生成不同的条码和编号
    service.generate_barcode.side_effect = [
        "SP202604100000001",
        "SP202604100000002",
        "SP202604100000003"
    ]
    service.generate_sample_number.side_effect = [
        "2026000001",
        "2026000002",
        "2026000003"
    ]
    return service


@pytest.fixture
def sample_service(mock_db, mock_sample_repo, mock_barcode_service):
    """样品服务 fixture"""
    return SampleService(
        db=mock_db,
        sample_repo=mock_sample_repo,
        barcode_service=mock_barcode_service
    )


@pytest.fixture
def parent_sample():
    """母样品 fixture"""
    return Sample(
        id="parent-sample-id",
        barcode="SP202604090000001",
        sample_number="2026000100",
        client_name="测试客户",
        client_contact="13800138000",
        sample_name="母样品",
        sample_type="环境样品",
        sample_category="水质",
        quantity=1000.0,
        unit="mL",
        received_date=datetime(2026, 4, 9, 10, 0, 0),
        sampling_date=datetime(2026, 4, 9, 9, 0, 0),
        sampling_location="测试地点",
        sampling_person="张三",
        storage_location="冷藏室A",
        storage_condition="4°C",
        priority=Priority.NORMAL,
        status=SampleStatus.REGISTERED,
        created_by="user123",
        created_at=datetime(2026, 4, 9, 10, 0, 0),
        updated_at=datetime(2026, 4, 9, 10, 0, 0),
        version=1
    )


@pytest.fixture
def sub_samples_data():
    """子样品数据 fixture"""
    return [
        {
            "sample_name": "子样品1",
            "quantity": 300.0,
            "unit": "mL",
            "description": "第一份子样品"
        },
        {
            "sample_name": "子样品2",
            "quantity": 400.0,
            "unit": "mL",
            "description": "第二份子样品"
        }
    ]


class TestSampleSplitSuccess:
    """测试分样操作成功场景"""
    
    @pytest.mark.asyncio
    async def test_split_sample_success(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_db,
        mock_sample_repo,
        mock_barcode_service
    ):
        """测试成功分样操作"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟创建子样品
        def create_child_sample(data):
            return Sample(
                id=f"child-{data['barcode']}",
                **data
            )
        
        mock_sample_repo.create.side_effect = create_child_sample
        
        # 执行分样操作
        result = await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证返回结果
        assert len(result) == 2
        assert all(isinstance(sample, Sample) for sample in result)
        
        # 验证母样品被查询
        mock_sample_repo.get_by_id.assert_called_once_with(parent_sample.id)
        
        # 验证条码生成服务被调用
        assert mock_barcode_service.generate_barcode.call_count == 2
        assert mock_barcode_service.generate_sample_number.call_count == 2
        
        # 验证仓库创建方法被调用
        assert mock_sample_repo.create.call_count == 2
        
        # 验证数据库事务
        mock_db.commit.assert_called_once()
        assert mock_db.refresh.call_count == 2
    
    @pytest.mark.asyncio
    async def test_split_sample_generates_unique_barcodes(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo,
        mock_barcode_service
    ):
        """测试分样时为每个子样品生成唯一条码"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证为每个子样品生成了条码和编号
        assert mock_barcode_service.generate_barcode.call_count == 2
        assert mock_barcode_service.generate_sample_number.call_count == 2
    
    @pytest.mark.asyncio
    async def test_split_sample_establishes_parent_child_relationship(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时建立父子关系"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都设置了 parent_sample_id
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["parent_sample_id"] == parent_sample.id
    
    @pytest.mark.asyncio
    async def test_split_sample_inherits_client_info(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时继承母样品的客户信息"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都继承了客户信息
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["client_name"] == parent_sample.client_name
            assert child_data["client_contact"] == parent_sample.client_contact
    
    @pytest.mark.asyncio
    async def test_split_sample_inherits_sample_type(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时继承母样品的样品类型"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都继承了样品类型
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["sample_type"] == parent_sample.sample_type
            assert child_data["sample_category"] == parent_sample.sample_category
    
    @pytest.mark.asyncio
    async def test_split_sample_inherits_sampling_info(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时继承母样品的采样信息"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都继承了采样信息
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["sampling_date"] == parent_sample.sampling_date
            assert child_data["sampling_location"] == parent_sample.sampling_location
            assert child_data["sampling_person"] == parent_sample.sampling_person
    
    @pytest.mark.asyncio
    async def test_split_sample_inherits_storage_info(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时继承母样品的存储信息"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都继承了存储信息
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["storage_location"] == parent_sample.storage_location
            assert child_data["storage_condition"] == parent_sample.storage_condition
    
    @pytest.mark.asyncio
    async def test_split_sample_uses_child_specific_data(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时使用子样品特定数据"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证子样品使用了自己的数据
        for i, call in enumerate(mock_sample_repo.create.call_args_list):
            child_data = call[0][0]
            assert child_data["sample_name"] == sub_samples_data[i]["sample_name"]
            assert child_data["quantity"] == sub_samples_data[i]["quantity"]
            assert child_data["unit"] == sub_samples_data[i]["unit"]
            assert child_data["description"] == sub_samples_data[i]["description"]
    
    @pytest.mark.asyncio
    async def test_split_sample_initializes_status_as_registered(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时子样品状态初始化为 REGISTERED"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品状态都是 REGISTERED
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["status"] == SampleStatus.REGISTERED
    
    @pytest.mark.asyncio
    async def test_split_sample_sets_created_by(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时设置创建人"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都设置了创建人
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["created_by"] == created_by
    
    @pytest.mark.asyncio
    async def test_split_sample_sets_initial_version(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试分样时设置初始版本号"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品版本号都是 1
        for call in mock_sample_repo.create.call_args_list:
            child_data = call[0][0]
            assert child_data["version"] == 1
    
    @pytest.mark.asyncio
    async def test_split_sample_generates_default_name_if_not_provided(
        self,
        sample_service,
        parent_sample,
        mock_sample_repo
    ):
        """测试分样时如果未提供子样品名称则生成默认名称"""
        created_by = "user456"
        
        # 子样品数据不包含 sample_name
        sub_samples_data_no_name = [
            {"quantity": 300.0, "unit": "mL"},
            {"quantity": 400.0, "unit": "mL"}
        ]
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data_no_name,
            created_by=created_by
        )
        
        # 验证生成了默认名称
        for i, call in enumerate(mock_sample_repo.create.call_args_list):
            child_data = call[0][0]
            expected_name = f"{parent_sample.sample_name}-子样品{i + 1}"
            assert child_data["sample_name"] == expected_name


class TestSampleSplitValidation:
    """测试分样操作的验证逻辑"""
    
    @pytest.mark.asyncio
    async def test_split_sample_parent_not_found(
        self,
        sample_service,
        sub_samples_data,
        mock_sample_repo
    ):
        """测试母样品不存在时抛出异常"""
        created_by = "user456"
        parent_id = "non-existent-id"
        
        # 模拟母样品不存在
        mock_sample_repo.get_by_id.return_value = None
        
        # 验证抛出 NotFoundException
        with pytest.raises(NotFoundException) as exc_info:
            await sample_service.split_sample(
                parent_sample_id=parent_id,
                sub_samples_data=sub_samples_data,
                created_by=created_by
            )
        
        assert "样品不存在" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_split_sample_parent_archived(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_db,
        mock_sample_repo
    ):
        """测试母样品已归档时拒绝分样"""
        created_by = "user456"
        
        # 设置母样品状态为 ARCHIVED
        parent_sample.status = SampleStatus.ARCHIVED
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 验证抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.split_sample(
                parent_sample_id=parent_sample.id,
                sub_samples_data=sub_samples_data,
                created_by=created_by
            )
        
        assert "已归档的样品不能进行分样操作" in str(exc_info.value)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_split_sample_empty_sub_samples_data(
        self,
        sample_service,
        parent_sample,
        mock_db,
        mock_sample_repo
    ):
        """测试子样品数据为空时抛出异常"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 验证抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.split_sample(
                parent_sample_id=parent_sample.id,
                sub_samples_data=[],
                created_by=created_by
            )
        
        assert "至少需要提供 1 个子样品数据" in str(exc_info.value)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_split_sample_missing_required_fields(
        self,
        sample_service,
        parent_sample,
        mock_db,
        mock_sample_repo
    ):
        """测试子样品缺少必填字段时抛出异常"""
        created_by = "user456"
        
        # 子样品数据缺少必填字段
        invalid_sub_samples_data = [
            {"sample_name": "子样品1"}  # 缺少 quantity 和 unit
        ]
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 验证抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.split_sample(
                parent_sample_id=parent_sample.id,
                sub_samples_data=invalid_sub_samples_data,
                created_by=created_by
            )
        
        assert "缺少必填字段" in str(exc_info.value)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()


class TestSampleSplitTransactionAtomicity:
    """测试分样操作的事务原子性"""
    
    @pytest.mark.asyncio
    async def test_split_sample_rollback_on_error(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_db,
        mock_sample_repo
    ):
        """测试分样失败时回滚事务"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟创建第二个子样品时失败
        mock_sample_repo.create.side_effect = [
            Sample(id="child1", barcode="SP202604100000001", sample_number="2026000001"),
            Exception("数据库错误")
        ]
        
        # 验证抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.split_sample(
                parent_sample_id=parent_sample.id,
                sub_samples_data=sub_samples_data,
                created_by=created_by
            )
        
        assert "分样操作失败" in str(exc_info.value)
        
        # 验证事务被回滚
        mock_db.rollback.assert_called_once()
        
        # 验证事务未被提交
        mock_db.commit.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_split_sample_commits_only_on_success(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_db,
        mock_sample_repo
    ):
        """测试分样成功时才提交事务"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟成功创建子样品
        def create_child_sample(data):
            return Sample(
                id=f"child-{data['barcode']}",
                **data
            )
        
        mock_sample_repo.create.side_effect = create_child_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证事务被提交
        mock_db.commit.assert_called_once()
        
        # 验证事务未被回滚
        mock_db.rollback.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_split_sample_refreshes_all_children(
        self,
        sample_service,
        parent_sample,
        sub_samples_data,
        mock_db,
        mock_sample_repo
    ):
        """测试分样成功后刷新所有子样品"""
        created_by = "user456"
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟创建子样品
        child_samples = []
        def create_child_sample(data):
            child = Sample(
                id=f"child-{len(child_samples)}",
                **data
            )
            child_samples.append(child)
            return child
        
        mock_sample_repo.create.side_effect = create_child_sample
        
        # 执行分样操作
        await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=sub_samples_data,
            created_by=created_by
        )
        
        # 验证所有子样品都被刷新
        assert mock_db.refresh.call_count == 2
        for child in child_samples:
            mock_db.refresh.assert_any_call(child)


class TestSampleSplitEdgeCases:
    """测试分样操作的边界情况"""
    
    @pytest.mark.asyncio
    async def test_split_sample_single_child(
        self,
        sample_service,
        parent_sample,
        mock_sample_repo
    ):
        """测试分样为单个子样品"""
        created_by = "user456"
        
        # 只有一个子样品
        single_sub_sample_data = [
            {"sample_name": "唯一子样品", "quantity": 500.0, "unit": "mL"}
        ]
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟创建子样品
        mock_sample_repo.create.return_value = Sample(
            id="child1",
            barcode="SP202604100000001",
            sample_number="2026000001"
        )
        
        # 执行分样操作
        result = await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=single_sub_sample_data,
            created_by=created_by
        )
        
        # 验证返回一个子样品
        assert len(result) == 1
    
    @pytest.mark.asyncio
    async def test_split_sample_many_children(
        self,
        sample_service,
        parent_sample,
        mock_sample_repo,
        mock_barcode_service
    ):
        """测试分样为多个子样品"""
        created_by = "user456"
        
        # 10个子样品
        many_sub_samples_data = [
            {"sample_name": f"子样品{i}", "quantity": 50.0, "unit": "mL"}
            for i in range(1, 11)
        ]
        
        # 模拟生成足够的条码和编号
        mock_barcode_service.generate_barcode.side_effect = [
            f"SP20260410000000{i}" for i in range(1, 11)
        ]
        mock_barcode_service.generate_sample_number.side_effect = [
            f"202600000{i}" for i in range(1, 11)
        ]
        
        # 模拟获取母样品
        mock_sample_repo.get_by_id.return_value = parent_sample
        
        # 模拟创建子样品
        def create_child_sample(data):
            return Sample(
                id=f"child-{data['barcode']}",
                **data
            )
        
        mock_sample_repo.create.side_effect = create_child_sample
        
        # 执行分样操作
        result = await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            sub_samples_data=many_sub_samples_data,
            created_by=created_by
        )
        
        # 验证返回10个子样品
        assert len(result) == 10
        
        # 验证条码生成服务被调用10次
        assert mock_barcode_service.generate_barcode.call_count == 10
        assert mock_barcode_service.generate_sample_number.call_count == 10
