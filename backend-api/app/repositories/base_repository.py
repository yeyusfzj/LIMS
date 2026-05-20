"""
基础仓库类

提供通用的 CRUD 操作、分页查询和条件过滤功能。
使用泛型支持不同的模型类型，所有方法都是异步的。

使用示例：
    class SampleRepository(BaseRepository[Sample]):
        def __init__(self, db: AsyncSession):
            super().__init__(Sample, db)
    
    # 使用仓库
    repo = SampleRepository(db)
    sample = await repo.create(sample_data)
    samples = await repo.get_all(skip=0, limit=10)
"""
from typing import TypeVar, Generic, Type, Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sql_delete, and_, or_
from sqlalchemy.sql import Select
from pydantic import BaseModel

from app.models.base import Base
from app.core.exceptions import NotFoundException, ConflictException
from app.schemas.response import PaginationMeta

# 定义泛型类型变量
ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class PaginatedResponse(BaseModel, Generic[ModelType]):
    """分页响应模型"""
    items: List[ModelType]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        arbitrary_types_allowed = True


class BaseRepository(Generic[ModelType]):
    """
    基础仓库类
    
    提供通用的数据访问方法，包括：
    - CRUD 操作（创建、读取、更新、删除）
    - 分页查询
    - 条件过滤
    - 批量操作
    
    所有方法都是异步的，使用 SQLAlchemy 异步 API。
    支持乐观锁机制防止并发更新冲突。
    
    Attributes:
        model: SQLAlchemy 模型类
        db: 异步数据库会话
    """
    
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        初始化仓库
        
        Args:
            model: SQLAlchemy 模型类
            db: 异步数据库会话
        """
        self.model = model
        self.db = db
    
    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """
        创建记录
        
        Args:
            obj_in: 包含创建数据的字典
        
        Returns:
            ModelType: 创建的模型实例
        
        Raises:
            ConflictException: 当违反唯一性约束时
        
        Example:
            sample_data = {
                "barcode": "SP20260101000001",
                "sample_number": "2026000001",
                "client_name": "测试客户",
                ...
            }
            sample = await repo.create(sample_data)
        """
        try:
            db_obj = self.model(**obj_in)
            self.db.add(db_obj)
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except Exception as e:
            await self.db.rollback()
            # 检查是否是唯一性约束冲突
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                raise ConflictException(f"记录已存在，违反唯一性约束")
            raise
    
    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        """
        根据 ID 获取记录
        
        Args:
            id: 记录的主键 ID
        
        Returns:
            Optional[ModelType]: 找到的模型实例，不存在则返回 None
        
        Example:
            sample = await repo.get_by_id("123e4567-e89b-12d3-a456-426614174000")
        """
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_id_or_404(self, id: Any) -> ModelType:
        """
        根据 ID 获取记录，不存在则抛出异常
        
        Args:
            id: 记录的主键 ID
        
        Returns:
            ModelType: 找到的模型实例
        
        Raises:
            NotFoundException: 当记录不存在时
        
        Example:
            sample = await repo.get_by_id_or_404("123e4567-e89b-12d3-a456-426614174000")
        """
        obj = await self.get_by_id(id)
        if obj is None:
            raise NotFoundException(f"{self.model.__name__} 不存在")
        return obj
    
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[List[Any]] = None
    ) -> List[ModelType]:
        """
        获取所有记录（支持分页和过滤）
        
        Args:
            skip: 跳过的记录数（用于分页）
            limit: 返回的最大记录数
            filters: 过滤条件字典，键为字段名，值为过滤值
            order_by: 排序字段列表
        
        Returns:
            List[ModelType]: 模型实例列表
        
        Example:
            # 简单查询
            samples = await repo.get_all(skip=0, limit=10)
            
            # 带过滤条件
            samples = await repo.get_all(
                skip=0,
                limit=10,
                filters={"status": "REGISTERED", "client_name": "测试客户"}
            )
            
            # 带排序
            from sqlalchemy import desc
            samples = await repo.get_all(
                skip=0,
                limit=10,
                order_by=[desc(Sample.created_at)]
            )
        """
        query = select(self.model)
        
        # 应用过滤条件
        if filters:
            query = self._apply_filters(query, filters)
        
        # 应用排序
        if order_by:
            query = query.order_by(*order_by)
        
        # 应用分页
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_paginated(
        self,
        page: int = 1,
        page_size: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[List[Any]] = None
    ) -> Tuple[List[ModelType], PaginationMeta]:
        """
        获取分页记录（返回记录和分页元数据）
        
        Args:
            page: 页码（从 1 开始）
            page_size: 每页记录数
            filters: 过滤条件字典
            order_by: 排序字段列表
        
        Returns:
            Tuple[List[ModelType], PaginationMeta]: 记录列表和分页元数据
        
        Example:
            items, meta = await repo.get_paginated(
                page=1,
                page_size=10,
                filters={"status": "REGISTERED"}
            )
            print(f"总记录数: {meta.total}, 总页数: {meta.total_pages}")
        """
        # 确保页码至少为 1
        page = max(1, page)
        page_size = max(1, page_size)
        
        # 计算 skip
        skip = (page - 1) * page_size
        
        # 获取总记录数
        total = await self.count(filters)
        
        # 计算总页数
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        
        # 获取记录
        items = await self.get_all(
            skip=skip,
            limit=page_size,
            filters=filters,
            order_by=order_by
        )
        
        # 创建分页元数据
        meta = PaginationMeta(
            total=total,
            page=page,
            pageSize=page_size,
            totalPages=total_pages
        )
        
        return items, meta
    
    async def update(
        self,
        id: Any,
        obj_in: Dict[str, Any],
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> ModelType:
        """
        更新记录
        
        Args:
            id: 记录的主键 ID
            obj_in: 包含更新数据的字典
            check_version: 是否检查版本号（乐观锁）
            current_version: 当前版本号（用于乐观锁）
        
        Returns:
            ModelType: 更新后的模型实例
        
        Raises:
            NotFoundException: 当记录不存在时
            ConflictException: 当版本冲突时（乐观锁）
        
        Example:
            # 简单更新
            sample = await repo.update(
                id="123e4567-e89b-12d3-a456-426614174000",
                obj_in={"client_name": "新客户名称"}
            )
            
            # 使用乐观锁
            sample = await repo.update(
                id="123e4567-e89b-12d3-a456-426614174000",
                obj_in={"client_name": "新客户名称"},
                check_version=True,
                current_version=1
            )
        """
        db_obj = await self.get_by_id_or_404(id)
        
        # 检查版本号（乐观锁）
        if check_version and hasattr(db_obj, 'version'):
            if current_version is None:
                raise ConflictException("需要提供当前版本号")
            if db_obj.version != current_version:
                raise ConflictException(
                    f"版本冲突：当前版本为 {db_obj.version}，提供的版本为 {current_version}"
                )
        
        # 更新字段
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        # 更新版本号
        if hasattr(db_obj, 'version'):
            db_obj.version += 1
        
        try:
            await self.db.commit()
            await self.db.refresh(db_obj)
            return db_obj
        except Exception as e:
            await self.db.rollback()
            raise
    
    async def delete(self, id: Any, soft_delete: bool = True) -> bool:
        """
        删除记录（支持软删除和硬删除）
        
        Args:
            id: 记录的主键 ID
            soft_delete: 是否软删除（默认 True）
                        软删除：将状态设置为 ARCHIVED
                        硬删除：从数据库中物理删除
        
        Returns:
            bool: 删除成功返回 True
        
        Raises:
            NotFoundException: 当记录不存在时
        
        Example:
            # 软删除
            success = await repo.delete(id="123e4567-e89b-12d3-a456-426614174000")
            
            # 硬删除
            success = await repo.delete(
                id="123e4567-e89b-12d3-a456-426614174000",
                soft_delete=False
            )
        """
        db_obj = await self.get_by_id_or_404(id)
        
        if soft_delete and hasattr(db_obj, 'status'):
            # 软删除：更新状态为 ARCHIVED
            db_obj.status = "ARCHIVED"
            await self.db.commit()
        else:
            # 硬删除：物理删除
            await self.db.delete(db_obj)
            await self.db.commit()
        
        return True
    
    async def delete_many(
        self,
        ids: List[Any],
        soft_delete: bool = True
    ) -> Dict[str, Any]:
        """
        批量删除记录
        
        Args:
            ids: 记录 ID 列表
            soft_delete: 是否软删除（默认 True）
        
        Returns:
            Dict[str, Any]: 包含成功和失败统计的字典
                {
                    "success": 3,
                    "failed": 1,
                    "errors": [{"id": "xxx", "error": "错误信息"}]
                }
        
        Example:
            result = await repo.delete_many(
                ids=["id1", "id2", "id3"],
                soft_delete=True
            )
            print(f"成功删除 {result['success']} 条记录")
        """
        success_count = 0
        failed_count = 0
        errors = []
        
        for id in ids:
            try:
                await self.delete(id, soft_delete=soft_delete)
                success_count += 1
            except Exception as e:
                failed_count += 1
                errors.append({
                    "id": str(id),
                    "error": str(e)
                })
        
        return {
            "success": success_count,
            "failed": failed_count,
            "errors": errors
        }
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        统计记录数量
        
        Args:
            filters: 过滤条件字典
        
        Returns:
            int: 记录数量
        
        Example:
            # 统计所有记录
            total = await repo.count()
            
            # 统计符合条件的记录
            total = await repo.count(filters={"status": "REGISTERED"})
        """
        query = select(func.count()).select_from(self.model)
        
        # 应用过滤条件
        if filters:
            query = self._apply_filters(query, filters)
        
        result = await self.db.execute(query)
        return result.scalar_one()
    
    async def exists(self, id: Any) -> bool:
        """
        检查记录是否存在
        
        Args:
            id: 记录的主键 ID
        
        Returns:
            bool: 存在返回 True，否则返回 False
        
        Example:
            if await repo.exists("123e4567-e89b-12d3-a456-426614174000"):
                print("记录存在")
        """
        obj = await self.get_by_id(id)
        return obj is not None
    
    async def exists_by_field(
        self,
        field_name: str,
        field_value: Any,
        exclude_id: Optional[Any] = None
    ) -> bool:
        """
        检查指定字段值的记录是否存在
        
        Args:
            field_name: 字段名
            field_value: 字段值
            exclude_id: 排除的记录 ID（用于更新时检查唯一性）
        
        Returns:
            bool: 存在返回 True，否则返回 False
        
        Example:
            # 检查条码是否已存在
            exists = await repo.exists_by_field("barcode", "SP20260101000001")
            
            # 更新时检查（排除当前记录）
            exists = await repo.exists_by_field(
                "barcode",
                "SP20260101000001",
                exclude_id="current_id"
            )
        """
        if not hasattr(self.model, field_name):
            return False
        
        field = getattr(self.model, field_name)
        query = select(func.count()).select_from(self.model).where(field == field_value)
        
        # 排除指定 ID
        if exclude_id is not None:
            query = query.where(self.model.id != exclude_id)
        
        result = await self.db.execute(query)
        count = result.scalar_one()
        return count > 0
    
    def _apply_filters(self, query: Select, filters: Dict[str, Any]) -> Select:
        """
        应用过滤条件到查询
        
        支持的过滤方式：
        - 精确匹配：{"field": "value"}
        - 列表匹配（IN）：{"field": ["value1", "value2"]}
        - 范围查询：{"field__gte": value, "field__lte": value}
        - 模糊查询：{"field__like": "%value%"}
        - 空值查询：{"field__isnull": True/False}
        
        Args:
            query: SQLAlchemy 查询对象
            filters: 过滤条件字典
        
        Returns:
            Select: 应用过滤条件后的查询对象
        """
        conditions = []
        
        for key, value in filters.items():
            # 处理特殊操作符
            if "__" in key:
                field_name, operator = key.rsplit("__", 1)
                if not hasattr(self.model, field_name):
                    continue
                
                field = getattr(self.model, field_name)
                
                if operator == "gte":  # 大于等于
                    conditions.append(field >= value)
                elif operator == "gt":  # 大于
                    conditions.append(field > value)
                elif operator == "lte":  # 小于等于
                    conditions.append(field <= value)
                elif operator == "lt":  # 小于
                    conditions.append(field < value)
                elif operator == "like":  # 模糊查询
                    conditions.append(field.like(value))
                elif operator == "ilike":  # 不区分大小写的模糊查询
                    conditions.append(field.ilike(value))
                elif operator == "isnull":  # 空值查询
                    if value:
                        conditions.append(field.is_(None))
                    else:
                        conditions.append(field.isnot(None))
                elif operator == "in":  # IN 查询
                    if isinstance(value, (list, tuple)) and value:
                        conditions.append(field.in_(value))
                elif operator == "notin":  # NOT IN 查询
                    if isinstance(value, (list, tuple)) and value:
                        conditions.append(field.notin_(value))
            else:
                # 精确匹配或 IN 查询
                if not hasattr(self.model, key):
                    continue
                
                field = getattr(self.model, key)
                
                if isinstance(value, (list, tuple)):
                    # 列表值使用 IN 查询
                    if value:  # 只有非空列表才添加条件
                        conditions.append(field.in_(value))
                else:
                    # 精确匹配
                    conditions.append(field == value)
        
        # 应用所有条件（AND 连接）
        if conditions:
            query = query.where(and_(*conditions))
        
        return query
