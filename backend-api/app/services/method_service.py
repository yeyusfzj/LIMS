"""
检测方法服务

提供检测方法管理的核心业务逻辑，包括：
- 方法创建、查询、更新、删除
- 方法版本管理
- 方法状态管理（草稿、激活、归档）
- 方法复制功能

所有方法都是异步的，使用数据库事务确保数据一致性。
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.models.method import TestMethod, MethodStatus
from app.schemas.method import MethodCreate, MethodUpdate
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)

logger = logging.getLogger(__name__)


class MethodService:
    """
    检测方法服务类
    
    提供检测方法管理的核心业务逻辑。
    
    Example:
        service = MethodService()
        method = await service.create_method(db, method_data, user_id)
    """
    
    async def create_method(
        self,
        db: AsyncSession,
        method_data: MethodCreate,
        created_by: str
    ) -> TestMethod:
        """
        创建检测方法
        
        业务逻辑：
        1. 验证方法编号是否已存在
        2. 创建方法记录
        3. 设置创建人和创建时间
        4. 保存到数据库
        
        Args:
            db: 异步数据库会话
            method_data: 方法创建数据
            created_by: 创建人用户 ID
        
        Returns:
            TestMethod: 创建成功的方法实例
        
        Raises:
            ConflictException: 当方法编号已存在时
            ValidationException: 当数据验证失败时
        """
        try:
            logger.info(f"开始创建检测方法，创建人: {created_by}")
            
            # 检查方法编号是否已存在
            stmt = select(TestMethod).where(TestMethod.code == method_data.code)
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if existing:
                logger.warning(f"方法编号已存在: {method_data.code}")
                raise ConflictException(f"方法编号已存在: {method_data.code}")
            
            # 准备方法数据
            method_dict = method_data.model_dump()
            
            # 转换设备和步骤列表为 JSON 格式
            method_dict['equipment'] = [eq.model_dump() for eq in method_data.equipment]
            method_dict['steps'] = [step.model_dump() for step in method_data.steps]
            
            # 添加系统字段
            method_dict['id'] = str(uuid.uuid4())
            method_dict['createdBy'] = created_by
            method_dict['createdAt'] = datetime.utcnow()
            method_dict['updatedAt'] = datetime.utcnow()
            
            # 创建方法记录
            method = TestMethod(**method_dict)
            db.add(method)
            
            # 提交事务
            await db.commit()
            await db.refresh(method)
            
            logger.info(
                f"检测方法创建成功: ID={method.id}, "
                f"编号={method.code}, "
                f"名称={method.name}"
            )
            
            return method
            
        except ConflictException:
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"创建检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"创建检测方法失败: {str(e)}")
    
    async def get_method_list(
        self,
        db: AsyncSession,
        keyword: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        查询检测方法列表（分页）
        
        业务逻辑：
        1. 构建查询过滤条件
        2. 支持关键词搜索（方法编号、方法名称）
        3. 支持按分类和状态筛选
        4. 返回分页数据
        
        Args:
            db: 异步数据库会话
            keyword: 关键词（搜索编号和名称）
            category: 方法分类
            status: 方法状态
            page: 页码（从 1 开始）
            page_size: 每页数量
        
        Returns:
            Dict: 包含方法列表和分页信息
        """
        try:
            logger.info(
                f"查询检测方法列表: page={page}, page_size={page_size}, "
                f"keyword={keyword}, category={category}, status={status}"
            )
            
            # 构建查询条件
            conditions = []
            
            # 关键词搜索（方法编号或名称）
            if keyword:
                conditions.append(
                    or_(
                        TestMethod.code.ilike(f"%{keyword}%"),
                        TestMethod.name.ilike(f"%{keyword}%")
                    )
                )
            
            # 分类筛选
            if category:
                conditions.append(TestMethod.category == category)
            
            # 状态筛选
            if status:
                try:
                    status_enum = MethodStatus(status.upper())
                    conditions.append(TestMethod.status == status_enum)
                except ValueError:
                    logger.warning(f"无效的状态值: {status}")
            
            # 构建查询
            if conditions:
                where_clause = and_(*conditions)
            else:
                where_clause = True
            
            # 查询总数
            count_stmt = select(func.count()).select_from(TestMethod).where(where_clause)
            total_result = await db.execute(count_stmt)
            total = total_result.scalar()
            
            # 查询数据
            stmt = (
                select(TestMethod)
                .where(where_clause)
                .order_by(TestMethod.updatedAt.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
            result = await db.execute(stmt)
            methods = result.scalars().all()
            
            logger.info(
                f"查询完成: 找到 {total} 条记录, "
                f"返回第 {page} 页"
            )
            
            return {
                "data": methods,
                "total": total,
                "page": page,
                "pageSize": page_size
            }
            
        except Exception as e:
            logger.error(f"查询检测方法列表失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询检测方法列表失败: {str(e)}")
    
    async def get_method_by_id(
        self,
        db: AsyncSession,
        method_id: str
    ) -> TestMethod:
        """
        根据 ID 查询检测方法详情
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
        
        Returns:
            TestMethod: 方法实例
        
        Raises:
            NotFoundException: 当方法不存在时
        """
        try:
            logger.info(f"查询检测方法详情: method_id={method_id}")
            
            stmt = select(TestMethod).where(TestMethod.id == method_id)
            result = await db.execute(stmt)
            method = result.scalar_one_or_none()
            
            if not method:
                logger.warning(f"检测方法不存在: {method_id}")
                raise NotFoundException(f"检测方法不存在")
            
            logger.info(f"查询成功: {method.code}")
            return method
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"查询检测方法详情失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询检测方法详情失败: {str(e)}")
    
    async def update_method(
        self,
        db: AsyncSession,
        method_id: str,
        method_data: MethodUpdate
    ) -> TestMethod:
        """
        更新检测方法信息
        
        业务逻辑：
        1. 验证方法是否存在
        2. 如果更新了方法编号，检查新编号是否已被使用
        3. 过滤掉 None 值（只更新提供的字段）
        4. 自动更新 updatedAt 时间戳
        5. 提交事务并返回更新后的方法
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
            method_data: 方法更新数据
        
        Returns:
            TestMethod: 更新后的方法实例
        
        Raises:
            NotFoundException: 当方法不存在时
            ConflictException: 当方法编号冲突时
            ValidationException: 当数据验证失败时
        """
        try:
            logger.info(f"开始更新检测方法: method_id={method_id}")
            
            # 验证方法是否存在
            existing_method = await self.get_method_by_id(db, method_id)
            
            # 过滤掉 None 值
            update_dict = method_data.model_dump(exclude_unset=True)
            
            # 如果没有可更新的字段，直接返回原方法
            if not update_dict:
                logger.info(f"没有可更新的字段，返回原方法: {method_id}")
                return existing_method
            
            # 如果更新了方法编号，检查新编号是否已被使用
            if 'code' in update_dict and update_dict['code'] != existing_method.code:
                stmt = select(TestMethod).where(TestMethod.code == update_dict['code'])
                result = await db.execute(stmt)
                code_exists = result.scalar_one_or_none()
                
                if code_exists:
                    logger.warning(f"方法编号已存在: {update_dict['code']}")
                    raise ConflictException(f"方法编号已存在")
            
            # 转换设备和步骤列表为 JSON 格式
            if 'equipment' in update_dict and update_dict['equipment'] is not None:
                update_dict['equipment'] = [eq.model_dump() for eq in method_data.equipment]
            
            if 'steps' in update_dict and update_dict['steps'] is not None:
                update_dict['steps'] = [step.model_dump() for step in method_data.steps]
            
            # 更新时间戳
            update_dict['updatedAt'] = datetime.utcnow()
            
            # 更新方法
            for key, value in update_dict.items():
                setattr(existing_method, key, value)
            
            # 提交事务
            await db.commit()
            await db.refresh(existing_method)
            
            logger.info(
                f"检测方法更新成功: ID={method_id}, "
                f"编号={existing_method.code}"
            )
            
            return existing_method
            
        except (NotFoundException, ConflictException):
            await db.rollback()
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"更新检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"更新检测方法失败: {str(e)}")
    
    async def delete_method(
        self,
        db: AsyncSession,
        method_id: str
    ) -> None:
        """
        删除检测方法
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
        
        Raises:
            NotFoundException: 当方法不存在时
        """
        try:
            logger.info(f"开始删除检测方法: method_id={method_id}")
            
            # 验证方法是否存在
            method = await self.get_method_by_id(db, method_id)
            
            # 删除方法
            await db.delete(method)
            await db.commit()
            
            logger.info(f"检测方法删除成功: ID={method_id}")
            
        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"删除检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"删除检测方法失败: {str(e)}")
    
    async def get_method_history(
        self,
        db: AsyncSession,
        method_id: str
    ) -> List[TestMethod]:
        """
        获取检测方法版本历史
        
        业务逻辑：
        1. 查询方法是否存在
        2. 查询同一方法编号的所有版本
        3. 按创建时间倒序排列
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
        
        Returns:
            List[TestMethod]: 版本历史列表
        
        Raises:
            NotFoundException: 当方法不存在时
        """
        try:
            logger.info(f"查询检测方法版本历史: method_id={method_id}")
            
            # 验证方法是否存在
            method = await self.get_method_by_id(db, method_id)
            
            # 查询同一方法编号的所有版本
            stmt = (
                select(TestMethod)
                .where(TestMethod.code == method.code)
                .order_by(TestMethod.createdAt.desc())
            )
            result = await db.execute(stmt)
            history = result.scalars().all()
            
            logger.info(f"查询完成: 找到 {len(history)} 个版本")
            
            return history
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"查询版本历史失败: {str(e)}", exc_info=True)
            raise ValidationException(f"查询版本历史失败: {str(e)}")
    
    async def copy_method(
        self,
        db: AsyncSession,
        method_id: str,
        new_version: str,
        created_by: str
    ) -> TestMethod:
        """
        复制检测方法（创建新版本）
        
        业务逻辑：
        1. 验证原方法是否存在
        2. 复制方法信息
        3. 使用新版本号
        4. 状态设置为 DRAFT
        5. 生成新的 ID
        6. 保存到数据库
        
        Args:
            db: 异步数据库会话
            method_id: 原方法 ID
            new_version: 新版本号
            created_by: 创建人用户 ID
        
        Returns:
            TestMethod: 新创建的方法实例
        
        Raises:
            NotFoundException: 当原方法不存在时
            ValidationException: 当数据验证失败时
        """
        try:
            logger.info(
                f"开始复制检测方法: method_id={method_id}, "
                f"new_version={new_version}"
            )
            
            # 验证原方法是否存在
            original = await self.get_method_by_id(db, method_id)
            
            # 准备新方法数据
            new_method_dict = {
                'id': str(uuid.uuid4()),
                'code': original.code,
                'name': original.name,
                'category': original.category,
                'version': new_version,
                'status': MethodStatus.DRAFT,  # 新版本默认为草稿状态
                'scope': original.scope,
                'description': original.description,
                'equipment': original.equipment,
                'steps': original.steps,
                'precision': original.precision,
                'accuracy': original.accuracy,
                'detectionLimit': original.detectionLimit,
                'measurementRange': original.measurementRange,
                'qualityControl': original.qualityControl,
                'safetyNotes': original.safetyNotes,
                'operationNotes': original.operationNotes,
                'createdBy': created_by,
                'createdAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            }
            
            # 创建新方法记录
            new_method = TestMethod(**new_method_dict)
            db.add(new_method)
            
            # 提交事务
            await db.commit()
            await db.refresh(new_method)
            
            logger.info(
                f"检测方法复制成功: 新ID={new_method.id}, "
                f"版本={new_method.version}"
            )
            
            return new_method
            
        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"复制检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"复制检测方法失败: {str(e)}")
    
    async def archive_method(
        self,
        db: AsyncSession,
        method_id: str
    ) -> None:
        """
        归档检测方法
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
        
        Raises:
            NotFoundException: 当方法不存在时
        """
        try:
            logger.info(f"开始归档检测方法: method_id={method_id}")
            
            # 验证方法是否存在
            method = await self.get_method_by_id(db, method_id)
            
            # 更新状态为归档
            method.status = MethodStatus.ARCHIVED
            method.updatedAt = datetime.utcnow()
            
            # 提交事务
            await db.commit()
            
            logger.info(f"检测方法归档成功: ID={method_id}")
            
        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"归档检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"归档检测方法失败: {str(e)}")
    
    async def activate_method(
        self,
        db: AsyncSession,
        method_id: str
    ) -> None:
        """
        激活检测方法
        
        Args:
            db: 异步数据库会话
            method_id: 方法 ID
        
        Raises:
            NotFoundException: 当方法不存在时
        """
        try:
            logger.info(f"开始激活检测方法: method_id={method_id}")
            
            # 验证方法是否存在
            method = await self.get_method_by_id(db, method_id)
            
            # 更新状态为激活
            method.status = MethodStatus.ACTIVE
            method.updatedAt = datetime.utcnow()
            
            # 提交事务
            await db.commit()
            
            logger.info(f"检测方法激活成功: ID={method_id}")
            
        except NotFoundException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error(f"激活检测方法失败: {str(e)}", exc_info=True)
            raise ValidationException(f"激活检测方法失败: {str(e)}")


# 创建服务实例
method_service = MethodService()
