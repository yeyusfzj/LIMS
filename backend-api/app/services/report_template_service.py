"""
报告模板服务
"""

import re
from typing import Optional, List, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError

from app.models.report import ReportTemplate, Report
from app.schemas.report_template import (
    ReportTemplateCreate,
    ReportTemplateUpdate,
    ReportTemplateQuery,
    ReportTemplateListResponse,
    ReportTemplateResponse,
    TemplateValidationResult,
    TemplateValidationError,
    TemplateVariable,
    ReportTemplateVersionInfo
)
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException
)
from app.core.logging import logger


class ReportTemplateService:
    """报告模板服务类"""
    
    async def create_template(
        self,
        db: AsyncSession,
        data: ReportTemplateCreate,
        user_id: str
    ) -> ReportTemplate:
        """
        创建报告模板
        
        Args:
            db: 数据库会话
            data: 模板创建数据
            user_id: 创建用户ID
            
        Returns:
            创建的模板对象
            
        Raises:
            ValidationException: 模板验证失败
        """
        try:
            # 验证模板格式
            validation = self.validate_template_format(data.content, data.variables)
            if not validation.isValid:
                error_messages = [e.message for e in validation.errors]
                raise ValidationException(
                    message="模板验证失败",
                    details=", ".join(error_messages)
                )
            
            # 验证模板变量
            variable_validation = self.validate_template_variables(data.variables)
            if not variable_validation.isValid:
                error_messages = [e.message for e in variable_validation.errors]
                raise ValidationException(
                    message="变量验证失败",
                    details=", ".join(error_messages)
                )
            
            # 创建模板
            template = ReportTemplate(
                name=data.name,
                description=data.description,
                category=data.category,
                content=data.content,
                variables=[var.model_dump() for var in data.variables],
                version=1,
                isActive=True,
                createdBy=user_id
            )
            
            db.add(template)
            await db.flush()
            await db.refresh(template)
            
            logger.info(
                "报告模板创建成功",
                extra={"template_id": template.id, "name": template.name}
            )
            
            return template
            
        except ValidationException:
            raise
        except IntegrityError as e:
            logger.error("创建报告模板失败：数据库约束错误", extra={"error": str(e)})
            raise ConflictException(message="模板名称已存在或违反数据库约束")
        except Exception as e:
            logger.error("创建报告模板失败", extra={"error": str(e), "data": data.model_dump()})
            raise
    
    async def update_template(
        self,
        db: AsyncSession,
        template_id: str,
        data: ReportTemplateUpdate,
        user_id: str
    ) -> ReportTemplate:
        """
        更新报告模板（创建新版本）
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            data: 更新数据
            user_id: 更新用户ID
            
        Returns:
            更新后的模板对象
            
        Raises:
            NotFoundException: 模板不存在
            ValidationException: 模板验证失败
        """
        try:
            # 获取当前模板
            result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            # 如果更新了内容或变量，需要验证
            if data.content or data.variables:
                content = data.content if data.content else template.content
                variables = data.variables if data.variables else [
                    TemplateVariable(**var) for var in template.variables
                ]
                
                validation = self.validate_template_format(content, variables)
                if not validation.isValid:
                    error_messages = [e.message for e in validation.errors]
                    raise ValidationException(
                        message="模板验证失败",
                        details=", ".join(error_messages)
                    )
                
                if data.variables:
                    variable_validation = self.validate_template_variables(data.variables)
                    if not variable_validation.isValid:
                        error_messages = [e.message for e in variable_validation.errors]
                        raise ValidationException(
                            message="变量验证失败",
                            details=", ".join(error_messages)
                        )
            
            # 如果更新了内容或变量，创建新版本
            should_create_new_version = data.content or data.variables
            new_version = template.version + 1 if should_create_new_version else template.version
            
            # 更新模板
            if data.name is not None:
                template.name = data.name
            if data.description is not None:
                template.description = data.description
            if data.category is not None:
                template.category = data.category
            if data.content is not None:
                template.content = data.content
            if data.variables is not None:
                template.variables = [var.model_dump() for var in data.variables]
            if data.isActive is not None:
                template.isActive = data.isActive
            
            template.version = new_version
            
            await db.flush()
            await db.refresh(template)
            
            logger.info(
                "报告模板更新成功",
                extra={
                    "template_id": template_id,
                    "version": new_version,
                    "updated_by": user_id
                }
            )
            
            return template
            
        except (NotFoundException, ValidationException):
            raise
        except IntegrityError as e:
            logger.error("更新报告模板失败：数据库约束错误", extra={"error": str(e)})
            raise ConflictException(message="模板名称已存在或违反数据库约束")
        except Exception as e:
            logger.error(
                "更新报告模板失败",
                extra={"error": str(e), "template_id": template_id}
            )
            raise
    
    async def get_template(
        self,
        db: AsyncSession,
        template_id: str
    ) -> ReportTemplate:
        """
        获取模板详情
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            
        Returns:
            模板对象
            
        Raises:
            NotFoundException: 模板不存在
        """
        try:
            result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            return template
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("获取报告模板失败", extra={"error": str(e), "template_id": template_id})
            raise
    
    async def list_templates(
        self,
        db: AsyncSession,
        query: ReportTemplateQuery
    ) -> ReportTemplateListResponse:
        """
        查询模板列表
        
        Args:
            db: 数据库会话
            query: 查询参数
            
        Returns:
            模板列表响应
        """
        try:
            # 构建查询条件
            conditions = []
            
            if query.category:
                conditions.append(ReportTemplate.category == query.category)
            
            if query.isActive is not None:
                conditions.append(ReportTemplate.isActive == query.isActive)
            
            if query.search:
                search_pattern = f"%{query.search}%"
                conditions.append(
                    or_(
                        ReportTemplate.name.ilike(search_pattern),
                        ReportTemplate.description.ilike(search_pattern)
                    )
                )
            
            # 查询总数
            count_query = select(func.count(ReportTemplate.id))
            if conditions:
                count_query = count_query.where(*conditions)
            
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            # 查询数据
            offset = (query.page - 1) * query.pageSize
            data_query = select(ReportTemplate)
            if conditions:
                data_query = data_query.where(*conditions)
            
            data_query = data_query.order_by(
                ReportTemplate.createdAt.desc()
            ).offset(offset).limit(query.pageSize)
            
            data_result = await db.execute(data_query)
            items = data_result.scalars().all()
            
            total_pages = (total + query.pageSize - 1) // query.pageSize
            
            return ReportTemplateListResponse(
                items=[ReportTemplateResponse.model_validate(item) for item in items],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
            
        except Exception as e:
            logger.error("查询报告模板列表失败", extra={"error": str(e), "query": query.model_dump()})
            raise
    
    async def activate_template(
        self,
        db: AsyncSession,
        template_id: str,
        user_id: str
    ) -> ReportTemplate:
        """
        激活模板
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            user_id: 操作用户ID
            
        Returns:
            更新后的模板对象
            
        Raises:
            NotFoundException: 模板不存在
        """
        try:
            result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            template.is_active = True
            await db.flush()
            await db.refresh(template)
            
            logger.info(
                "报告模板已激活",
                extra={"template_id": template_id, "activated_by": user_id}
            )
            
            return template
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("激活报告模板失败", extra={"error": str(e), "template_id": template_id})
            raise
    
    async def deactivate_template(
        self,
        db: AsyncSession,
        template_id: str,
        user_id: str
    ) -> ReportTemplate:
        """
        停用模板
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            user_id: 操作用户ID
            
        Returns:
            更新后的模板对象
            
        Raises:
            NotFoundException: 模板不存在
        """
        try:
            result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            template.is_active = False
            await db.flush()
            await db.refresh(template)
            
            logger.info(
                "报告模板已停用",
                extra={"template_id": template_id, "deactivated_by": user_id}
            )
            
            return template
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("停用报告模板失败", extra={"error": str(e), "template_id": template_id})
            raise
    
    async def delete_template(
        self,
        db: AsyncSession,
        template_id: str,
        user_id: str
    ) -> None:
        """
        删除模板
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            user_id: 操作用户ID
            
        Raises:
            NotFoundException: 模板不存在
            ConflictException: 模板已被使用
        """
        try:
            # 检查模板是否存在
            result = await db.execute(
                select(ReportTemplate).where(ReportTemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            # 检查是否有关联的报告
            count_result = await db.execute(
                select(func.count(Report.id)).where(Report.template_id == template_id)
            )
            report_count = count_result.scalar()
            
            if report_count > 0:
                raise ConflictException(
                    message="该模板已被使用，无法删除。请先停用模板。"
                )
            
            await db.delete(template)
            await db.flush()
            
            logger.info(
                "报告模板已删除",
                extra={"template_id": template_id, "deleted_by": user_id}
            )
            
        except (NotFoundException, ConflictException):
            raise
        except Exception as e:
            logger.error("删除报告模板失败", extra={"error": str(e), "template_id": template_id})
            raise
    
    def validate_template_format(
        self,
        content: str,
        variables: List[TemplateVariable]
    ) -> TemplateValidationResult:
        """
        验证模板格式
        
        Args:
            content: 模板内容
            variables: 变量定义列表
            
        Returns:
            验证结果
        """
        errors: List[TemplateValidationError] = []
        
        # 检查内容是否为空
        if not content or not content.strip():
            errors.append(TemplateValidationError(
                type="format",
                message="模板内容不能为空"
            ))
            return TemplateValidationResult(isValid=False, errors=errors)
        
        # 提取模板中使用的变量
        variable_pattern = re.compile(r'\{\{(\s*[\w.]+\s*)\}\}')
        used_variables: Set[str] = set()
        
        for match in variable_pattern.finditer(content):
            var_name = match.group(1).strip()
            used_variables.add(var_name)
        
        # 检查模板中使用的变量是否都已定义
        defined_variables = {var.name for var in variables}
        
        for used_var in used_variables:
            # 支持嵌套属性，如 sample.name
            root_var = used_var.split('.')[0]
            if root_var not in defined_variables:
                errors.append(TemplateValidationError(
                    type="variable",
                    message=f"模板中使用了未定义的变量: {used_var}",
                    location=used_var
                ))
        
        # 检查是否有定义但未使用的变量（警告，不影响验证结果）
        for defined_var in defined_variables:
            is_used = False
            for used_var in used_variables:
                if used_var == defined_var or used_var.startswith(defined_var + '.'):
                    is_used = True
                    break
            if not is_used:
                logger.warning(
                    "模板中定义了未使用的变量",
                    extra={"variable": defined_var}
                )
        
        return TemplateValidationResult(
            isValid=len(errors) == 0,
            errors=errors
        )
    
    def validate_template_variables(
        self,
        variables: List[TemplateVariable]
    ) -> TemplateValidationResult:
        """
        验证模板变量
        
        Args:
            variables: 变量定义列表
            
        Returns:
            验证结果
        """
        errors: List[TemplateValidationError] = []
        
        # 检查变量名是否重复
        variable_names: Set[str] = set()
        for variable in variables:
            if variable.name in variable_names:
                errors.append(TemplateValidationError(
                    type="variable",
                    message=f"变量名重复: {variable.name}",
                    location=variable.name
                ))
            variable_names.add(variable.name)
        
        # 检查必填变量是否有默认值
        for variable in variables:
            if variable.required and variable.defaultValue is not None:
                logger.warning(
                    "必填变量不应设置默认值",
                    extra={"variable": variable.name}
                )
        
        return TemplateValidationResult(
            isValid=len(errors) == 0,
            errors=errors
        )
    
    async def get_template_versions(
        self,
        db: AsyncSession,
        template_id: str
    ) -> ReportTemplateVersionInfo:
        """
        获取模板版本信息
        
        Args:
            db: 数据库会话
            template_id: 模板ID
            
        Returns:
            版本信息
            
        Raises:
            NotFoundException: 模板不存在
        """
        try:
            result = await db.execute(
                select(
                    ReportTemplate.id,
                    ReportTemplate.version,
                    ReportTemplate.createdAt,
                    ReportTemplate.updatedAt,
                    ReportTemplate.createdBy
                ).where(ReportTemplate.id == template_id)
            )
            template = result.one_or_none()
            
            if not template:
                raise NotFoundException(message="模板不存在")
            
            return ReportTemplateVersionInfo(
                templateId=template.id,
                currentVersion=template.version,
                createdAt=template.createdAt,
                updatedAt=template.updatedAt,
                createdBy=template.createdBy
            )
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(
                "获取模板版本信息失败",
                extra={"error": str(e), "template_id": template_id}
            )
            raise


# 创建服务实例
report_template_service = ReportTemplateService()
