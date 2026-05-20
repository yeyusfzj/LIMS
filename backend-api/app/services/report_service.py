"""
报告生成服务
实现报告数据获取、编号生成、报告生成和 PDF 导出
"""

import re
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from jinja2 import Template, Environment, BaseLoader

from app.models.report import Report, ReportTemplate, ReportStatus
from app.models.sample import Sample
from app.models.result import Result
from app.models.audit import AuditTask
from app.models.judgment import QualityJudgment
from app.models.workflow import WorkflowInstance
from app.schemas.report import (
    ReportGenerate,
    ReportUpdate,
    ReportQuery,
    ReportListResponse,
    ReportResponse,
    ReportData,
    ReportGenerationResult
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)
from app.core.logging import logger


class ReportService:
    """报告生成服务类"""
    
    async def generate_report(
        self,
        db: AsyncSession,
        data: ReportGenerate,
        user_id: str
    ) -> ReportGenerationResult:
        """
        生成报告
        
        Args:
            db: 数据库会话
            data: 报告生成数据
            user_id: 生成用户ID
            
        Returns:
            报告生成结果
            
        Raises:
            NotFoundException: 样品或模板不存在
            ValidationException: 数据验证失败
        """
        try:
            # 1. 获取报告数据
            report_data = await self._fetch_report_data(db, data.sampleId, user_id)
            
            # 2. 获取报告模板
            template_result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == data.templateId)
            )
            template = template_result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="报告模板不存在")
            
            if not template.isActive:
                raise ValidationException(message="报告模板未激活，无法使用")
            
            # 3. 生成报告编号（仅正式生成时）
            report_number = None
            if not data.preview:
                report_number = await self._generate_report_number(db, data.sampleId)
            
            # 4. 填充报告内容
            content = self._fill_report_template(
                template.content,
                template.variables,
                report_data,
                report_number
            )
            
            # 5. 如果是预览模式，直接返回内容
            if data.preview:
                logger.info(
                    "报告预览生成成功",
                    extra={"sample_id": data.sampleId, "template_id": data.templateId, "user_id": user_id}
                )
                return ReportGenerationResult(
                    content=content,
                    preview=True
                )
            
            # 6. 正式生成：创建报告记录
            report = Report(
                reportNumber=report_number,
                sampleId=data.sampleId,
                templateId=data.templateId,
                content=content,
                status=ReportStatus.DRAFT,
                generatedBy=user_id
            )
            
            db.add(report)
            await db.flush()
            await db.refresh(report)
            
            logger.info(
                "报告生成成功",
                extra={
                    "report_id": report.id,
                    "report_number": report.reportNumber,
                    "sample_id": data.sampleId,
                    "template_id": data.templateId,
                    "user_id": user_id
                }
            )
            
            return ReportGenerationResult(
                reportId=report.id,
                reportNumber=report.reportNumber,
                content=report.content,
                preview=False
            )
            
        except (NotFoundException, ValidationException):
            raise
        except IntegrityError as e:
            logger.error("生成报告失败：数据库约束错误", extra={"error": str(e)})
            raise ConflictException(message="报告编号已存在或违反数据库约束")
        except Exception as e:
            logger.error(
                "生成报告失败",
                extra={"error": str(e), "data": data.model_dump(), "user_id": user_id}
            )
            raise
    
    async def _fetch_report_data(
        self,
        db: AsyncSession,
        sample_id: str,
        user_id: str
    ) -> ReportData:
        """
        获取报告数据
        从数据库获取样品、检测项、结果、判定和审核数据
        
        Args:
            db: 数据库会话
            sample_id: 样品ID
            user_id: 用户ID
            
        Returns:
            报告数据
            
        Raises:
            NotFoundException: 样品不存在
        """
        try:
            # 获取样品信息（包含所有关联数据）
            result = await db.execute(
                select(Sample)
                .options(
                    selectinload(Sample.results),
                    selectinload(Sample.quality_judgment),
                    selectinload(Sample.workflow_instance).selectinload(WorkflowInstance.tasks)
                )
                .where(Sample.id == sample_id)
            )
            sample = result.scalar_one_or_none()
            
            if not sample:
                raise NotFoundException(message="样品不存在")
            
            # 构建报告数据
            report_data = ReportData(
                sample={
                    "id": sample.id,
                    "barcode": sample.barcode,
                    "sampleNumber": sample.sample_number,
                    "clientName": sample.client_name,
                    "clientContact": sample.client_contact,
                    "sampleName": sample.sample_name,
                    "sampleType": sample.sample_type,
                    "sampleCategory": sample.sample_category,
                    "quantity": sample.quantity,
                    "unit": sample.unit,
                    "receivedDate": sample.received_date,
                    "samplingDate": sample.sampling_date,
                    "samplingLocation": sample.sampling_location,
                    "samplingPerson": sample.sampling_person,
                    "storageLocation": sample.storage_location,
                    "storageCondition": sample.storage_condition,
                    "status": sample.status,
                    "priority": sample.priority,
                    "description": sample.description,
                    "remarks": sample.remarks
                },
                results=[
                    {
                        "id": result.id,
                        "parameter": result.parameter,
                        "value": result.value,
                        "textValue": result.textValue,
                        "unit": result.unit,
                        "method": result.method,
                        "source": result.source,
                        "isAbnormal": result.isAbnormal,
                        "abnormalReason": result.abnormalReason,
                        "enteredBy": result.enteredBy,
                        "enteredAt": result.enteredAt,
                        "reviewedBy": result.reviewedBy,
                        "reviewedAt": result.reviewedAt
                    }
                    for result in sample.results
                ] if sample.results else [],
                qualityJudgment={
                    "id": sample.quality_judgment.id,
                    "result": sample.quality_judgment.result,
                    "basis": sample.quality_judgment.basis,
                    "isAutomatic": sample.quality_judgment.isAutomatic,
                    "judgedBy": sample.quality_judgment.judgedBy,
                    "judgedAt": sample.quality_judgment.judgedAt,
                    "reviewedBy": sample.quality_judgment.reviewedBy,
                    "reviewedAt": sample.quality_judgment.reviewedAt
                } if sample.quality_judgment else None,
                auditTasks=[
                    {
                        "id": task.id,
                        "level": task.level,
                        "auditorId": task.auditorId,
                        "status": task.status,
                        "decision": task.decision,
                        "comments": task.comments,
                        "submittedAt": task.submittedAt,
                        "completedAt": task.completedAt
                    }
                    for task in (sample.workflow_instance.tasks if sample.workflow_instance else [])
                ],
                generatedAt=datetime.now(),
                generatedBy=user_id
            )
            
            return report_data
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(
                "获取报告数据失败",
                extra={"error": str(e), "sample_id": sample_id, "user_id": user_id}
            )
            raise
    
    async def _generate_report_number(
        self,
        db: AsyncSession,
        sample_id: str
    ) -> str:
        """
        生成报告编号
        格式: REPORT-YYYYMMDD-序号
        
        Args:
            db: 数据库会话
            sample_id: 样品ID
            
        Returns:
            报告编号
        """
        try:
            today = datetime.now()
            date_str = today.strftime("%Y%m%d")
            
            # 查询今天已生成的报告数量
            start_of_day = datetime(today.year, today.month, today.day, 0, 0, 0)
            end_of_day = datetime(today.year, today.month, today.day, 23, 59, 59)
            
            count_result = await db.execute(
                select(func.count(Report.id)).where(
                    and_(
                        Report.generatedAt >= start_of_day,
                        Report.generatedAt <= end_of_day
                    )
                )
            )
            count = count_result.scalar()
            
            # 生成序号（补零到4位）
            sequence = str(count + 1).zfill(4)
            report_number = f"REPORT-{date_str}-{sequence}"
            
            # 检查编号是否已存在（防止并发冲突）
            existing_result = await db.execute(
                select(Report).where(Report.reportNumber == report_number)
            )
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                # 如果存在，递归生成新编号
                logger.warning(
                    "报告编号冲突，重新生成",
                    extra={"report_number": report_number, "sample_id": sample_id}
                )
                return await self._generate_report_number(db, sample_id)
            
            return report_number
            
        except Exception as e:
            logger.error(
                "生成报告编号失败",
                extra={"error": str(e), "sample_id": sample_id}
            )
            raise
    
    def _fill_report_template(
        self,
        template_content: str,
        variables: List[Dict[str, Any]],
        report_data: ReportData,
        report_number: Optional[str] = None
    ) -> str:
        """
        填充报告模板
        使用 Jinja2 模板引擎渲染模板
        
        Args:
            template_content: 模板内容
            variables: 变量定义列表
            report_data: 报告数据
            report_number: 报告编号
            
        Returns:
            填充后的内容
        """
        try:
            # 将 Handlebars 语法转换为 Jinja2 语法
            content = template_content
            
            # 转换循环语法: {{#each items}} -> {% for item in items %}
            content = re.sub(
                r'\{\{#each\s+(\w+)\}\}',
                r'{% for item in \1 %}',
                content
            )
            # 转换循环结束: {{/each}} -> {% endfor %}
            content = re.sub(r'\{\{/each\}\}', r'{% endfor %}', content)
            
            # 转换条件语法: {{#if condition}} -> {% if condition %}
            content = re.sub(
                r'\{\{#if\s+(\w+)\}\}',
                r'{% if \1 %}',
                content
            )
            # 转换条件结束: {{/if}} -> {% endif %}
            content = re.sub(r'\{\{/if\}\}', r'{% endif %}', content)
            
            # 转换变量引用: {{this.property}} -> {{item.property}}
            content = re.sub(r'\{\{this\.', r'{{item.', content)
            
            # 转换索引: {{@index}} -> {{loop.index0}}
            content = re.sub(r'\{\{@index\}\}', r'{{loop.index0}}', content)
            
            # 转换辅助函数: {{add @index 1}} -> {{loop.index}}
            content = re.sub(r'\{\{add\s+@index\s+1\}\}', r'{{loop.index}}', content)
            
            # 构建数据上下文
            context = {
                "reportNumber": report_number or "预览",
                "sampleBarcode": report_data.sample.get("barcode", ""),
                "sampleNumber": report_data.sample.get("sampleNumber", ""),
                "sampleName": report_data.sample.get("sampleName", ""),
                "sampleType": report_data.sample.get("sampleType", ""),
                "clientName": report_data.sample.get("clientName", ""),
                "clientContact": report_data.sample.get("clientContact", ""),
                "receivedDate": self._format_date(report_data.sample.get("receivedDate")),
                "samplingDate": self._format_date(report_data.sample.get("samplingDate")),
                "testDate": self._format_date(datetime.now()),
                "analysisDate": self._format_date(datetime.now()),
                "reviewDate": self._format_date(datetime.now()),
                "results": [
                    {
                        "parameter": r.get("parameter", ""),
                        "method": r.get("method", ""),
                        "value": r.get("value") or r.get("textValue", ""),
                        "unit": r.get("unit", ""),
                        "standardLimit": "-",  # 需要从标准库获取
                        "judgment": "合格" if not r.get("isAbnormal") else "不合格"
                    }
                    for r in report_data.results
                ],
                "qualityJudgment": report_data.qualityJudgment.get("result", "") if report_data.qualityJudgment else "",
                "analysisDescription": "本次检测严格按照相关标准和规范进行，检测过程规范，数据真实可靠。",
                "analyst": "检测员",
                "reviewer": "审核员",
                "generatedAt": self._format_date(report_data.generatedAt),
                "generatedBy": report_data.generatedBy
            }
            
            # 使用 Jinja2 渲染模板
            env = Environment(loader=BaseLoader())
            template = env.from_string(content)
            rendered_content = template.render(**context)
            
            return rendered_content
            
        except Exception as e:
            logger.error(
                "填充报告模板失败",
                extra={"error": str(e), "report_number": report_number}
            )
            raise
    
    def _format_date(self, value: Any) -> str:
        """
        格式化日期
        
        Args:
            value: 日期值
            
        Returns:
            格式化后的日期字符串
        """
        if value is None:
            return ""
        
        if isinstance(value, (datetime, date)):
            return value.strftime("%Y-%m-%d")
        
        return str(value)

    
    async def get_report(
        self,
        db: AsyncSession,
        report_id: str
    ) -> Report:
        """
        获取报告详情
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            
        Returns:
            报告对象
            
        Raises:
            NotFoundException: 报告不存在
        """
        try:
            result = await db.execute(
                select(Report)
                .options(
                    selectinload(Report.sample),
                    selectinload(Report.template),
                    selectinload(Report.signatures),
                    selectinload(Report.distributions)
                )
                .where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            return report
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("获取报告详情失败", extra={"error": str(e), "report_id": report_id})
            raise
    
    async def list_reports(
        self,
        db: AsyncSession,
        query: ReportQuery
    ) -> ReportListResponse:
        """
        查询报告列表
        
        Args:
            db: 数据库会话
            query: 查询参数
            
        Returns:
            报告列表响应
        """
        try:
            # 构建查询条件
            conditions = []
            
            if query.sampleId:
                conditions.append(Report.sampleId == query.sampleId)
            
            if query.status:
                conditions.append(Report.status == query.status)
            
            if query.startDate:
                conditions.append(Report.generatedAt >= query.startDate)
            
            if query.endDate:
                conditions.append(Report.generatedAt <= query.endDate)
            
            if query.search:
                search_pattern = f"%{query.search}%"
                conditions.append(Report.reportNumber.ilike(search_pattern))
            
            # 查询总数
            count_query = select(func.count(Report.id))
            if conditions:
                count_query = count_query.where(and_(*conditions))
            
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            # 查询数据
            offset = (query.page - 1) * query.pageSize
            data_query = (
                select(Report)
                .options(
                    selectinload(Report.sample),
                    selectinload(Report.template)
                )
            )
            if conditions:
                data_query = data_query.where(and_(*conditions))
            
            data_query = data_query.order_by(
                Report.generatedAt.desc()
            ).offset(offset).limit(query.pageSize)
            
            data_result = await db.execute(data_query)
            items = data_result.scalars().all()
            
            total_pages = (total + query.pageSize - 1) // query.pageSize
            
            return ReportListResponse(
                items=[ReportResponse.model_validate(item) for item in items],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
            
        except Exception as e:
            logger.error("查询报告列表失败", extra={"error": str(e), "query": query.model_dump()})
            raise
    
    async def update_report(
        self,
        db: AsyncSession,
        report_id: str,
        data: ReportUpdate,
        user_id: str
    ) -> Report:
        """
        更新报告
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            data: 更新数据
            user_id: 更新用户ID
            
        Returns:
            更新后的报告对象
            
        Raises:
            NotFoundException: 报告不存在
            ValidationException: 报告状态不允许修改
        """
        try:
            result = await db.execute(
                select(Report).where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            # 检查报告状态是否允许修改
            if report.status in [ReportStatus.SIGNED, ReportStatus.DISTRIBUTED, ReportStatus.RECALLED]:
                raise ValidationException(message="报告已签名、已分发或已回收，无法修改")
            
            # 更新报告内容
            if data.content is not None:
                report.content = data.content
            
            await db.flush()
            await db.refresh(report)
            
            logger.info(
                "报告更新成功",
                extra={"report_id": report_id, "updated_by": user_id}
            )
            
            return report
            
        except (NotFoundException, ValidationException):
            raise
        except Exception as e:
            logger.error(
                "更新报告失败",
                extra={"error": str(e), "report_id": report_id}
            )
            raise
    
    async def delete_report(
        self,
        db: AsyncSession,
        report_id: str,
        user_id: str
    ) -> None:
        """
        删除报告
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            user_id: 操作用户ID
            
        Raises:
            NotFoundException: 报告不存在
            ValidationException: 报告状态不允许删除
        """
        try:
            result = await db.execute(
                select(Report).where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            # 只能删除草稿状态的报告
            if report.status != ReportStatus.DRAFT:
                raise ValidationException(message="只能删除草稿状态的报告")
            
            await db.delete(report)
            await db.flush()
            
            logger.info(
                "报告已删除",
                extra={"report_id": report_id, "deleted_by": user_id}
            )
            
        except (NotFoundException, ValidationException):
            raise
        except Exception as e:
            logger.error("删除报告失败", extra={"error": str(e), "report_id": report_id})
            raise
    
    async def export_report_pdf(
        self,
        db: AsyncSession,
        report_id: str
    ) -> bytes:
        """
        导出报告为 PDF
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            
        Returns:
            PDF 文件字节
            
        Raises:
            NotFoundException: 报告不存在
        """
        try:
            # 获取报告
            report = await self.get_report(db, report_id)
            
            # 使用 weasyprint 将 HTML 转换为 PDF
            from weasyprint import HTML, CSS
            from io import BytesIO
            
            # 创建 PDF
            pdf_buffer = BytesIO()
            
            # 添加基础样式
            css = CSS(string='''
                @page {
                    size: A4;
                    margin: 2cm;
                }
                body {
                    font-family: "SimSun", serif;
                    font-size: 12pt;
                    line-height: 1.6;
                }
                h1 {
                    text-align: center;
                    font-size: 18pt;
                    margin-bottom: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                table, th, td {
                    border: 1px solid #000;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f0f0f0;
                }
            ''')
            
            # 生成 PDF
            html = HTML(string=report.content)
            html.write_pdf(pdf_buffer, stylesheets=[css])
            
            pdf_bytes = pdf_buffer.getvalue()
            pdf_buffer.close()
            
            logger.info(
                "报告 PDF 导出成功",
                extra={"report_id": report_id, "pdf_size": len(pdf_bytes)}
            )
            
            return pdf_bytes
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(
                "导出报告 PDF 失败",
                extra={"error": str(e), "report_id": report_id}
            )
            raise
    
    async def recall_report(
        self,
        db: AsyncSession,
        report_id: str,
        reason: str,
        user_id: str
    ) -> Report:
        """
        撤回报告
        
        Args:
            db: 数据库会话
            report_id: 报告ID
            reason: 撤回原因
            user_id: 操作用户ID
            
        Returns:
            撤回后的报告对象
            
        Raises:
            NotFoundException: 报告不存在
            ValidationException: 报告状态不允许撤回
        """
        try:
            # 1. 检查报告是否存在
            result = await db.execute(
                select(Report).where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            
            if not report:
                raise NotFoundException(message="报告不存在")
            
            # 2. 检查报告状态
            if report.status == ReportStatus.RECALLED:
                raise ValidationException(message="报告已经被撤回")
            
            if report.status not in [ReportStatus.DISTRIBUTED, ReportStatus.SIGNED]:
                raise ValidationException(message="只能撤回已签名或已分发的报告")
            
            # 3. 更新报告状态为已撤回
            previous_status = report.status
            report.status = ReportStatus.RECALLED
            report.recalledAt = datetime.now()
            report.recallReason = reason
            
            await db.flush()
            await db.refresh(report)
            
            logger.info(
                "报告已撤回",
                extra={
                    "report_id": report_id,
                    "reason": reason,
                    "recalled_by": user_id,
                    "previous_status": previous_status
                }
            )
            
            return report
            
        except (NotFoundException, ValidationException):
            raise
        except Exception as e:
            logger.error(
                "报告撤回失败",
                extra={
                    "error": str(e),
                    "report_id": report_id,
                    "reason": reason,
                    "user_id": user_id
                }
            )
            raise


# 创建服务实例
report_service = ReportService()
