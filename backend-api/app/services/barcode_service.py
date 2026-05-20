"""
条码生成服务

提供样品条码和样品编号的生成功能，确保唯一性和并发安全。

条码格式：
- 样品条码：SP{YYYYMMDD}{6位序列号}，例如：SP202604100000001
- 样品编号：{YYYY}{6位序列号}，例如：20260000001

并发安全：
- 使用 asyncio.Lock 确保同一时间只有一个协程生成条码
- 查询数据库获取最大序列号并递增
- 在数据库事务中创建样品记录，利用唯一约束作为最后防线
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sample import Sample

logger = logging.getLogger(__name__)


class BarcodeService:
    """
    条码生成服务
    
    负责生成唯一的样品条码和样品编号。
    使用异步锁确保并发安全，防止生成重复的条码。
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化条码生成服务
        
        Args:
            db: 异步数据库会话
        """
        self.db = db
        self._barcode_lock = asyncio.Lock()
        self._sample_number_lock = asyncio.Lock()
    
    async def generate_barcode(self) -> str:
        """
        生成唯一的样品条码
        
        格式：SP{YYYYMMDD}{6位序列号}
        例如：SP202604100000001
        
        算法：
        1. 获取当前日期，生成日期前缀（YYYYMMDD）
        2. 使用异步锁保护临界区
        3. 查询数据库中今天已有的最大条码
        4. 提取序列号并递增
        5. 生成新条码
        
        Returns:
            str: 生成的唯一条码
            
        Raises:
            ValueError: 当序列号超过最大值（999999）时抛出
        """
        async with self._barcode_lock:
            # 获取当前日期
            now = datetime.now()
            date_prefix = now.strftime("%Y%m%d")
            barcode_prefix = f"SP{date_prefix}"
            
            logger.debug(f"Generating barcode with prefix: {barcode_prefix}")
            
            # 查询今天已有的最大序列号
            stmt = select(func.max(Sample.barcode)).where(
                Sample.barcode.like(f"{barcode_prefix}%")
            )
            result = await self.db.execute(stmt)
            last_barcode = result.scalar()
            
            # 计算新序列号
            if last_barcode:
                # 提取最后6位序列号
                last_sequence = int(last_barcode[-6:])
                sequence = last_sequence + 1
                logger.debug(f"Last barcode: {last_barcode}, sequence: {sequence}")
            else:
                # 今天第一个条码
                sequence = 1
                logger.debug(f"First barcode of the day, sequence: {sequence}")
            
            # 检查序列号是否超过最大值
            if sequence > 999999:
                error_msg = f"今日条码序列号已达上限（999999）"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # 生成新条码
            barcode = f"{barcode_prefix}{sequence:06d}"
            logger.info(f"Generated barcode: {barcode}")
            
            return barcode
    
    async def generate_sample_number(self) -> str:
        """
        生成唯一的样品编号
        
        格式：{YYYY}{6位序列号}
        例如：20260000001
        
        算法：
        1. 获取当前年份，生成年份前缀（YYYY）
        2. 使用异步锁保护临界区
        3. 查询数据库中今年已有的最大样品编号
        4. 提取序列号并递增
        5. 生成新样品编号
        
        Returns:
            str: 生成的唯一样品编号
            
        Raises:
            ValueError: 当序列号超过最大值（999999）时抛出
        """
        async with self._sample_number_lock:
            # 获取当前年份
            now = datetime.now()
            year_prefix = str(now.year)
            
            logger.debug(f"Generating sample number with prefix: {year_prefix}")
            
            # 查询今年已有的最大序列号
            stmt = select(func.max(Sample.sample_number)).where(
                Sample.sample_number.like(f"{year_prefix}%")
            )
            result = await self.db.execute(stmt)
            last_number = result.scalar()
            
            # 计算新序列号
            if last_number:
                # 提取最后6位序列号
                last_sequence = int(last_number[-6:])
                sequence = last_sequence + 1
                logger.debug(f"Last sample number: {last_number}, sequence: {sequence}")
            else:
                # 今年第一个样品编号
                sequence = 1
                logger.debug(f"First sample number of the year, sequence: {sequence}")
            
            # 检查序列号是否超过最大值
            if sequence > 999999:
                error_msg = f"今年样品编号序列号已达上限（999999）"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # 生成新样品编号
            sample_number = f"{year_prefix}{sequence:06d}"
            logger.info(f"Generated sample number: {sample_number}")
            
            return sample_number
    
    @staticmethod
    def validate_barcode(barcode: str) -> bool:
        """
        验证条码格式是否正确
        
        格式：SP + 8位日期（YYYYMMDD） + 6位序列号
        例如：SP202604100000001（2+8+6=16位）
        
        Args:
            barcode: 待验证的条码
            
        Returns:
            bool: 格式正确返回 True，否则返回 False
        """
        if not barcode or len(barcode) != 16:
            return False
        
        # 检查前缀
        if not barcode.startswith("SP"):
            return False
        
        # 检查日期部分（8位数字）
        date_part = barcode[2:10]
        if not date_part.isdigit() or len(date_part) != 8:
            return False
        
        # 检查序列号部分（6位数字）
        sequence_part = barcode[10:]
        if not sequence_part.isdigit() or len(sequence_part) != 6:
            return False
        
        return True
    
    @staticmethod
    def validate_sample_number(sample_number: str) -> bool:
        """
        验证样品编号格式是否正确
        
        格式：4位年份（YYYY） + 6位序列号
        例如：20260000001（4+6=10位）
        
        Args:
            sample_number: 待验证的样品编号
            
        Returns:
            bool: 格式正确返回 True，否则返回 False
        """
        if not sample_number or len(sample_number) != 10:
            return False
        
        # 检查年份部分（4位数字）
        year_part = sample_number[:4]
        if not year_part.isdigit() or len(year_part) != 4:
            return False
        
        # 检查序列号部分（6位数字）
        sequence_part = sample_number[4:]
        if not sequence_part.isdigit() or len(sequence_part) != 6:
            return False
        
        return True
    
    @staticmethod
    def extract_date_from_barcode(barcode: str) -> Optional[datetime]:
        """
        从条码中提取日期
        
        Args:
            barcode: 样品条码
            
        Returns:
            datetime: 提取的日期，如果格式错误返回 None
        """
        if not BarcodeService.validate_barcode(barcode):
            return None
        
        try:
            date_str = barcode[2:10]  # YYYYMMDD
            return datetime.strptime(date_str, "%Y%m%d")
        except ValueError:
            return None
    
    @staticmethod
    def extract_year_from_sample_number(sample_number: str) -> Optional[int]:
        """
        从样品编号中提取年份
        
        Args:
            sample_number: 样品编号
            
        Returns:
            int: 提取的年份，如果格式错误返回 None
        """
        if not BarcodeService.validate_sample_number(sample_number):
            return None
        
        try:
            year_str = sample_number[:4]  # YYYY
            return int(year_str)
        except ValueError:
            return None
