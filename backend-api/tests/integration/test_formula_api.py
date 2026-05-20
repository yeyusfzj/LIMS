"""
公式 API 集成测试
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models.user import User
from app.models.formula import Formula
from app.core.security import create_access_token


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """创建测试用户"""
    user = User(
        id="test-user-id",
        username="testuser",
        email="test@example.com",
        password="hashed_password",
        realName="测试用户",
        isActive=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User):
    """生成认证头"""
    token = create_access_token({"userId": test_user.id, "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_formula(db_session: AsyncSession, test_user: User):
    """创建测试公式"""
    formula = Formula(
        name="测试公式",
        description="用于测试的公式",
        expression="a + b",
        parameters=[
            {"name": "a", "type": "number", "required": True},
            {"name": "b", "type": "number", "required": True}
        ],
        isActive=True,
        createdBy=test_user.id
    )
    db_session.add(formula)
    await db_session.commit()
    await db_session.refresh(formula)
    return formula


class TestFormulaAPI:
    """公式 API 测试类"""
    
    @pytest.mark.asyncio
    async def test_create_formula(self, auth_headers):
        """测试创建公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formulas",
                json={
                    "name": "浓度计算公式",
                    "description": "根据吸光度计算浓度",
                    "expression": "absorbance * slope + intercept",
                    "parameters": [
                        {
                            "name": "absorbance",
                            "type": "number",
                            "description": "吸光度",
                            "required": True
                        },
                        {
                            "name": "slope",
                            "type": "number",
                            "description": "斜率",
                            "required": True
                        },
                        {
                            "name": "intercept",
                            "type": "number",
                            "description": "截距",
                            "required": True
                        }
                    ],
                    "isActive": True
                },
                headers=auth_headers
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["message"] == "公式创建成功"
            assert data["data"]["name"] == "浓度计算公式"
            assert data["data"]["expression"] == "absorbance * slope + intercept"
            assert len(data["data"]["parameters"]) == 3
    
    @pytest.mark.asyncio
    async def test_create_formula_invalid_expression(self, auth_headers):
        """测试创建无效表达式的公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formulas",
                json={
                    "name": "无效公式",
                    "expression": "import os",
                    "parameters": [
                        {"name": "a", "type": "number", "required": True}
                    ]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "error" in data
    
    @pytest.mark.asyncio
    async def test_list_formulas(self, auth_headers, test_formula):
        """测试查询公式列表"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/formulas",
                params={"page": 1, "pageSize": 20},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "查询成功"
            assert "items" in data["data"]
            assert "total" in data["data"]
            assert "page" in data["data"]
            assert "pageSize" in data["data"]
            assert "totalPages" in data["data"]
    
    @pytest.mark.asyncio
    async def test_list_formulas_with_filter(self, auth_headers, test_formula):
        """测试带过滤条件的公式列表查询"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/formulas",
                params={"name": "测试", "isActive": True},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "查询成功"
            assert len(data["data"]["items"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_formula(self, auth_headers, test_formula):
        """测试获取公式详情"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/formulas/{test_formula.id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "查询成功"
            assert data["data"]["id"] == test_formula.id
            assert data["data"]["name"] == test_formula.name
    
    @pytest.mark.asyncio
    async def test_get_formula_not_found(self, auth_headers):
        """测试获取不存在的公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/formulas/non-existent-id",
                headers=auth_headers
            )
            
            assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_formula(self, auth_headers, test_formula):
        """测试更新公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/formulas/{test_formula.id}",
                json={
                    "name": "更新后的公式",
                    "description": "更新后的描述"
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "公式更新成功"
            assert data["data"]["name"] == "更新后的公式"
            assert data["data"]["description"] == "更新后的描述"
    
    @pytest.mark.asyncio
    async def test_update_formula_expression(self, auth_headers, test_formula):
        """测试更新公式表达式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.put(
                f"/api/v1/formulas/{test_formula.id}",
                json={
                    "expression": "a * b",
                    "parameters": [
                        {"name": "a", "type": "number", "required": True},
                        {"name": "b", "type": "number", "required": True}
                    ]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["data"]["expression"] == "a * b"
    
    @pytest.mark.asyncio
    async def test_delete_formula(self, auth_headers, test_formula):
        """测试删除公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.delete(
                f"/api/v1/formulas/{test_formula.id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "公式删除成功"
    
    @pytest.mark.asyncio
    async def test_validate_formula(self, auth_headers):
        """测试验证公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formulas/validate",
                json={
                    "expression": "a + b * c",
                    "parameters": [
                        {"name": "a", "type": "number", "required": True},
                        {"name": "b", "type": "number", "required": True},
                        {"name": "c", "type": "number", "required": True}
                    ]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "验证完成"
            assert data["data"]["valid"] is True
            assert len(data["data"]["errors"]) == 0
    
    @pytest.mark.asyncio
    async def test_validate_formula_invalid(self, auth_headers):
        """测试验证无效公式"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/formulas/validate",
                json={
                    "expression": "a + b + undefined_var",
                    "parameters": [
                        {"name": "a", "type": "number", "required": True},
                        {"name": "b", "type": "number", "required": True}
                    ]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["data"]["valid"] is False
            assert len(data["data"]["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_execute_formula(self, auth_headers, test_formula):
        """测试执行公式计算"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/formulas/{test_formula.id}/execute",
                json={
                    "a": 10,
                    "b": 20
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "计算成功"
            assert data["data"]["success"] is True
            assert data["data"]["value"] == 30.0
    
    @pytest.mark.asyncio
    async def test_execute_formula_missing_parameter(self, auth_headers, test_formula):
        """测试执行公式时缺少参数"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/formulas/{test_formula.id}/execute",
                json={
                    "a": 10
                    # 缺少参数 b
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "计算失败"
            assert data["data"]["success"] is False
            assert "error" in data["data"]
    
    @pytest.mark.asyncio
    async def test_execute_formula_wrong_type(self, auth_headers, test_formula):
        """测试执行公式时参数类型错误"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/formulas/{test_formula.id}/execute",
                json={
                    "a": "not a number",
                    "b": 20
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "计算失败"
            assert data["data"]["success"] is False
    
    @pytest.mark.asyncio
    async def test_execute_formula_complex_expression(self, auth_headers, test_user):
        """测试执行复杂公式"""
        # 先创建一个复杂公式
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/v1/formulas",
                json={
                    "name": "复杂公式",
                    "expression": "sqrt(a**2 + b**2)",
                    "parameters": [
                        {"name": "a", "type": "number", "required": True},
                        {"name": "b", "type": "number", "required": True}
                    ]
                },
                headers=auth_headers
            )
            
            assert create_response.status_code == 201
            formula_id = create_response.json()["data"]["id"]
            
            # 执行计算
            execute_response = await client.post(
                f"/api/v1/formulas/{formula_id}/execute",
                json={
                    "a": 3,
                    "b": 4
                },
                headers=auth_headers
            )
            
            assert execute_response.status_code == 200
            data = execute_response.json()
            assert data["data"]["success"] is True
            assert data["data"]["value"] == 5.0  # sqrt(9 + 16) = 5
    
    @pytest.mark.asyncio
    async def test_unauthorized_access(self):
        """测试未授权访问"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/formulas")
            
            assert response.status_code == 401
