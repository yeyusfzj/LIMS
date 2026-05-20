"""
流转仓库类

提供流转记录特定的数据访问方法，包括：
- 获取流转记录列表（支持分页和筛选）
- 根据样品 ID 查询流转记录
- 查询样品的完整监管链
- 按状态查询流转记录
- 按确认状态查询流转记录
- 其他流转特定的查询方法

继承自 BaseRepository，复用通用的 CRUD 操作。
"""
from typing import Optional, List, Tuple
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import joinedload

from app.models.transfer import Transfer, TransferStatus
from app.models.sample import Sample
from app.repositories.base_repository import BaseRepository


class TransferRepository(BaseRepository[Transfer]):
    """
    流转仓库类
    
    提供流转记录特定的数据访问方法，继承 BaseRepository 的通用 CRUD 操作。
    所有方法都是异步的，使用 SQLAlchemy 异步 API。
    
    Attributes:
        model: Transfer 模型类
        db: 异步数据库会话
    
    Example:
        repo = TransferRepository(db)
        transfers = await repo.get_by_sample_id("sample_id_123")
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化流转仓库
        
        Args:
            db: 异步数据库会话
        """
        super().__init__(Transfer, db)
    
    async def get_transfers_with_filters(
        self,
        skip: int = 0,
        limit: int = 100,
        sample_number: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[Transfer], int]:
        """
        获取流转记录列表（支持分页和筛选）
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
            sample_number: 样品编号（可选，模糊搜索）
            status: 流转状态（可选）
            start_date: 开始日期（可选）
            end_date: 结束日期（可选）
        
        Returns:
            Tuple[List[Transfer], int]: (流转记录列表, 总记录数)
        
        Example:
            transfers, total = await repo.get_transfers_with_filters(
                skip=0,
                limit=20,
                sample_number="S2024",
                status="PENDING"
            )
            print(f"找到 {total} 条记录，返回 {len(transfers)} 条")
        """
        # 构建查询条件
        conditions = []
        
        # 样品编号筛选（模糊搜索）
        if sample_number:
            conditions.append(Sample.sample_number.ilike(f"%{sample_number}%"))
        
        # 状态筛选
        if status:
            conditions.append(Transfer.status == status)
        
        # 日期范围筛选
        if start_date:
            conditions.append(Transfer.transfer_date >= datetime.combine(start_date, datetime.min.time()))
        if end_date:
            conditions.append(Transfer.transfer_date <= datetime.combine(end_date, datetime.max.time()))
        
        # 构建查询（关联样品表以支持样品编号筛选）
        query = (
            select(Transfer)
            .join(Sample, Transfer.sample_id == Sample.id)
            .options(joinedload(Transfer.sample))
        )
        
        # 应用筛选条件
        if conditions:
            query = query.where(and_(*conditions))
        
        # 按流转日期降序排序
        query = query.order_by(Transfer.transfer_date.desc())
        
        # 查询总数
        count_query = (
            select(func.count(Transfer.id))
            .join(Sample, Transfer.sample_id == Sample.id)
        )
        if conditions:
            count_query = count_query.where(and_(*conditions))
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # 应用分页
        query = query.offset(skip).limit(limit)
        
        # 执行查询
        result = await self.db.execute(query)
        transfers = list(result.unique().scalars().all())
        
        return transfers, total
    
    async def get_by_sample_id(
        self,
        sample_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        根据样品 ID 查询所有流转记录
        
        Args:
            sample_id: 样品 ID
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 流转记录列表
        
        Example:
            # 查询某个样品的所有流转记录
            transfers = await repo.get_by_sample_id("sample_id_123")
            print(f"找到 {len(transfers)} 条流转记录")
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"sample_id": sample_id},
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def get_chain_of_custody(self, sample_id: str) -> List[Transfer]:
        """
        查询样品的完整监管链（按时间顺序）
        
        返回指定样品的所有流转记录，按流转时间升序排列，
        用于追踪样品的完整流转历史和监管链。
        
        Args:
            sample_id: 样品 ID
        
        Returns:
            List[Transfer]: 按时间顺序排列的流转记录列表
        
        Example:
            # 查询样品的完整监管链
            chain = await repo.get_chain_of_custody("sample_id_123")
            for transfer in chain:
                print(f"{transfer.transfer_date}: {transfer.from_location} -> {transfer.to_location}")
        """
        result = await self.db.execute(
            select(Transfer)
            .where(Transfer.sample_id == sample_id)
            .order_by(Transfer.transfer_date.asc())
        )
        return list(result.scalars().all())
    
    async def get_by_status(
        self,
        status: TransferStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        根据状态查询流转记录列表
        
        Args:
            status: 流转状态（PENDING, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 流转记录列表
        
        Example:
            # 查询所有待处理的流转记录
            pending_transfers = await repo.get_by_status(TransferStatus.PENDING)
            
            # 分页查询
            transfers = await repo.get_by_status(
                TransferStatus.IN_TRANSIT,
                skip=0,
                limit=10
            )
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status": status},
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def get_pending_transfers(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        获取所有待处理的流转记录
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 待处理的流转记录列表
        
        Example:
            # 获取所有待处理的流转记录
            pending = await repo.get_pending_transfers()
        """
        return await self.get_by_status(TransferStatus.PENDING, skip, limit)
    
    async def get_unconfirmed_by_sender(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        获取发送方未确认的流转记录
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 发送方未确认的流转记录列表
        
        Example:
            # 获取所有发送方未确认的流转记录
            unconfirmed = await repo.get_unconfirmed_by_sender()
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"sender_confirmed": False},
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def get_unconfirmed_by_receiver(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        获取接收方未确认的流转记录
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 接收方未确认的流转记录列表
        
        Example:
            # 获取所有接收方未确认的流转记录
            unconfirmed = await repo.get_unconfirmed_by_receiver()
        """
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"receiver_confirmed": False},
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def get_fully_confirmed(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        获取双方都已确认的流转记录
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 双方都已确认的流转记录列表
        
        Example:
            # 获取所有双方都已确认的流转记录
            confirmed = await repo.get_fully_confirmed()
        """
        result = await self.db.execute(
            select(Transfer)
            .where(
                and_(
                    Transfer.sender_confirmed == True,
                    Transfer.receiver_confirmed == True
                )
            )
            .order_by(Transfer.transfer_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
    
    async def get_by_location(
        self,
        location: str,
        location_type: str = "both",
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        根据位置查询流转记录
        
        Args:
            location: 位置名称
            location_type: 位置类型（"from" 起始位置, "to" 目标位置, "both" 任意位置）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 流转记录列表
        
        Example:
            # 查询从某个位置发出的流转记录
            transfers = await repo.get_by_location("实验室A", location_type="from")
            
            # 查询到某个位置的流转记录
            transfers = await repo.get_by_location("实验室B", location_type="to")
            
            # 查询涉及某个位置的所有流转记录
            transfers = await repo.get_by_location("实验室C", location_type="both")
        """
        if location_type == "from":
            filters = {"from_location": location}
        elif location_type == "to":
            filters = {"to_location": location}
        else:  # both
            # 使用 OR 条件查询
            result = await self.db.execute(
                select(Transfer)
                .where(
                    or_(
                        Transfer.from_location == location,
                        Transfer.to_location == location
                    )
                )
                .order_by(Transfer.transfer_date.desc())
                .offset(skip)
                .limit(limit)
            )
            return list(result.scalars().all())
        
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def get_by_person(
        self,
        person: str,
        person_type: str = "both",
        skip: int = 0,
        limit: int = 100
    ) -> List[Transfer]:
        """
        根据人员查询流转记录
        
        Args:
            person: 人员姓名
            person_type: 人员类型（"from" 发送人, "to" 接收人, "both" 任意角色）
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
        
        Returns:
            List[Transfer]: 流转记录列表
        
        Example:
            # 查询某人作为发送人的流转记录
            transfers = await repo.get_by_person("张三", person_type="from")
            
            # 查询某人作为接收人的流转记录
            transfers = await repo.get_by_person("李四", person_type="to")
            
            # 查询某人参与的所有流转记录
            transfers = await repo.get_by_person("王五", person_type="both")
        """
        if person_type == "from":
            filters = {"from_person": person}
        elif person_type == "to":
            filters = {"to_person": person}
        else:  # both
            # 使用 OR 条件查询
            result = await self.db.execute(
                select(Transfer)
                .where(
                    or_(
                        Transfer.from_person == person,
                        Transfer.to_person == person
                    )
                )
                .order_by(Transfer.transfer_date.desc())
                .offset(skip)
                .limit(limit)
            )
            return list(result.scalars().all())
        
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters=filters,
            order_by=[Transfer.transfer_date.desc()]
        )
    
    async def count_by_sample_id(self, sample_id: str) -> int:
        """
        统计指定样品的流转记录数量
        
        Args:
            sample_id: 样品 ID
        
        Returns:
            int: 流转记录数量
        
        Example:
            count = await repo.count_by_sample_id("sample_id_123")
            print(f"该样品有 {count} 条流转记录")
        """
        return await self.count(filters={"sample_id": sample_id})
    
    async def count_by_status(self, status: TransferStatus) -> int:
        """
        统计指定状态的流转记录数量
        
        Args:
            status: 流转状态
        
        Returns:
            int: 流转记录数量
        
        Example:
            count = await repo.count_by_status(TransferStatus.PENDING)
            print(f"待处理流转记录数量: {count}")
        """
        return await self.count(filters={"status": status})
