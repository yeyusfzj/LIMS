"""
仪器服务

提供仪器管理的核心业务逻辑，包括：
- 仪器创建（验证编码唯一性）
- 仪器查询（分页、过滤）
- 仪器更新（部分字段更新）
- 仪器状态管理
- 仪器删除（软删除）

所有方法都是异步的，使用数据库事务确保数据一致性。
"""

import logging
from typing import List, Optional, Tuple
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.instrument import Instrument, InstrumentStatus
from app.repositories.instrument_repository import InstrumentRepository
from app.schemas.instrument import InstrumentCreate, InstrumentUpdate
from app.schemas.response import PaginationMeta
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)

logger = logging.getLogger(__name__)


class InstrumentService:
    """
    仪器服务类
    
    提供仪器管理的核心业务逻辑。
    使用仓库模式访问数据。
    
    Attributes:
        db: 异步数据库会话
        instrument_repo: 仪器仓库实例
    
    Example:
        service = InstrumentService(db)
        instrument = await service.create_instrument(instrument_data, user_id)
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化仪器服务
        
        Args:
            db: 异步数据库会话
        """
        self.db = db
        self.instrument_repo = InstrumentRepository(db)
    
    async def create_instrument(
        self,
        instrument_data: InstrumentCreate,
        created_by: str
    ) -> Instrument:
        """
        创建仪器
        
        业务逻辑：
        1. 验证仪器编码唯一性
        2. 初始化仪器状态
        3. 设置创建人和创建时间
        4. 保存到数据库
        
        Args:
            instrument_data: 仪器创建数据（Pydantic 模型）
            created_by: 创建人用户 ID
        
        Returns:
            Instrument: 创建成功的仪器实例
        
        Raises:
            ValidationException: 当数据验证失败时
            ConflictException: 当编码已存在时
            Exception: 其他数据库错误
        
        Example:
            instrument_data = InstrumentCreate(
                code="INS-2024-001",
                name="高效液相色谱仪",
                model="LC-2030C",
                manufacturer="岛津",
                status=InstrumentStatus.IN_USE
            )
            instrument = await service.create_instrument(instrument_data, "user123")
            print(f"仪器创建成功: {instrument.code}")
        """
        try:
            logger.info(f"开始创建仪器，创建人: {created_by}")
            
            # 验证编码唯一性
            if await self.instrument_repo.code_exists(instrument_data.code):
                logger.warning(f"仪器编码已存在: {instrument_data.code}")
                raise ConflictException(f"仪器编码已存在: {instrument_data.code}")
            
            logger.debug(f"仪器编码验证通过: {instrument_data.code}")
            
            # 准备仪器数据
            instrument_dict = instrument_data.model_dump()
            instrument_dict.update({
                "created_by": created_by,
                "version": 1,  # 初始版本号
                "created_at": datetime.utcnow(),  # 显式设置创建时间
                "updated_at": datetime.utcnow()   # 显式设置更新时间
            })
            
            # 创建仪器记录
            instrument = await self.instrument_repo.create(instrument_dict)
            
            # 提交事务
            await self.db.commit()
            await self.db.refresh(instrument)
            
            logger.info(
                f"仪器创建成功: ID={instrument.id}, "
                f"编码={instrument.code}, "
                f"名称={instrument.name}"
            )
            
            return instrument
            
        except ConflictException:
            # 编码冲突
            await self.db.rollback()
            logger.error(f"仪器创建失败：编码冲突")
            raise
            
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(f"仪器创建失败: {str(e)}", exc_info=True)
            raise ValidationException(f"仪器创建失败: {str(e)}")
    
    async def get_instruments(
        self,
        page: int = 1,
        page_size: int = 20,
        code: Optional[str] = None,
        name: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[InstrumentStatus] = None,
        exclude_disposed: bool = True
    ) -> Tuple[List[Instrument], PaginationMeta]:
        """
        查询仪器列表（分页）
        
        业务逻辑：
        1. 构建查询过滤条件
        2. 默认排除 DISPOSED 状态的仪器（除非明确指定）
        3. 支持多条件过滤（编码、名称、部门、状态）
        4. 返回分页数据和元数据
        
        Args:
            page: 页码（从 1 开始）
            page_size: 每页数量
            code: 编码过滤（模糊匹配）
            name: 名称过滤（模糊匹配）
            department: 部门过滤（精确匹配）
            status: 状态过滤（精确匹配）
            exclude_disposed: 是否排除已报废仪器（默认 True）
        
        Returns:
            Tuple[List[Instrument], PaginationMeta]: 仪器列表和分页元数据
        
        Example:
            # 查询第一页，每页 20 条
            instruments, meta = await service.get_instruments(page=1, page_size=20)
            
            # 按部门过滤
            instruments, meta = await service.get_instruments(
                page=1,
                page_size=20,
                department="理化检测部"
            )
            
            # 多条件过滤
            instruments, meta = await service.get_instruments(
                page=1,
                page_size=20,
                name="色谱",
                status=InstrumentStatus.IN_USE
            )
        """
        try:
            logger.info(
                f"查询仪器列表: page={page}, page_size={page_size}, "
                f"code={code}, name={name}, "
                f"department={department}, status={status}"
            )
            
            # 构建过滤条件
            filters = {}
            
            # 编码过滤（模糊匹配）
            if code:
                filters["code__ilike"] = f"%{code}%"
            
            # 名称过滤（模糊匹配）
            if name:
                filters["name__ilike"] = f"%{name}%"
            
            # 部门过滤（精确匹配）
            if department:
                filters["current_department"] = department
            
            # 状态过滤
            if status:
                filters["status"] = status
            elif exclude_disposed:
                # 默认排除 DISPOSED 状态
                filters["status__notin"] = [InstrumentStatus.DISPOSED]
            
            # 执行分页查询
            instruments, meta = await self.instrument_repo.get_paginated(
                page=page,
                page_size=page_size,
                filters=filters,
                order_by=[Instrument.created_at.desc()]
            )
            
            logger.info(
                f"查询完成: 找到 {meta.total} 条记录, "
                f"返回第 {meta.page} 页，共 {meta.totalPages} 页"
            )
            
            return instruments, meta
            
        except Exception as e:
            logger.error(f"查询仪器列表失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询仪器列表失败: {str(e)}")
    
    async def get_instrument_by_id(self, instrument_id: str) -> Instrument:
        """
        根据 ID 查询仪器详情
        
        业务逻辑：
        1. 根据 ID 查询仪器
        2. 如果不存在，抛出 NotFoundException
        3. 返回完整的仪器信息
        
        Args:
            instrument_id: 仪器 ID
        
        Returns:
            Instrument: 仪器实例
        
        Raises:
            NotFoundException: 当仪器不存在时
        
        Example:
            instrument = await service.get_instrument_by_id("123e4567-e89b-12d3-a456-426614174000")
            print(f"仪器名称: {instrument.name}")
        """
        try:
            logger.info(f"查询仪器详情: instrument_id={instrument_id}")
            
            instrument = await self.instrument_repo.get_by_id(instrument_id)
            
            if not instrument:
                logger.warning(f"仪器不存在: {instrument_id}")
                raise NotFoundException(f"仪器不存在: {instrument_id}")
            
            logger.info(f"查询成功: {instrument.code}")
            return instrument
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"查询仪器详情失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询仪器详情失败: {str(e)}")
    
    async def get_instrument_by_code(self, code: str) -> Optional[Instrument]:
        """
        根据编码查询仪器
        
        业务逻辑：
        1. 根据编码查询仪器
        2. 如果不存在，返回 None
        3. 返回仪器信息
        
        Args:
            code: 仪器编码
        
        Returns:
            Optional[Instrument]: 仪器实例，如果不存在则返回 None
        
        Example:
            instrument = await service.get_instrument_by_code("INS-2024-001")
            if instrument:
                print(f"仪器名称: {instrument.name}")
        """
        try:
            logger.info(f"根据编码查询仪器: code={code}")
            
            instrument = await self.instrument_repo.get_by_code(code)
            
            if instrument:
                logger.info(f"查询成功: {instrument.name}")
                return instrument
            else:
                logger.warning(f"仪器不存在: {code}")
                return None
            
        except Exception as e:
            logger.error(f"根据编码查询仪器失败: {str(e)}", exc_info=True)
            raise ValidationException(f"根据编码查询仪器失败: {str(e)}")
    
    async def update_instrument(
        self,
        instrument_id: str,
        instrument_data: InstrumentUpdate,
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> Instrument:
        """
        更新仪器信息
        
        业务逻辑：
        1. 验证仪器是否存在
        2. 过滤掉 None 值（只更新提供的字段）
        3. 防止更新受保护字段（code、created_by、created_at）
        4. 验证更新字段的有效性
        5. 自动更新 updated_at 时间戳
        6. 可选：使用乐观锁防止并发冲突（version 字段）
        7. 提交事务并返回更新后的仪器
        
        Args:
            instrument_id: 仪器 ID
            instrument_data: 仪器更新数据（Pydantic 模型）
            check_version: 是否检查版本号（乐观锁）
            current_version: 当前版本号（用于乐观锁）
        
        Returns:
            Instrument: 更新后的仪器实例
        
        Raises:
            NotFoundException: 当仪器不存在时
            ValidationException: 当数据验证失败时
            ConflictException: 当版本冲突时（乐观锁）
        
        Example:
            # 简单更新
            update_data = InstrumentUpdate(
                current_location="检测室B",
                status=InstrumentStatus.MAINTENANCE
            )
            instrument = await service.update_instrument(instrument_id, update_data)
            
            # 使用乐观锁
            update_data = InstrumentUpdate(current_location="检测室B")
            instrument = await service.update_instrument(
                instrument_id,
                update_data,
                check_version=True,
                current_version=1
            )
        """
        try:
            logger.info(f"开始更新仪器: instrument_id={instrument_id}")
            
            # 1. 验证仪器是否存在
            existing_instrument = await self.get_instrument_by_id(instrument_id)
            
            # 2. 过滤掉 None 值（只更新提供的字段）
            update_dict = instrument_data.model_dump(exclude_unset=True)
            logger.info(f"接收到的更新数据: {update_dict}")
            
            # 3. 定义受保护字段（不允许更新）
            protected_fields = {
                "code",              # 编码（不可变）
                "created_by",        # 创建人（不可变）
                "created_at",        # 创建时间（不可变）
                "id",                # 主键（不可变）
                "version",           # 版本号（由系统管理）
            }
            
            # 4. 移除受保护字段
            filtered_update_dict = {
                k: v for k, v in update_dict.items()
                if k not in protected_fields
            }
            
            logger.info(f"过滤后的更新数据: {filtered_update_dict}")
            
            # 5. 如果没有可更新的字段，直接返回原仪器
            if not filtered_update_dict:
                logger.info(f"没有可更新的字段，返回原仪器: {instrument_id}")
                return existing_instrument
            
            # 6. 记录更新的字段
            logger.debug(f"更新字段: {list(filtered_update_dict.keys())}")
            
            # 7. 执行更新（使用仓库的 update 方法，支持乐观锁）
            updated_instrument = await self.instrument_repo.update(
                id=instrument_id,
                obj_in=filtered_update_dict,
                check_version=check_version,
                current_version=current_version
            )
            
            logger.info(
                f"仪器更新成功: ID={instrument_id}, "
                f"编码={updated_instrument.code}, "
                f"版本={updated_instrument.version}"
            )
            
            return updated_instrument
            
        except NotFoundException:
            # 仪器不存在，直接抛出
            raise
        except ConflictException:
            # 版本冲突，直接抛出
            await self.db.rollback()
            logger.error(f"仪器更新失败：版本冲突 - instrument_id={instrument_id}")
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(f"仪器更新失败: {str(e)}", exc_info=True)
            raise ValidationException(f"仪器更新失败: {str(e)}")
    
    async def update_instrument_status(
        self,
        instrument_id: str,
        new_status: InstrumentStatus,
        updated_by: str,
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> Instrument:
        """
        更新仪器状态
        
        业务逻辑：
        1. 验证仪器是否存在
        2. 验证状态枚举值的有效性（由 Pydantic 自动验证）
        3. 记录状态变更时间（updated_at 自动更新）
        4. 可选：使用乐观锁防止并发冲突
        5. 提交事务并返回更新后的仪器
        
        Args:
            instrument_id: 仪器 ID
            new_status: 新状态（InstrumentStatus 枚举）
            updated_by: 更新人用户 ID
            check_version: 是否检查版本号（乐观锁）
            current_version: 当前版本号（用于乐观锁）
        
        Returns:
            Instrument: 更新后的仪器实例
        
        Raises:
            NotFoundException: 当仪器不存在时
            ValidationException: 当数据验证失败时
            ConflictException: 当版本冲突时（乐观锁）
        
        Example:
            # 简单状态更新
            instrument = await service.update_instrument_status(
                instrument_id="123",
                new_status=InstrumentStatus.MAINTENANCE,
                updated_by="user123"
            )
            
            # 使用乐观锁
            instrument = await service.update_instrument_status(
                instrument_id="123",
                new_status=InstrumentStatus.IN_USE,
                updated_by="user123",
                check_version=True,
                current_version=1
            )
        """
        try:
            logger.info(
                f"开始更新仪器状态: instrument_id={instrument_id}, "
                f"new_status={new_status}, updated_by={updated_by}"
            )
            
            # 1. 验证仪器是否存在
            existing_instrument = await self.get_instrument_by_id(instrument_id)
            
            # 2. 验证状态枚举值（由 InstrumentStatus 枚举类型自动验证）
            if not isinstance(new_status, InstrumentStatus):
                raise ValidationException(
                    f"无效的状态值: {new_status}。"
                    f"有效值为: {', '.join([s.value for s in InstrumentStatus])}"
                )
            
            # 3. 准备更新数据
            update_dict = {
                "status": new_status
            }
            
            # 4. 记录状态变更日志
            logger.info(
                f"状态变更: instrument_id={instrument_id}, "
                f"旧状态={existing_instrument.status}, "
                f"新状态={new_status}"
            )
            
            # 5. 执行更新（使用仓库的 update 方法，支持乐观锁）
            updated_instrument = await self.instrument_repo.update(
                id=instrument_id,
                obj_in=update_dict,
                check_version=check_version,
                current_version=current_version
            )
            
            logger.info(
                f"仪器状态更新成功: ID={instrument_id}, "
                f"编码={updated_instrument.code}, "
                f"状态={updated_instrument.status}, "
                f"版本={updated_instrument.version}"
            )
            
            return updated_instrument
            
        except NotFoundException:
            # 仪器不存在，直接抛出
            raise
        except ConflictException:
            # 版本冲突，直接抛出
            await self.db.rollback()
            logger.error(
                f"仪器状态更新失败：版本冲突 - "
                f"instrument_id={instrument_id}"
            )
            raise
        except ValidationException:
            # 验证异常，直接抛出
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"仪器状态更新失败: {str(e)}", 
                exc_info=True
            )
            raise ValidationException(f"仪器状态更新失败: {str(e)}")
    
    async def delete_instrument(
        self,
        instrument_id: str
    ) -> bool:
        """
        删除仪器（软删除）
        
        业务逻辑：
        1. 验证仪器是否存在
        2. 将状态更新为 DISPOSED（软删除）
        3. 提交事务
        
        Args:
            instrument_id: 仪器 ID
        
        Returns:
            bool: 删除成功返回 True
        
        Raises:
            NotFoundException: 当仪器不存在时
            ValidationException: 当删除失败时
        
        Example:
            success = await service.delete_instrument("123e4567-e89b-12d3-a456-426614174000")
            if success:
                print("仪器删除成功")
        """
        try:
            logger.info(f"开始删除仪器: instrument_id={instrument_id}")
            
            # 1. 验证仪器是否存在
            existing_instrument = await self.get_instrument_by_id(instrument_id)
            
            # 2. 软删除：将状态更新为 DISPOSED
            update_dict = {
                "status": InstrumentStatus.DISPOSED
            }
            
            await self.instrument_repo.update(
                id=instrument_id,
                obj_in=update_dict
            )
            
            logger.info(
                f"仪器删除成功: ID={instrument_id}, "
                f"编码={existing_instrument.code}"
            )
            
            return True
            
        except NotFoundException:
            # 仪器不存在，直接抛出
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(f"仪器删除失败: {str(e)}", exc_info=True)
            raise ValidationException(f"仪器删除失败: {str(e)}")
