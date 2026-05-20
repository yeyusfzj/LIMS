"""
公式服务单元测试
"""

import pytest
from app.services.formula_service import FormulaService
from app.schemas.formula import FormulaParameter


class TestFormulaService:
    """公式服务测试类"""
    
    def setup_method(self):
        """测试前准备"""
        self.service = FormulaService()
    
    def test_validate_expression_valid(self):
        """测试有效的公式表达式验证"""
        expression = "a * b + c"
        parameters = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=True),
            FormulaParameter(name="c", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is True
        assert len(result.errors) == 0
    
    def test_validate_expression_empty(self):
        """测试空表达式验证"""
        expression = ""
        parameters = [
            FormulaParameter(name="a", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is False
        assert "公式表达式不能为空" in result.errors
    
    def test_validate_expression_no_parameters(self):
        """测试无参数定义验证"""
        expression = "a + b"
        parameters = []
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is False
        assert "至少需要定义一个参数" in result.errors
    
    def test_validate_expression_duplicate_parameter_names(self):
        """测试重复参数名称验证"""
        expression = "a + b"
        parameters = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="a", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is False
        assert "参数名称必须唯一" in result.errors
    
    def test_validate_expression_invalid_parameter_name(self):
        """测试无效参数名称验证"""
        expression = "1a + b"
        parameters = [
            FormulaParameter(name="1a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is False
        assert any("参数名称" in error and "无效" in error for error in result.errors)
    
    def test_validate_expression_undefined_variable(self):
        """测试未定义变量验证"""
        expression = "a + b + c"
        parameters = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is False
        assert any("未定义的参数" in error and "c" in error for error in result.errors)
    
    def test_validate_expression_dangerous_content(self):
        """测试危险内容验证"""
        dangerous_expressions = [
            ("__import__('os')", "__xxx__ 形式的特殊属性"),
            ("import os", "import 语句"),
            ("eval('1+1')", "eval 函数"),
            ("exec('print(1)')", "exec 函数"),
        ]
        
        parameters = [
            FormulaParameter(name="a", type="number", required=True)
        ]
        
        for expression, expected_error in dangerous_expressions:
            result = self.service.validate_expression(expression, parameters)
            assert result.valid is False
            assert any(expected_error in error for error in result.errors)
    
    def test_validate_expression_with_math_functions(self):
        """测试包含数学函数的表达式验证"""
        expression = "sqrt(a**2 + b**2)"
        parameters = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=True)
        ]
        
        result = self.service.validate_expression(expression, parameters)
        
        assert result.valid is True
        assert len(result.errors) == 0
    
    def test_validate_parameters_valid(self):
        """测试有效参数验证"""
        param_defs = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=False)
        ]
        param_values = {"a": 10, "b": 20}
        
        result = self.service.validate_parameters(param_defs, param_values)
        
        assert result.valid is True
        assert len(result.errors) == 0
    
    def test_validate_parameters_missing_required(self):
        """测试缺少必需参数验证"""
        param_defs = [
            FormulaParameter(name="a", type="number", required=True),
            FormulaParameter(name="b", type="number", required=True)
        ]
        param_values = {"a": 10}
        
        result = self.service.validate_parameters(param_defs, param_values)
        
        assert result.valid is False
        assert any("缺少必需参数" in error and "b" in error for error in result.errors)
    
    def test_validate_parameters_wrong_type(self):
        """测试参数类型错误验证"""
        param_defs = [
            FormulaParameter(name="a", type="number", required=True)
        ]
        param_values = {"a": "not a number"}
        
        result = self.service.validate_parameters(param_defs, param_values)
        
        assert result.valid is False
        assert any("类型错误" in error for error in result.errors)
    
    def test_evaluate_expression_simple(self):
        """测试简单表达式计算"""
        expression = "a + b"
        parameters = {"a": 10, "b": 20}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 30.0
    
    def test_evaluate_expression_complex(self):
        """测试复杂表达式计算"""
        expression = "a * b + c / d"
        parameters = {"a": 2, "b": 3, "c": 10, "d": 2}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 11.0  # 2*3 + 10/2 = 6 + 5 = 11
    
    def test_evaluate_expression_with_math_functions(self):
        """测试包含数学函数的表达式计算"""
        expression = "sqrt(a**2 + b**2)"
        parameters = {"a": 3, "b": 4}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 5.0  # sqrt(9 + 16) = sqrt(25) = 5
    
    def test_evaluate_expression_with_constants(self):
        """测试包含常量的表达式计算"""
        expression = "2 * pi * r"
        parameters = {"r": 1}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert abs(result - 6.283185307179586) < 0.0001  # 2 * pi * 1
    
    def test_evaluate_expression_division_by_zero(self):
        """测试除零错误"""
        expression = "a / b"
        parameters = {"a": 10, "b": 0}
        
        with pytest.raises(ValueError) as exc_info:
            self.service.evaluate_expression(expression, parameters)
        
        assert "公式计算失败" in str(exc_info.value)
    
    def test_evaluate_expression_invalid_result(self):
        """测试无效结果（非数字）"""
        expression = "'hello'"
        parameters = {}
        
        with pytest.raises(ValueError) as exc_info:
            self.service.evaluate_expression(expression, parameters)
        
        assert "公式计算失败" in str(exc_info.value)
    
    def test_extract_variables(self):
        """测试变量提取"""
        import ast
        
        expression = "a + b * sqrt(c)"
        tree = ast.parse(expression, mode='eval')
        
        variables = self.service._extract_variables(tree)
        
        assert set(variables) == {"a", "b", "c", "sqrt"}
    
    def test_evaluate_expression_with_max_min(self):
        """测试 max 和 min 函数"""
        expression = "max(a, b) - min(c, d)"
        parameters = {"a": 10, "b": 20, "c": 5, "d": 3}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 17.0  # max(10, 20) - min(5, 3) = 20 - 3 = 17
    
    def test_evaluate_expression_with_trigonometric_functions(self):
        """测试三角函数"""
        expression = "sin(a) + cos(b)"
        parameters = {"a": 0, "b": 0}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert abs(result - 1.0) < 0.0001  # sin(0) + cos(0) = 0 + 1 = 1
    
    def test_evaluate_expression_with_power(self):
        """测试幂运算"""
        expression = "pow(a, b)"
        parameters = {"a": 2, "b": 3}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 8.0  # 2^3 = 8
    
    def test_evaluate_expression_with_abs(self):
        """测试绝对值函数"""
        expression = "abs(a - b)"
        parameters = {"a": 5, "b": 10}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 5.0  # |5 - 10| = 5
    
    def test_evaluate_expression_with_round(self):
        """测试四舍五入函数"""
        expression = "round(a / b, 2)"
        parameters = {"a": 10, "b": 3}
        
        result = self.service.evaluate_expression(expression, parameters)
        
        assert result == 3.33  # round(10/3, 2) = 3.33
