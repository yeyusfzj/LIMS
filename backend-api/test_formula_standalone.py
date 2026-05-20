"""
公式服务独立测试脚本
"""

import sys
sys.path.insert(0, '.')

from app.services.formula_service import FormulaService
from app.schemas.formula import FormulaParameter


def test_validate_expression():
    """测试公式表达式验证"""
    service = FormulaService()
    
    print("测试 1: 有效的公式表达式")
    expression = "a * b + c"
    parameters = [
        FormulaParameter(name="a", type="number", required=True),
        FormulaParameter(name="b", type="number", required=True),
        FormulaParameter(name="c", type="number", required=True)
    ]
    result = service.validate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is True
    print("  ✓ 通过\n")
    
    print("测试 2: 空表达式")
    result = service.validate_expression("", parameters)
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is False
    assert "公式表达式不能为空" in result.errors
    print("  ✓ 通过\n")
    
    print("测试 3: 未定义的变量")
    expression = "a + b + undefined_var"
    parameters = [
        FormulaParameter(name="a", type="number", required=True),
        FormulaParameter(name="b", type="number", required=True)
    ]
    result = service.validate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is False
    print("  ✓ 通过\n")
    
    print("测试 4: 危险内容检测")
    dangerous_expressions = [
        "__import__('os')",
        "import os",
        "eval('1+1')",
        "exec('print(1)')"
    ]
    for expr in dangerous_expressions:
        result = service.validate_expression(expr, [FormulaParameter(name="a", type="number", required=True)])
        print(f"  表达式: {expr}")
        print(f"  验证结果: valid={result.valid}")
        assert result.valid is False
    print("  ✓ 通过\n")
    
    print("测试 5: 包含数学函数的表达式")
    expression = "sqrt(a**2 + b**2)"
    parameters = [
        FormulaParameter(name="a", type="number", required=True),
        FormulaParameter(name="b", type="number", required=True)
    ]
    result = service.validate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is True
    print("  ✓ 通过\n")


def test_evaluate_expression():
    """测试公式计算"""
    service = FormulaService()
    
    print("测试 6: 简单表达式计算")
    expression = "a + b"
    parameters = {"a": 10, "b": 20}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert result == 30.0
    print("  ✓ 通过\n")
    
    print("测试 7: 复杂表达式计算")
    expression = "a * b + c / d"
    parameters = {"a": 2, "b": 3, "c": 10, "d": 2}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert result == 11.0
    print("  ✓ 通过\n")
    
    print("测试 8: 包含数学函数的计算")
    expression = "sqrt(a**2 + b**2)"
    parameters = {"a": 3, "b": 4}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert result == 5.0
    print("  ✓ 通过\n")
    
    print("测试 9: 包含常量的计算")
    expression = "2 * pi * r"
    parameters = {"r": 1}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert abs(result - 6.283185307179586) < 0.0001
    print("  ✓ 通过\n")
    
    print("测试 10: max 和 min 函数")
    expression = "max(a, b) - min(c, d)"
    parameters = {"a": 10, "b": 20, "c": 5, "d": 3}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert result == 17.0
    print("  ✓ 通过\n")
    
    print("测试 11: 三角函数")
    expression = "sin(a) + cos(b)"
    parameters = {"a": 0, "b": 0}
    result = service.evaluate_expression(expression, parameters)
    print(f"  表达式: {expression}")
    print(f"  参数: {parameters}")
    print(f"  结果: {result}")
    assert abs(result - 1.0) < 0.0001
    print("  ✓ 通过\n")
    
    print("测试 12: 除零错误处理")
    expression = "a / b"
    parameters = {"a": 10, "b": 0}
    try:
        result = service.evaluate_expression(expression, parameters)
        print("  ✗ 应该抛出异常")
        assert False
    except ValueError as e:
        print(f"  捕获到预期的异常: {str(e)}")
        assert "公式计算失败" in str(e)
        print("  ✓ 通过\n")


def test_validate_parameters():
    """测试参数验证"""
    service = FormulaService()
    
    print("测试 13: 有效参数")
    param_defs = [
        FormulaParameter(name="a", type="number", required=True),
        FormulaParameter(name="b", type="number", required=False)
    ]
    param_values = {"a": 10, "b": 20}
    result = service.validate_parameters(param_defs, param_values)
    print(f"  参数定义: {[(p.name, p.type, p.required) for p in param_defs]}")
    print(f"  参数值: {param_values}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is True
    print("  ✓ 通过\n")
    
    print("测试 14: 缺少必需参数")
    param_defs = [
        FormulaParameter(name="a", type="number", required=True),
        FormulaParameter(name="b", type="number", required=True)  # 改为必需
    ]
    param_values = {"a": 10}
    result = service.validate_parameters(param_defs, param_values)
    print(f"  参数值: {param_values}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is False
    print("  ✓ 通过\n")
    
    print("测试 15: 参数类型错误")
    param_defs = [
        FormulaParameter(name="a", type="number", required=True)
    ]
    param_values = {"a": "not a number"}
    result = service.validate_parameters(param_defs, param_values)
    print(f"  参数值: {param_values}")
    print(f"  验证结果: valid={result.valid}, errors={result.errors}")
    assert result.valid is False
    print("  ✓ 通过\n")


if __name__ == "__main__":
    print("=" * 60)
    print("公式服务测试")
    print("=" * 60)
    print()
    
    try:
        test_validate_expression()
        test_evaluate_expression()
        test_validate_parameters()
        
        print("=" * 60)
        print("所有测试通过！✓")
        print("=" * 60)
    except Exception as e:
        print(f"\n测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
