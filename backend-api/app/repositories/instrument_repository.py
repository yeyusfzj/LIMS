"""
仪器仓库类

提供仪器特定的数据访问方法，包括：
- 根据编码查询仪器
- 按状态查询仪器
- 按部门查询仪器
- 其他仪器特定的查询方法

继承自 BaseRepository，复用通用的 CRUD 操作。
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.instrument import Instrument, InstrumentStatus
from app.repositories.base_repository import BaseRepository


class InstrumentRepository(BaseRepository[Instrument]):
    """
    仪器仓库类
    
    提供仪器特定的数据访问方法，继承 BaseRepository 的通用 CRUD 操作。
    所有方法都是异步的，使用 SQLAlchemy 异步 API。
    
    Attributes:
        model: Instrument 模型类
        db: 异步数据库会话
    
    Example:
        repo = InstrumentRepository(db)
        instrument = await repo.get_by_code("INS-2024-001")
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化仪器仓库
        
        Args:
            db: 异步数据库会话
        """
        super().__init__(Instrument, db)
    
    async def get_by_code(self, code: str) -> Optional[Instrument]:
        """
        根据编码查询仪器
        
        Args:
            code: 仪器编码
        
        Returns:
            Optional[Instrument]: 找到的仪器实例，不存在则返回 None
        
        Example:
            instrument = await repo.get_by_code("INS-2024-001")
            if instrument:
                print(f"找到仪器: {instrument.name}")
        """
        result = await self.db.execute(
            select(Instrument).where(Instrument.code == code)
        )
        return result.scalar_one_or_none()
    
    async def get_by_status(
        self,
        status: InstrumentStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Instrument]:
        """
        根据状态查询仪器列表
        
        Args:
            status: 仪器状态（IN_USE, STANDBY, MAINTENANCE, 
                   CALIBRATING, PENDING_DISPOSAL, DISPOSED）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Instrument]: 仪器列表
        
        Example:
            # 查询所有在用的仪器
            instruments = await repo.get_by_status(InstrumentStatus.IN_USE)
            
            # 分页查询
            instruments = await repo.get_by_status(
                InstrumentStatus.MAINTENANCE,
                skip=0,
                limit=10
            )
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status": status}
        )
    
    async def get_by_department(
        self,
        department: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Instrument]:
        """
        根据部门查询仪器列表
        
        Args:
            department: 部门名称
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Instrument]: 仪器列表
        
        Example:
            instruments = await repo.get_by_department("理化检测部")
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"current_department": department}
        )
    
    async def get_by_name(
        self,
        name: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Instrument]:
        """
        根据仪器名称查询仪器列表（模糊查询）
        
        Args:
            name: 仪器名称（支持部分匹配）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Instrument]: 仪器列表
        
        Example:
            # 查询名称包含"色谱"的仪器
            instruments = await repo.get_by_name("色谱")
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"name__ilike": f"%{name}%"}
        )
    
    async def get_active_instruments(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Instrument]:
        """
        获取所有活跃仪器（排除已报废的仪器）
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Instrument]: 活跃仪器列表
        
        Example:
            # 获取所有活跃仪器
            instruments = await repo.get_active_instruments()
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status__notin": [InstrumentStatus.DISPOSED]}
        )
    
    async def count_by_status(self, status: InstrumentStatus) -> int:
        """
        统计指定状态的仪器数量
        
        Args:
            status: 仪器状态
        
        Returns:
            int: 仪器数量
        
        Example:
            count = await repo.count_by_status(InstrumentStatus.IN_USE)
            print(f"在用仪器数量: {count}")
        """
        return await self.count(filters={"status": status})
    
    async def code_exists(self, code: str) -> bool:
        """
        检查编码是否已存在
        
        Args:
            code: 仪器编码
        
        Returns:
            bool: 存在返回 True，否则返回 False
        
        Example:
            if await repo.code_exists("INS-2024-001"):
                print("编码已存在")
        """
        return await self.exists_by_field("code", code)
