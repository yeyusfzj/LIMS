"""
样品查询 API 集成测试

测试样品查询相关的 API 端点：
- GET /api/v1/samples/ - 分页查询样品列表
- GET /api/v1/samples/{sample_id} - 查询样品详情
"""
import pytest
from httpx import AsyncClient
from datetime import datetime
from typing import List

from app.models.sample import Sample, SampleStatus, Priority
from app.core.database import get_db


@pytest.fixture
async def sample_data_list(test_db):
    """创建测试样品数据"""
    samples = []
    
    # 创建多个不同状态和类型的样品
    test_cases = [
        {
            "barcode": "SP20260409000001",
            "sample_number": "2026000001",
            "client_name": "客户A",
            "sample_name": "水样1",
            "sample_type": "环境样品",
            "sample_category": "水质",
            "status": SampleStatus.REGISTERED,
        },
        {
            "barcode": "SP20260409000002",
            "sample_number": "2026000002",
            "client_name": "客户B",
            "sample_name": "土壤样品1",
            "sample_type": "土壤样品",
            "sample_category": "土壤",
            "status": SampleStatus.IN_TESTING,
        },
        {
            "barcode": "SP20260409000003",
            "sample_number": "2026000003",
            "client_name": "客户A",
            "sample_name": "水样2",
            "sample_type": "环境样品",
            "sample_category": "水质",
            "status": SampleStatus.TESTING_COMPLETE,
        },
        {
            "barcode": "SP20260409000004",
            "sample_number": "2026000004",
            "client_name": "客户C",
            "sample_name": "空气样品1",
            "sample_type": "空气样品",
            "sample_category": "空气",
            "status": SampleStatus.ARCHIVED,  # 已归档
        },
        {
            "barcode": "SP20260409000005",
            "sample_number": "2026000005",
            "client_name": "客户B",
            "sample_name": "水样3",
            "sample_type": "环境样品",
            "sample_category": "水质",
            "status": SampleStatus.RELEASED,
        },
    ]
    
    for i, test_case in enumerate(test_cases):
        sample = Sample(
            id=f"test-sample-{i+1}",
            barcode=test_case["barcode"],
            sample_number=test_case["sample_number"],
            client_name=test_case["client_name"],
            client_contact="13800138000",
            sample_name=test_case["sample_name"],
            sample_type=test_case["sample_type"],
            sample_category=test_case["sample_category"],
            quantity=500.0,
            unit="mL",
            received_date=datetime(2026, 4, 9, 10, 0, 0),
            status=test_case["status"],
            priority=Priority.NORMAL,
            version=1,
            created_by="test-user",
            created_at=datetime(2026, 4, 9, 10, 0, 0),
            updated_at=datetime(2026, 4, 9, 10, 0, 0),
        )
        test_db.add(sample)
        samples.append(sample)
    
    await test_db.commit()
    
    # 刷新所有样品以获取最新数据
    for sample in samples:
        await test_db.refresh(sample)
    
    return samples


class TestListSamplesAPI:
    """测试样品列表查询 API"""
    
    @pytest.mark.asyncio
    async def test_list_samples_basic(self, async_client: AsyncClient, sample_data_list):
        """测试基本分页查询"""
        response = await async_client.get("/api/v1/samples/?page=1&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证响应结构
        assert "message" in data
        assert "data" in data
        assert "items" in data["data"]
        assert "total" in data["data"]
        assert "page" in data["data"]
        assert "page_size" in data["data"]
        assert "total_pages" in data["data"]
        
        # 验证数据（默认应该排除 ARCHIVED 状态）
        assert len(data["data"]["items"]) == 4  # 5个样品中有1个是 ARCHIVED
        assert data["data"]["total"] == 4
        assert data["data"]["page"] == 1
        assert data["data"]["page_size"] == 10
        
        # 验证不包含已归档样品
        barcodes = [item["barcode"] for item in data["data"]["items"]]
        assert "SP20260409000004" not in barcodes  # 已归档样品
    
    @pytest.mark.asyncio
    async def test_list_samples_with_barcode_filter(self, async_client: AsyncClient, sample_data_list):
        """测试按条码过滤"""
        response = await async_client.get("/api/v1/samples/?barcode=SP20260409000001")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该只返回一个样品
        assert len(data["data"]["items"]) == 1
        assert data["data"]["items"][0]["barcode"] == "SP20260409000001"
        assert data["data"]["total"] == 1
    
    @pytest.mark.asyncio
    async def test_list_samples_with_sample_number_filter(self, async_client: AsyncClient, sample_data_list):
        """测试按样品编号过滤"""
        response = await async_client.get("/api/v1/samples/?sample_number=2026000002")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该只返回一个样品
        assert len(data["data"]["items"]) == 1
        assert data["data"]["items"][0]["sample_number"] == "2026000002"
        assert data["data"]["total"] == 1
    
    @pytest.mark.asyncio
    async def test_list_samples_with_client_name_filter(self, async_client: AsyncClient, sample_data_list):
        """测试按客户名称过滤"""
        response = await async_client.get("/api/v1/samples/?client_name=客户A")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回2个样品（客户A的样品）
        assert len(data["data"]["items"]) == 2
        assert data["data"]["total"] == 2
        
        # 验证所有样品都是客户A的
        for item in data["data"]["items"]:
            assert item["client_name"] == "客户A"
    
    @pytest.mark.asyncio
    async def test_list_samples_with_sample_type_filter(self, async_client: AsyncClient, sample_data_list):
        """测试按样品类型过滤"""
        response = await async_client.get("/api/v1/samples/?sample_type=环境样品")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回3个环境样品（排除已归档的）
        assert len(data["data"]["items"]) == 3
        assert data["data"]["total"] == 3
        
        # 验证所有样品都是环境样品
        for item in data["data"]["items"]:
            assert item["sample_type"] == "环境样品"
    
    @pytest.mark.asyncio
    async def test_list_samples_with_status_filter(self, async_client: AsyncClient, sample_data_list):
        """测试按状态过滤"""
        response = await async_client.get("/api/v1/samples/?status=REGISTERED")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该只返回 REGISTERED 状态的样品
        assert len(data["data"]["items"]) == 1
        assert data["data"]["total"] == 1
        assert data["data"]["items"][0]["status"] == "REGISTERED"
    
    @pytest.mark.asyncio
    async def test_list_samples_include_archived(self, async_client: AsyncClient, sample_data_list):
        """测试包含已归档样品"""
        response = await async_client.get("/api/v1/samples/?status=ARCHIVED")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回已归档的样品
        assert len(data["data"]["items"]) == 1
        assert data["data"]["total"] == 1
        assert data["data"]["items"][0]["status"] == "ARCHIVED"
        assert data["data"]["items"][0]["barcode"] == "SP20260409000004"
    
    @pytest.mark.asyncio
    async def test_list_samples_multiple_filters(self, async_client: AsyncClient, sample_data_list):
        """测试多条件过滤"""
        response = await async_client.get(
            "/api/v1/samples/?client_name=客户A&sample_type=环境样品"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回客户A的环境样品
        assert len(data["data"]["items"]) == 2
        assert data["data"]["total"] == 2
        
        # 验证所有样品都满足条件
        for item in data["data"]["items"]:
            assert item["client_name"] == "客户A"
            assert item["sample_type"] == "环境样品"
    
    @pytest.mark.asyncio
    async def test_list_samples_pagination(self, async_client: AsyncClient, sample_data_list):
        """测试分页功能"""
        # 第一页，每页2条
        response = await async_client.get("/api/v1/samples/?page=1&page_size=2")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]["items"]) == 2
        assert data["data"]["page"] == 1
        assert data["data"]["page_size"] == 2
        assert data["data"]["total"] == 4  # 排除已归档的
        assert data["data"]["total_pages"] == 2
        
        # 第二页
        response = await async_client.get("/api/v1/samples/?page=2&page_size=2")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]["items"]) == 2
        assert data["data"]["page"] == 2
        assert data["data"]["page_size"] == 2
    
    @pytest.mark.asyncio
    async def test_list_samples_empty_result(self, async_client: AsyncClient, sample_data_list):
        """测试空结果"""
        response = await async_client.get("/api/v1/samples/?client_name=不存在的客户")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["data"]["items"]) == 0
        assert data["data"]["total"] == 0
        assert data["data"]["total_pages"] == 0
    
    @pytest.mark.asyncio
    async def test_list_samples_invalid_page(self, async_client: AsyncClient, sample_data_list):
        """测试无效页码"""
        # 页码为0（应该被调整为1）
        response = await async_client.get("/api/v1/samples/?page=0&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回第一页的数据
        assert data["data"]["page"] >= 1
    
    @pytest.mark.asyncio
    async def test_list_samples_response_fields(self, async_client: AsyncClient, sample_data_list):
        """测试响应字段完整性"""
        response = await async_client.get("/api/v1/samples/?page=1&page_size=1")
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证样品对象包含所有必要字段
        sample = data["data"]["items"][0]
        required_fields = [
            "id", "barcode", "sample_number", "client_name", "sample_name",
            "sample_type", "sample_category", "quantity", "unit", "status",
            "priority", "version", "created_by", "created_at", "updated_at"
        ]
        
        for field in required_fields:
            assert field in sample, f"缺少字段: {field}"


class TestGetSampleByIdAPI:
    """测试样品详情查询 API"""
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_success(self, async_client: AsyncClient, sample_data_list):
        """测试成功查询样品详情"""
        sample_id = sample_data_list[0].id
        
        response = await async_client.get(f"/api/v1/samples/{sample_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证响应结构
        assert "message" in data
        assert "data" in data
        
        # 验证样品数据
        sample = data["data"]
        assert sample["id"] == sample_id
        assert sample["barcode"] == "SP20260409000001"
        assert sample["sample_number"] == "2026000001"
        assert sample["client_name"] == "客户A"
        assert sample["sample_name"] == "水样1"
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_not_found(self, async_client: AsyncClient):
        """测试样品不存在"""
        response = await async_client.get("/api/v1/samples/non-existent-id")
        
        assert response.status_code == 404
        data = response.json()
        
        # 验证错误响应
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
        assert "样品不存在" in data["error"]["message"]
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_all_fields(self, async_client: AsyncClient, sample_data_list):
        """测试返回所有字段"""
        sample_id = sample_data_list[0].id
        
        response = await async_client.get(f"/api/v1/samples/{sample_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        sample = data["data"]
        
        # 验证所有必要字段
        required_fields = [
            "id", "barcode", "sample_number", "client_name", "client_contact",
            "sample_name", "sample_type", "sample_category", "quantity", "unit",
            "received_date", "status", "priority", "version", "created_by",
            "created_at", "updated_at"
        ]
        
        for field in required_fields:
            assert field in sample, f"缺少字段: {field}"
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_archived(self, async_client: AsyncClient, sample_data_list):
        """测试查询已归档样品"""
        # 找到已归档的样品
        archived_sample = next(s for s in sample_data_list if s.status == SampleStatus.ARCHIVED)
        
        response = await async_client.get(f"/api/v1/samples/{archived_sample.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该能够查询到已归档样品的详情
        sample = data["data"]
        assert sample["id"] == archived_sample.id
        assert sample["status"] == "ARCHIVED"
    
    @pytest.mark.asyncio
    async def test_get_sample_by_id_different_statuses(self, async_client: AsyncClient, sample_data_list):
        """测试查询不同状态的样品"""
        for test_sample in sample_data_list:
            response = await async_client.get(f"/api/v1/samples/{test_sample.id}")
            
            assert response.status_code == 200
            data = response.json()
            
            sample = data["data"]
            assert sample["id"] == test_sample.id
            assert sample["status"] == test_sample.status.value


class TestSampleQueryEdgeCases:
    """测试边界情况"""
    
    @pytest.mark.asyncio
    async def test_list_samples_large_page_size(self, async_client: AsyncClient, sample_data_list):
        """测试大页面大小"""
        response = await async_client.get("/api/v1/samples/?page=1&page_size=1000")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回所有非归档样品
        assert len(data["data"]["items"]) == 4
    
    @pytest.mark.asyncio
    async def test_list_samples_beyond_last_page(self, async_client: AsyncClient, sample_data_list):
        """测试超出最后一页"""
        response = await async_client.get("/api/v1/samples/?page=100&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回空列表
        assert len(data["data"]["items"]) == 0
        assert data["data"]["page"] == 100
    
    @pytest.mark.asyncio
    async def test_list_samples_fuzzy_search(self, async_client: AsyncClient, sample_data_list):
        """测试模糊搜索"""
        # 搜索包含"客户"的客户名称
        response = await async_client.get("/api/v1/samples/?client_name=客户")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回所有客户（排除已归档的）
        assert data["data"]["total"] == 4
    
    @pytest.mark.asyncio
    async def test_list_samples_partial_barcode(self, async_client: AsyncClient, sample_data_list):
        """测试部分条码搜索"""
        # 搜索包含"000001"的条码
        response = await async_client.get("/api/v1/samples/?barcode=000001")
        
        assert response.status_code == 200
        data = response.json()
        
        # 应该返回匹配的样品
        assert len(data["data"]["items"]) == 1
        assert "000001" in data["data"]["items"][0]["barcode"]
