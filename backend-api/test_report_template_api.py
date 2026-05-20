"""
报告模板 API 测试
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.report import ReportTemplate
from app.services.report_template_service import report_template_service
from app.schemas.report_template import (
    ReportTemplateCreate,
    ReportTemplateUpdate,
    ReportTemplateQuery,
    TemplateVariable,
    TemplateVariableType
)
from app.core.security import get_password_hash
import uuid


async def setup_test_data(db: AsyncSession):
    """设置测试数据"""
    print("设置测试数据...")
    
    # 创建测试用户
    test_user = User(
        id=str(uuid.uuid4()),
        username="test_user",
        email="test@example.com",
        password=get_password_hash("password123"),
        real_name="测试用户",
        is_active=True
    )
    db.add(test_user)
    await db.flush()
    
    print(f"✓ 创建测试用户: {test_user.username} (ID: {test_user.id})")
    return test_user


async def test_create_template(db: AsyncSession, user_id: str):
    """测试创建报告模板"""
    print("\n测试 1: 创建报告模板")
    print("-" * 50)
    
    # 准备测试数据
    template_data = ReportTemplateCreate(
        name="水质检测报告模板",
        description="用于水质检测的标准报告模板",
        category="环境检测",
        content="""
        <html>
        <head><title>{{reportTitle}}</title></head>
        <body>
            <h1>{{reportTitle}}</h1>
            <p>样品名称：{{sample.name}}</p>
            <p>样品编号：{{sample.number}}</p>
            <p>检测日期：{{testDate}}</p>
            <p>检测结果：{{result}}</p>
        </body>
        </html>
        """,
        variables=[
            TemplateVariable(
                name="reportTitle",
                type=TemplateVariableType.STRING,
                label="报告标题",
                description="报告的标题",
                required=True
            ),
            TemplateVariable(
                name="sample",
                type=TemplateVariableType.OBJECT,
                label="样品信息",
                description="样品的详细信息",
                required=True
            ),
            TemplateVariable(
                name="testDate",
                type=TemplateVariableType.DATE,
                label="检测日期",
                required=True
            ),
            TemplateVariable(
                name="result",
                type=TemplateVariableType.STRING,
                label="检测结果",
                required=False,
                defaultValue="待检测"
            )
        ]
    )
    
    # 创建模板
    template = await report_template_service.create_template(
        db=db,
        data=template_data,
        user_id=user_id
    )
    
    print(f"✓ 模板创建成功")
    print(f"  - ID: {template.id}")
    print(f"  - 名称: {template.name}")
    print(f"  - 分类: {template.category}")
    print(f"  - 版本: {template.version}")
    print(f"  - 变量数量: {len(template.variables)}")
    print(f"  - 是否激活: {template.is_active}")
    
    return template


async def test_list_templates(db: AsyncSession):
    """测试查询模板列表"""
    print("\n测试 2: 查询模板列表")
    print("-" * 50)
    
    query = ReportTemplateQuery(
        page=1,
        pageSize=10
    )
    
    result = await report_template_service.list_templates(db=db, query=query)
    
    print(f"✓ 查询成功")
    print(f"  - 总数: {result.total}")
    print(f"  - 当前页: {result.page}")
    print(f"  - 每页数量: {result.pageSize}")
    print(f"  - 总页数: {result.totalPages}")
    print(f"  - 返回记录数: {len(result.items)}")
    
    for item in result.items:
        print(f"    * {item.name} (版本: {item.version}, 激活: {item.isActive})")
    
    return result


async def test_get_template(db: AsyncSession, template_id: str):
    """测试获取模板详情"""
    print("\n测试 3: 获取模板详情")
    print("-" * 50)
    
    template = await report_template_service.get_template(
        db=db,
        template_id=template_id
    )
    
    print(f"✓ 获取成功")
    print(f"  - ID: {template.id}")
    print(f"  - 名称: {template.name}")
    print(f"  - 描述: {template.description}")
    print(f"  - 分类: {template.category}")
    print(f"  - 版本: {template.version}")
    print(f"  - 变量:")
    for var in template.variables:
        print(f"    * {var['name']} ({var['type']}) - {var['label']}")
    
    return template


async def test_update_template(db: AsyncSession, template_id: str, user_id: str):
    """测试更新模板"""
    print("\n测试 4: 更新模板")
    print("-" * 50)
    
    # 更新描述（不创建新版本）
    update_data = ReportTemplateUpdate(
        description="更新后的描述：用于水质检测的标准报告模板（2024版）"
    )
    
    template = await report_template_service.update_template(
        db=db,
        template_id=template_id,
        data=update_data,
        user_id=user_id
    )
    
    print(f"✓ 更新成功（未创建新版本）")
    print(f"  - 版本: {template.version}")
    print(f"  - 描述: {template.description}")
    
    # 更新内容（创建新版本）
    update_data2 = ReportTemplateUpdate(
        content="""
        <html>
        <head><title>{{reportTitle}}</title></head>
        <body>
            <h1>{{reportTitle}}</h1>
            <h2>样品信息</h2>
            <p>样品名称：{{sample.name}}</p>
            <p>样品编号：{{sample.number}}</p>
            <p>样品类型：{{sample.type}}</p>
            <h2>检测信息</h2>
            <p>检测日期：{{testDate}}</p>
            <p>检测结果：{{result}}</p>
        </body>
        </html>
        """
    )
    
    template = await report_template_service.update_template(
        db=db,
        template_id=template_id,
        data=update_data2,
        user_id=user_id
    )
    
    print(f"✓ 更新成功（创建新版本）")
    print(f"  - 新版本: {template.version}")
    
    return template


async def test_activate_deactivate(db: AsyncSession, template_id: str, user_id: str):
    """测试激活和停用模板"""
    print("\n测试 5: 激活和停用模板")
    print("-" * 50)
    
    # 停用模板
    template = await report_template_service.deactivate_template(
        db=db,
        template_id=template_id,
        user_id=user_id
    )
    print(f"✓ 模板已停用: {template.is_active}")
    
    # 激活模板
    template = await report_template_service.activate_template(
        db=db,
        template_id=template_id,
        user_id=user_id
    )
    print(f"✓ 模板已激活: {template.is_active}")
    
    return template


async def test_get_versions(db: AsyncSession, template_id: str):
    """测试获取版本信息"""
    print("\n测试 6: 获取版本信息")
    print("-" * 50)
    
    versions = await report_template_service.get_template_versions(
        db=db,
        template_id=template_id
    )
    
    print(f"✓ 获取成功")
    print(f"  - 模板ID: {versions.templateId}")
    print(f"  - 当前版本: {versions.currentVersion}")
    print(f"  - 创建时间: {versions.createdAt}")
    print(f"  - 更新时间: {versions.updatedAt}")
    print(f"  - 创建人: {versions.createdBy}")
    
    return versions


async def test_validation():
    """测试模板验证"""
    print("\n测试 7: 模板验证")
    print("-" * 50)
    
    # 测试有效模板
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
    print(f"✓ 有效模板验证: {result.isValid}")
    
    # 测试无效模板（使用未定义的变量）
    invalid_content = "<h1>{{title}}</h1><p>{{undefinedVar}}</p>"
    result = report_template_service.validate_template_format(invalid_content, variables)
    print(f"✓ 无效模板验证: {result.isValid}")
    if not result.isValid:
        for error in result.errors:
            print(f"  - 错误: {error.message}")


async def test_search_templates(db: AsyncSession):
    """测试搜索模板"""
    print("\n测试 8: 搜索模板")
    print("-" * 50)
    
    # 按关键词搜索
    query = ReportTemplateQuery(
        search="水质",
        page=1,
        pageSize=10
    )
    
    result = await report_template_service.list_templates(db=db, query=query)
    print(f"✓ 搜索 '水质': 找到 {result.total} 个结果")
    
    # 按分类筛选
    query = ReportTemplateQuery(
        category="环境检测",
        page=1,
        pageSize=10
    )
    
    result = await report_template_service.list_templates(db=db, query=query)
    print(f"✓ 分类 '环境检测': 找到 {result.total} 个结果")
    
    # 按激活状态筛选
    query = ReportTemplateQuery(
        isActive=True,
        page=1,
        pageSize=10
    )
    
    result = await report_template_service.list_templates(db=db, query=query)
    print(f"✓ 激活状态: 找到 {result.total} 个结果")


async def main():
    """主测试函数"""
    print("=" * 50)
    print("报告模板服务测试")
    print("=" * 50)
    
    # 创建数据库表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 创建数据库会话
    async with AsyncSessionLocal() as db:
        try:
            # 设置测试数据
            test_user = await setup_test_data(db)
            await db.commit()
            
            # 运行测试
            template = await test_create_template(db, test_user.id)
            await db.commit()
            
            await test_list_templates(db)
            
            await test_get_template(db, template.id)
            
            await test_update_template(db, template.id, test_user.id)
            await db.commit()
            
            await test_activate_deactivate(db, template.id, test_user.id)
            await db.commit()
            
            await test_get_versions(db, template.id)
            
            await test_validation()
            
            await test_search_templates(db)
            
            print("\n" + "=" * 50)
            print("所有测试完成！")
            print("=" * 50)
            
        except Exception as e:
            print(f"\n❌ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            await db.rollback()
        finally:
            await db.close()
    
    # 清理
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


if __name__ == "__main__":
    asyncio.run(main())
