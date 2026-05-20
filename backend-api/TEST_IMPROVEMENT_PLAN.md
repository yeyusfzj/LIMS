# 测试覆盖率改进计划

## 概述

本文档详细说明了如何将 FastAPI 后端的测试覆盖率从当前的 41% 提升到目标的 80% 以上。

**当前状态**: 41% 覆盖率  
**目标状态**: ≥80% 单元测试覆盖率, ≥70% 集成测试覆盖率  
**预计时间**: 6 周  
**负责人**: 开发团队

---

## 第一阶段：修复测试环境和关键安全模块（第 1 周）

### 目标
- 修复测试环境问题
- 补充认证授权测试
- 覆盖率目标: 41% → 52%

### 任务清单

#### 1.1 修复 Pydantic 配置问题 ⚠️ 紧急

**问题**: Pydantic v2 不支持同时使用 `class Config` 和 `model_config`

**解决方案**:
```python
# 错误写法（Pydantic v1）
class SampleResponse(BaseModel):
    id: str
    
    class Config:
        from_attributes = True

# 正确写法（Pydantic v2）
from pydantic import ConfigDict

class SampleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
```

**需要修改的文件**:
- `app/schemas/sample.py`
- `app/schemas/transfer.py`
- `app/schemas/audit.py`
- `app/schemas/audit_log.py`
- `app/schemas/formula.py`
- `app/schemas/judgment.py`
- `app/schemas/method.py`
- `app/schemas/permission.py`
- `app/schemas/report.py`
- `app/schemas/report_template.py`
- `app/schemas/response.py`
- `app/repositories/base_repository.py`
- `app/config.py`

**预计时间**: 1 天

#### 1.2 认证中间件测试

**文件**: `tests/unit/test_auth_middleware.py`

**测试用例**:
```python
import pytest
from fastapi import HTTPException
from app.middleware.auth import get_current_user
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_get_current_user_with_valid_token(db_session, test_user):
    """测试使用有效令牌获取当前用户"""
    token = create_access_token({"sub": test_user.id})
    user = await get_current_user(token, db_session)
    assert user.id == test_user.id

@pytest.mark.asyncio
async def test_get_current_user_with_invalid_token(db_session):
    """测试使用无效令牌"""
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user("invalid_token", db_session)
    assert exc_info.value.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_with_expired_token(db_session, test_user):
    """测试使用过期令牌"""
    # 创建已过期的令牌
    token = create_access_token(
        {"sub": test_user.id},
        expires_delta=timedelta(seconds=-1)
    )
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token, db_session)
    assert exc_info.value.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_with_nonexistent_user(db_session):
    """测试令牌中的用户不存在"""
    token = create_access_token({"sub": "nonexistent_id"})
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token, db_session)
    assert exc_info.value.status_code == 401
```

**预计增加覆盖率**: +46 语句  
**预计时间**: 1 天

#### 1.3 权限系统测试

**文件**: `tests/unit/test_permission_checker.py`

**测试用例**:
```python
import pytest
from fastapi import HTTPException
from app.core.permissions import PermissionChecker
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission

@pytest.mark.asyncio
async def test_permission_checker_with_valid_permission(db_session, test_user_with_permissions):
    """测试用户有权限的情况"""
    checker = PermissionChecker("sample", "create")
    user = await checker(test_user_with_permissions)
    assert user.id == test_user_with_permissions.id

@pytest.mark.asyncio
async def test_permission_checker_without_permission(db_session, test_user):
    """测试用户没有权限的情况"""
    checker = PermissionChecker("sample", "delete")
    with pytest.raises(HTTPException) as exc_info:
        await checker(test_user)
    assert exc_info.value.status_code == 403

@pytest.mark.asyncio
async def test_permission_checker_with_admin_role(db_session, admin_user):
    """测试管理员角色拥有所有权限"""
    checker = PermissionChecker("sample", "delete")
    user = await checker(admin_user)
    assert user.id == admin_user.id

@pytest.mark.asyncio
async def test_permission_checker_with_inactive_user(db_session, inactive_user):
    """测试非活跃用户"""
    checker = PermissionChecker("sample", "read")
    with pytest.raises(HTTPException) as exc_info:
        await checker(inactive_user)
    assert exc_info.value.status_code == 403
```

**预计增加覆盖率**: +51 语句  
**预计时间**: 2 天

#### 1.4 安全模块完善测试

**文件**: `tests/unit/test_security_complete.py`

**测试用例**:
```python
import pytest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
    revoke_token,
    is_token_revoked
)

def test_password_hashing():
    """测试密码哈希"""
    password = "test_password_123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)

def test_create_and_verify_access_token():
    """测试访问令牌创建和验证"""
    user_id = "test_user_id"
    token = create_access_token({"sub": user_id})
    payload = verify_token(token)
    assert payload["sub"] == user_id

def test_create_and_verify_refresh_token():
    """测试刷新令牌创建和验证"""
    user_id = "test_user_id"
    token = create_refresh_token({"sub": user_id})
    payload = verify_token(token)
    assert payload["sub"] == user_id

@pytest.mark.asyncio
async def test_token_revocation(redis_client):
    """测试令牌撤销"""
    token = create_access_token({"sub": "test_user"})
    
    # 撤销前令牌有效
    assert not await is_token_revoked(token, redis_client)
    
    # 撤销令牌
    await revoke_token(token, redis_client)
    
    # 撤销后令牌无效
    assert await is_token_revoked(token, redis_client)
```

**预计增加覆盖率**: +62 语句  
**预计时间**: 2 天

### 第一阶段总结

- **预计增加覆盖语句**: 159 条
- **预计覆盖率提升**: 41% → 52%
- **预计时间**: 5 个工作日

---

## 第二阶段：核心业务逻辑测试（第 2-3 周）

### 目标
- 补充样品服务完整测试
- 补充流转服务完整测试
- 补充数据访问层测试
- 覆盖率目标: 52% → 70%

### 任务清单

#### 2.1 样品服务完整测试

**文件**: `tests/unit/test_sample_service_complete.py`

**测试用例**:
- 样品创建（包含验证）
- 样品查询（各种过滤条件）
- 样品更新（包含版本控制）
- 样品删除（软删除）
- 样品分样（验证分样逻辑）
- 样品合样（验证合样逻辑）
- 样品状态转换（状态机）
- 样品批量操作
- 样品搜索和排序
- 样品权限过滤

**预计增加覆盖率**: +200 语句  
**预计时间**: 3 天

#### 2.2 流转服务完整测试

**文件**: `tests/unit/test_transfer_service_complete.py`

**测试用例**:
- 流转创建和验证
- 流转接收确认
- 监管链完整性验证
- 流转历史查询
- 流转状态管理
- 流转权限控制
- 批量流转操作

**预计增加覆盖率**: +80 语句  
**预计时间**: 2 天

#### 2.3 数据访问层测试

**文件**: `tests/unit/test_repositories_complete.py`

**测试用例**:
- 基础 CRUD 操作
- 复杂查询（多条件、关联查询）
- 分页和排序
- 批量操作
- 事务处理
- 错误处理和回滚
- 并发控制

**预计增加覆盖率**: +150 语句  
**预计时间**: 3 天

#### 2.4 条码服务测试

**文件**: `tests/unit/test_barcode_service_complete.py`

**测试用例**:
- 条码生成（各种格式）
- 条码验证
- 条码唯一性检查
- 条码解析
- 批量条码生成

**预计增加覆盖率**: +78 语句  
**预计时间**: 1 天

### 第二阶段总结

- **预计增加覆盖语句**: 508 条
- **预计覆盖率提升**: 52% → 70%
- **预计时间**: 9 个工作日

---

## 第三阶段：新功能模块测试（第 4-5 周）

### 目标
- 为所有新迁移的功能添加测试
- 覆盖率目标: 70% → 85%

### 3.1 工作流模块测试

**单元测试文件**:
- `tests/unit/test_workflow_service.py`
- `tests/unit/test_task_service.py`
- `tests/unit/test_assignment_engine.py`

**集成测试文件**:
- `tests/integration/test_workflow_execution.py`

**预计增加覆盖率**: +300 语句  
**预计时间**: 4 天

### 3.2 结果和审核模块测试

**单元测试文件**:
- `tests/unit/test_result_service.py`
- `tests/unit/test_audit_service.py`
- `tests/unit/test_formula_service_complete.py`
- `tests/unit/test_anomaly_service.py`
- `tests/unit/test_import_service_complete.py`

**集成测试文件**:
- `tests/integration/test_batch_import.py`
- `tests/integration/test_audit_workflow.py`

**预计增加覆盖率**: +400 语句  
**预计时间**: 5 天

### 3.3 报告和统计模块测试

**单元测试文件**:
- `tests/unit/test_report_template_service.py`
- `tests/unit/test_report_service.py`
- `tests/unit/test_signature_service.py`
- `tests/unit/test_statistics_service.py`
- `tests/unit/test_export_service_complete.py`

**集成测试文件**:
- `tests/integration/test_report_generation.py`
- `tests/integration/test_data_export.py`

**预计增加覆盖率**: +350 语句  
**预计时间**: 5 天

### 第三阶段总结

- **预计增加覆盖语句**: 1050 条
- **预计覆盖率提升**: 70% → 85%
- **预计时间**: 14 个工作日

---

## 第四阶段：系统管理和优化（第 6 周）

### 目标
- 完善系统管理功能测试
- 添加性能测试
- 覆盖率目标: 85% → 90%

### 4.1 系统管理模块测试

**单元测试文件**:
- `tests/unit/test_audit_log_service.py`
- `tests/unit/test_backup_service.py`
- `tests/unit/test_performance_service_complete.py`
- `tests/unit/test_queue_service.py`
- `tests/unit/test_method_service.py`

**预计增加覆盖率**: +250 语句  
**预计时间**: 3 天

### 4.2 中间件完整测试

**单元测试文件**:
- `tests/unit/test_error_handler_complete.py`
- `tests/unit/test_logging_middleware_complete.py`
- `tests/unit/test_rate_limit_complete.py`

**预计增加覆盖率**: +100 语句  
**预计时间**: 2 天

### 第四阶段总结

- **预计增加覆盖语句**: 350 条
- **预计覆盖率提升**: 85% → 90%
- **预计时间**: 5 个工作日

---

## 测试最佳实践

### 1. 测试命名规范

```python
# 好的测试名称
def test_create_sample_with_valid_data():
    """测试使用有效数据创建样品"""
    pass

def test_create_sample_with_duplicate_barcode_raises_error():
    """测试使用重复条码创建样品时抛出错误"""
    pass

# 不好的测试名称
def test_sample():
    pass

def test_1():
    pass
```

### 2. 使用 Fixtures

```python
@pytest.fixture
async def test_sample(db_session):
    """创建测试样品"""
    sample = Sample(
        barcode="TEST001",
        sample_number="S001",
        client_name="测试客户",
        sample_name="测试样品",
        sample_type="水质",
        quantity=100.0,
        unit="mL"
    )
    db_session.add(sample)
    await db_session.commit()
    await db_session.refresh(sample)
    return sample
```

### 3. 测试边界条件

```python
@pytest.mark.parametrize("quantity,expected", [
    (0, False),      # 边界：零
    (0.1, True),     # 边界：最小正数
    (1000, True),    # 正常值
    (-1, False),     # 边界：负数
])
def test_validate_quantity(quantity, expected):
    """测试数量验证"""
    result = validate_quantity(quantity)
    assert result == expected
```

### 4. 测试异常情况

```python
@pytest.mark.asyncio
async def test_create_sample_with_invalid_data_raises_validation_error(db_session):
    """测试使用无效数据创建样品时抛出验证错误"""
    with pytest.raises(ValidationError) as exc_info:
        await sample_service.create_sample(
            db_session,
            SampleCreate(
                barcode="",  # 无效：空条码
                sample_number="S001",
                client_name="测试客户"
            )
        )
    assert "barcode" in str(exc_info.value)
```

### 5. 使用 Mock

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_send_notification_on_sample_created():
    """测试创建样品时发送通知"""
    with patch('app.services.notification_service.send_notification') as mock_send:
        mock_send.return_value = AsyncMock()
        
        await sample_service.create_sample(db_session, sample_data)
        
        mock_send.assert_called_once()
```

---

## 持续集成配置

### GitHub Actions 配置示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run tests with coverage
        run: |
          pytest --cov=app --cov-report=xml --cov-report=term
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
          REDIS_URL: redis://localhost:6379/0
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
      
      - name: Check coverage threshold
        run: |
          coverage report --fail-under=70
```

---

## 测试覆盖率监控

### 每日检查清单

- [ ] 运行所有测试
- [ ] 检查覆盖率报告
- [ ] 识别未覆盖的代码
- [ ] 添加缺失的测试
- [ ] 更新测试文档

### 每周检查清单

- [ ] 审查测试质量
- [ ] 重构重复的测试代码
- [ ] 更新测试数据
- [ ] 检查测试性能
- [ ] 更新测试覆盖率报告

### 每月检查清单

- [ ] 全面审查测试策略
- [ ] 评估测试覆盖率趋势
- [ ] 识别测试盲点
- [ ] 优化测试执行时间
- [ ] 分享测试最佳实践

---

## 资源和工具

### 推荐阅读

1. [pytest 官方文档](https://docs.pytest.org/)
2. [FastAPI 测试指南](https://fastapi.tiangolo.com/tutorial/testing/)
3. [Python 测试最佳实践](https://docs.python-guide.org/writing/tests/)
4. [测试驱动开发 (TDD)](https://en.wikipedia.org/wiki/Test-driven_development)

### 有用的工具

1. **pytest-cov**: 覆盖率测试
2. **pytest-xdist**: 并行测试
3. **pytest-mock**: Mock 支持
4. **hypothesis**: 属性测试
5. **faker**: 测试数据生成
6. **factory-boy**: 测试数据工厂

---

## 总结

通过执行这个 6 周的改进计划，我们将：

1. ✅ 修复测试环境问题
2. ✅ 将覆盖率从 41% 提升到 90%
3. ✅ 补充所有关键模块的测试
4. ✅ 建立完善的测试体系
5. ✅ 达到项目质量标准

**关键成功因素**:
- 团队承诺和投入
- 持续的测试文化
- 定期的代码审查
- 自动化的 CI/CD 流程

**下一步行动**:
1. 立即开始第一阶段任务
2. 每周审查进度
3. 及时调整计划
4. 分享经验和最佳实践
