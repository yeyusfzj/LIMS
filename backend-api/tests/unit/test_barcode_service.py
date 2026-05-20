"""
条码生成服务单元测试

测试条码生成服务的核心功能：
1. 条码生成（格式、唯一性、序列号递增）
2. 样品编号生成（格式、唯一性、序列号递增）
3. 格式验证
4. 日期和年份提取
5. 并发安全性
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.barcode_service import BarcodeService
from app.models.sample import Sample


class TestBarcodeGeneration:
    """测试条码生成功能"""
    
    @pytest.mark.asyncio
    async def test_generate_first_barcode_of_day(self):
        """测试生成当天第一个条码"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：没有已存在的条码
        mock_result = MagicMock()
        mock_result.scalar.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 生成条码
        barcode = await service.generate_barcode()
        
        # 验证格式
        assert barcode.startswith("SP")
        assert len(barcode) == 16
        
        # 验证日期部分
        today = datetime.now().strftime("%Y%m%d")
        assert barcode[2:10] == today
        
        # 验证序列号（第一个应该是 000001）
        assert barcode[-6:] == "000001"
    
    @pytest.mark.asyncio
    async def test_generate_barcode_with_existing(self):
        """测试生成条码时已有条码存在"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：已存在条码 SP20260410000005
        today = datetime.now().strftime("%Y%m%d")
        last_barcode = f"SP{today}000005"
        
        mock_result = MagicMock()
        mock_result.scalar.return_value = last_barcode
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 生成条码
        barcode = await service.generate_barcode()
        
        # 验证序列号递增（应该是 000006）
        assert barcode[-6:] == "000006"
        assert barcode == f"SP{today}000006"
    
    @pytest.mark.asyncio
    async def test_generate_barcode_max_sequence_error(self):
        """测试序列号达到最大值时抛出错误"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：序列号已达最大值
        today = datetime.now().strftime("%Y%m%d")
        last_barcode = f"SP{today}999999"
        
        mock_result = MagicMock()
        mock_result.scalar.return_value = last_barcode
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 验证抛出 ValueError
        with pytest.raises(ValueError, match="今日条码序列号已达上限"):
            await service.generate_barcode()


class TestSampleNumberGeneration:
    """测试样品编号生成功能"""
    
    @pytest.mark.asyncio
    async def test_generate_first_sample_number_of_year(self):
        """测试生成当年第一个样品编号"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：没有已存在的样品编号
        mock_result = MagicMock()
        mock_result.scalar.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 生成样品编号
        sample_number = await service.generate_sample_number()
        
        # 验证格式
        assert len(sample_number) == 10
        
        # 验证年份部分
        current_year = str(datetime.now().year)
        assert sample_number[:4] == current_year
        
        # 验证序列号（第一个应该是 000001）
        assert sample_number[-6:] == "000001"
    
    @pytest.mark.asyncio
    async def test_generate_sample_number_with_existing(self):
        """测试生成样品编号时已有编号存在"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：已存在样品编号 2026000123
        current_year = str(datetime.now().year)
        last_number = f"{current_year}000123"
        
        mock_result = MagicMock()
        mock_result.scalar.return_value = last_number
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 生成样品编号
        sample_number = await service.generate_sample_number()
        
        # 验证序列号递增（应该是 000124）
        assert sample_number[-6:] == "000124"
        assert sample_number == f"{current_year}000124"
    
    @pytest.mark.asyncio
    async def test_generate_sample_number_max_sequence_error(self):
        """测试序列号达到最大值时抛出错误"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：序列号已达最大值
        current_year = str(datetime.now().year)
        last_number = f"{current_year}999999"
        
        mock_result = MagicMock()
        mock_result.scalar.return_value = last_number
        mock_db.execute = AsyncMock(return_value=mock_result)
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 验证抛出 ValueError
        with pytest.raises(ValueError, match="今年样品编号序列号已达上限"):
            await service.generate_sample_number()


class TestBarcodeValidation:
    """测试条码格式验证"""
    
    def test_validate_barcode_valid(self):
        """测试有效的条码格式"""
        valid_barcodes = [
            "SP20260410000001",  # SP + 20260410 + 000001 = 16位
            "SP20260101000001",
            "SP20261231999999",
        ]
        
        for barcode in valid_barcodes:
            assert BarcodeService.validate_barcode(barcode) is True
    
    def test_validate_barcode_invalid(self):
        """测试无效的条码格式"""
        invalid_barcodes = [
            "",  # 空字符串
            "SP2026041000001",  # 长度不足
            "SP20260410000000001",  # 长度过长
            "AB202604100000001",  # 前缀错误
            "SP2026041A0000001",  # 包含非数字字符
            "SP20260410000",  # 序列号位数不足
            "202604100000001",  # 缺少前缀
        ]
        
        for barcode in invalid_barcodes:
            assert BarcodeService.validate_barcode(barcode) is False
    
    def test_validate_sample_number_valid(self):
        """测试有效的样品编号格式"""
        valid_numbers = [
            "2026000001",  # 2026 + 000001 = 10位
            "2026000123",
            "2026999999",
        ]
        
        for number in valid_numbers:
            assert BarcodeService.validate_sample_number(number) is True
    
    def test_validate_sample_number_invalid(self):
        """测试无效的样品编号格式"""
        invalid_numbers = [
            "",  # 空字符串
            "202600001",  # 长度不足
            "2026000000001",  # 长度过长
            "202A0000001",  # 包含非数字字符
            "202600000",  # 序列号位数不足
            "0000001",  # 缺少年份
        ]
        
        for number in invalid_numbers:
            assert BarcodeService.validate_sample_number(number) is False


class TestBarcodeExtraction:
    """测试从条码中提取信息"""
    
    def test_extract_date_from_barcode_valid(self):
        """测试从有效条码中提取日期"""
        barcode = "SP20260410000001"  # 16位格式
        date = BarcodeService.extract_date_from_barcode(barcode)
        
        assert date is not None
        assert date.year == 2026
        assert date.month == 4
        assert date.day == 10
    
    def test_extract_date_from_barcode_invalid(self):
        """测试从无效条码中提取日期"""
        invalid_barcodes = [
            "SP20261301000001",  # 无效月份
            "SP20260432000001",  # 无效日期
            "INVALID",  # 完全无效
        ]
        
        for barcode in invalid_barcodes:
            date = BarcodeService.extract_date_from_barcode(barcode)
            assert date is None
    
    def test_extract_year_from_sample_number_valid(self):
        """测试从有效样品编号中提取年份"""
        sample_number = "2026000001"  # 10位格式
        year = BarcodeService.extract_year_from_sample_number(sample_number)
        
        assert year == 2026
    
    def test_extract_year_from_sample_number_invalid(self):
        """测试从无效样品编号中提取年份"""
        invalid_numbers = [
            "INVALID",
            "202600001",  # 长度不足
        ]
        
        for number in invalid_numbers:
            year = BarcodeService.extract_year_from_sample_number(number)
            assert year is None


class TestConcurrency:
    """测试并发安全性"""
    
    @pytest.mark.asyncio
    async def test_concurrent_barcode_generation(self):
        """测试并发生成条码时的安全性"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：初始没有条码
        call_count = 0
        today = datetime.now().strftime("%Y%m%d")
        
        def create_mock_result():
            nonlocal call_count
            mock_result = MagicMock()
            if call_count == 0:
                mock_result.scalar.return_value = None
            else:
                # 后续调用返回递增的条码
                mock_result.scalar.return_value = f"SP{today}{call_count:06d}"
            call_count += 1
            return mock_result
        
        mock_db.execute = AsyncMock(side_effect=lambda *args, **kwargs: create_mock_result())
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 并发生成多个条码
        tasks = [service.generate_barcode() for _ in range(5)]
        barcodes = await asyncio.gather(*tasks)
        
        # 验证所有条码都已生成
        assert len(barcodes) == 5
        
        # 验证所有条码格式正确
        for barcode in barcodes:
            assert BarcodeService.validate_barcode(barcode)
    
    @pytest.mark.asyncio
    async def test_concurrent_sample_number_generation(self):
        """测试并发生成样品编号时的安全性"""
        # 模拟数据库会话
        mock_db = AsyncMock(spec=AsyncSession)
        
        # 模拟查询结果：初始没有样品编号
        call_count = 0
        current_year = str(datetime.now().year)
        
        def create_mock_result():
            nonlocal call_count
            mock_result = MagicMock()
            if call_count == 0:
                mock_result.scalar.return_value = None
            else:
                # 后续调用返回递增的样品编号
                mock_result.scalar.return_value = f"{current_year}{call_count:06d}"
            call_count += 1
            return mock_result
        
        mock_db.execute = AsyncMock(side_effect=lambda *args, **kwargs: create_mock_result())
        
        # 创建服务实例
        service = BarcodeService(mock_db)
        
        # 并发生成多个样品编号
        tasks = [service.generate_sample_number() for _ in range(5)]
        sample_numbers = await asyncio.gather(*tasks)
        
        # 验证所有样品编号都已生成
        assert len(sample_numbers) == 5
        
        # 验证所有样品编号格式正确
        for number in sample_numbers:
            assert BarcodeService.validate_sample_number(number)
