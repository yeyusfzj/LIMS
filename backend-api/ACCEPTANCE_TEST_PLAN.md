# FastAPI 完整迁移 - 验收测试计划

## 测试概述

本文档定义了 FastAPI 完整迁移项目的验收测试计划,包括 API 一致性、数据库兼容性、功能完整性、性能指标和安全性验证。

## 测试环境

### 测试环境要求
- FastAPI 服务: http://localhost:8000
- Node.js 服务: http://localhost:3000 (用于对比)
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 测试数据
- 使用测试数据库
- 预置测试用户和权限
- 预置样品、工作流等测试数据

## 测试阶段

### 阶段 1: API 一致性验证 (任务 13.1)

**目标**: 验证 FastAPI 和 Node.js 后端的 API 完全一致

**测试内容**:
1. 端点路径一致性
2. 请求参数格式一致性
3. 响应数据格式一致性
4. 错误响应格式一致性
5. 分页格式一致性
6. HTTP 状态码一致性

**测试方法**:
- 对比两个后端的 OpenAPI 规范
- 执行相同的 API 请求,对比响应
- 验证错误场景的响应一致性

**通过标准**:
- ✅ 所有端点路径匹配
- ✅ 请求参数格式100%一致
- ✅ 响应数据结构100%一致
- ✅ 错误响应格式一致
- ✅ 分页参数和响应格式一致

---

### 阶段 2: 数据库兼容性验证 (任务 13.2)

**目标**: 验证 FastAPI 可以与 Node.js 后端共享数据库

**测试内容**:
1. SQLAlchemy 模型与 Prisma schema 一致性
2. 所有关系映射正确性
3. 所有索引存在性
4. 数据读写兼容性
5. 事务处理兼容性

**测试方法**:
- 对比模型定义
- 验证数据库表结构
- 交叉读写测试(FastAPI 写,Node.js 读;反之亦然)
- 验证外键约束和级联操作

**通过标准**:
- ✅ 所有模型字段类型匹配
- ✅ 所有关系映射正确
- ✅ 所有索引存在
- ✅ 数据可以互相读写
- ✅ 事务隔离级别一致

---

### 阶段 3: 功能完整性验证 (任务 13.3)

**目标**: 验证所有业务功能正常工作

**测试内容**:
1. 认证授权功能
2. 样品管理功能
3. 工作流和任务管理
4. 检测结果管理
5. 审核管理
6. 报告管理
7. 统计分析
8. 系统管理

**测试方法**:
- 端到端功能测试
- 业务流程测试
- 边界条件测试
- 异常场景测试

**通过标准**:
- ✅ 所有核心功能正常
- ✅ 所有业务流程完整
- ✅ 边界条件处理正确
- ✅ 异常场景有适当处理

---

### 阶段 4: 性能指标验证 (任务 13.4)

**目标**: 验证性能指标达到要求

**测试内容**:
1. API 响应时间
2. 数据库查询时间
3. 并发支持能力
4. 内存使用情况
5. CPU 使用情况

**测试方法**:
- 使用 Locust 进行负载测试
- 使用 py-spy 进行性能分析
- 监控系统资源使用

**性能目标**:
- ⚠️ API 响应时间 P95 < 200ms (当前: 2.6s, **未达标**)
- ✅ 数据库查询时间 P95 < 100ms
- ⚠️ 并发支持 ≥ 1000 QPS (需验证)
- ✅ 内存使用 < 2GB (单进程)

**当前状态**:
- 🔴 响应时间严重超标 (12.9倍)
- 🟡 并发能力未充分验证
- 🟢 内存使用正常

---

### 阶段 5: 安全性验证 (任务 13.5)

**目标**: 验证安全措施正常工作

**测试内容**:
1. JWT 认证
2. RBAC 权限控制
3. 敏感数据加密
4. 限流保护
5. 审计日志记录
6. 输入参数验证
7. SQL 注入防护
8. XSS 防护

**测试方法**:
- 认证和授权测试
- 安全扫描
- 渗透测试
- 日志审计

**通过标准**:
- ✅ JWT 认证正常工作
- ✅ 权限控制有效
- ✅ 敏感数据已加密
- ✅ 限流保护生效
- ✅ 审计日志完整
- ✅ 输入验证有效
- ✅ 无 SQL 注入漏洞
- ✅ 无 XSS 漏洞

---

## 测试脚本

### 1. API 一致性测试脚本

```python
# tests/acceptance/test_api_consistency.py
import pytest
import requests
from typing import Dict, Any

FASTAPI_BASE = "http://localhost:8000"
NODEJS_BASE = "http://localhost:3000"

class TestAPIConsistency:
    """API 一致性测试"""
    
    def test_endpoint_paths(self):
        """测试端点路径一致性"""
        # 获取两个后端的 OpenAPI 规范
        fastapi_spec = requests.get(f"{FASTAPI_BASE}/openapi.json").json()
        nodejs_spec = requests.get(f"{NODEJS_BASE}/api-docs/json").json()
        
        # 对比端点路径
        fastapi_paths = set(fastapi_spec['paths'].keys())
        nodejs_paths = set(nodejs_spec['paths'].keys())
        
        assert fastapi_paths == nodejs_paths, f"端点路径不一致: {fastapi_paths ^ nodejs_paths}"
    
    def test_login_response_format(self):
        """测试登录响应格式一致性"""
        login_data = {"username": "testuser", "password": "password123"}
        
        # FastAPI 响应
        fastapi_resp = requests.post(f"{FASTAPI_BASE}/api/v1/auth/login", json=login_data)
        # Node.js 响应
        nodejs_resp = requests.post(f"{NODEJS_BASE}/api/auth/login", json=login_data)
        
        # 验证响应结构一致
        assert fastapi_resp.status_code == nodejs_resp.status_code
        assert set(fastapi_resp.json().keys()) == set(nodejs_resp.json().keys())
    
    def test_pagination_format(self):
        """测试分页格式一致性"""
        # 测试样品列表分页
        params = {"page": 1, "pageSize": 20}
        
        fastapi_resp = requests.get(f"{FASTAPI_BASE}/api/v1/samples", params=params)
        nodejs_resp = requests.get(f"{NODEJS_BASE}/api/samples", params=params)
        
        # 验证分页结构
        fastapi_data = fastapi_resp.json()
        nodejs_data = nodejs_resp.json()
        
        assert "pagination" in fastapi_data
        assert "pagination" in nodejs_data
        assert set(fastapi_data["pagination"].keys()) == set(nodejs_data["pagination"].keys())
```

### 2. 数据库兼容性测试脚本

```python
# tests/acceptance/test_database_compatibility.py
import pytest
from sqlalchemy import create_engine, inspect
from app.core.database import Base
from app.models import *

class TestDatabaseCompatibility:
    """数据库兼容性测试"""
    
    def test_table_structure(self):
        """测试表结构一致性"""
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        # 获取所有表
        tables = inspector.get_table_names()
        
        # 验证关键表存在
        required_tables = [
            'users', 'roles', 'permissions',
            'samples', 'workflows', 'tasks',
            'results', 'audits', 'reports'
        ]
        
        for table in required_tables:
            assert table in tables, f"表 {table} 不存在"
    
    def test_cross_backend_read_write(self):
        """测试跨后端读写"""
        # FastAPI 写入数据
        sample_data = {
            "client_name": "测试客户",
            "sample_name": "测试样品",
            # ... 其他字段
        }
        
        # 通过 FastAPI 创建
        fastapi_resp = requests.post(f"{FASTAPI_BASE}/api/v1/samples", json=sample_data)
        sample_id = fastapi_resp.json()["data"]["id"]
        
        # 通过 Node.js 读取
        nodejs_resp = requests.get(f"{NODEJS_BASE}/api/samples/{sample_id}")
        
        assert nodejs_resp.status_code == 200
        assert nodejs_resp.json()["data"]["sample_name"] == "测试样品"
```

### 3. 功能完整性测试脚本

```python
# tests/acceptance/test_functionality.py
import pytest
import requests

class TestFunctionality:
    """功能完整性测试"""
    
    def test_authentication_flow(self):
        """测试认证流程"""
        # 登录
        login_resp = requests.post(f"{FASTAPI_BASE}/api/v1/auth/login", 
                                   json={"username": "admin", "password": "admin123"})
        assert login_resp.status_code == 200
        
        token = login_resp.json()["accessToken"]
        
        # 获取用户信息
        headers = {"Authorization": f"Bearer {token}"}
        me_resp = requests.get(f"{FASTAPI_BASE}/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        
        # 刷新令牌
        refresh_resp = requests.post(f"{FASTAPI_BASE}/api/v1/auth/refresh",
                                     json={"refreshToken": login_resp.json()["refreshToken"]})
        assert refresh_resp.status_code == 200
    
    def test_sample_management_flow(self):
        """测试样品管理流程"""
        # 创建样品
        # 查询样品
        # 更新样品
        # 删除样品
        pass
    
    def test_workflow_execution(self):
        """测试工作流执行"""
        # 创建工作流模板
        # 创建工作流实例
        # 执行工作流
        # 验证任务创建
        pass
```

### 4. 性能测试脚本

```python
# tests/acceptance/test_performance.py
import pytest
import time
import statistics
from concurrent.futures import ThreadPoolExecutor

class TestPerformance:
    """性能测试"""
    
    def test_api_response_time(self):
        """测试 API 响应时间"""
        response_times = []
        
        for _ in range(100):
            start = time.time()
            resp = requests.get(f"{FASTAPI_BASE}/api/v1/samples")
            end = time.time()
            
            response_times.append((end - start) * 1000)  # 转换为毫秒
        
        p95 = statistics.quantiles(response_times, n=20)[18]  # P95
        
        print(f"P95 响应时间: {p95:.2f}ms")
        assert p95 < 200, f"P95 响应时间 {p95:.2f}ms 超过目标 200ms"
    
    def test_concurrent_requests(self):
        """测试并发请求"""
        def make_request():
            return requests.get(f"{FASTAPI_BASE}/api/v1/samples")
        
        with ThreadPoolExecutor(max_workers=100) as executor:
            futures = [executor.submit(make_request) for _ in range(1000)]
            results = [f.result() for f in futures]
        
        success_count = sum(1 for r in results if r.status_code == 200)
        success_rate = success_count / len(results) * 100
        
        print(f"成功率: {success_rate:.2f}%")
        assert success_rate >= 99, f"成功率 {success_rate:.2f}% 低于目标 99%"
```

### 5. 安全性测试脚本

```python
# tests/acceptance/test_security.py
import pytest
import requests

class TestSecurity:
    """安全性测试"""
    
    def test_authentication_required(self):
        """测试认证要求"""
        # 未认证请求应该返回 401
        resp = requests.get(f"{FASTAPI_BASE}/api/v1/samples")
        assert resp.status_code == 401
    
    def test_permission_control(self):
        """测试权限控制"""
        # 使用普通用户令牌访问管理员端点
        # 应该返回 403
        pass
    
    def test_rate_limiting(self):
        """测试限流保护"""
        # 快速发送大量请求
        # 应该触发限流返回 429
        pass
    
    def test_sql_injection_protection(self):
        """测试 SQL 注入防护"""
        # 尝试 SQL 注入攻击
        malicious_input = "'; DROP TABLE samples; --"
        resp = requests.get(f"{FASTAPI_BASE}/api/v1/samples",
                           params={"search": malicious_input})
        
        # 应该安全处理,不会执行 SQL
        assert resp.status_code in [200, 400]  # 正常响应或参数错误
```

---

## 测试执行计划

### 第1天: 环境准备和 API 一致性测试
- [ ] 准备测试环境
- [ ] 准备测试数据
- [ ] 执行 API 一致性测试
- [ ] 记录测试结果

### 第2天: 数据库兼容性和功能完整性测试
- [ ] 执行数据库兼容性测试
- [ ] 执行功能完整性测试
- [ ] 记录测试结果

### 第3天: 性能和安全性测试
- [ ] 执行性能测试
- [ ] 执行安全性测试
- [ ] 记录测试结果

### 第4天: 问题修复和回归测试
- [ ] 修复发现的问题
- [ ] 执行回归测试
- [ ] 生成测试报告

---

## 测试报告模板

### 测试执行摘要
- 测试日期: YYYY-MM-DD
- 测试人员: [姓名]
- 测试环境: [环境描述]
- 测试版本: [版本号]

### 测试结果统计
- 总测试用例数: X
- 通过用例数: X
- 失败用例数: X
- 跳过用例数: X
- 通过率: X%

### 关键发现
1. **API 一致性**: [通过/失败] - [详细说明]
2. **数据库兼容性**: [通过/失败] - [详细说明]
3. **功能完整性**: [通过/失败] - [详细说明]
4. **性能指标**: [通过/失败] - [详细说明]
5. **安全性**: [通过/失败] - [详细说明]

### 问题列表
| ID | 严重程度 | 问题描述 | 状态 | 负责人 |
|----|---------|---------|------|--------|
| 1  | 高      | 响应时间超标 | 待修复 | [姓名] |
| 2  | 中      | ... | ... | ... |

### 建议和结论
- [测试结论]
- [改进建议]
- [下一步行动]

---

## 验收标准

### 必须通过的标准 (阻塞性)
- ✅ API 一致性 100%
- ✅ 数据库兼容性 100%
- ✅ 核心功能正常 100%
- ✅ 安全性测试通过 100%

### 应该通过的标准 (非阻塞性)
- ⚠️ 性能指标达标 (当前未达标)
- ✅ 测试覆盖率 ≥ 80%
- ✅ 文档完整性 100%

### 可以延后的标准
- 性能优化 (可以在生产环境部署后继续优化)
- 可选功能测试
- 压力测试

---

## 附录

### A. 测试环境配置

```bash
# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 初始化测试数据
python scripts/init_test_data.py

# 运行测试
pytest tests/acceptance/ -v --html=report.html
```

### B. 测试数据准备

```sql
-- 创建测试用户
INSERT INTO users (username, password, email) VALUES
  ('testuser', '$2b$12$...', 'test@example.com'),
  ('admin', '$2b$12$...', 'admin@example.com');

-- 创建测试角色和权限
-- ...
```

### C. 常见问题和解决方案

**问题1**: 测试环境数据库连接失败
- 解决方案: 检查数据库服务是否启动,检查连接字符串

**问题2**: 性能测试结果不稳定
- 解决方案: 增加测试样本数,多次运行取平均值

**问题3**: 并发测试导致数据库锁
- 解决方案: 使用独立的测试数据,避免数据竞争

---

**文档版本**: 1.0
**最后更新**: 2026-04-15
**维护人**: FastAPI 迁移团队
