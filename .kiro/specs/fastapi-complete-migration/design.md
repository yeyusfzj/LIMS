# 设计文档：FastAPI 完整迁移

## 概述

本文档描述了将 Node.js 后端（backend-api）的所有功能完整迁移到 FastAPI 后端（fastapi-backend）的技术设计方案。


## 迁移策略

### 分阶段实施

迁移将分为 5 个阶段进行，每个阶段完成后都能独立验证和部署：

**阶段 1：认证授权和基础设施（2-3 周）**
- JWT 认证系统
- RBAC 权限控制
- 用户和角色管理
- 中间件层完善
- 健康检查和监控

**阶段 2：工作流和任务管理（2-3 周）**
- 工作流模板管理
- 工作流实例管理
- 任务管理和分配
- 自动任务分配引擎

**阶段 3：检测结果和审核管理（2-3 周）**
- 检测结果管理
- 批量导入功能
- 计算公式引擎
- 异常检测
- 审核任务管理
- 审核流程引擎

**阶段 4：报告和统计分析（2-3 周）**
- 报告模板管理
- 报告生成引擎
- 电子签名
- 报告发布和撤回
- 统计分析
- 数据导出

**阶段 5：系统管理和优化（1-2 周）**
- 审计日志管理
- 数据备份恢复
- 性能监控
- 异步任务队列
- 检测方法库
- 质量判定规则
- 性能优化和压力测试

### 迁移原则

1. **保持 API 兼容性**：确保前端无需修改即可切换后端
2. **数据库共享**：FastAPI 和 Node.js 后端共享同一个 PostgreSQL 数据库
3. **渐进式迁移**：每个模块独立迁移，可以逐步切换流量
4. **完整测试覆盖**：每个功能都有单元测试和集成测试
5. **性能优先**：充分利用 Python 异步特性提升性能


## 架构设计

### 整体架构

FastAPI 后端采用与 Node.js 后端相同的分层架构模式，确保架构一致性：

```
┌─────────────────────────────────────────┐
│         API Gateway / Load Balancer     │
│    (可选：Nginx 反向代理和负载均衡)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         FastAPI Application             │
│  - ASGI Server (Uvicorn/Gunicorn)      │
│  - OpenAPI 自动文档                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Middleware Layer (中间件层)      │
│  - CORS 中间件                          │
│  - 认证中间件 (JWT)                     │
│  - 权限中间件 (RBAC)                    │
│  - 限流中间件                           │
│  - 日志中间件                           │
│  - 错误处理中间件                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         API Router Layer (路由层)        │
│  - 请求验证 (Pydantic)                  │
│  - 参数解析                             │
│  - 响应序列化                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Service Layer (业务逻辑层)       │
│  - 业务规则实现                         │
│  - 工作流引擎                           │
│  - 事务管理                             │
│  - 缓存管理                             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository Layer (数据访问层)       │
│  - SQLAlchemy 异步查询                  │
│  - 查询优化                             │
│  - 批量操作                             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Model Layer (模型层)             │
│  - SQLAlchemy ORM 模型                  │
│  - 关系映射                             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Layer (数据层)              │
│  PostgreSQL  │  Redis  │  File Storage  │
└─────────────────────────────────────────┘
```

### 技术栈对比

| 层级 | Node.js 后端 | FastAPI 后端 | 说明 |
|------|-------------|-------------|------|
| Web 框架 | Express.js | FastAPI | 都是轻量级高性能框架 |
| 语言 | TypeScript | Python 3.11+ | 都支持类型提示 |
| ORM | Prisma | SQLAlchemy 2.0 | 都支持异步操作 |
| 数据库驱动 | pg | asyncpg | 都是异步驱动 |
| 验证 | Joi | Pydantic | 都支持 schema 验证 |
| 认证 | jsonwebtoken | PyJWT | JWT 标准实现 |
| 日志 | Winston | Python logging | 结构化日志 |
| 测试 | Vitest + fast-check | pytest + hypothesis | 都支持属性测试 |
| 文档 | Swagger (手动) | OpenAPI (自动) | FastAPI 自动生成 |
| 异步模型 | async/await | async/await | 语法相似 |


## 组件和接口

### 1. 认证授权模块

#### 1.1 JWT 认证服务

**文件**: `app/core/security.py`

**职责**:
- 生成 JWT 访问令牌和刷新令牌
- 验证令牌有效性
- 解析令牌获取用户信息
- 令牌刷新和撤销

**关键接口**:
```python
class SecurityService:
    async def create_access_token(
        self, 
        user_id: str, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """创建访问令牌"""
        
    async def create_refresh_token(
        self, 
        user_id: str
    ) -> str:
        """创建刷新令牌"""
        
    async def verify_token(
        self, 
        token: str
    ) -> Dict[str, Any]:
        """验证令牌并返回载荷"""
        
    async def decode_token(
        self, 
        token: str
    ) -> TokenPayload:
        """解码令牌"""
```

**与 Node.js 后端的兼容性**:
- 使用相同的 JWT_SECRET_KEY
- 使用相同的令牌过期时间
- 使用相同的载荷结构：`{ userId, email, roles }`
- 使用相同的算法：HS256

#### 1.2 权限控制服务

**文件**: `app/core/permissions.py`

**职责**:
- 检查用户权限
- 实现 RBAC 权限模型
- 权限依赖注入

**关键接口**:
```python
class PermissionChecker:
    def __init__(
        self, 
        resource: str, 
        action: str
    ):
        """初始化权限检查器"""
        
    async def __call__(
        self, 
        current_user: User = Depends(get_current_user)
    ) -> User:
        """检查用户是否有权限"""

# 使用示例
@router.post("/samples")
async def create_sample(
    data: SampleCreate,
    user: User = Depends(PermissionChecker("sample", "create"))
):
    """创建样品 - 需要 sample:create 权限"""
```

#### 1.3 认证中间件

**文件**: `app/middleware/auth.py`

**职责**:
- 从请求头提取 JWT 令牌
- 验证令牌有效性
- 将用户信息注入请求上下文

**实现**:
```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """获取当前登录用户"""
    try:
        payload = await security_service.verify_token(token)
        user_id = payload.get("userId")
        
        user = await user_repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="用户不存在"
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="无效的认证令牌"
        )
```

### 2. 用户和角色管理模块

#### 2.1 用户服务

**文件**: `app/services/user_service.py`

**职责**:
- 用户 CRUD 操作
- 密码哈希和验证
- 用户角色分配

**关键接口**:
```python
class UserService:
    async def create_user(
        self, 
        db: AsyncSession, 
        data: UserCreate
    ) -> User:
        """创建用户"""
        
    async def get_users(
        self, 
        db: AsyncSession, 
        query: UserQuery
    ) -> PaginatedResult[User]:
        """查询用户列表"""
        
    async def update_user(
        self, 
        db: AsyncSession, 
        user_id: str, 
        data: UserUpdate
    ) -> User:
        """更新用户"""
        
    async def assign_roles(
        self, 
        db: AsyncSession, 
        user_id: str, 
        role_ids: List[str]
    ) -> User:
        """分配角色"""
```

#### 2.2 角色服务

**文件**: `app/services/role_service.py`

**职责**:
- 角色 CRUD 操作
- 角色权限分配
- 角色继承管理

**关键接口**:
```python
class RoleService:
    async def create_role(
        self, 
        db: AsyncSession, 
        data: RoleCreate
    ) -> Role:
        """创建角色"""
        
    async def assign_permissions(
        self, 
        db: AsyncSession, 
        role_id: str, 
        permission_ids: List[str]
    ) -> Role:
        """分配权限"""
```

#### 2.3 权限服务

**文件**: `app/services/permission_service.py`

**职责**:
- 权限 CRUD 操作
- 权限树管理
- 权限检查

**关键接口**:
```python
class PermissionService:
    async def create_permission(
        self, 
        db: AsyncSession, 
        data: PermissionCreate
    ) -> Permission:
        """创建权限"""
        
    async def check_permission(
        self, 
        db: AsyncSession, 
        user_id: str, 
        resource: str, 
        action: str
    ) -> bool:
        """检查用户权限"""
```


### 3. 工作流管理模块

#### 3.1 工作流服务

**文件**: `app/services/workflow_service.py`

**职责**:
- 工作流模板管理
- 工作流实例管理
- 工作流状态机

**关键接口**:
```python
class WorkflowService:
    async def create_template(
        self, 
        db: AsyncSession, 
        data: WorkflowTemplateCreate
    ) -> WorkflowTemplate:
        """创建工作流模板"""
        
    async def create_instance(
        self, 
        db: AsyncSession, 
        template_id: str, 
        data: WorkflowInstanceCreate
    ) -> WorkflowInstance:
        """创建工作流实例"""
        
    async def execute_workflow(
        self, 
        db: AsyncSession, 
        instance_id: str
    ) -> WorkflowInstance:
        """执行工作流"""
```

#### 3.2 任务服务

**文件**: `app/services/task_service.py`

**职责**:
- 任务 CRUD 操作
- 任务分配
- 任务执行
- 任务状态管理

**关键接口**:
```python
class TaskService:
    async def create_task(
        self, 
        db: AsyncSession, 
        data: TaskCreate
    ) -> Task:
        """创建任务"""
        
    async def assign_task(
        self, 
        db: AsyncSession, 
        task_id: str, 
        assignee_id: str
    ) -> Task:
        """分配任务"""
        
    async def complete_task(
        self, 
        db: AsyncSession, 
        task_id: str, 
        result: TaskResult
    ) -> Task:
        """完成任务"""
```

#### 3.3 自动分配引擎

**文件**: `app/services/assignment_engine.py`

**职责**:
- 根据规则自动分配任务
- 负载均衡
- 技能匹配

**关键接口**:
```python
class AssignmentEngine:
    async def auto_assign(
        self, 
        db: AsyncSession, 
        task: Task
    ) -> str:
        """自动分配任务，返回分配的用户 ID"""
        
    async def calculate_workload(
        self, 
        db: AsyncSession, 
        user_id: str
    ) -> int:
        """计算用户工作量"""
```

### 4. 检测结果管理模块

#### 4.1 结果服务

**文件**: `app/services/result_service.py`

**职责**:
- 检测结果 CRUD 操作
- 批量导入
- 结果审核

**关键接口**:
```python
class ResultService:
    async def create_result(
        self, 
        db: AsyncSession, 
        data: ResultCreate
    ) -> Result:
        """创建检测结果"""
        
    async def batch_import(
        self, 
        db: AsyncSession, 
        file: UploadFile
    ) -> BatchImportResult:
        """批量导入结果"""
        
    async def review_result(
        self, 
        db: AsyncSession, 
        result_id: str, 
        review: ResultReview
    ) -> Result:
        """审核结果"""
```

#### 4.2 公式服务

**文件**: `app/services/formula_service.py`

**职责**:
- 公式 CRUD 操作
- 公式验证
- 公式执行

**关键接口**:
```python
class FormulaService:
    async def create_formula(
        self, 
        db: AsyncSession, 
        data: FormulaCreate
    ) -> Formula:
        """创建公式"""
        
    async def validate_formula(
        self, 
        expression: str
    ) -> bool:
        """验证公式语法"""
        
    async def execute_formula(
        self, 
        formula: Formula, 
        variables: Dict[str, float]
    ) -> float:
        """执行公式计算"""
```

#### 4.3 异常检测服务

**文件**: `app/services/anomaly_service.py`

**职责**:
- 异常检测规则管理
- 自动异常检测
- 异常处理

**关键接口**:
```python
class AnomalyService:
    async def detect_anomaly(
        self, 
        db: AsyncSession, 
        result: Result
    ) -> Optional[Anomaly]:
        """检测异常"""
        
    async def handle_anomaly(
        self, 
        db: AsyncSession, 
        anomaly_id: str, 
        action: AnomalyAction
    ) -> Anomaly:
        """处理异常"""
```

#### 4.4 导入服务

**文件**: `app/services/import_service.py`

**职责**:
- 文件解析（Excel, CSV）
- 数据验证
- 批量插入

**关键接口**:
```python
class ImportService:
    async def parse_file(
        self, 
        file: UploadFile
    ) -> List[Dict[str, Any]]:
        """解析文件"""
        
    async def validate_data(
        self, 
        data: List[Dict[str, Any]]
    ) -> ValidationResult:
        """验证数据"""
        
    async def import_results(
        self, 
        db: AsyncSession, 
        data: List[ResultCreate]
    ) -> BatchImportResult:
        """批量导入结果"""
```


### 5. 审核管理模块

#### 5.1 审核服务

**文件**: `app/services/audit_service.py`

**职责**:
- 审核任务管理
- 审核流程执行
- 审核统计

**关键接口**:
```python
class AuditService:
    async def create_audit_task(
        self, 
        db: AsyncSession, 
        data: AuditTaskCreate
    ) -> AuditTask:
        """创建审核任务"""
        
    async def execute_audit(
        self, 
        db: AsyncSession, 
        task_id: str, 
        audit: AuditExecution
    ) -> AuditTask:
        """执行审核"""
        
    async def get_audit_statistics(
        self, 
        db: AsyncSession, 
        query: AuditStatisticsQuery
    ) -> AuditStatistics:
        """获取审核统计"""
```

#### 5.2 质量判定服务

**文件**: `app/services/judgment_service.py`

**职责**:
- 质量判定规则管理
- 自动判定
- 判定历史

**关键接口**:
```python
class JudgmentService:
    async def create_rule(
        self, 
        db: AsyncSession, 
        data: JudgmentRuleCreate
    ) -> JudgmentRule:
        """创建判定规则"""
        
    async def auto_judge(
        self, 
        db: AsyncSession, 
        sample_id: str
    ) -> QualityJudgment:
        """自动判定"""
        
    async def manual_judge(
        self, 
        db: AsyncSession, 
        data: ManualJudgment
    ) -> QualityJudgment:
        """手动判定"""
```

### 6. 报告管理模块

#### 6.1 报告模板服务

**文件**: `app/services/report_template_service.py`

**职责**:
- 报告模板 CRUD 操作
- 模板字段配置
- 模板版本管理

**关键接口**:
```python
class ReportTemplateService:
    async def create_template(
        self, 
        db: AsyncSession, 
        data: ReportTemplateCreate
    ) -> ReportTemplate:
        """创建报告模板"""
        
    async def update_template(
        self, 
        db: AsyncSession, 
        template_id: str, 
        data: ReportTemplateUpdate
    ) -> ReportTemplate:
        """更新报告模板"""
```

#### 6.2 报告生成服务

**文件**: `app/services/report_service.py`

**职责**:
- 报告生成
- 报告审核
- 报告发布
- 报告撤回

**关键接口**:
```python
class ReportService:
    async def generate_report(
        self, 
        db: AsyncSession, 
        data: ReportGenerate
    ) -> Report:
        """生成报告"""
        
    async def review_report(
        self, 
        db: AsyncSession, 
        report_id: str, 
        review: ReportReview
    ) -> Report:
        """审核报告"""
        
    async def publish_report(
        self, 
        db: AsyncSession, 
        report_id: str
    ) -> Report:
        """发布报告"""
        
    async def recall_report(
        self, 
        db: AsyncSession, 
        report_id: str, 
        reason: str
    ) -> Report:
        """撤回报告"""
```

#### 6.3 电子签名服务

**文件**: `app/services/signature_service.py`

**职责**:
- 签名创建
- 签名验证
- 签名应用

**关键接口**:
```python
class SignatureService:
    async def create_signature(
        self, 
        db: AsyncSession, 
        data: SignatureCreate
    ) -> Signature:
        """创建电子签名"""
        
    async def verify_signature(
        self, 
        signature: Signature, 
        data: bytes
    ) -> bool:
        """验证签名"""
        
    async def sign_report(
        self, 
        db: AsyncSession, 
        report_id: str, 
        signature_id: str
    ) -> Report:
        """签署报告"""
```

#### 6.4 报告分发服务

**文件**: `app/services/distribution_service.py`

**职责**:
- 报告分发
- 分发记录
- 分发通知

**关键接口**:
```python
class DistributionService:
    async def distribute_report(
        self, 
        db: AsyncSession, 
        report_id: str, 
        recipients: List[str]
    ) -> List[Distribution]:
        """分发报告"""
        
    async def get_distribution_history(
        self, 
        db: AsyncSession, 
        report_id: str
    ) -> List[Distribution]:
        """获取分发历史"""
```


### 7. 统计分析模块

#### 7.1 统计服务

**文件**: `app/services/statistics_service.py`

**职责**:
- 综合统计
- 审核统计
- 工作量统计
- 质量统计

**关键接口**:
```python
class StatisticsService:
    async def get_overview_statistics(
        self, 
        db: AsyncSession, 
        query: StatisticsQuery
    ) -> OverviewStatistics:
        """获取综合统计"""
        
    async def get_audit_statistics(
        self, 
        db: AsyncSession, 
        query: AuditStatisticsQuery
    ) -> AuditStatistics:
        """获取审核统计"""
        
    async def get_workload_statistics(
        self, 
        db: AsyncSession, 
        query: WorkloadQuery
    ) -> WorkloadStatistics:
        """获取工作量统计"""
        
    async def get_quality_statistics(
        self, 
        db: AsyncSession, 
        query: QualityQuery
    ) -> QualityStatistics:
        """获取质量统计"""
```

#### 7.2 导出服务

**文件**: `app/services/export_service.py`

**职责**:
- 数据导出（Excel, CSV）
- 报表生成
- 文件管理

**关键接口**:
```python
class ExportService:
    async def export_to_excel(
        self, 
        data: List[Dict[str, Any]], 
        columns: List[str]
    ) -> bytes:
        """导出为 Excel"""
        
    async def export_to_csv(
        self, 
        data: List[Dict[str, Any]]
    ) -> str:
        """导出为 CSV"""
        
    async def generate_report(
        self, 
        db: AsyncSession, 
        report_type: str, 
        query: Dict[str, Any]
    ) -> str:
        """生成报表文件路径"""
```

### 8. 系统管理模块

#### 8.1 审计日志服务

**文件**: `app/services/audit_log_service.py`

**职责**:
- 审计日志记录
- 审计日志查询
- 审计日志归档

**关键接口**:
```python
class AuditLogService:
    async def log_action(
        self, 
        db: AsyncSession, 
        log: AuditLogCreate
    ) -> AuditLog:
        """记录审计日志"""
        
    async def query_logs(
        self, 
        db: AsyncSession, 
        query: AuditLogQuery
    ) -> PaginatedResult[AuditLog]:
        """查询审计日志"""
        
    async def archive_logs(
        self, 
        db: AsyncSession, 
        before_date: datetime
    ) -> int:
        """归档历史日志"""
```

#### 8.2 备份服务

**文件**: `app/services/backup_service.py`

**职责**:
- 数据备份
- 数据恢复
- 备份管理

**关键接口**:
```python
class BackupService:
    async def create_backup(
        self, 
        db: AsyncSession
    ) -> BackupRecord:
        """创建备份"""
        
    async def restore_backup(
        self, 
        db: AsyncSession, 
        backup_id: str
    ) -> bool:
        """恢复备份"""
        
    async def list_backups(
        self, 
        db: AsyncSession
    ) -> List[BackupRecord]:
        """列出备份"""
```

#### 8.3 性能监控服务

**文件**: `app/services/performance_service.py`

**职责**:
- 性能指标收集
- 性能统计
- 慢查询分析

**关键接口**:
```python
class PerformanceService:
    async def record_metric(
        self, 
        metric: PerformanceMetric
    ) -> None:
        """记录性能指标"""
        
    async def get_statistics(
        self, 
        query: PerformanceQuery
    ) -> PerformanceStatistics:
        """获取性能统计"""
        
    async def get_slow_queries(
        self, 
        threshold: int = 1000
    ) -> List[SlowQuery]:
        """获取慢查询"""
```

#### 8.4 队列服务

**文件**: `app/services/queue_service.py`

**职责**:
- 异步任务队列管理
- 任务调度
- 任务监控

**关键接口**:
```python
class QueueService:
    async def enqueue_task(
        self, 
        task_type: str, 
        data: Dict[str, Any]
    ) -> str:
        """添加任务到队列"""
        
    async def get_task_status(
        self, 
        task_id: str
    ) -> TaskStatus:
        """获取任务状态"""
        
    async def cancel_task(
        self, 
        task_id: str
    ) -> bool:
        """取消任务"""
```

#### 8.5 检测方法服务

**文件**: `app/services/method_service.py`

**职责**:
- 检测方法 CRUD 操作
- 方法版本管理
- 方法关联管理

**关键接口**:
```python
class MethodService:
    async def create_method(
        self, 
        db: AsyncSession, 
        data: MethodCreate
    ) -> TestMethod:
        """创建检测方法"""
        
    async def update_method(
        self, 
        db: AsyncSession, 
        method_id: str, 
        data: MethodUpdate
    ) -> TestMethod:
        """更新检测方法"""
```


## 数据模型

### SQLAlchemy 模型映射

FastAPI 后端使用 SQLAlchemy 2.0 异步 ORM，需要将 Prisma schema 中的所有模型映射为 SQLAlchemy 模型。

#### 模型映射原则

1. **表名一致**：使用与 Prisma 相同的表名
2. **字段类型映射**：
   - String → String
   - Int → Integer
   - Float → Float
   - Boolean → Boolean
   - DateTime → DateTime
   - Json → JSON
   - Enum → Enum

3. **关系映射**：
   - 一对多：使用 `relationship()` 和 `back_populates`
   - 多对多：使用中间表和 `secondary`
   - 一对一：使用 `uselist=False`

4. **索引和约束**：保持与 Prisma 定义一致

#### 核心模型示例

**用户模型** (`app/models/user.py`):
```python
from sqlalchemy import Column, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
import uuid
from datetime import datetime

# 用户-角色关联表
user_roles = Table(
    'UserRole',
    Base.metadata,
    Column('userId', String, ForeignKey('User.id'), primary_key=True),
    Column('roleId', String, ForeignKey('Role.id'), primary_key=True)
)

class User(Base):
    __tablename__ = 'User'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    realName = Column(String(100))
    phone = Column(String(20))
    department = Column(String(100))
    position = Column(String(100))
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    created_samples = relationship('Sample', back_populates='creator')
    audit_logs = relationship('AuditLog', back_populates='user')
```

**样品模型** (`app/models/sample.py`):
```python
from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

class SampleStatus(str, enum.Enum):
    REGISTERED = "REGISTERED"
    TESTING = "TESTING"
    COMPLETED = "COMPLETED"
    RELEASED = "RELEASED"

class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class Sample(Base):
    __tablename__ = 'Sample'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    sampleNumber = Column(String(50), unique=True, nullable=False, index=True)
    clientName = Column(String(200), nullable=False)
    clientContact = Column(String(100))
    sampleName = Column(String(200), nullable=False)
    sampleType = Column(String(100), nullable=False)
    sampleCategory = Column(String(100))
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    status = Column(SQLEnum(SampleStatus), default=SampleStatus.REGISTERED, index=True)
    priority = Column(SQLEnum(Priority), default=Priority.MEDIUM)
    receivedDate = Column(DateTime, nullable=False)
    samplingDate = Column(DateTime)
    samplingLocation = Column(String(200))
    samplingPerson = Column(String(100))
    storageLocation = Column(String(200))
    storageCondition = Column(String(200))
    description = Column(String(1000))
    remarks = Column(String(1000))
    createdBy = Column(String, ForeignKey('User.id'), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    creator = relationship('User', back_populates='created_samples')
    test_items = relationship('TestItem', back_populates='sample')
    transfers = relationship('Transfer', back_populates='sample')
    results = relationship('Result', back_populates='sample')
    reports = relationship('Report', back_populates='sample')
```

**工作流模型** (`app/models/workflow.py`):
```python
from sqlalchemy import Column, String, JSON, DateTime, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum

class WorkflowStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class WorkflowInstanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class WorkflowTemplate(Base):
    __tablename__ = 'WorkflowTemplate'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(String(1000))
    category = Column(String(100))
    nodes = Column(JSON, nullable=False)  # 节点配置
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.DRAFT)
    version = Column(Integer, default=1)
    createdBy = Column(String, ForeignKey('User.id'), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    instances = relationship('WorkflowInstance', back_populates='template')

class WorkflowInstance(Base):
    __tablename__ = 'WorkflowInstance'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    templateId = Column(String, ForeignKey('WorkflowTemplate.id'), nullable=False)
    sampleId = Column(String, ForeignKey('Sample.id'))
    status = Column(SQLEnum(WorkflowInstanceStatus), default=WorkflowInstanceStatus.PENDING)
    currentNode = Column(String(100))
    startedAt = Column(DateTime)
    completedAt = Column(DateTime)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    template = relationship('WorkflowTemplate', back_populates='instances')
    sample = relationship('Sample')
    tasks = relationship('Task', back_populates='workflow_instance')
```

### 数据库连接配置

**文件**: `app/core/database.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,  # 连接池大小
    max_overflow=10,  # 最大溢出连接数
    pool_pre_ping=True,  # 连接前检查
    pool_recycle=3600,  # 连接回收时间（秒）
)

# 创建会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

# 依赖注入：获取数据库会话
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```


## 错误处理

### 统一错误响应格式

与 Node.js 后端保持一致的错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": "详细信息（可选）"
  }
}
```

### 自定义异常类

**文件**: `app/core/exceptions.py`

```python
from fastapi import HTTPException
from typing import Optional, Dict, Any

class AppException(HTTPException):
    """应用基础异常"""
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[str] = None
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message)

class UnauthorizedException(AppException):
    """未授权异常"""
    def __init__(self, message: str = "未授权", details: Optional[str] = None):
        super().__init__(401, "UNAUTHORIZED", message, details)

class ForbiddenException(AppException):
    """禁止访问异常"""
    def __init__(self, message: str = "禁止访问", details: Optional[str] = None):
        super().__init__(403, "FORBIDDEN", message, details)

class NotFoundException(AppException):
    """资源不存在异常"""
    def __init__(self, message: str = "资源不存在", details: Optional[str] = None):
        super().__init__(404, "NOT_FOUND", message, details)

class ValidationException(AppException):
    """验证异常"""
    def __init__(self, message: str = "验证失败", details: Optional[str] = None):
        super().__init__(400, "VALIDATION_ERROR", message, details)

class ConflictException(AppException):
    """冲突异常"""
    def __init__(self, message: str = "资源冲突", details: Optional[str] = None):
        super().__init__(409, "CONFLICT", message, details)

class InternalServerException(AppException):
    """服务器内部错误"""
    def __init__(self, message: str = "服务器内部错误", details: Optional[str] = None):
        super().__init__(500, "INTERNAL_ERROR", message, details)
```

### 错误处理中间件

**文件**: `app/middleware/error_handler.py`

```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.core.exceptions import AppException
from app.core.logging import logger
import traceback

async def error_handler_middleware(request: Request, call_next):
    """全局错误处理中间件"""
    try:
        response = await call_next(request)
        return response
    except AppException as e:
        # 应用自定义异常
        logger.warning(f"Application error: {e.code} - {e.message}", extra={
            "code": e.code,
            "path": request.url.path,
            "method": request.method
        })
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": {
                    "code": e.code,
                    "message": e.message,
                    "details": e.details
                }
            }
        )
    except RequestValidationError as e:
        # Pydantic 验证错误
        logger.warning(f"Validation error: {str(e)}", extra={
            "path": request.url.path,
            "errors": e.errors()
        })
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "请求参数验证失败",
                    "details": e.errors()
                }
            }
        )
    except IntegrityError as e:
        # 数据库完整性错误
        logger.error(f"Database integrity error: {str(e)}", extra={
            "path": request.url.path
        })
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "CONFLICT",
                    "message": "数据冲突",
                    "details": "违反数据库约束"
                }
            }
        )
    except SQLAlchemyError as e:
        # 数据库错误
        logger.error(f"Database error: {str(e)}", extra={
            "path": request.url.path,
            "traceback": traceback.format_exc()
        })
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "DATABASE_ERROR",
                    "message": "数据库操作失败"
                }
            }
        )
    except Exception as e:
        # 未预期的错误
        logger.error(f"Unexpected error: {str(e)}", extra={
            "path": request.url.path,
            "traceback": traceback.format_exc()
        })
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "服务器内部错误"
                }
            }
        )
```

## 测试策略

### 测试层次

1. **单元测试**：测试单个函数和类
2. **集成测试**：测试 API 端点和数据库交互
3. **属性测试**：使用 Hypothesis 进行属性测试
4. **性能测试**：使用 Locust 进行压力测试

### 测试覆盖目标

- 单元测试覆盖率：≥ 80%
- 集成测试覆盖率：≥ 70%
- 关键业务逻辑：100%

### 测试工具

- **pytest**: 测试框架
- **pytest-asyncio**: 异步测试支持
- **hypothesis**: 属性测试
- **httpx**: 异步 HTTP 客户端
- **pytest-cov**: 覆盖率报告
- **locust**: 性能测试

### 测试数据库

使用独立的测试数据库，每次测试前重置：

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models.base import Base
from app.core.database import get_db

TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_db"

@pytest.fixture(scope="function")
async def db_session():
    """创建测试数据库会话"""
    engine = create_async_engine(TEST_DATABASE_URL)
    
    # 创建所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    # 清理所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()
```

### 测试示例

**单元测试** (`tests/unit/test_barcode_service.py`):
```python
import pytest
from app.services.barcode_service import BarcodeService

@pytest.mark.asyncio
async def test_generate_barcode():
    """测试条码生成"""
    service = BarcodeService()
    barcode = await service.generate_barcode()
    
    assert barcode.startswith("SP")
    assert len(barcode) == 20  # SP + 8位日期 + 6位序列号
```

**集成测试** (`tests/integration/test_sample_api.py`):
```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_sample(auth_headers):
    """测试创建样品 API"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/samples",
            json={
                "clientName": "测试客户",
                "sampleName": "水样",
                "sampleType": "环境样品",
                "quantity": 500,
                "unit": "ml",
                "receivedDate": "2026-04-09T10:00:00Z"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "样品创建成功"
        assert "barcode" in data["data"]
```

**属性测试** (`tests/property/test_sample_properties.py`):
```python
import pytest
from hypothesis import given, strategies as st
from app.services.sample_service import SampleService

@pytest.mark.asyncio
@given(
    client_name=st.text(min_size=1, max_size=200),
    quantity=st.floats(min_value=0.1, max_value=10000)
)
async def test_sample_creation_properties(db_session, client_name, quantity):
    """属性测试：样品创建"""
    service = SampleService()
    
    sample = await service.create_sample(
        db_session,
        {
            "clientName": client_name,
            "sampleName": "测试样品",
            "sampleType": "测试类型",
            "quantity": quantity,
            "unit": "ml",
            "receivedDate": datetime.now()
        }
    )
    
    # 验证属性
    assert sample.clientName == client_name
    assert sample.quantity == quantity
    assert sample.barcode is not None
    assert sample.status == "REGISTERED"
```


## 性能优化

### 1. 数据库连接池

**配置** (`app/core/database.py`):
```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,  # 基础连接数
    max_overflow=10,  # 最大溢出连接数
    pool_pre_ping=True,  # 连接前检查
    pool_recycle=3600,  # 连接回收时间（1小时）
    pool_timeout=30,  # 获取连接超时时间
)
```

**优势**:
- 复用数据库连接，减少连接开销
- 自动检测和回收失效连接
- 限制最大连接数，防止数据库过载

### 2. 查询优化

#### 2.1 使用索引

确保所有常用查询字段都有索引：

```python
class Sample(Base):
    __tablename__ = 'Sample'
    
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    sampleNumber = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(SampleStatus), default=SampleStatus.REGISTERED, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, index=True)
```

#### 2.2 预加载关联数据

使用 `selectinload` 避免 N+1 查询问题：

```python
from sqlalchemy.orm import selectinload

async def get_sample_with_relations(db: AsyncSession, sample_id: str) -> Sample:
    """获取样品及其关联数据"""
    result = await db.execute(
        select(Sample)
        .options(
            selectinload(Sample.test_items),
            selectinload(Sample.results),
            selectinload(Sample.transfers)
        )
        .where(Sample.id == sample_id)
    )
    return result.scalar_one_or_none()
```

#### 2.3 分页查询

所有列表查询都使用分页：

```python
async def get_samples(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20
) -> PaginatedResult[Sample]:
    """分页查询样品"""
    offset = (page - 1) * page_size
    
    # 查询总数
    count_result = await db.execute(select(func.count(Sample.id)))
    total = count_result.scalar()
    
    # 查询数据
    result = await db.execute(
        select(Sample)
        .offset(offset)
        .limit(page_size)
        .order_by(Sample.createdAt.desc())
    )
    items = result.scalars().all()
    
    return PaginatedResult(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )
```

#### 2.4 批量操作

使用批量插入和更新：

```python
async def batch_create_results(
    db: AsyncSession,
    results: List[ResultCreate]
) -> List[Result]:
    """批量创建检测结果"""
    result_objects = [
        Result(**result.dict())
        for result in results
    ]
    
    db.add_all(result_objects)
    await db.flush()
    
    return result_objects
```

### 3. 缓存策略

#### 3.1 Redis 缓存

**配置** (`app/core/cache.py`):
```python
import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True
)

async def get_cache(key: str) -> Optional[str]:
    """获取缓存"""
    return await redis_client.get(key)

async def set_cache(
    key: str, 
    value: str, 
    expire: int = 3600
) -> None:
    """设置缓存"""
    await redis_client.setex(key, expire, value)

async def delete_cache(key: str) -> None:
    """删除缓存"""
    await redis_client.delete(key)
```

#### 3.2 缓存装饰器

```python
from functools import wraps
import json

def cache_result(expire: int = 3600):
    """缓存函数结果"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{func.__name__}:{json.dumps(args)}:{json.dumps(kwargs)}"
            
            # 尝试从缓存获取
            cached = await get_cache(cache_key)
            if cached:
                return json.loads(cached)
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            await set_cache(cache_key, json.dumps(result), expire)
            
            return result
        return wrapper
    return decorator

# 使用示例
@cache_result(expire=1800)
async def get_statistics(db: AsyncSession, query: StatisticsQuery):
    """获取统计数据（缓存30分钟）"""
    # 复杂的统计查询
    pass
```

#### 3.3 缓存失效策略

```python
async def invalidate_sample_cache(sample_id: str):
    """使样品相关缓存失效"""
    patterns = [
        f"get_sample:{sample_id}",
        f"get_sample_with_relations:{sample_id}",
        "get_samples:*",  # 列表查询缓存
        "get_statistics:*"  # 统计缓存
    ]
    
    for pattern in patterns:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
```

### 4. 异步任务队列

使用 Celery 或 ARQ 处理耗时操作：

**配置** (`app/core/queue.py`):
```python
from celery import Celery
from app.config import settings

celery_app = Celery(
    "fastapi_backend",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
)
```

**任务定义** (`app/tasks/import_tasks.py`):
```python
from app.core.queue import celery_app
from app.services.import_service import ImportService

@celery_app.task(name="import_results")
async def import_results_task(file_path: str, user_id: str):
    """异步导入检测结果"""
    service = ImportService()
    result = await service.import_from_file(file_path, user_id)
    return result

@celery_app.task(name="generate_report")
async def generate_report_task(report_id: str):
    """异步生成报告"""
    service = ReportService()
    result = await service.generate_report_pdf(report_id)
    return result
```

**使用示例**:
```python
@router.post("/results/import")
async def import_results(
    file: UploadFile,
    user: User = Depends(get_current_user)
):
    """批量导入检测结果"""
    # 保存文件
    file_path = await save_upload_file(file)
    
    # 提交异步任务
    task = import_results_task.delay(file_path, user.id)
    
    return {
        "message": "导入任务已提交",
        "data": {
            "task_id": task.id
        }
    }
```

### 5. 限流保护

**全局限流** (`app/middleware/rate_limit.py`):
```python
from fastapi import Request, HTTPException
from app.core.cache import redis_client
import time

async def rate_limit_middleware(request: Request, call_next):
    """限流中间件"""
    # 获取客户端 IP
    client_ip = request.client.host
    
    # 限流键
    key = f"rate_limit:{client_ip}"
    
    # 获取当前请求数
    current = await redis_client.get(key)
    
    if current and int(current) >= 60:  # 每分钟60次
        raise HTTPException(
            status_code=429,
            detail="请求过于频繁，请稍后再试"
        )
    
    # 增加计数
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60)  # 60秒过期
    await pipe.execute()
    
    response = await call_next(request)
    return response
```

**端点级限流**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/login")
@limiter.limit("5/minute")  # 每分钟5次
async def login(request: Request, credentials: LoginCredentials):
    """用户登录"""
    pass
```

### 6. 响应压缩

启用 Gzip 压缩：

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### 7. 数据库查询监控

记录慢查询：

```python
from sqlalchemy import event
from sqlalchemy.engine import Engine
import time

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info['query_start_time'].pop(-1)
    
    if total > 1.0:  # 慢查询阈值：1秒
        logger.warning(f"Slow query detected: {total:.2f}s", extra={
            "query": statement,
            "duration": total
        })
```


## 部署策略

### 1. 开发环境

**启动方式**:
```bash
# 使用 Uvicorn 开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**特点**:
- 自动重载
- 详细错误信息
- 调试模式

### 2. 生产环境

#### 2.1 使用 Gunicorn + Uvicorn Workers

**启动脚本** (`scripts/start_production.sh`):
```bash
#!/bin/bash

# 设置环境变量
export PYTHONPATH=/app
export LOG_LEVEL=INFO

# 启动 Gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --keep-alive 5 \
  --access-logfile /var/log/fastapi/access.log \
  --error-logfile /var/log/fastapi/error.log \
  --log-level info
```

**Worker 数量计算**:
```
workers = (2 × CPU核心数) + 1
```

#### 2.2 Systemd 服务配置

**文件**: `/etc/systemd/system/fastapi-backend.service`

```ini
[Unit]
Description=FastAPI Backend Service
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=fastapi
Group=fastapi
WorkingDirectory=/opt/fastapi-backend
Environment="PATH=/opt/fastapi-backend/venv/bin"
Environment="PYTHONPATH=/opt/fastapi-backend"
ExecStart=/opt/fastapi-backend/venv/bin/gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**管理命令**:
```bash
# 启动服务
sudo systemctl start fastapi-backend

# 停止服务
sudo systemctl stop fastapi-backend

# 重启服务
sudo systemctl restart fastapi-backend

# 查看状态
sudo systemctl status fastapi-backend

# 查看日志
sudo journalctl -u fastapi-backend -f
```

#### 2.3 Nginx 反向代理

**配置文件**: `/etc/nginx/sites-available/fastapi-backend`

```nginx
upstream fastapi_backend {
    # 负载均衡
    server 127.0.0.1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8001 weight=1 max_fails=3 fail_timeout=30s;
    
    # 保持连接
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    # SSL 证书
    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 日志
    access_log /var/log/nginx/fastapi_access.log;
    error_log /var/log/nginx/fastapi_error.log;
    
    # 客户端最大请求体大小
    client_max_body_size 100M;
    
    # 代理设置
    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # 静态文件
    location /static/ {
        alias /opt/fastapi-backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /health {
        proxy_pass http://fastapi_backend/health;
        access_log off;
    }
}
```

### 3. Docker 部署

#### 3.1 Dockerfile 优化

**多阶段构建** (`Dockerfile`):
```dockerfile
# 构建阶段
FROM python:3.11-slim as builder

WORKDIR /build

# 安装构建依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir --user -r requirements.txt

# 运行阶段
FROM python:3.11-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制依赖
COPY --from=builder /root/.local /root/.local

# 复制应用代码
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# 创建非 root 用户
RUN useradd -m -u 1000 fastapi && \
    chown -R fastapi:fastapi /app

USER fastapi

# 设置环境变量
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120"]
```

#### 3.2 Docker Compose 生产配置

**文件**: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  fastapi:
    build:
      context: .
      dockerfile: Dockerfile
    image: fastapi-backend:latest
    container_name: fastapi-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/lab_db
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
      - redis
    networks:
      - backend
    volumes:
      - ./logs:/app/logs
      - ./exports:/app/exports
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:14-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=lab_db
    ports:
      - "5432:5432"
    networks:
      - backend
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - backend
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile
    image: fastapi-backend:latest
    container_name: celery-worker
    restart: unless-stopped
    command: celery -A app.core.queue worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/lab_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    networks:
      - backend
    volumes:
      - ./logs:/app/logs

  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - backend
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - fastapi

networks:
  backend:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 4. 数据库迁移

**迁移脚本** (`scripts/migrate.sh`):
```bash
#!/bin/bash

# 等待数据库就绪
echo "Waiting for database..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  sleep 1
done

echo "Database is ready!"

# 运行迁移
echo "Running database migrations..."
alembic upgrade head

echo "Migrations completed!"
```

**在 Docker 中运行迁移**:
```bash
docker-compose exec fastapi alembic upgrade head
```

### 5. 监控和日志

#### 5.1 Prometheus 监控

**安装 Prometheus 客户端**:
```bash
pip install prometheus-fastapi-instrumentator
```

**配置** (`app/main.py`):
```python
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()

# 启用 Prometheus 监控
Instrumentator().instrument(app).expose(app)
```

**访问指标**:
```
http://localhost:8000/metrics
```

#### 5.2 日志聚合

使用 ELK Stack 或 Loki 收集日志：

**Filebeat 配置** (`filebeat.yml`):
```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/fastapi/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "fastapi-logs-%{+yyyy.MM.dd}"
```

### 6. 备份策略

**自动备份脚本** (`scripts/backup.sh`):
```bash
#!/bin/bash

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="lab_db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -h localhost -U user $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 删除30天前的备份
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_backup_$DATE.sql.gz"
```

**Cron 定时任务**:
```cron
# 每天凌晨2点备份
0 2 * * * /opt/fastapi-backend/scripts/backup.sh
```


## API 一致性保证

### 1. 端点路径一致性

FastAPI 后端必须提供与 Node.js 后端完全相同的 API 端点：

| 模块 | Node.js 端点 | FastAPI 端点 | 状态 |
|------|-------------|-------------|------|
| 认证 | POST /api/auth/login | POST /api/auth/login | ✅ 已实现 |
| 认证 | POST /api/auth/refresh | POST /api/auth/refresh | 待实现 |
| 认证 | POST /api/auth/logout | POST /api/auth/logout | 待实现 |
| 样品 | POST /api/samples | POST /api/v1/samples | ✅ 已实现 |
| 样品 | GET /api/samples | GET /api/v1/samples | ✅ 已实现 |
| 样品 | GET /api/samples/:id | GET /api/v1/samples/{id} | ✅ 已实现 |
| 工作流 | POST /api/workflows | POST /api/v1/workflows | 待实现 |
| 任务 | POST /api/tasks | POST /api/v1/tasks | 待实现 |
| 结果 | POST /api/results | POST /api/v1/results | 待实现 |
| 审核 | POST /api/audits | POST /api/v1/audits | 待实现 |
| 报告 | POST /api/reports | POST /api/v1/reports | 待实现 |

### 2. 请求响应格式一致性

#### 2.1 成功响应格式

```json
{
  "message": "操作成功",
  "data": {
    // 返回数据
  }
}
```

**Pydantic 模型**:
```python
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar('T')

class SuccessResponse(BaseModel, Generic[T]):
    message: str
    data: Optional[T] = None
```

#### 2.2 错误响应格式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": "详细信息"
  }
}
```

**Pydantic 模型**:
```python
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[str] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
```

#### 2.3 分页响应格式

```json
{
  "message": "查询成功",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

**Pydantic 模型**:
```python
class PaginatedResult(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    pageSize: int
    totalPages: int
```

### 3. 日期时间格式

使用 ISO 8601 格式：

```python
from datetime import datetime
from pydantic import BaseModel, Field

class SampleResponse(BaseModel):
    id: str
    barcode: str
    createdAt: datetime = Field(..., json_schema_extra={"format": "date-time"})
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

### 4. 枚举值一致性

确保枚举值与 Node.js 后端完全一致：

```python
from enum import Enum

class SampleStatus(str, Enum):
    REGISTERED = "REGISTERED"  # 与 Prisma enum 一致
    TESTING = "TESTING"
    COMPLETED = "COMPLETED"
    RELEASED = "RELEASED"
```

### 5. 查询参数一致性

```python
from fastapi import Query
from typing import Optional

@router.get("/samples")
async def get_samples(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    barcode: Optional[str] = None,
    sampleNumber: Optional[str] = None,
    clientName: Optional[str] = None,
    status: Optional[SampleStatus] = None,
    startDate: Optional[datetime] = None,
    endDate: Optional[datetime] = None
):
    """查询样品列表 - 参数名与 Node.js 后端一致"""
    pass
```

## 迁移实施计划

### 阶段 1：认证授权和基础设施（2-3 周）

#### 第 1 周：认证系统

**任务**:
1. 实现 JWT 认证服务
   - 令牌生成和验证
   - 令牌刷新机制
   - 令牌撤销
2. 实现认证中间件
   - 令牌提取和验证
   - 用户信息注入
3. 实现认证 API
   - 登录端点
   - 刷新端点
   - 登出端点
   - 获取当前用户信息

**验收标准**:
- 所有认证 API 测试通过
- 与 Node.js 后端令牌互通
- 单元测试覆盖率 ≥ 80%

#### 第 2 周：权限控制

**任务**:
1. 实现权限服务
   - 权限 CRUD 操作
   - 权限检查逻辑
2. 实现角色服务
   - 角色 CRUD 操作
   - 角色权限分配
3. 实现用户服务
   - 用户 CRUD 操作
   - 用户角色分配
4. 实现权限中间件
   - RBAC 权限检查
   - 数据权限过滤

**验收标准**:
- 所有权限 API 测试通过
- 权限检查正确工作
- 集成测试通过

#### 第 3 周：基础设施完善

**任务**:
1. 完善中间件层
   - 限流中间件
   - 日志中间件
   - 错误处理中间件
2. 实现健康检查
   - 基础健康检查
   - 详细健康检查
   - 依赖服务检查
3. 实现监控
   - Prometheus 指标
   - 性能监控
   - 慢查询监控
4. 完善文档
   - API 文档完善
   - 部署文档
   - 运维文档

**验收标准**:
- 所有中间件正常工作
- 健康检查端点可用
- 监控指标正常收集
- 文档完整

### 阶段 2：工作流和任务管理（2-3 周）

#### 第 1 周：工作流模板

**任务**:
1. 实现工作流模板服务
   - 模板 CRUD 操作
   - 节点配置管理
   - 模板版本管理
2. 实现工作流模板 API
   - 创建模板
   - 查询模板
   - 更新模板
   - 删除模板

**验收标准**:
- 工作流模板 API 测试通过
- 与 Node.js 后端 API 一致
- 单元测试覆盖率 ≥ 80%

#### 第 2 周：工作流实例和任务

**任务**:
1. 实现工作流实例服务
   - 实例创建
   - 实例执行
   - 状态管理
2. 实现任务服务
   - 任务 CRUD 操作
   - 任务分配
   - 任务执行
3. 实现工作流和任务 API

**验收标准**:
- 工作流实例可以正常创建和执行
- 任务可以正常分配和完成
- 集成测试通过

#### 第 3 周：自动分配引擎

**任务**:
1. 实现自动分配引擎
   - 负载均衡算法
   - 技能匹配算法
   - 优先级处理
2. 集成到任务服务
3. 性能优化

**验收标准**:
- 自动分配引擎正常工作
- 分配算法合理
- 性能测试通过

### 阶段 3：检测结果和审核管理（2-3 周）

#### 第 1 周：检测结果管理

**任务**:
1. 实现结果服务
   - 结果 CRUD 操作
   - 结果审核
2. 实现批量导入服务
   - Excel 解析
   - CSV 解析
   - 数据验证
   - 批量插入
3. 实现结果 API

**验收标准**:
- 结果 API 测试通过
- 批量导入功能正常
- 性能测试通过

#### 第 2 周：公式和异常检测

**任务**:
1. 实现公式服务
   - 公式 CRUD 操作
   - 公式验证
   - 公式执行
2. 实现异常检测服务
   - 异常检测规则
   - 自动检测
   - 异常处理
3. 实现相关 API

**验收标准**:
- 公式计算正确
- 异常检测准确
- 单元测试通过

#### 第 3 周：审核管理

**任务**:
1. 实现审核服务
   - 审核任务管理
   - 审核流程执行
   - 审核统计
2. 实现质量判定服务
   - 判定规则管理
   - 自动判定
   - 手动判定
3. 实现审核 API

**验收标准**:
- 审核流程正常工作
- 质量判定准确
- 集成测试通过

### 阶段 4：报告和统计分析（2-3 周）

#### 第 1 周：报告模板和生成

**任务**:
1. 实现报告模板服务
   - 模板 CRUD 操作
   - 模板字段配置
2. 实现报告生成服务
   - 报告生成
   - PDF 导出
3. 实现报告 API

**验收标准**:
- 报告模板管理正常
- 报告生成功能正常
- PDF 导出正确

#### 第 2 周：电子签名和分发

**任务**:
1. 实现电子签名服务
   - 签名创建
   - 签名验证
   - 签名应用
2. 实现报告分发服务
   - 报告分发
   - 分发记录
3. 实现报告审核和发布
4. 实现相关 API

**验收标准**:
- 电子签名功能正常
- 报告分发功能正常
- 审核流程正确

#### 第 3 周：统计分析

**任务**:
1. 实现统计服务
   - 综合统计
   - 审核统计
   - 工作量统计
   - 质量统计
2. 实现导出服务
   - Excel 导出
   - CSV 导出
3. 实现统计 API
4. 性能优化（缓存）

**验收标准**:
- 统计数据准确
- 导出功能正常
- 性能测试通过

### 阶段 5：系统管理和优化（1-2 周）

#### 第 1 周：系统管理

**任务**:
1. 实现审计日志服务
   - 日志记录
   - 日志查询
   - 日志归档
2. 实现备份服务
   - 数据备份
   - 数据恢复
3. 实现性能监控服务
   - 指标收集
   - 性能统计
4. 实现队列服务
   - 任务队列管理
   - 任务调度
5. 实现检测方法服务
6. 实现质量判定规则服务

**验收标准**:
- 所有系统管理功能正常
- API 测试通过

#### 第 2 周：性能优化和压力测试

**任务**:
1. 性能优化
   - 查询优化
   - 缓存优化
   - 连接池优化
2. 压力测试
   - 并发测试
   - 负载测试
   - 稳定性测试
3. 文档完善
4. 部署准备

**验收标准**:
- 性能指标达标
- 压力测试通过
- 文档完整
- 可以部署到生产环境

## 风险和缓解措施

### 风险 1：数据库兼容性问题

**描述**: SQLAlchemy 模型与 Prisma schema 不完全兼容

**影响**: 高

**缓解措施**:
- 详细对比 Prisma schema 和 SQLAlchemy 模型
- 编写模型验证脚本
- 进行充分的集成测试
- 保持与 Node.js 后端的数据库版本同步

### 风险 2：API 不一致

**描述**: FastAPI 端点与 Node.js 后端不一致，导致前端无法切换

**影响**: 高

**缓解措施**:
- 制定 API 一致性检查清单
- 编写 API 对比测试
- 使用相同的请求响应格式
- 详细的 API 文档对比

### 风险 3：性能问题

**描述**: FastAPI 后端性能不如 Node.js 后端

**影响**: 中

**缓解措施**:
- 充分利用 Python 异步特性
- 实现缓存策略
- 优化数据库查询
- 进行性能测试和调优
- 使用连接池和批量操作

### 风险 4：迁移时间超期

**描述**: 迁移工作量超出预期，无法按时完成

**影响**: 中

**缓解措施**:
- 分阶段实施，每个阶段独立验收
- 优先实现核心功能
- 及时调整计划
- 增加开发资源

### 风险 5：测试覆盖不足

**描述**: 测试不充分，导致生产环境出现问题

**影响**: 高

**缓解措施**:
- 制定测试计划
- 确保测试覆盖率达标
- 进行充分的集成测试
- 在测试环境充分验证
- 灰度发布

## 成功标准

### 功能完整性

- ✅ 所有 Node.js 后端功能都已迁移
- ✅ 所有 API 端点都已实现
- ✅ 所有业务逻辑都已实现
- ✅ 与前端完全兼容

### 性能指标

- ✅ API 响应时间 < 200ms (P95)
- ✅ 数据库查询时间 < 100ms (P95)
- ✅ 并发支持 ≥ 1000 QPS
- ✅ 内存使用 < 2GB (单进程)

### 质量指标

- ✅ 单元测试覆盖率 ≥ 80%
- ✅ 集成测试覆盖率 ≥ 70%
- ✅ 所有关键业务逻辑有测试
- ✅ 无严重 bug

### 文档完整性

- ✅ API 文档完整
- ✅ 部署文档完整
- ✅ 运维文档完整
- ✅ 开发文档完整

### 部署就绪

- ✅ Docker 镜像构建成功
- ✅ 可以在生产环境部署
- ✅ 监控和日志配置完成
- ✅ 备份策略实施

