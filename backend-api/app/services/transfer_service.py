"""
流转服务

提供样品流转的核心业务逻辑，包括：
- 流转记录列表查询（支持分页和筛选）
- 流转记录创建（使用事务确保原子性）
- 流转确认（发送方和接收方）
- 监管链查询
- 流转状态管理

所有方法都是异步的，使用数据库事务确保数据一致性。
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, date

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transfer import Transfer, TransferStatus
from app.repositories.transfer_repository import TransferRepository
from app.repositories.sample_repository import SampleRepository
from app.schemas.transfer import TransferCreate, TransferResponse
from app.core.exceptions import (
    NotFoundException,
    ValidationException
)

logger = logging.getLogger(__name__)


class TransferService:
    """
    流转服务类
    
    提供样品流转的核心业务逻辑。
    使用仓库模式访问数据，使用事务确保数据一致性。
    
    Attributes:
        db: 异步数据库会话
        transfer_repo: 流转仓库实例
        sample_repo: 样品仓库实例
    
    Example:
        service = TransferService(db)
        transfer = await service.create_transfer(sample_id, transfer_data, user_id)
    """
    
    def __init__(self, db: AsyncSession):
        """
        初始化流转服务
        
        Args:
            db: 异步数据库会话
        """
        self.db = db
        self.transfer_repo = TransferRepository(db)
        self.sample_repo = SampleRepository(db)
    
    async def get_transfers_list(
        self,
        page: int = 1,
        page_size: int = 20,
        sample_number: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        获取流转记录列表（支持分页和筛选）
        
        业务逻辑：
        1. 构建查询条件（样品编号、状态、日期范围）
        2. 执行分页查询
        3. 返回流转记录列表和分页信息
        
        Args:
            page: 页码（从 1 开始）
            page_size: 每页数量
            sample_number: 样品编号（可选，模糊搜索）
            status: 流转状态（可选）
            start_date: 开始日期（可选）
            end_date: 结束日期（可选）
        
        Returns:
            Dict[str, Any]: 包含流转记录列表和分页信息
            {
                "items": [TransferResponse, ...],
                "pagination": {
                    "total": 总记录数,
                    "page": 当前页码,
                    "page_size": 每页数量,
                    "total_pages": 总页数
                }
            }
        
        Example:
            result = await service.get_transfers_list(
                page=1,
                page_size=20,
                sample_number="S2024",
                status="PENDING"
            )
            print(f"找到 {result['pagination']['total']} 条记录")
        """
        try:
            logger.info(
                f"开始查询流转记录列表: page={page}, page_size={page_size}, "
                f"sample_number={sample_number}, status={status}, "
                f"start_date={start_date}, end_date={end_date}"
            )
            
            # 计算 skip
            skip = (page - 1) * page_size
            
            # 调用仓库方法获取流转记录列表
            transfers, total = await self.transfer_repo.get_transfers_with_filters(
                skip=skip,
                limit=page_size,
                sample_number=sample_number,
                status=status,
                start_date=start_date,
                end_date=end_date
            )
            
            # 计算总页数
            total_pages = (total + page_size - 1) // page_size
            
            logger.info(
                f"流转记录列表查询成功: 返回 {len(transfers)} 条记录, "
                f"总记录数 {total}, 总页数 {total_pages}"
            )
            
            # 转换为响应模型
            items = [TransferResponse.model_validate(t) for t in transfers]
            
            return {
                "items": items,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": total_pages
                }
            }
            
        except Exception as e:
            logger.error(
                f"流转记录列表查询失败: error={str(e)}",
                exc_info=True
            )
            raise ValidationException(f"流转记录列表查询失败: {str(e)}")
    
    async def create_transfer(
        self,
        sample_id: str,
        transfer_data: TransferCreate,
        created_by: str
    ) -> Transfer:
        """
        创建流转记录
        
        业务逻辑：
        1. 验证样品是否存在
        2. 验证必填字段（由 Pydantic 自动验证）
        3. 创建流转记录（状态初始化为 PENDING）
        4. 更新样品的存储位置为目标位置
        5. 使用数据库事务确保原子性
        
        Args:
            sample_id: 样品 ID
            transfer_data: 流转创建数据（Pydantic 模型）
            created_by: 创建人用户 ID
        
        Returns:
            Transfer: 创建成功的流转记录实例
        
        Raises:
            NotFoundException: 当样品不存在时
            ValidationException: 当数据验证失败时
            Exception: 其他数据库错误
        
        Example:
            transfer_data = TransferCreate(
                from_location="实验室A",
                to_location="实验室B",
                from_person="张三",
                to_person="李四",
                remarks="常规流转"
            )
            transfer = await service.create_transfer(
                sample_id="123",
                transfer_data=transfer_data,
                created_by="user123"
            )
            print(f"流转记录创建成功: {transfer.id}")
        """
        try:
            logger.info(
                f"开始创建流转记录: sample_id={sample_id}, "
                f"from_location={transfer_data.from_location}, "
                f"to_location={transfer_data.to_location}, "
                f"created_by={created_by}"
            )
            
            # 1. 验证样品是否存在
            sample = await self.sample_repo.get_by_id(sample_id)
            if not sample:
                logger.warning(f"样品不存在: {sample_id}")
                raise NotFoundException(f"样品不存在: {sample_id}")
            
            logger.debug(
                f"样品验证通过: ID={sample.id}, "
                f"条码={sample.barcode}, "
                f"当前位置={sample.storage_location}"
            )
            
            # 2. 准备流转记录数据
            transfer_dict = transfer_data.model_dump()
            transfer_dict.update({
                "sample_id": sample_id,
                "status": TransferStatus.PENDING,  # 初始化状态为 PENDING
                "sender_confirmed": False,         # 发送方未确认
                "receiver_confirmed": False,       # 接收方未确认
                "transfer_date": datetime.utcnow()  # 流转时间
            })
            
            # 3. 创建流转记录
            transfer = await self.transfer_repo.create(transfer_dict)
            
            logger.debug(
                f"流转记录已创建: ID={transfer.id}, "
                f"状态={transfer.status}"
            )
            
            # 4. 更新样品的存储位置为目标位置
            await self.sample_repo.update(
                id=sample_id,
                obj_in={"storage_location": transfer_data.to_location}
            )
            
            logger.debug(
                f"样品存储位置已更新: {sample.storage_location} -> "
                f"{transfer_data.to_location}"
            )
            
            # 5. 提交事务
            await self.db.commit()
            await self.db.refresh(transfer)
            
            logger.info(
                f"流转记录创建成功: ID={transfer.id}, "
                f"样品ID={sample_id}, "
                f"从 {transfer.from_location} 到 {transfer.to_location}"
            )
            
            return transfer
            
        except NotFoundException:
            # 样品不存在，直接抛出
            await self.db.rollback()
            raise
            
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"流转记录创建失败: sample_id={sample_id}, "
                f"error={str(e)}",
                exc_info=True
            )
            raise ValidationException(f"流转记录创建失败: {str(e)}")
    
    async def confirm_transfer(
        self,
        transfer_id: str,
        confirmation_type: str,
        confirmed_by: str
    ) -> Transfer:
        """
        确认流转记录
        
        业务逻辑：
        1. 验证流转记录是否存在
        2. 验证 confirmation_type 是否有效（sender 或 receiver）
        3. 根据 confirmation_type 更新对应的确认标志
        4. 如果双方都确认（sender_confirmed=True AND receiver_confirmed=True），则：
           - 更新流转状态为 RECEIVED
           - 记录接收时间（received_date）
        5. 使用数据库事务确保原子性
        
        Args:
            transfer_id: 流转记录 ID
            confirmation_type: 确认类型（"sender" 发送方确认, "receiver" 接收方确认）
            confirmed_by: 确认人用户 ID
        
        Returns:
            Transfer: 更新后的流转记录实例
        
        Raises:
            NotFoundException: 当流转记录不存在时
            ValidationException: 当 confirmation_type 无效时
            Exception: 其他数据库错误
        
        Example:
            # 发送方确认
            transfer = await service.confirm_transfer(
                transfer_id="123",
                confirmation_type="sender",
                confirmed_by="user123"
            )
            
            # 接收方确认
            transfer = await service.confirm_transfer(
                transfer_id="123",
                confirmation_type="receiver",
                confirmed_by="user456"
            )
            
            # 双方确认后，状态自动更新为 RECEIVED
            print(f"流转状态: {transfer.status}")
            print(f"接收时间: {transfer.received_date}")
        """
        try:
            logger.info(
                f"开始确认流转记录: transfer_id={transfer_id}, "
                f"confirmation_type={confirmation_type}, "
                f"confirmed_by={confirmed_by}"
            )
            
            # 1. 验证流转记录是否存在
            transfer = await self.transfer_repo.get_by_id(transfer_id)
            if not transfer:
                logger.warning(f"流转记录不存在: {transfer_id}")
                raise NotFoundException(f"流转记录不存在: {transfer_id}")
            
            logger.debug(
                f"流转记录验证通过: ID={transfer.id}, "
                f"当前状态={transfer.status}, "
                f"发送方已确认={transfer.sender_confirmed}, "
                f"接收方已确认={transfer.receiver_confirmed}"
            )
            
            # 2. 验证 confirmation_type 是否有效
            if confirmation_type not in ["sender", "receiver"]:
                logger.warning(
                    f"无效的确认类型: {confirmation_type}, "
                    f"transfer_id={transfer_id}"
                )
                raise ValidationException(
                    f"无效的确认类型: {confirmation_type}，"
                    f"必须是 'sender' 或 'receiver'"
                )
            
            # 3. 准备更新数据
            update_data = {}
            
            # 根据 confirmation_type 更新对应的确认标志
            if confirmation_type == "sender":
                update_data["sender_confirmed"] = True
                logger.debug(f"设置发送方确认标志: transfer_id={transfer_id}")
            else:  # receiver
                update_data["receiver_confirmed"] = True
                logger.debug(f"设置接收方确认标志: transfer_id={transfer_id}")
            
            # 4. 检查是否双方都确认
            # 需要考虑当前更新后的状态
            sender_confirmed = (
                update_data.get("sender_confirmed", transfer.sender_confirmed)
            )
            receiver_confirmed = (
                update_data.get("receiver_confirmed", transfer.receiver_confirmed)
            )
            
            if sender_confirmed and receiver_confirmed:
                # 双方都确认，更新状态为 RECEIVED 并记录接收时间
                update_data["status"] = TransferStatus.RECEIVED
                update_data["received_date"] = datetime.utcnow()
                
                logger.info(
                    f"双方确认完成，更新流转状态为 RECEIVED: "
                    f"transfer_id={transfer_id}"
                )
            else:
                # 只有一方确认，更新状态为 IN_TRANSIT
                if transfer.status == TransferStatus.PENDING:
                    update_data["status"] = TransferStatus.IN_TRANSIT
                    logger.debug(
                        f"单方确认，更新流转状态为 IN_TRANSIT: "
                        f"transfer_id={transfer_id}"
                    )
            
            # 5. 更新流转记录
            updated_transfer = await self.transfer_repo.update(
                id=transfer_id,
                obj_in=update_data
            )
            
            logger.debug(
                f"流转记录已更新: ID={updated_transfer.id}, "
                f"状态={updated_transfer.status}, "
                f"发送方已确认={updated_transfer.sender_confirmed}, "
                f"接收方已确认={updated_transfer.receiver_confirmed}"
            )
            
            # 6. 提交事务
            await self.db.commit()
            await self.db.refresh(updated_transfer)
            
            logger.info(
                f"流转确认成功: ID={transfer_id}, "
                f"确认类型={confirmation_type}, "
                f"当前状态={updated_transfer.status}, "
                f"发送方已确认={updated_transfer.sender_confirmed}, "
                f"接收方已确认={updated_transfer.receiver_confirmed}"
            )
            
            return updated_transfer
            
        except (NotFoundException, ValidationException):
            # 业务异常，直接抛出
            await self.db.rollback()
            raise
            
        except Exception as e:
            # 其他错误，回滚事务
            await self.db.rollback()
            logger.error(
                f"流转确认失败: transfer_id={transfer_id}, "
                f"confirmation_type={confirmation_type}, "
                f"error={str(e)}",
                exc_info=True
            )
            raise ValidationException(f"流转确认失败: {str(e)}")
    
    async def get_chain_of_custody(self, sample_id: str) -> List[Transfer]:
        """
        查询样品的完整监管链
        
        业务逻辑：
        1. 验证样品是否存在
        2. 调用 TransferRepository 的 get_chain_of_custody() 方法
        3. 返回按时间顺序排列的流转记录列表
        
        监管链包含样品的所有流转记录，按时间升序排列，用于追踪样品的完整流转历史。
        每条记录包含：起始位置、目标位置、交接人、时间戳、确认状态等信息。
        
        Args:
            sample_id: 样品 ID
        
        Returns:
            List[Transfer]: 按时间顺序排列的流转记录列表（可能为空列表）
        
        Raises:
            NotFoundException: 当样品不存在时
            Exception: 其他数据库错误
        
        Example:
            # 查询样品的完整监管链
            chain = await service.get_chain_of_custody("sample_id_123")
            
            # 遍历监管链
            for transfer in chain:
                print(
                    f"{transfer.transfer_date}: "
                    f"{transfer.from_location} -> {transfer.to_location}, "
                    f"状态: {transfer.status}, "
                    f"发送方确认: {transfer.sender_confirmed}, "
                    f"接收方确认: {transfer.receiver_confirmed}"
                )
            
            # 空监管链（样品从未流转）
            if not chain:
                print("该样品尚未发生流转")
        """
        try:
            logger.info(f"开始查询样品监管链: sample_id={sample_id}")
            
            # 1. 验证样品是否存在
            sample = await self.sample_repo.get_by_id(sample_id)
            if not sample:
                logger.warning(f"样品不存在: {sample_id}")
                raise NotFoundException(f"样品不存在: {sample_id}")
            
            logger.debug(
                f"样品验证通过: ID={sample.id}, "
                f"条码={sample.barcode}, "
                f"样品名称={sample.sample_name}"
            )
            
            # 2. 调用 TransferRepository 获取监管链
            chain = await self.transfer_repo.get_chain_of_custody(sample_id)
            
            logger.info(
                f"监管链查询成功: sample_id={sample_id}, "
                f"流转记录数={len(chain)}"
            )
            
            if chain:
                logger.debug(
                    f"监管链详情: "
                    f"首次流转={chain[0].transfer_date}, "
                    f"最后流转={chain[-1].transfer_date}, "
                    f"流转次数={len(chain)}"
                )
            else:
                logger.debug(f"样品尚未发生流转: sample_id={sample_id}")
            
            # 3. 返回监管链（按时间升序排列）
            return chain
            
        except NotFoundException:
            # 样品不存在，直接抛出
            raise
            
        except Exception as e:
            # 其他错误
            logger.error(
                f"监管链查询失败: sample_id={sample_id}, "
                f"error={str(e)}",
                exc_info=True
            )
            raise ValidationException(f"监管链查询失败: {str(e)}")
