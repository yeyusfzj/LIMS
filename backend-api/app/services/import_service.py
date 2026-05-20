"""
批量导入服务

实现检测结果的批量导入功能
验证需求：3.2, 11.8, 10.1
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
import logging
import uuid
from datetime import datetime

from app.models.result import Result, ResultSource
from app.models.sample import Sample
from app.schemas.result import (
    ImportResult,
    ImportError,
    ResultResponse,
    ImportTaskStatus,
    ImportTaskResponse
)
from app.utils.file_parser import file_parser
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


class ImportService:
    """批量导入服务类"""

    async def import_results(
        self,
        db: AsyncSession,
        content: bytes,
        filename: str,
        entered_by: str,
        field_mapping: Optional[Dict[str, str]] = None
    ) -> ImportResult:
        """
        导入检测结果
        
        需求 3.2: 支持批量导入检测结果
        需求 11.8: 使用批量插入优化性能
        需求 10.1: 提供详细的错误信息
        
        Args:
            db: 数据库会话
            content: 文件内容（字节）
            filename: 文件名
            entered_by: 录入人员 ID
            field_mapping: 字段映射配置（可选）
            
        Returns:
            导入结果
        """
        errors: List[ImportError] = []
        data_rows: List[Dict[str, Any]] = []

        try:
            # 步骤 1: 解析文件
            logger.info(f"Starting file import: {filename}")
            
            data_rows = file_parser.parse_file(content, filename)
            
            if not data_rows:
                return ImportResult(
                    success=False,
                    total_records=0,
                    success_count=0,
                    failure_count=0,
                    errors=[ImportError(
                        row=0,
                        message="文件中没有有效数据"
                    )]
                )

            logger.info(f"File parsed successfully: {len(data_rows)} records")

            # 步骤 2: 验证数据
            validation_result = await self._validate_data(db, data_rows, field_mapping)
            errors.extend(validation_result['errors'])
            valid_rows = validation_result['valid_rows']

            if not valid_rows:
                return ImportResult(
                    success=False,
                    total_records=len(data_rows),
                    success_count=0,
                    failure_count=len(data_rows),
                    errors=errors
                )

            # 步骤 3: 批量插入
            inserted_results = await self._batch_insert(db, valid_rows, entered_by)

            # 步骤 4: 返回结果
            result = ImportResult(
                success=len(errors) == 0,
                total_records=len(data_rows),
                success_count=len(inserted_results),
                failure_count=len(data_rows) - len(inserted_results),
                errors=errors,
                imported_results=inserted_results
            )

            logger.info(
                f"Import completed: {filename}",
                extra={
                    "total": result.total_records,
                    "success": result.success_count,
                    "failed": result.failure_count
                }
            )

            return result

        except Exception as e:
            logger.error(f"Import failed: {str(e)}", exc_info=True)
            
            return ImportResult(
                success=False,
                total_records=len(data_rows),
                success_count=0,
                failure_count=len(data_rows),
                errors=[ImportError(
                    row=0,
                    message=f"导入失败: {str(e)}"
                )]
            )

    async def _validate_data(
        self,
        db: AsyncSession,
        data_rows: List[Dict[str, Any]],
        field_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        验证导入数据
        
        Args:
            db: 数据库会话
            data_rows: 数据行列表
            field_mapping: 字段映射配置
            
        Returns:
            包含有效行和错误的字典
        """
        valid_rows: List[Dict[str, Any]] = []
        errors: List[ImportError] = []

        # 默认字段映射
        if not field_mapping:
            field_mapping = {
                'sample_id': 'sampleId',
                'test_item_id': 'testItemId',
                'parameter': 'parameter',
                'value': 'value',
                'text_value': 'textValue',
                'unit': 'unit',
                'method': 'method',
                'instrument_id': 'instrumentId'
            }

        # 批量查询样品，提高性能
        sample_ids = set()
        for row in data_rows:
            sample_id_field = field_mapping.get('sample_id', 'sampleId')
            sample_id = row.get(sample_id_field)
            if sample_id:
                sample_ids.add(sample_id)

        # 查询样品是否存在
        sample_query = select(Sample.id).where(Sample.id.in_(sample_ids))
        sample_result = await db.execute(sample_query)
        existing_sample_ids = set(row[0] for row in sample_result.fetchall())

        # 验证每一行数据
        for i, row in enumerate(data_rows):
            row_number = i + 2  # Excel/CSV 行号从 2 开始（第 1 行是表头）
            row_errors: List[ImportError] = []

            # 提取字段值
            sample_id = row.get(field_mapping.get('sample_id', 'sampleId'), '').strip()
            test_item_id = row.get(field_mapping.get('test_item_id', 'testItemId'), '').strip()
            parameter = row.get(field_mapping.get('parameter', 'parameter'), '').strip()
            method = row.get(field_mapping.get('method', 'method'), '').strip()
            value_str = row.get(field_mapping.get('value', 'value'), '').strip()
            text_value = row.get(field_mapping.get('text_value', 'textValue'), '').strip()
            unit = row.get(field_mapping.get('unit', 'unit'), '').strip()
            instrument_id = row.get(field_mapping.get('instrument_id', 'instrumentId'), '').strip()

            # 验证必填字段
            if not sample_id:
                row_errors.append(ImportError(
                    row=row_number,
                    field='sampleId',
                    message='样品 ID 不能为空'
                ))

            if not test_item_id:
                row_errors.append(ImportError(
                    row=row_number,
                    field='testItemId',
                    message='检测项 ID 不能为空'
                ))

            if not parameter:
                row_errors.append(ImportError(
                    row=row_number,
                    field='parameter',
                    message='检测参数不能为空'
                ))

            if not method:
                row_errors.append(ImportError(
                    row=row_number,
                    field='method',
                    message='检测方法不能为空'
                ))

            # 验证数值和文本值至少有一个
            value = None
            if value_str:
                try:
                    value = float(value_str)
                except ValueError:
                    row_errors.append(ImportError(
                        row=row_number,
                        field='value',
                        value=value_str,
                        message='数值格式不正确'
                    ))

            if value is None and not text_value:
                row_errors.append(ImportError(
                    row=row_number,
                    field='value',
                    message='数值结果或文本结果至少需要提供一个'
                ))

            # 验证样品是否存在
            if sample_id and sample_id not in existing_sample_ids:
                row_errors.append(ImportError(
                    row=row_number,
                    field='sampleId',
                    value=sample_id,
                    message='样品不存在'
                ))

            # 如果有错误，记录错误；否则添加到有效行
            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows.append({
                    'sample_id': sample_id,
                    'test_item_id': test_item_id,
                    'parameter': parameter,
                    'value': value,
                    'text_value': text_value if text_value else None,
                    'unit': unit if unit else None,
                    'method': method,
                    'instrument_id': instrument_id if instrument_id else None
                })

        return {
            'valid_rows': valid_rows,
            'errors': errors
        }

    async def _batch_insert(
        self,
        db: AsyncSession,
        valid_rows: List[Dict[str, Any]],
        entered_by: str
    ) -> List[ResultResponse]:
        """
        批量插入结果
        
        需求 11.8: 使用批量插入优化性能
        
        Args:
            db: 数据库会话
            valid_rows: 有效的数据行
            entered_by: 录入人员 ID
            
        Returns:
            插入的结果列表
        """
        try:
            # 创建结果对象列表
            result_objects = []
            for row in valid_rows:
                result = Result(
                    id=str(uuid.uuid4()),
                    sampleId=row['sample_id'],
                    testItemId=row['test_item_id'],
                    parameter=row['parameter'],
                    value=row['value'],
                    textValue=row['text_value'],
                    unit=row['unit'],
                    method=row['method'],
                    source=ResultSource.INSTRUMENT,  # 批量导入默认为仪器来源
                    instrumentId=row['instrument_id'],
                    enteredBy=entered_by,
                    enteredAt=datetime.utcnow()
                )
                result_objects.append(result)

            # 批量插入
            db.add_all(result_objects)
            await db.commit()

            # 刷新对象以获取数据库生成的字段
            for result in result_objects:
                await db.refresh(result)

            logger.info(f"Batch insert completed: {len(result_objects)} records")

            # 转换为响应格式
            return [self._map_to_response(r) for r in result_objects]

        except Exception as e:
            logger.error(f"Batch insert failed: {str(e)}", exc_info=True)
            await db.rollback()
            raise

    async def create_import_task(
        self,
        filename: str,
        entered_by: str
    ) -> str:
        """
        创建导入任务
        
        Args:
            filename: 文件名
            entered_by: 录入人员 ID
            
        Returns:
            任务 ID
        """
        task_id = str(uuid.uuid4())
        
        # 存储任务信息到 Redis
        task_data = {
            'task_id': task_id,
            'status': ImportTaskStatus.PENDING.value,
            'filename': filename,
            'entered_by': entered_by,
            'created_at': datetime.utcnow().isoformat()
        }
        
        await redis_client.setex(
            f"import_task:{task_id}",
            3600,  # 1小时过期
            str(task_data)
        )
        
        logger.info(f"Import task created: {task_id}")
        return task_id

    async def get_import_task_status(
        self,
        task_id: str
    ) -> Optional[ImportTaskResponse]:
        """
        获取导入任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态，如果不存在返回 None
        """
        task_data_str = await redis_client.get(f"import_task:{task_id}")
        
        if not task_data_str:
            return None
        
        # 解析任务数据（简化版，实际应使用 JSON）
        # 这里仅作示例，实际应该存储 JSON 格式
        return ImportTaskResponse(
            task_id=task_id,
            status=ImportTaskStatus.PENDING,
            filename="example.xlsx",
            created_at=datetime.utcnow()
        )

    def _map_to_response(self, result: Result) -> ResultResponse:
        """
        将数据库模型映射为响应 DTO
        
        Args:
            result: 数据库结果模型
            
        Returns:
            结果响应 DTO
        """
        from app.schemas.result import ResultResponse
        
        return ResultResponse(
            id=result.id,
            sample_id=result.sampleId,
            test_item_id=result.testItemId,
            parameter=result.parameter,
            value=result.value,
            text_value=result.textValue,
            unit=result.unit,
            method=result.method,
            source=result.source,
            instrument_id=result.instrumentId,
            formula_id=result.formulaId,
            is_calculated=result.isCalculated,
            is_abnormal=result.isAbnormal,
            abnormal_reason=result.abnormalReason,
            is_retest=result.isRetest,
            original_result_id=result.originalResultId,
            retest_reason=result.retestReason,
            version=result.version,
            entered_by=result.enteredBy,
            entered_at=result.enteredAt,
            reviewed_by=result.reviewedBy,
            reviewed_at=result.reviewedAt
        )


# 创建服务实例
import_service = ImportService()
