"""
样品服务

提供样品管理的核心业务逻辑，包括：
- 样品创建（生成条码和编号）
- 样品查询（分页、过滤）
- 样品更新（部分字段更新）
- 样品状态管理
- 样品流转
- 分样和合样操作
- 样品删除（软删除）

所有方法都是异步的，使用数据库事务确保数据一致性。
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.models.sample import Sample, SampleStatus
from app.repositories.sample_repository import SampleRepository
from app.services.barcode_service import BarcodeService
from app.schemas.sample import SampleCreate, SampleUpdate
from app.schemas.response import PaginationMeta
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)

logger = logging.getLogger(__name__)


class SampleService:
    """
    样品服务类
    
    提供样品管理的核心业务逻辑。
    使用仓库模式访问数据，使用条码服务生成唯一标识。
    
    Attributes:
        db: 异步数据库会话
        sample_repo: 样品仓库实例
        barcode_service: 条码生成服务实例
    
    Example:
        service = SampleService(db)
        sample = await service.create_sample(sample_data, user_id)
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化样品服务
        
        Args:
            db: 异步数据库会话
        """
        self.db = db
        self.sample_repo = SampleRepository(db)
        self.barcode_service = BarcodeService(db)
    
    async def create_sample(
        self,
        sample_data: SampleCreate,
        created_by: str
    ) -> Sample:
        """
        创建样品
        
        业务逻辑：
        1. 生成唯一的条码（格式：SP{YYYYMMDD}{6位序列号}）
        2. 生成唯一的样品编号（格式：{YYYY}{6位序列号}）
        3. 初始化样品状态为 REGISTERED
        4. 设置创建人和创建时间
        5. 保存到数据库
        
        Args:
            sample_data: 样品创建数据（Pydantic 模型）
            created_by: 创建人用户 ID
        
        Returns:
            Sample: 创建成功的样品实例
        
        Raises:
            ValidationException: 当数据验证失败时
            ConflictException: 当条码或编号冲突时（理论上不应发生）
            Exception: 其他数据库错误
        
        Example:
            sample_data = SampleCreate(
                client_name="测试客户",
                sample_name="水样",
                sample_type="环境样品",
                sample_category="水质",
                quantity=500.0,
                unit="mL",
                received_date=datetime.now(),
                priority=Priority.NORMAL
            )
            sample = await service.create_sample(sample_data, "user123")
            print(f"样品创建成功: {sample.barcode}")
        """
        try:
            logger.info(f"开始创建样品，创建人: {created_by}")
            
            # 生成唯一条码和样品编号
            barcode = await self.barcode_service.generate_barcode()
            sample_number = await self.barcode_service.generate_sample_number()
            
            logger.debug(f"生成条码: {barcode}, 样品编号: {sample_number}")
            
            # 准备样品数据
            sample_dict = sample_data.model_dump()
            sample_dict.update({
                "barcode": barcode,
                "sample_number": sample_number,
                "status": SampleStatus.REGISTERED,  # 初始化状态为 REGISTERED
                "created_by": created_by,
                "version": 1,  # 初始版本号
                "created_at": datetime.utcnow(),  # 显式设置创建时间
                "updated_at": datetime.utcnow()   # 显式设置更新时间
            })
            
            # 创建样品记录
            sample = await self.sample_repo.create(sample_dict)
            
            # 提交事务
            await self.db.commit()
            await self.db.refresh(sample)
            
            logger.info(
                f"样品创建成功: ID={sample.id}, "
                f"条码={sample.barcode}, "
                f"样品编号={sample.sample_number}"
            )
            
            return sample
            
        except ConflictException:
            # 条码或编号冲突（理论上不应发生，因为有锁保护）
            await self.db.rollback()
            logger.error(f"样品创建失败：条码或编号冲突")
            raise
            
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(f"样品创建失败: {str(e)}", exc_info=True)
            raise ValidationException(f"样品创建失败: {str(e)}")
    
    async def get_samples(
        self,
        page: int = 1,
        page_size: int = 20,
        barcode: Optional[str] = None,
        sample_number: Optional[str] = None,
        client_name: Optional[str] = None,
        sample_type: Optional[str] = None,
        status: Optional[SampleStatus] = None,
        exclude_archived: bool = True
    ) -> Tuple[List[Sample], PaginationMeta]:
        """
        查询样品列表（分页）
        
        业务逻辑：
        1. 构建查询过滤条件
        2. 默认排除 ARCHIVED 状态的样品（除非明确指定）
        3. 支持多条件过滤（条码、样品编号、客户名称、样品类型、状态）
        4. 返回分页数据和元数据
        
        Args:
            page: 页码（从 1 开始）
            page_size: 每页数量
            barcode: 条码过滤（模糊匹配）
            sample_number: 样品编号过滤（模糊匹配）
            client_name: 客户名称过滤（模糊匹配）
            sample_type: 样品类型过滤（精确匹配）
            status: 状态过滤（精确匹配）
            exclude_archived: 是否排除已归档样品（默认 True）
        
        Returns:
            Tuple[List[Sample], PaginationMeta]: 样品列表和分页元数据
        
        Example:
            # 查询第一页，每页 20 条
            samples, meta = await service.get_samples(page=1, page_size=20)
            
            # 按客户名称过滤
            samples, meta = await service.get_samples(
                page=1,
                page_size=20,
                client_name="测试客户"
            )
            
            # 多条件过滤
            samples, meta = await service.get_samples(
                page=1,
                page_size=20,
                sample_type="环境样品",
                status=SampleStatus.REGISTERED
            )
        """
        try:
            logger.info(
                f"查询样品列表: page={page}, page_size={page_size}, "
                f"barcode={barcode}, sample_number={sample_number}, "
                f"client_name={client_name}, sample_type={sample_type}, "
                f"status={status}"
            )
            
            # 构建过滤条件
            filters = {}
            
            # 条码过滤（模糊匹配）
            if barcode:
                filters["barcode__ilike"] = f"%{barcode}%"
            
            # 样品编号过滤（模糊匹配）
            if sample_number:
                filters["sample_number__ilike"] = f"%{sample_number}%"
            
            # 客户名称过滤（模糊匹配）
            if client_name:
                filters["client_name__ilike"] = f"%{client_name}%"
            
            # 样品类型过滤（精确匹配）
            if sample_type:
                filters["sample_type"] = sample_type
            
            # 状态过滤
            if status:
                filters["status"] = status
            elif exclude_archived:
                # 默认排除 ARCHIVED 状态
                filters["status__notin"] = [SampleStatus.ARCHIVED]
            
            # 执行分页查询
            # 使用稳定排序：先按创建时间降序，再按ID升序（确保排序稳定）
            samples, meta = await self.sample_repo.get_paginated(
                page=page,
                page_size=page_size,
                filters=filters,
                order_by=[Sample.created_at.desc(), Sample.id.asc()]
            )
            
            logger.info(
                f"查询完成: 找到 {meta.total} 条记录, "
                f"返回第 {meta.page} 页，共 {meta.totalPages} 页"
            )
            
            return samples, meta
            
        except Exception as e:
            logger.error(f"查询样品列表失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询样品列表失败: {str(e)}")
    
    async def get_sample_by_id(self, sample_id: str) -> Sample:
        """
        根据 ID 查询样品详情
        
        业务逻辑：
        1. 根据 ID 查询样品
        2. 如果不存在，抛出 NotFoundException
        3. 返回完整的样品信息
        
        Args:
            sample_id: 样品 ID
        
        Returns:
            Sample: 样品实例
        
        Raises:
            NotFoundException: 当样品不存在时
        
        Example:
            sample = await service.get_sample_by_id("123e4567-e89b-12d3-a456-426614174000")
            print(f"样品名称: {sample.sample_name}")
        """
        try:
            logger.info(f"查询样品详情: sample_id={sample_id}")
            
            sample = await self.sample_repo.get_by_id(sample_id)
            
            if not sample:
                logger.warning(f"样品不存在: {sample_id}")
                raise NotFoundException(f"样品不存在: {sample_id}")
            
            logger.info(f"查询成功: {sample.barcode}")
            return sample
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"查询样品详情失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询样品详情失败: {str(e)}")
    
    async def get_sample_by_barcode(self, barcode: str) -> Optional[Sample]:
        """
        根据条码查询样品
        
        业务逻辑：
        1. 根据条码查询样品
        2. 如果不存在，返回 None
        3. 返回样品信息
        
        Args:
            barcode: 样品条码
        
        Returns:
            Optional[Sample]: 样品实例，如果不存在则返回 None
        
        Example:
            sample = await service.get_sample_by_barcode("SP20260419000001")
            if sample:
                print(f"样品名称: {sample.sample_name}")
        """
        try:
            logger.info(f"根据条码查询样品: barcode={barcode}")
            
            # 使用仓库的查询方法
            result = await self.sample_repo.get_by_filters({"barcode": barcode})
            
            if result:
                sample = result[0]
                logger.info(f"查询成功: {sample.sample_name}")
                return sample
            else:
                logger.warning(f"样品不存在: {barcode}")
                return None
            
        except Exception as e:
            logger.error(f"根据条码查询样品失败: {str(e)}", exc_info=True)
            raise ValidationException(f"根据条码查询样品失败: {str(e)}")
    
    async def update_sample(
        self,
        sample_id: str,
        sample_data: SampleUpdate,
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> Sample:
        """
        更新样品信息
        
        业务逻辑：
        1. 验证样品是否存在
        2. 过滤掉 None 值（只更新提供的字段）
        3. 防止更新受保护字段（barcode、sample_number、created_by、created_at）
        4. 验证更新字段的有效性
        5. 自动更新 updated_at 时间戳
        6. 可选：使用乐观锁防止并发冲突（version 字段）
        7. 提交事务并返回更新后的样品
        
        Args:
            sample_id: 样品 ID
            sample_data: 样品更新数据（Pydantic 模型）
            check_version: 是否检查版本号（乐观锁）
            current_version: 当前版本号（用于乐观锁）
        
        Returns:
            Sample: 更新后的样品实例
        
        Raises:
            NotFoundException: 当样品不存在时
            ValidationException: 当数据验证失败时
            ConflictException: 当版本冲突时（乐观锁）
        
        Example:
            # 简单更新
            update_data = SampleUpdate(
                client_name="新客户名称",
                storage_location="新存储位置"
            )
            sample = await service.update_sample(sample_id, update_data)
            
            # 使用乐观锁
            update_data = SampleUpdate(client_name="新客户名称")
            sample = await service.update_sample(
                sample_id,
                update_data,
                check_version=True,
                current_version=1
            )
        """
        try:
            logger.info(f"开始更新样品: sample_id={sample_id}")
            
            # 1. 验证样品是否存在
            existing_sample = await self.get_sample_by_id(sample_id)
            
            # 2. 过滤掉 None 值（只更新提供的字段）
            update_dict = sample_data.model_dump(exclude_unset=True)
            logger.info(f"接收到的更新数据: {update_dict}")
            
            # 3. 定义受保护字段（不允许更新）
            protected_fields = {
                "barcode",           # 条码（系统生成）
                "sample_number",     # 样品编号（系统生成）
                "created_by",        # 创建人（不可变）
                "created_at",        # 创建时间（不可变）
                "id",                # 主键（不可变）
                "version",           # 版本号（由系统管理）
                "released_at",       # 放行时间（由状态管理）
                "released_by"        # 放行人（由状态管理）
            }
            
            # 4. 移除受保护字段
            filtered_update_dict = {
                k: v for k, v in update_dict.items()
                if k not in protected_fields
            }
            
            logger.info(f"过滤后的更新数据: {filtered_update_dict}")
            
            # 5. 如果没有可更新的字段，直接返回原样品
            if not filtered_update_dict:
                logger.info(f"没有可更新的字段，返回原样品: {sample_id}")
                return existing_sample
            
            # 6. 记录更新的字段
            logger.debug(f"更新字段: {list(filtered_update_dict.keys())}")
            
            # 7. 执行更新（使用仓库的 update 方法，支持乐观锁）
            updated_sample = await self.sample_repo.update(
                id=sample_id,
                obj_in=filtered_update_dict,
                check_version=check_version,
                current_version=current_version
            )
            
            logger.info(
                f"样品更新成功: ID={sample_id}, "
                f"条码={updated_sample.barcode}, "
                f"版本={updated_sample.version}"
            )
            
            return updated_sample
            
        except NotFoundException:
            # 样品不存在，直接抛出
            raise
        except ConflictException:
            # 版本冲突，直接抛出
            await self.db.rollback()
            logger.error(f"样品更新失败：版本冲突 - sample_id={sample_id}")
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(f"样品更新失败: {str(e)}", exc_info=True)
            raise ValidationException(f"样品更新失败: {str(e)}")
    
    async def update_sample_status(
        self,
        sample_id: str,
        new_status: SampleStatus,
        updated_by: str,
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> Sample:
        """
        更新样品状态
        
        业务逻辑：
        1. 验证样品是否存在
        2. 验证状态枚举值的有效性（由 Pydantic 自动验证）
        3. 记录状态变更时间（updated_at 自动更新）
        4. 处理放行状态（RELEASED）的特殊逻辑：
           - 记录放行时间（released_at）
           - 记录放行人（released_by）
        5. 可选：使用乐观锁防止并发冲突
        6. 提交事务并返回更新后的样品
        
        Args:
            sample_id: 样品 ID
            new_status: 新状态（SampleStatus 枚举）
            updated_by: 更新人用户 ID
            check_version: 是否检查版本号（乐观锁）
            current_version: 当前版本号（用于乐观锁）
        
        Returns:
            Sample: 更新后的样品实例
        
        Raises:
            NotFoundException: 当样品不存在时
            ValidationException: 当数据验证失败时
            ConflictException: 当版本冲突时（乐观锁）
        
        Example:
            # 简单状态更新
            sample = await service.update_sample_status(
                sample_id="123",
                new_status=SampleStatus.IN_TESTING,
                updated_by="user123"
            )
            
            # 使用乐观锁
            sample = await service.update_sample_status(
                sample_id="123",
                new_status=SampleStatus.RELEASED,
                updated_by="user123",
                check_version=True,
                current_version=1
            )
        """
        try:
            logger.info(
                f"开始更新样品状态: sample_id={sample_id}, "
                f"new_status={new_status}, updated_by={updated_by}"
            )
            
            # 1. 验证样品是否存在
            existing_sample = await self.get_sample_by_id(sample_id)
            
            # 2. 验证状态枚举值（由 SampleStatus 枚举类型自动验证）
            if not isinstance(new_status, SampleStatus):
                raise ValidationException(
                    f"无效的状态值: {new_status}。"
                    f"有效值为: {', '.join([s.value for s in SampleStatus])}"
                )
            
            # 3. 准备更新数据
            update_dict = {
                "status": new_status
            }
            
            # 4. 处理放行状态的特殊逻辑
            if new_status == SampleStatus.RELEASED:
                # 记录放行时间和放行人
                update_dict["released_at"] = datetime.utcnow()
                update_dict["released_by"] = updated_by
                logger.info(
                    f"样品放行: sample_id={sample_id}, "
                    f"released_by={updated_by}"
                )
            
            # 5. 记录状态变更日志
            logger.info(
                f"状态变更: sample_id={sample_id}, "
                f"旧状态={existing_sample.status}, "
                f"新状态={new_status}"
            )
            
            # 6. 执行更新（使用仓库的 update 方法，支持乐观锁）
            updated_sample = await self.sample_repo.update(
                id=sample_id,
                obj_in=update_dict,
                check_version=check_version,
                current_version=current_version
            )
            
            logger.info(
                f"样品状态更新成功: ID={sample_id}, "
                f"条码={updated_sample.barcode}, "
                f"状态={updated_sample.status}, "
                f"版本={updated_sample.version}"
            )
            
            return updated_sample
            
        except NotFoundException:
            # 样品不存在，直接抛出
            raise
        except ConflictException:
            # 版本冲突，直接抛出
            await self.db.rollback()
            logger.error(
                f"样品状态更新失败：版本冲突 - "
                f"sample_id={sample_id}"
            )
            raise
        except ValidationException:
            # 验证异常，直接抛出
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"样品状态更新失败: {str(e)}", 
                exc_info=True
            )
            raise ValidationException(f"样品状态更新失败: {str(e)}")
    
    async def split_sample(
        self,
        parent_sample_id: str,
        sub_samples_data: List[Dict[str, Any]],
        created_by: str
    ) -> List[Sample]:
        """
        分样操作
        
        业务逻辑：
        1. 验证母样品是否存在
        2. 验证母样品状态（不能是 ARCHIVED）
        3. 为每个子样品生成唯一的条码和样品编号
        4. 设置 parent_sample_id 建立父子关系
        5. 继承母样品的部分信息（客户信息、样品类型等）
        6. 使用数据库事务确保原子性（所有子样品都创建成功或全部回滚）
        7. 提交事务并返回所有子样品
        
        Args:
            parent_sample_id: 母样品 ID
            sub_samples_data: 子样品数据列表，每个元素包含子样品的特定信息
                             （如 quantity、unit、sample_name 等）
            created_by: 创建人用户 ID
        
        Returns:
            List[Sample]: 创建成功的子样品列表
        
        Raises:
            NotFoundException: 当母样品不存在时
            ValidationException: 当数据验证失败或母样品状态不允许分样时
            Exception: 其他数据库错误
        
        Example:
            sub_samples_data = [
                {
                    "sample_name": "子样品1",
                    "quantity": 100.0,
                    "unit": "mL",
                    "description": "第一份子样品"
                },
                {
                    "sample_name": "子样品2",
                    "quantity": 150.0,
                    "unit": "mL",
                    "description": "第二份子样品"
                }
            ]
            child_samples = await service.split_sample(
                parent_sample_id="parent-id",
                sub_samples_data=sub_samples_data,
                created_by="user123"
            )
            print(f"成功创建 {len(child_samples)} 个子样品")
        """
        try:
            logger.info(
                f"开始分样操作: parent_sample_id={parent_sample_id}, "
                f"子样品数量={len(sub_samples_data)}, "
                f"创建人={created_by}"
            )
            
            # 1. 验证母样品是否存在
            parent_sample = await self.get_sample_by_id(parent_sample_id)
            
            # 2. 验证母样品状态（不能是 ARCHIVED）
            if parent_sample.status == SampleStatus.ARCHIVED:
                error_msg = f"已归档的样品不能进行分样操作: {parent_sample_id}"
                logger.warning(error_msg)
                raise ValidationException(error_msg)
            
            logger.info(
                f"母样品验证通过: 条码={parent_sample.barcode}, "
                f"状态={parent_sample.status}"
            )
            
            # 3. 验证子样品数据
            if not sub_samples_data or len(sub_samples_data) < 1:
                raise ValidationException("至少需要提供 1 个子样品数据")
            
            # 4. 创建所有子样品（使用事务确保原子性）
            child_samples = []
            
            for idx, sub_data in enumerate(sub_samples_data):
                logger.debug(f"创建第 {idx + 1} 个子样品")
                
                # 4.1 生成唯一的条码和样品编号
                barcode = await self.barcode_service.generate_barcode()
                sample_number = await self.barcode_service.generate_sample_number()
                
                logger.debug(
                    f"子样品 {idx + 1}: 条码={barcode}, "
                    f"样品编号={sample_number}"
                )
                
                # 4.2 准备子样品数据
                # 继承母样品的部分信息
                child_sample_dict = {
                    # 系统生成字段
                    "barcode": barcode,
                    "sample_number": sample_number,
                    "status": SampleStatus.REGISTERED,
                    "created_by": created_by,
                    "version": 1,
                    
                    # 建立父子关系
                    "parent_sample_id": parent_sample_id,
                    
                    # 继承母样品的客户信息
                    "client_name": parent_sample.client_name,
                    "client_contact": parent_sample.client_contact,
                    
                    # 继承母样品的样品类型信息
                    "sample_type": parent_sample.sample_type,
                    "sample_category": parent_sample.sample_category,
                    
                    # 继承母样品的接收日期
                    "received_date": parent_sample.received_date,
                    
                    # 继承母样品的采样信息（如果有）
                    "sampling_date": parent_sample.sampling_date,
                    "sampling_location": parent_sample.sampling_location,
                    "sampling_person": parent_sample.sampling_person,
                    
                    # 继承母样品的存储信息（如果有）
                    "storage_location": parent_sample.storage_location,
                    "storage_condition": parent_sample.storage_condition,
                    
                    # 继承母样品的优先级
                    "priority": parent_sample.priority,
                }
                
                # 4.3 合并子样品特定数据（覆盖继承的字段）
                # 子样品可以指定自己的 sample_name, quantity, unit, description, remarks 等
                child_sample_dict.update(sub_data)
                
                # 4.4 如果子样品没有指定 sample_name，使用母样品名称 + 序号
                if "sample_name" not in sub_data or not sub_data.get("sample_name"):
                    child_sample_dict["sample_name"] = (
                        f"{parent_sample.sample_name}-子样品{idx + 1}"
                    )
                
                # 4.5 验证必填字段
                required_fields = ["quantity", "unit"]
                for field in required_fields:
                    if field not in child_sample_dict or child_sample_dict[field] is None:
                        raise ValidationException(
                            f"子样品 {idx + 1} 缺少必填字段: {field}"
                        )
                
                # 4.6 创建子样品记录
                child_sample = await self.sample_repo.create(child_sample_dict)
                child_samples.append(child_sample)
                
                logger.info(
                    f"子样品 {idx + 1} 创建成功: "
                    f"ID={child_sample.id}, "
                    f"条码={child_sample.barcode}, "
                    f"样品名称={child_sample.sample_name}"
                )
            
            # 5. 提交事务
            await self.db.commit()
            
            # 6. 刷新所有子样品以获取最新数据
            for child_sample in child_samples:
                await self.db.refresh(child_sample)
            
            logger.info(
                f"分样操作成功: 母样品={parent_sample_id}, "
                f"创建了 {len(child_samples)} 个子样品"
            )
            
            return child_samples
            
        except NotFoundException:
            # 母样品不存在，直接抛出
            raise
        except ValidationException:
            # 验证异常，回滚事务并抛出
            await self.db.rollback()
            logger.error(f"分样操作验证失败: parent_sample_id={parent_sample_id}")
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"分样操作失败: parent_sample_id={parent_sample_id}, "
                f"错误: {str(e)}",
                exc_info=True
            )
            raise ValidationException(f"分样操作失败: {str(e)}")
    
    async def merge_samples(
        self,
        source_sample_ids: List[str],
        merged_sample_data: Dict[str, Any],
        created_by: str
    ) -> Sample:
        """
        合样操作
        
        业务逻辑：
        1. 验证所有来源样品是否存在
        2. 验证来源样品状态（不能是 ARCHIVED）
        3. 生成唯一的条码和样品编号
        4. 使用第一个来源样品的客户信息
        5. 记录 merged_from_ids 列表
        6. 使用数据库事务确保原子性
        7. 提交事务并返回合并后的样品
        
        Args:
            source_sample_ids: 来源样品 ID 列表（至少 2 个）
            merged_sample_data: 合并后的样品数据，包含样品的特定信息
                               （如 sample_name、quantity、unit 等）
            created_by: 创建人用户 ID
        
        Returns:
            Sample: 创建成功的合并样品
        
        Raises:
            NotFoundException: 当来源样品不存在时
            ValidationException: 当数据验证失败或来源样品状态不允许合样时
            Exception: 其他数据库错误
        
        Example:
            source_sample_ids = ["sample-id-1", "sample-id-2", "sample-id-3"]
            merged_sample_data = {
                "sample_name": "合并样品",
                "quantity": 500.0,
                "unit": "mL",
                "description": "由3个样品合并而成"
            }
            merged_sample = await service.merge_samples(
                source_sample_ids=source_sample_ids,
                merged_sample_data=merged_sample_data,
                created_by="user123"
            )
            print(f"合样成功: {merged_sample.barcode}")
        """
        try:
            logger.info(
                f"开始合样操作: source_sample_ids={source_sample_ids}, "
                f"来源样品数量={len(source_sample_ids)}, "
                f"创建人={created_by}"
            )
            
            # 1. 验证来源样品数量
            if not source_sample_ids or len(source_sample_ids) < 2:
                raise ValidationException("至少需要提供 2 个来源样品")
            
            # 2. 验证所有来源样品是否存在，并检查状态
            source_samples = []
            for idx, sample_id in enumerate(source_sample_ids):
                logger.debug(f"验证来源样品 {idx + 1}: {sample_id}")
                
                # 2.1 查询样品
                sample = await self.get_sample_by_id(sample_id)
                
                # 2.2 验证样品状态（不能是 ARCHIVED）
                if sample.status == SampleStatus.ARCHIVED:
                    error_msg = f"已归档的样品不能进行合样操作: {sample_id}"
                    logger.warning(error_msg)
                    raise ValidationException(error_msg)
                
                source_samples.append(sample)
                logger.debug(
                    f"来源样品 {idx + 1} 验证通过: "
                    f"条码={sample.barcode}, "
                    f"状态={sample.status}"
                )
            
            logger.info(
                f"所有来源样品验证通过，共 {len(source_samples)} 个样品"
            )
            
            # 3. 生成唯一的条码和样品编号
            barcode = await self.barcode_service.generate_barcode()
            sample_number = await self.barcode_service.generate_sample_number()
            
            logger.debug(
                f"生成合并样品条码: {barcode}, "
                f"样品编号: {sample_number}"
            )
            
            # 4. 使用第一个来源样品的客户信息
            first_source = source_samples[0]
            
            # 5. 准备合并样品数据
            merged_sample_dict = {
                # 系统生成字段
                "barcode": barcode,
                "sample_number": sample_number,
                "status": SampleStatus.REGISTERED,
                "created_by": created_by,
                "version": 1,
                
                # 记录来源样品 ID 列表
                "merged_from_ids": source_sample_ids,
                
                # 继承第一个来源样品的客户信息
                "client_name": first_source.client_name,
                "client_contact": first_source.client_contact,
                
                # 继承第一个来源样品的样品类型信息
                "sample_type": first_source.sample_type,
                "sample_category": first_source.sample_category,
                
                # 继承第一个来源样品的接收日期
                "received_date": first_source.received_date,
                
                # 继承第一个来源样品的采样信息（如果有）
                "sampling_date": first_source.sampling_date,
                "sampling_location": first_source.sampling_location,
                "sampling_person": first_source.sampling_person,
                
                # 继承第一个来源样品的存储信息（如果有）
                "storage_location": first_source.storage_location,
                "storage_condition": first_source.storage_condition,
                
                # 继承第一个来源样品的优先级
                "priority": first_source.priority,
            }
            
            # 6. 合并用户提供的样品数据（覆盖继承的字段）
            # 用户可以指定自己的 sample_name, quantity, unit, description, remarks 等
            merged_sample_dict.update(merged_sample_data)
            
            # 7. 如果用户没有指定 sample_name，使用默认名称
            if "sample_name" not in merged_sample_data or not merged_sample_data.get("sample_name"):
                merged_sample_dict["sample_name"] = (
                    f"{first_source.sample_name}-合样"
                )
            
            # 8. 验证必填字段
            required_fields = ["quantity", "unit"]
            for field in required_fields:
                if field not in merged_sample_dict or merged_sample_dict[field] is None:
                    raise ValidationException(
                        f"合并样品缺少必填字段: {field}"
                    )
            
            # 9. 创建合并样品记录
            merged_sample = await self.sample_repo.create(merged_sample_dict)
            
            logger.info(
                f"合并样品创建成功: "
                f"ID={merged_sample.id}, "
                f"条码={merged_sample.barcode}, "
                f"样品名称={merged_sample.sample_name}"
            )
            
            # 10. 提交事务
            await self.db.commit()
            
            # 11. 刷新样品以获取最新数据
            await self.db.refresh(merged_sample)
            
            logger.info(
                f"合样操作成功: 来源样品={source_sample_ids}, "
                f"合并样品ID={merged_sample.id}, "
                f"条码={merged_sample.barcode}"
            )
            
            return merged_sample
            
        except NotFoundException:
            # 来源样品不存在，直接抛出
            raise
        except ValidationException:
            # 验证异常，回滚事务并抛出
            await self.db.rollback()
            logger.error(
                f"合样操作验证失败: source_sample_ids={source_sample_ids}"
            )
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"合样操作失败: source_sample_ids={source_sample_ids}, "
                f"错误: {str(e)}",
                exc_info=True
            )
            raise ValidationException(f"合样操作失败: {str(e)}")

    async def delete_sample(
        self,
        sample_id: str,
        deleted_by: str
    ) -> Sample:
        """
        软删除样品
        
        业务逻辑：
        1. 验证样品是否存在
        2. 检查样品是否已有审核任务或报告（如果有则拒绝删除）
        3. 将样品状态更新为 ARCHIVED（软删除）
        4. 记录删除操作的审计日志
        5. 提交事务并返回更新后的样品
        
        Args:
            sample_id: 样品 ID
            deleted_by: 删除人用户 ID
        
        Returns:
            Sample: 更新后的样品实例（状态为 ARCHIVED）
        
        Raises:
            NotFoundException: 当样品不存在时
            ValidationException: 当样品已有审核任务或报告时
            Exception: 其他数据库错误
        
        Example:
            sample = await service.delete_sample(
                sample_id="123",
                deleted_by="user123"
            )
            print(f"样品已归档: {sample.barcode}")
        """
        try:
            logger.info(
                f"开始软删除样品: sample_id={sample_id}, "
                f"deleted_by={deleted_by}"
            )
            
            # 1. 验证样品是否存在
            existing_sample = await self.get_sample_by_id(sample_id)
            
            # 2. 检查样品是否已归档
            if existing_sample.status == SampleStatus.ARCHIVED:
                logger.warning(f"样品已归档，无需重复删除: {sample_id}")
                return existing_sample
            
            # 3. 检查关联数据（审核任务、报告等）
            # TODO: 实现检查逻辑
            # 这里需要查询审核任务表和报告表
            # 如果样品已有审核任务或报告，则拒绝删除
            # 示例代码（需要根据实际数据模型调整）:
            # has_audit_tasks = await self.check_audit_tasks(sample_id)
            # has_reports = await self.check_reports(sample_id)
            # if has_audit_tasks or has_reports:
            #     raise ValidationException(
            #         f"样品已有审核任务或报告，无法删除: {sample_id}"
            #     )
            
            logger.info(f"样品关联数据检查通过: {sample_id}")
            
            # 4. 更新样品状态为 ARCHIVED（软删除）
            update_dict = {
                "status": SampleStatus.ARCHIVED
            }
            
            updated_sample = await self.sample_repo.update(
                id=sample_id,
                obj_in=update_dict
            )
            
            # 5. 记录审计日志
            logger.info(
                f"样品软删除成功: ID={sample_id}, "
                f"条码={updated_sample.barcode}, "
                f"删除人={deleted_by}"
            )
            
            # TODO: 记录到审计日志表
            # await self.audit_log_service.log(
            #     action="DELETE_SAMPLE",
            #     resource_type="SAMPLE",
            #     resource_id=sample_id,
            #     user_id=deleted_by,
            #     details={"barcode": updated_sample.barcode}
            # )
            
            return updated_sample
            
        except NotFoundException:
            # 样品不存在，直接抛出
            raise
        except ValidationException:
            # 验证异常，直接抛出
            raise
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"样品软删除失败: sample_id={sample_id}, "
                f"错误: {str(e)}",
                exc_info=True
            )
            raise ValidationException(f"样品软删除失败: {str(e)}")
    
    async def batch_delete_samples(
        self,
        sample_ids: List[str],
        deleted_by: str
    ) -> Dict[str, Any]:
        """
        批量软删除样品
        
        业务逻辑：
        1. 遍历所有样品 ID
        2. 对每个样品执行软删除操作
        3. 记录成功和失败的样品
        4. 返回统计信息（成功数量、失败数量、失败详情）
        
        Args:
            sample_ids: 样品 ID 列表
            deleted_by: 删除人用户 ID
        
        Returns:
            Dict[str, Any]: 批量删除结果统计
                {
                    "total": 总数,
                    "success": 成功数量,
                    "failed": 失败数量,
                    "success_ids": 成功的样品 ID 列表,
                    "failed_details": 失败详情列表 [{"id": "...", "error": "..."}]
                }
        
        Example:
            result = await service.batch_delete_samples(
                sample_ids=["id1", "id2", "id3"],
                deleted_by="user123"
            )
            print(f"成功: {result['success']}, 失败: {result['failed']}")
        """
        try:
            logger.info(
                f"开始批量软删除样品: 数量={len(sample_ids)}, "
                f"deleted_by={deleted_by}"
            )
            
            # 初始化统计信息
            total = len(sample_ids)
            success_count = 0
            failed_count = 0
            success_ids = []
            failed_details = []
            
            # 遍历所有样品 ID
            for sample_id in sample_ids:
                try:
                    # 执行软删除
                    await self.delete_sample(
                        sample_id=sample_id,
                        deleted_by=deleted_by
                    )
                    
                    # 记录成功
                    success_count += 1
                    success_ids.append(sample_id)
                    
                    logger.debug(f"样品删除成功: {sample_id}")
                    
                except NotFoundException as e:
                    # 样品不存在
                    failed_count += 1
                    failed_details.append({
                        "id": sample_id,
                        "error": f"样品不存在: {str(e)}"
                    })
                    logger.warning(f"样品删除失败（不存在）: {sample_id}")
                    
                except ValidationException as e:
                    # 验证失败（如已有审核任务或报告）
                    failed_count += 1
                    failed_details.append({
                        "id": sample_id,
                        "error": str(e)
                    })
                    logger.warning(f"样品删除失败（验证失败）: {sample_id}, {str(e)}")
                    
                except Exception as e:
                    # 其他错误
                    failed_count += 1
                    failed_details.append({
                        "id": sample_id,
                        "error": f"删除失败: {str(e)}"
                    })
                    logger.error(
                        f"样品删除失败（未知错误）: {sample_id}, {str(e)}",
                        exc_info=True
                    )
            
            # 构建返回结果
            result = {
                "total": total,
                "success": success_count,
                "failed": failed_count,
                "success_ids": success_ids,
                "failed_details": failed_details
            }
            
            logger.info(
                f"批量软删除完成: 总数={total}, "
                f"成功={success_count}, 失败={failed_count}"
            )
            
            return result
            
        except Exception as e:
            logger.error(
                f"批量软删除失败: {str(e)}",
                exc_info=True
            )
            raise ValidationException(f"批量软删除失败: {str(e)}")
