"""
公式计算服务

实现公式配置管理、表达式解析、计算执行和错误处理
验证需求：3.3, 3.4, 3.5, 10.1, 10.2
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.formula import Formula
from app.schemas.formula import (
    FormulaCreate,
    FormulaUpdate,
    FormulaQuery,
    FormulaResponse,
    PaginatedFormulaResponse,
    FormulaCalculationInput,
    FormulaCalculationResult,
    FormulaValidationResult,
    FormulaParameter
)
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import logger
import re
import ast
import math


class FormulaService:
    """公式服务类"""
    
    async def create_formula(
        self,
        db: AsyncSession,
        data: FormulaCreate,
        user_id: str
    ) -> FormulaResponse:
        """
        创建公式配置
        
        需求 3.3: 支持常见数学函数和自定义公式表达式
        
        Args:
            db: 数据库会话
            data: 公式创建数据
            user_id: 创建用户ID
            
        Returns:
            创建的公式
        """
        try:
            # 验证公式表达式
            validation = self.validate_expression(data.expression, data.parameters)
            if not validation.valid:
                raise ValidationException(
                    message="公式表达式验证失败",
                    details=", ".join(validation.errors)
                )
            
            # 创建公式记录
            formula = Formula(
                name=data.name,
                description=data.description,
                expression=data.expression,
                parameters=[p.dict() for p in data.parameters],
                isActive=data.isActive if data.isActive is not None else True,
                createdBy=user_id
            )
            
            db.add(formula)
            await db.flush()
            await db.refresh(formula)
            
            logger.info(
                "Formula created",
                extra={
                    "formula_id": formula.id,
                    "name": formula.name,
                    "expression": formula.expression
                }
            )
            
            return self._map_to_response(formula)
            
        except ValidationException:
            raise
        except Exception as e:
            logger.error("Failed to create formula", extra={"error": str(e), "data": data.dict()})
            raise
    
    async def get_formula_by_id(
        self,
        db: AsyncSession,
        formula_id: str
    ) -> FormulaResponse:
        """
        根据 ID 获取公式
        
        Args:
            db: 数据库会话
            formula_id: 公式ID
            
        Returns:
            公式详情
        """
        try:
            result = await db.execute(
                select(Formula).where(Formula.id == formula_id)
            )
            formula = result.scalar_one_or_none()
            
            if not formula:
                raise NotFoundException(message="公式不存在")
            
            return self._map_to_response(formula)
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("Failed to get formula by id", extra={"error": str(e), "formula_id": formula_id})
            raise
    
    async def list_formulas(
        self,
        db: AsyncSession,
        query: FormulaQuery
    ) -> PaginatedFormulaResponse:
        """
        查询公式列表
        
        Args:
            db: 数据库会话
            query: 查询参数
            
        Returns:
            分页公式列表
        """
        try:
            # 构建查询条件
            conditions = []
            
            if query.name:
                conditions.append(Formula.name.ilike(f"%{query.name}%"))
            
            if query.isActive is not None:
                conditions.append(Formula.isActive == query.isActive)
            
            if query.createdBy:
                conditions.append(Formula.createdBy == query.createdBy)
            
            # 构建基础查询
            base_query = select(Formula)
            if conditions:
                base_query = base_query.where(*conditions)
            
            # 计算分页参数
            skip = (query.page - 1) * query.pageSize
            
            # 查询总数
            count_result = await db.execute(
                select(func.count()).select_from(base_query.subquery())
            )
            total = count_result.scalar()
            
            # 查询数据
            result = await db.execute(
                base_query
                .offset(skip)
                .limit(query.pageSize)
                .order_by(Formula.createdAt.desc())
            )
            formulas = result.scalars().all()
            
            total_pages = (total + query.pageSize - 1) // query.pageSize
            
            return PaginatedFormulaResponse(
                items=[self._map_to_response(f) for f in formulas],
                total=total,
                page=query.page,
                pageSize=query.pageSize,
                totalPages=total_pages
            )
            
        except Exception as e:
            logger.error("Failed to list formulas", extra={"error": str(e), "query": query.dict()})
            raise
    
    async def update_formula(
        self,
        db: AsyncSession,
        formula_id: str,
        data: FormulaUpdate
    ) -> FormulaResponse:
        """
        更新公式
        
        Args:
            db: 数据库会话
            formula_id: 公式ID
            data: 更新数据
            
        Returns:
            更新后的公式
        """
        try:
            # 检查公式是否存在
            result = await db.execute(
                select(Formula).where(Formula.id == formula_id)
            )
            formula = result.scalar_one_or_none()
            
            if not formula:
                raise NotFoundException(message="公式不存在")
            
            # 如果更新了表达式或参数，需要验证
            if data.expression or data.parameters:
                expression = data.expression or formula.expression
                parameters = data.parameters or [
                    FormulaParameter(**p) for p in formula.parameters
                ]
                
                validation = self.validate_expression(expression, parameters)
                if not validation.valid:
                    raise ValidationException(
                        message="公式表达式验证失败",
                        details=", ".join(validation.errors)
                    )
            
            # 更新字段
            if data.name is not None:
                formula.name = data.name
            
            if data.description is not None:
                formula.description = data.description
            
            if data.expression is not None:
                formula.expression = data.expression
            
            if data.parameters is not None:
                formula.parameters = [p.dict() for p in data.parameters]
            
            if data.isActive is not None:
                formula.isActive = data.isActive
            
            await db.flush()
            await db.refresh(formula)
            
            logger.info(
                "Formula updated",
                extra={
                    "formula_id": formula.id,
                    "updates": data.dict(exclude_unset=True)
                }
            )
            
            return self._map_to_response(formula)
            
        except (NotFoundException, ValidationException):
            raise
        except Exception as e:
            logger.error("Failed to update formula", extra={"error": str(e), "formula_id": formula_id})
            raise
    
    async def delete_formula(
        self,
        db: AsyncSession,
        formula_id: str
    ) -> None:
        """
        删除公式
        
        Args:
            db: 数据库会话
            formula_id: 公式ID
        """
        try:
            result = await db.execute(
                select(Formula).where(Formula.id == formula_id)
            )
            formula = result.scalar_one_or_none()
            
            if not formula:
                raise NotFoundException(message="公式不存在")
            
            await db.delete(formula)
            await db.flush()
            
            logger.info("Formula deleted", extra={"formula_id": formula_id})
            
        except NotFoundException:
            raise
        except Exception as e:
            logger.error("Failed to delete formula", extra={"error": str(e), "formula_id": formula_id})
            raise
    
    async def calculate_formula(
        self,
        db: AsyncSession,
        input_data: FormulaCalculationInput
    ) -> FormulaCalculationResult:
        """
        执行公式计算
        
        需求 3.3: 自动执行关联的计算公式
        需求 3.5: 记录错误信息并通知用户
        
        Args:
            db: 数据库会话
            input_data: 计算输入
            
        Returns:
            计算结果
        """
        try:
            # 获取公式配置
            formula_response = await self.get_formula_by_id(db, input_data.formulaId)
            
            if not formula_response.isActive:
                return FormulaCalculationResult(
                    success=False,
                    error="公式已停用"
                )
            
            # 重建参数对象
            parameters = [FormulaParameter(**p) for p in formula_response.parameters]
            
            # 验证参数
            param_validation = self.validate_parameters(
                parameters,
                input_data.parameters
            )
            if not param_validation.valid:
                return FormulaCalculationResult(
                    success=False,
                    error=f"参数验证失败: {', '.join(param_validation.errors)}"
                )
            
            # 执行计算
            result = self.evaluate_expression(
                formula_response.expression,
                input_data.parameters
            )
            
            logger.info(
                "Formula calculated",
                extra={
                    "formula_id": input_data.formulaId,
                    "parameters": input_data.parameters,
                    "result": result
                }
            )
            
            return FormulaCalculationResult(
                success=True,
                value=result,
                expression=formula_response.expression,
                parameters=input_data.parameters
            )
            
        except Exception as e:
            logger.error("Formula calculation failed", extra={"error": str(e), "input": input_data.dict()})
            return FormulaCalculationResult(
                success=False,
                error=str(e),
                parameters=input_data.parameters
            )
    
    def validate_expression(
        self,
        expression: str,
        parameters: List[FormulaParameter]
    ) -> FormulaValidationResult:
        """
        验证公式表达式
        
        需求 3.4: 支持常见数学函数和自定义公式表达式
        
        Args:
            expression: 公式表达式
            parameters: 参数定义
            
        Returns:
            验证结果
        """
        errors = []
        
        # 检查表达式是否为空
        if not expression or not expression.strip():
            errors.append("公式表达式不能为空")
            return FormulaValidationResult(valid=False, errors=errors)
        
        # 检查参数定义
        if not parameters or len(parameters) == 0:
            errors.append("至少需要定义一个参数")
            return FormulaValidationResult(valid=False, errors=errors)
        
        # 检查参数名称是否唯一
        param_names = [p.name for p in parameters]
        if len(param_names) != len(set(param_names)):
            errors.append("参数名称必须唯一")
        
        # 检查参数名称是否有效
        valid_name_pattern = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')
        for param in parameters:
            if not valid_name_pattern.match(param.name):
                errors.append(
                    f"参数名称 \"{param.name}\" 无效，只允许字母、数字和下划线，且不能以数字开头"
                )
        
        # 检查表达式中是否包含危险内容
        dangerous_patterns = [
            (r'__\w+__', '__xxx__ 形式的特殊属性'),
            (r'\bimport\b', 'import 语句'),
            (r'\beval\b', 'eval 函数'),
            (r'\bexec\b', 'exec 函数'),
            (r'\bcompile\b', 'compile 函数'),
            (r'\bopen\b', 'open 函数'),
            (r'\bfile\b', 'file 操作'),
        ]
        
        for pattern, desc in dangerous_patterns:
            if re.search(pattern, expression):
                errors.append(f"表达式包含不允许的内容: {desc}")
        
        # 使用 AST 验证表达式语法
        try:
            tree = ast.parse(expression, mode='eval')
            
            # 检查 AST 节点类型，只允许安全的操作
            allowed_nodes = {
                ast.Expression, ast.BinOp, ast.UnaryOp, ast.Compare,
                ast.Num, ast.Constant, ast.Name, ast.Call,
                ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow,
                ast.USub, ast.UAdd,
                ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
                ast.Load
            }
            
            for node in ast.walk(tree):
                if type(node) not in allowed_nodes:
                    errors.append(f"表达式包含不允许的操作: {type(node).__name__}")
                    break
            
            # 提取表达式中使用的变量
            used_variables = self._extract_variables(tree)
            defined_params = {p.name for p in parameters}
            
            # 允许的数学函数
            allowed_functions = {
                'abs', 'pow', 'sqrt', 'exp', 'log', 'log10',
                'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
                'ceil', 'floor', 'round',
                'max', 'min'
            }
            
            for var in used_variables:
                if var not in defined_params and var not in allowed_functions:
                    errors.append(f"表达式中使用了未定义的参数或函数: {var}")
            
        except SyntaxError as e:
            errors.append(f"表达式语法错误: {str(e)}")
        
        return FormulaValidationResult(
            valid=len(errors) == 0,
            errors=errors
        )
    
    def validate_parameters(
        self,
        param_defs: List[FormulaParameter],
        param_values: Dict[str, Any]
    ) -> FormulaValidationResult:
        """
        验证计算参数
        
        Args:
            param_defs: 参数定义
            param_values: 参数值
            
        Returns:
            验证结果
        """
        errors = []
        
        for param_def in param_defs:
            value = param_values.get(param_def.name)
            
            # 检查必需参数
            if param_def.required and (value is None or value == ""):
                errors.append(f"缺少必需参数: {param_def.name}")
                continue
            
            # 如果参数有值，检查类型
            if value is not None and value != "":
                actual_type = type(value).__name__
                
                if param_def.type == 'number':
                    if not isinstance(value, (int, float)):
                        errors.append(
                            f"参数 {param_def.name} 类型错误，期望 number，实际 {actual_type}"
                        )
                elif param_def.type == 'string':
                    if not isinstance(value, str):
                        errors.append(
                            f"参数 {param_def.name} 类型错误，期望 string，实际 {actual_type}"
                        )
                elif param_def.type == 'boolean':
                    if not isinstance(value, bool):
                        errors.append(
                            f"参数 {param_def.name} 类型错误，期望 boolean，实际 {actual_type}"
                        )
        
        return FormulaValidationResult(
            valid=len(errors) == 0,
            errors=errors
        )
    
    def evaluate_expression(
        self,
        expression: str,
        parameters: Dict[str, Any]
    ) -> float:
        """
        执行公式表达式计算
        
        需求 3.3: 支持常见数学函数
        需求 3.5: 实现计算错误处理
        
        Args:
            expression: 公式表达式
            parameters: 参数值
            
        Returns:
            计算结果
        """
        try:
            # 创建安全的计算上下文
            # 只允许使用 math 模块的函数和提供的参数
            safe_context = {
                **parameters,
                # 常用数学函数
                'abs': abs,
                'pow': pow,
                'sqrt': math.sqrt,
                'exp': math.exp,
                'log': math.log,
                'log10': math.log10,
                'sin': math.sin,
                'cos': math.cos,
                'tan': math.tan,
                'asin': math.asin,
                'acos': math.acos,
                'atan': math.atan,
                'atan2': math.atan2,
                'ceil': math.ceil,
                'floor': math.floor,
                'round': round,
                'max': max,
                'min': min,
                # 常量
                'pi': math.pi,
                'e': math.e,
                # 禁止访问内置函数
                '__builtins__': {}
            }
            
            # 使用 eval 执行计算（在受限的上下文中）
            result = eval(expression, {"__builtins__": {}}, safe_context)
            
            # 验证结果
            if not isinstance(result, (int, float)):
                raise ValueError(
                    f"计算结果类型错误，期望 number，实际 {type(result).__name__}"
                )
            
            if not math.isfinite(result):
                raise ValueError("计算结果无效（无穷大或 NaN）")
            
            return float(result)
            
        except Exception as e:
            logger.error(
                "Expression evaluation failed",
                extra={
                    "error": str(e),
                    "expression": expression,
                    "parameters": parameters
                }
            )
            raise ValueError(f"公式计算失败: {str(e)}")
    
    def _extract_variables(self, tree: ast.AST) -> List[str]:
        """
        从 AST 中提取变量名
        
        Args:
            tree: AST 树
            
        Returns:
            变量名列表
        """
        variables = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                variables.append(node.id)
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                variables.append(node.func.id)
        
        return list(set(variables))
    
    def _map_to_response(self, formula: Formula) -> FormulaResponse:
        """
        将数据库模型映射为响应 DTO
        
        Args:
            formula: 数据库公式模型
            
        Returns:
            公式响应 DTO
        """
        return FormulaResponse(
            id=formula.id,
            name=formula.name,
            description=formula.description,
            expression=formula.expression,
            parameters=formula.parameters,
            isActive=formula.isActive,
            createdBy=formula.createdBy,
            createdAt=formula.createdAt,
            updatedAt=formula.updatedAt
        )


# 创建服务实例
formula_service = FormulaService()
