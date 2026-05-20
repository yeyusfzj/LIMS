"""
简单的报告模板测试
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.schemas.report_template import (
    ReportTemplateCreate,
    TemplateVariable,
    TemplateVariableType
)
from app.services.report_template_service import report_template_service


def test_validation():
    """测试模板验证功能"""
    print("测试模板验证功能")
    print("=" * 50)
    
    # 测试 1: 有效模板
    print("\n测试 1: 有效模板")
    variables = [
        TemplateVariable(
            name="title",
            type=TemplateVariableType.STRING,
            label="标题",
            required=True
        ),
        TemplateVariable(
            name="content",
            type=TemplateVariableType.STRING,
            label="内容",
            required=False
        )
    ]
    
    content = "<h1>{{title}}</h1><p>{{content}}</p>"
    result = report_template_service.validate_template_format(content, variables)
    print(f"验证结果: {result.isValid}")
    assert result.isValid, "有效模板应该通过验证"
    print("✓ 通过")
    
    # 测试 2: 使用未定义的变量
    print("\n测试 2: 使用未定义的变量")
    invalid_content = "<h1>{{title}}</h1><p>{{undefinedVar}}</p>"
    result = report_template_service.validate_template_format(invalid_content, variables)
    print(f"验证结果: {result.isValid}")
    assert not result.isValid, "使用未定义变量的模板应该验证失败"
    print(f"错误信息: {result.errors[0].message}")
    print("✓ 通过")
    
    # 测试 3: 空内容
    print("\n测试 3: 空内容")
    result = report_template_service.validate_template_format("", variables)
    print(f"验证结果: {result.isValid}")
    assert not result.isValid, "空内容应该验证失败"
    print(f"错误信息: {result.errors[0].message}")
    print("✓ 通过")
    
    # 测试 4: 嵌套变量
    print("\n测试 4: 嵌套变量")
    variables_nested = [
        TemplateVariable(
            name="sample",
            type=TemplateVariableType.OBJECT,
            label="样品信息",
            required=True
        )
    ]
    content_nested = "<p>样品名称：{{sample.name}}</p><p>样品编号：{{sample.number}}</p>"
    result = report_template_service.validate_template_format(content_nested, variables_nested)
    print(f"验证结果: {result.isValid}")
    assert result.isValid, "嵌套变量应该通过验证"
    print("✓ 通过")
    
    # 测试 5: 变量名重复
    print("\n测试 5: 变量名重复")
    duplicate_variables = [
        TemplateVariable(
            name="title",
            type=TemplateVariableType.STRING,
            label="标题1",
            required=True
        ),
        TemplateVariable(
            name="title",
            type=TemplateVariableType.STRING,
            label="标题2",
            required=True
        )
    ]
    result = report_template_service.validate_template_variables(duplicate_variables)
    print(f"验证结果: {result.isValid}")
    assert not result.isValid, "重复变量名应该验证失败"
    print(f"错误信息: {result.errors[0].message}")
    print("✓ 通过")
    
    print("\n" + "=" * 50)
    print("所有验证测试通过！")


def test_schema_validation():
    """测试 Pydantic schema 验证"""
    print("\n\n测试 Pydantic Schema 验证")
    print("=" * 50)
    
    # 测试 1: 有效的创建请求
    print("\n测试 1: 有效的创建请求")
    try:
        template_data = ReportTemplateCreate(
            name="测试模板",
            description="测试描述",
            category="测试分类",
            content="<h1>{{title}}</h1>",
            variables=[
                TemplateVariable(
                    name="title",
                    type=TemplateVariableType.STRING,
                    label="标题",
                    required=True
                )
            ]
        )
        print(f"✓ 创建成功: {template_data.name}")
    except Exception as e:
        print(f"❌ 失败: {str(e)}")
        raise
    
    # 测试 2: 变量名重复（应该失败）
    print("\n测试 2: 变量名重复")
    try:
        template_data = ReportTemplateCreate(
            name="测试模板",
            description="测试描述",
            category="测试分类",
            content="<h1>{{title}}</h1>",
            variables=[
                TemplateVariable(
                    name="title",
                    type=TemplateVariableType.STRING,
                    label="标题1",
                    required=True
                ),
                TemplateVariable(
                    name="title",
                    type=TemplateVariableType.STRING,
                    label="标题2",
                    required=True
                )
            ]
        )
        print("❌ 应该失败但成功了")
        assert False, "重复变量名应该验证失败"
    except ValueError as e:
        print(f"✓ 正确捕获错误: {str(e)}")
    
    # 测试 3: 空变量列表（应该失败）
    print("\n测试 3: 空变量列表")
    try:
        template_data = ReportTemplateCreate(
            name="测试模板",
            description="测试描述",
            category="测试分类",
            content="<h1>{{title}}</h1>",
            variables=[]
        )
        print("❌ 应该失败但成功了")
        assert False, "空变量列表应该验证失败"
    except ValueError as e:
        print(f"✓ 正确捕获错误: {str(e)}")
    
    print("\n" + "=" * 50)
    print("所有 Schema 验证测试通过！")


if __name__ == "__main__":
    try:
        test_validation()
        test_schema_validation()
        print("\n" + "=" * 50)
        print("✓ 所有测试通过！")
        print("=" * 50)
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
