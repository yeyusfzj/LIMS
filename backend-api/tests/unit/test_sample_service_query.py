"""
样品服务查询功能单元测试

测试 SampleService 的查询方法：
- get_samples: 分页查询样品列表
- get_sample_by_id: 根据 ID 查询样品详情
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from typing import List

from app.services.sample_service import SampleService
from app.models.sample import Sample, SampleStatus, Priority
from app.schemas.response import PaginationMeta
from app.core.exceptions import NotFoundException, ValidationException


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    return AsyncMock()


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


@pytest.fixture
def sample_data():
    """样品测试数据"""
    return {
        "id": "test-id-001",
        "barcode": "SP20260409000001",
        "sample_number": "2026000001",
        "client_name": "测试客户",
        "client_contact": "13800138000",
        "sample_name": "水样",
        "sample_type": "环境样品",
        "sample_category": "水质",
        "quantity": 500.0,
        "unit": "mL",
        "received_date": datetime(2026, 4, 9, 10, 0, 0),
        "sampling_date": datetime(2026, 4, 8, 14, 0, 0),
        "sampling_location": "采样点A",
        "sampling_person": "张三",
        "storage_location": "冷藏室A-01",
        "storage_condition": "4°C冷藏",
        "status": SampleStatus.REGISTERED,
        "priority": Priority.NORMAL,
        "description": "测试样品",
        "remarks": "无",
        "version": 1,
        "parent_sample_id": None,
        "merged_from_ids": [],
        "workflow_instance_id": None,
        "created_by": "user123",
        "created_at": datetime(2026, 4, 9, 10, 0, 0),
        "updated_at": datetime(2026, 4, 9, 10, 0, 0),
        "released_at": None,
        "released_by": None
    }


def create_sample_instance(data: dict) -> Sample:
    """创建样品实例"""
    sample = Sample()
    for key, value in data.items():
        setattr(sample, key, value)
    return sample


class TestGetSamples:
    """测试 get_samples 方法"""
    
    @pytest.mark.asyncio
    async def test_get_samples_basic(self, sample_service, mock_sample_repo, sample_data):
        """测试基本分页查询"""
        # 准备测试数据
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(page=1, page_size=20)
        
        # 验证结果
        assert len(result_samples) == 1
        assert result_samples[0].barcode == "SP20260409000001"
        assert result_meta.total == 1
        assert result_meta.page == 1
        assert result_meta.page_size == 20
        assert result_meta.total_pages == 1
        
        # 验证调用参数
        mock_sample_repo.get_paginated.assert_called_once()
        call_args = mock_sample_repo.get_paginated.call_args
        assert call_args.kwargs["page"] == 1
        assert call_args.kwargs["page_size"] == 20
        # 默认应该排除 ARCHIVED 状态
        assert "status__notin" in call_args.kwargs["filters"]
        assert SampleStatus.ARCHIVED in call_args.kwargs["filters"]["status__notin"]
    
    @pytest.mark.asyncio
    async def test_get_samples_with_barcode_filter(self, sample_service, mock_sample_repo, sample_data):
        """测试按条码过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            barcode="SP20260409"
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "barcode__ilike" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["barcode__ilike"] == "%SP20260409%"
    
    @pytest.mark.asyncio
    async def test_get_samples_with_sample_number_filter(self, sample_service, mock_sample_repo, sample_data):
        """测试按样品编号过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            sample_number="2026000001"
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "sample_number__ilike" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["sample_number__ilike"] == "%2026000001%"
    
    @pytest.mark.asyncio
    async def test_get_samples_with_client_name_filter(self, sample_service, mock_sample_repo, sample_data):
        """测试按客户名称过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            client_name="测试"
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "client_name__ilike" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["client_name__ilike"] == "%测试%"
    
    @pytest.mark.asyncio
    async def test_get_samples_with_sample_type_filter(self, sample_service, mock_sample_repo, sample_data):
        """测试按样品类型过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            sample_type="环境样品"
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "sample_type" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["sample_type"] == "环境样品"
    
    @pytest.mark.asyncio
    async def test_get_samples_with_status_filter(self, sample_service, mock_sample_repo, sample_data):
        """测试按状态过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            status=SampleStatus.REGISTERED
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "status" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["status"] == SampleStatus.REGISTERED
        # 明确指定状态时，不应该有 status__notin 过滤
        assert "status__notin" not in call_args.kwargs["filters"]
    
    @pytest.mark.asyncio
    async def test_get_samples_multiple_filters(self, sample_service, mock_sample_repo, sample_data):
        """测试多条件过滤"""
        samples = [create_sample_instance(sample_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            client_name="测试",
            sample_type="环境样品",
            status=SampleStatus.REGISTERED
        )
        
        # 验证结果
        assert len(result_samples) == 1
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        filters = call_args.kwargs["filters"]
        assert "client_name__ilike" in filters
        assert "sample_type" in filters
        assert "status" in filters
    
    @pytest.mark.asyncio
    async def test_get_samples_exclude_archived_default(self, sample_service, mock_sample_repo):
        """测试默认排除 ARCHIVED 状态"""
        samples = []
        meta = PaginationMeta(total=0, page=1, page_size=20, total_pages=0)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询（不指定状态）
        result_samples, result_meta = await sample_service.get_samples(page=1, page_size=20)
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "status__notin" in call_args.kwargs["filters"]
        assert SampleStatus.ARCHIVED in call_args.kwargs["filters"]["status__notin"]
    
    @pytest.mark.asyncio
    async def test_get_samples_include_archived(self, sample_service, mock_sample_repo, sample_data):
        """测试包含 ARCHIVED 状态"""
        # 创建已归档样品
        archived_data = sample_data.copy()
        archived_data["status"] = SampleStatus.ARCHIVED
        samples = [create_sample_instance(archived_data)]
        meta = PaginationMeta(total=1, page=1, page_size=20, total_pages=1)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询（明确指定 ARCHIVED 状态）
        result_samples, result_meta = await sample_service.get_samples(
            page=1,
            page_size=20,
            status=SampleStatus.ARCHIVED
        )
        
        # 验证结果
        assert len(result_samples) == 1
        assert result_samples[0].status == SampleStatus.ARCHIVED
        
        # 验证过滤条件
        call_args = mock_sample_repo.get_paginated.call_args
        assert "status" in call_args.kwargs["filters"]
        assert call_args.kwargs["filters"]["status"] == SampleStatus.ARCHIVED
    
    @pytest.mark.asyncio
    async def test_get_samples_empty_result(self, sample_service, mock_sample_repo):
        """测试空结果"""
        samples = []
        meta = PaginationMeta(total=0, page=1, page_size=20, total_pages=0)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(page=1, page_size=20)
        
        # 验证结果
        assert len(result_samples) == 0
        assert result_meta.total == 0
        assert result_meta.total_pages == 0
    
    @pytest.mark.asyncio
    async def test_get_samples_pagination_metadata(self, sample_service, mock_sample_repo, sample_data):
        """测试分页元数据"""
        # 创建多个样品
        samples = [create_sample_instance(sample_data) for _ in range(10)]
        meta = PaginationMeta(total=100, page=2, page_size=10, total_pages=10)
        
        mock_sample_repo.get_paginated.return_value = (samples, meta)
        
        # 执行查询
        result_samples, result_meta = await sample_service.get_samples(page=2, page_size=10)
        
        # 验证分页元数据
        assert result_meta.total == 100
        assert result_meta.page == 2
        assert result_meta.page_size == 10
        assert result_meta.total_pages == 10
    
    @pytest.mark.asyncio
    async def test_get_samples_error_handling(self, sample_service, mock_sample_repo):
        """测试错误处理"""
        # 模拟数据库错误
        mock_sample_repo.get_paginated.side_effect = Exception("数据库连接失败")
        
        # 执行查询，应该抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.get_samples(page=1, page_size=20)
        
        assert "查询样品列表失败" in str(exc_info.value)


class TestGetSampleById:
    """测试 get_sample_by_id 方法"""
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_success(self, sample_service, mock_sample_repo, sample_data):
        """测试成功查询样品详情"""
        sample = create_sample_instance(sample_data)
        mock_sample_repo.get_by_id.return_value = sample
        
        # 执行查询
        result = await sample_service.get_sample_by_id("test-id-001")
        
        # 验证结果
        assert result.id == "test-id-001"
        assert result.barcode == "SP20260409000001"
        assert result.sample_number == "2026000001"
        assert result.client_name == "测试客户"
        
        # 验证调用参数
        mock_sample_repo.get_by_id.assert_called_once_with("test-id-001")
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_not_found(self, sample_service, mock_sample_repo):
        """测试样品不存在"""
        mock_sample_repo.get_by_id.return_value = None
        
        # 执行查询，应该抛出 NotFoundException
        with pytest.raises(NotFoundException) as exc_info:
            await sample_service.get_sample_by_id("non-existent-id")
        
        assert "样品不存在" in str(exc_info.value)
        mock_sample_repo.get_by_id.assert_called_once_with("non-existent-id")
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_error_handling(self, sample_service, mock_sample_repo):
        """测试错误处理"""
        # 模拟数据库错误
        mock_sample_repo.get_by_id.side_effect = Exception("数据库连接失败")
        
        # 执行查询，应该抛出 ValidationException
        with pytest.raises(ValidationException) as exc_info:
            await sample_service.get_sample_by_id("test-id-001")
        
        assert "查询样品详情失败" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_with_all_fields(self, sample_service, mock_sample_repo, sample_data):
        """测试返回完整字段"""
        sample = create_sample_instance(sample_data)
        mock_sample_repo.get_by_id.return_value = sample
        
        # 执行查询
        result = await sample_service.get_sample_by_id("test-id-001")
        
        # 验证所有字段
        assert result.id == sample_data["id"]
        assert result.barcode == sample_data["barcode"]
        assert result.sample_number == sample_data["sample_number"]
        assert result.client_name == sample_data["client_name"]
        assert result.client_contact == sample_data["client_contact"]
        assert result.sample_name == sample_data["sample_name"]
        assert result.sample_type == sample_data["sample_type"]
        assert result.sample_category == sample_data["sample_category"]
        assert result.quantity == sample_data["quantity"]
        assert result.unit == sample_data["unit"]
        assert result.status == sample_data["status"]
        assert result.priority == sample_data["priority"]
        assert result.version == sample_data["version"]
        assert result.created_by == sample_data["created_by"]
