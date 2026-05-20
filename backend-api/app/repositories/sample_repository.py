"""
样品仓库类

提供样品特定的数据访问方法，包括：
- 根据条码查询样品
- 根据样品编号查询样品
- 按状态查询样品
- 按客户查询样品
- 其他样品特定的查询方法

继承自 BaseRepository，复用通用的 CRUD 操作。
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.sample import Sample, SampleStatus
from app.repositories.base_repository import BaseRepository


class SampleRepository(BaseRepository[Sample]):
    """
    样品仓库类
    
    提供样品特定的数据访问方法，继承 BaseRepository 的通用 CRUD 操作。
    所有方法都是异步的，使用 SQLAlchemy 异步 API。
    
    Attributes:
        model: Sample 模型类
        db: 异步数据库会话
    
    Example:
        repo = SampleRepository(db)
        sample = await repo.get_by_barcode("SP20260101000001")
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化样品仓库
        
        Args:
            db: 异步数据库会话
        """
        super().__init__(Sample, db)
    
    async def get_by_barcode(self, barcode: str) -> Optional[Sample]:
        """
        根据条码查询样品
        
        Args:
            barcode: 样品条码（格式：SP{YYYYMMDD}{6位序列号}）
        
        Returns:
            Optional[Sample]: 找到的样品实例，不存在则返回 None
        
        Example:
            sample = await repo.get_by_barcode("SP20260101000001")
            if sample:
                print(f"找到样品: {sample.sample_name}")
        """
        result = await self.db.execute(
            select(Sample).where(Sample.barcode == barcode)
        )
        return result.scalar_one_or_none()
    
    async def get_by_sample_number(self, sample_number: str) -> Optional[Sample]:
        """
        根据样品编号查询样品
        
        Args:
            sample_number: 样品编号（格式：{YYYY}{6位序列号}）
        
        Returns:
            Optional[Sample]: 找到的样品实例，不存在则返回 None
        
        Example:
            sample = await repo.get_by_sample_number("2026000001")
            if sample:
                print(f"找到样品: {sample.sample_name}")
        """
        result = await self.db.execute(
            select(Sample).where(Sample.sample_number == sample_number)
        )
        return result.scalar_one_or_none()
    
    async def get_by_status(
        self,
        status: SampleStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """
        根据状态查询样品列表
        
        Args:
            status: 样品状态（REGISTERED, IN_TESTING, TESTING_COMPLETE, 
                   IN_AUDIT, AUDIT_COMPLETE, RELEASED, ARCHIVED）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Sample]: 样品列表
        
        Example:
            # 查询所有已登记的样品
            samples = await repo.get_by_status(SampleStatus.REGISTERED)
            
            # 分页查询
            samples = await repo.get_by_status(
                SampleStatus.IN_TESTING,
                skip=0,
                limit=10
            )
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status": status}
        )
    
    async def get_by_client_name(
        self,
        client_name: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """
        根据客户名称查询样品列表（模糊查询）
        
        Args:
            client_name: 客户名称（支持部分匹配）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Sample]: 样品列表
        
        Example:
            # 查询客户名称包含"测试"的样品
            samples = await repo.get_by_client_name("测试")
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"client_name__ilike": f"%{client_name}%"}
        )
    
    async def get_by_sample_type(
        self,
        sample_type: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """
        根据样品类型查询样品列表
        
        Args:
            sample_type: 样品类型
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Sample]: 样品列表
        
        Example:
            samples = await repo.get_by_sample_type("环境样品")
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"sample_type": sample_type}
        )
    
    async def get_active_samples(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """
        获取所有活跃样品（排除已归档的样品）
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Sample]: 活跃样品列表
        
        Example:
            # 获取所有活跃样品
            samples = await repo.get_active_samples()
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status__notin": [SampleStatus.ARCHIVED]}
        )
    
    async def get_by_parent_sample_id(
        self,
        parent_sample_id: str
    ) -> List[Sample]:
        """
        根据母样品 ID 查询所有子样品
        
        Args:
            parent_sample_id: 母样品 ID
        
        Returns:
            List[Sample]: 子样品列表
        
        Example:
            # 查询某个样品的所有子样品
            child_samples = await repo.get_by_parent_sample_id(parent_id)
            print(f"找到 {len(child_samples)} 个子样品")
        """
        result = await self.db.execute(
            select(Sample).where(Sample.parent_sample_id == parent_sample_id)
        )
        return list(result.scalars().all())
    
    async def count_by_status(self, status: SampleStatus) -> int:
        """
        统计指定状态的样品数量
        
        Args:
            status: 样品状态
        
        Returns:
            int: 样品数量
        
        Example:
            count = await repo.count_by_status(SampleStatus.REGISTERED)
            print(f"已登记样品数量: {count}")
        """
        return await self.count(filters={"status": status})
    
    async def barcode_exists(self, barcode: str) -> bool:
        """
        检查条码是否已存在
        
        Args:
            barcode: 样品条码
        
        Returns:
            bool: 存在返回 True，否则返回 False
        
        Example:
            if await repo.barcode_exists("SP20260101000001"):
                print("条码已存在")
        """
        return await self.exists_by_field("barcode", barcode)
    
    async def sample_number_exists(self, sample_number: str) -> bool:
        """
        检查样品编号是否已存在
        
        Args:
            sample_number: 样品编号
        
        Returns:
            bool: 存在返回 True，否则返回 False
        
        Example:
            if await repo.sample_number_exists("2026000001"):
                print("样品编号已存在")
        """
        return await self.exists_by_field("sample_number", sample_number)
