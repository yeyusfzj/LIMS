# 样品管理 FastAPI 后端服务

实验室样品管理微服务，基于 FastAPI 框架构建，提供样品管理的核心业务逻辑。

## 功能特性

### 核心功能
- **样品管理**: 创建、查询、更新、删除样品
- **条码生成**: 自动生成唯一的样品条码和编号
- **样品流转**: 记录样品在不同位置间的流转
- **监管链**: 完整的样品流转历史追踪
- **分样合样**: 支持样品的分割和合并操作
- **状态管理**: 样品生命周期状态跟踪

### 技术特性
- **异步架构**: 基于 asyncio 的高性能异步处理
- **JWT 认证**: 安全的用户身份验证
- **RBAC 权限**: 基于角色的访问控制
- **请求日志**: 完整的请求追踪和日志记录
- **限流保护**: 基于 IP 的请求限流
- **自动文档**: Swagger UI 和 ReDoc 自动生成
- **数据验证**: Pydantic 模型自动验证
- **错误处理**: 统一的异常处理机制

## 技术栈

- **框架**: FastAPI 0.104+
- **Python**: 3.11+
- **数据库**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0+ (异步)
- **验证**: Pydantic 2.0+
- **认证**: JWT (PyJWT)
- **日志**: Python logging

## 快速开始

### 前置要求

- Python 3.11 或更高版本
- PostgreSQL 14 或更高版本
- pip 或 poetry

### 安装步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd fastapi-backend
```

2. **创建虚拟环境**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

5. **运行数据库迁移**
```bash
# 确保 PostgreSQL 数据库已创建
# 数据库表由 Node.js 后端的 Prisma 管理

# 首次使用时，初始化 Alembic 迁移
python scripts/create_initial_migration.py

# 验证迁移设置
python scripts/verify_migration_setup.py
```

6. **启动服务**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

7. **访问 API 文档**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## API 端点

### 样品管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/v1/samples` | 创建样品 | sample:create |
| GET | `/api/v1/samples` | 查询样品列表 | sample:read |
| GET | `/api/v1/samples/{id}` | 获取样品详情 | sample:read |
| PATCH | `/api/v1/samples/{id}` | 更新样品 | sample:update |
| DELETE | `/api/v1/samples/{id}` | 删除样品 | sample:delete |
| PATCH | `/api/v1/samples/{id}/status` | 更新状态 | sample:update |
| GET | `/api/v1/samples/barcode/{barcode}` | 按条码查询 | sample:read |
| POST | `/api/v1/samples/batch-delete` | 批量删除 | sample:delete |

### 流转和分样合样

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/v1/samples/{id}/transfer` | 创建流转 | sample:transfer |
| GET | `/api/v1/samples/{id}/chain-of-custody` | 查询监管链 | sample:read |
| POST | `/api/v1/transfers/{id}/confirm` | 确认流转 | sample:transfer |
| POST | `/api/v1/samples/{id}/split` | 分样 | sample:split |
| POST | `/api/v1/samples/merge` | 合样 | sample:merge |

### 健康检查

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/v1/health` | 详细健康检查 |

## 项目结构

```
fastapi-backend/
├── alembic/                    # 数据库迁移
│   ├── versions/               # 迁移版本
│   ├── env.py                  # 环境配置
│   └── script.py.mako          # 迁移模板
├── app/
│   ├── api/                    # API 路由
│   │   └── v1/
│   │       ├── health.py       # 健康检查
│   │       ├── samples.py      # 样品管理
│   │       └── transfers.py    # 流转和分样合样
│   ├── core/                   # 核心模块
│   │   ├── database.py         # 数据库连接
│   │   ├── exceptions.py       # 自定义异常
│   │   ├── logging.py          # 日志配置
│   │   ├── permissions.py      # 权限控制
│   │   └── security.py         # JWT 认证
│   ├── middleware/             # 中间件
│   │   ├── error_handler.py    # 错误处理
│   │   ├── logging.py          # 请求日志
│   │   └── rate_limit.py       # 限流
│   ├── models/                 # SQLAlchemy 模型
│   │   ├── base.py
│   │   ├── sample.py
│   │   └── transfer.py
│   ├── repositories/           # 数据访问层
│   │   ├── base_repository.py
│   │   ├── sample_repository.py
│   │   └── transfer_repository.py
│   ├── schemas/                # Pydantic 模型
│   │   ├── response.py
│   │   ├── sample.py
│   │   └── transfer.py
│   ├── services/               # 业务逻辑层
│   │   ├── barcode_service.py
│   │   ├── sample_service.py
│   │   └── transfer_service.py
│   ├── utils/                  # 工具函数
│   │   └── validators.py
│   ├── config.py               # 配置管理
│   └── main.py                 # 应用入口
├── docs/                       # 文档
│   ├── DATABASE_MIGRATION_GUIDE.md  # 迁移详细指南
│   └── MIGRATION_QUICK_REFERENCE.md # 迁移快速参考
├── scripts/                    # 脚本
│   ├── db_migration.py         # 迁移管理工具
│   ├── test_migration.py       # 迁移测试工具
│   ├── rollback_migration.py   # 回滚工具
│   ├── create_initial_migration.py  # 初始化工具
│   └── verify_migration_setup.py    # 验证工具
├── tests/                      # 测试
│   ├── unit/                   # 单元测试
│   └── integration/            # 集成测试
├── .env.example                # 环境变量模板
├── alembic.ini                 # Alembic 配置
├── requirements.txt            # 依赖列表
└── README.md                   # 本文件
```

## 配置说明

### 环境变量

在 `.env` 文件中配置以下变量:

```env
# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 日志配置
LOG_LEVEL=INFO

# 限流配置
RATE_LIMIT_PER_MINUTE=60
```

## 开发指南

### 数据库迁移

使用 Alembic 进行数据库版本管理：

```bash
# 验证迁移设置
python scripts/verify_migration_setup.py

# 创建新迁移
python scripts/db_migration.py create "添加新字段"

# 应用迁移
python scripts/db_migration.py upgrade

# 回滚迁移
python scripts/rollback_migration.py -1

# 测试迁移
python scripts/test_migration.py

# 查看迁移状态
python scripts/db_migration.py current
python scripts/db_migration.py history
```

详细文档:
- [数据库迁移指南](docs/DATABASE_MIGRATION_GUIDE.md)
- [迁移快速参考](docs/MIGRATION_QUICK_REFERENCE.md)

### 代码风格

- 遵循 PEP 8 代码规范
- 使用 type hints
- 编写 docstrings
- 保持函数简洁

### 测试

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 生成覆盖率报告
pytest --cov=app --cov-report=html
```

### 日志

日志级别:
- DEBUG: 详细的调试信息
- INFO: 一般信息（默认）
- WARNING: 警告信息
- ERROR: 错误信息
- CRITICAL: 严重错误

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t fastapi-backend .

# 运行容器
docker run -d -p 8000:8000 --env-file .env fastapi-backend
```

### Docker Compose

```bash
docker-compose up -d
```

## 性能优化

- 使用异步数据库连接
- 实现连接池管理
- 添加请求限流
- 使用索引优化查询
- 实现分页查询

## 安全性

- JWT 令牌认证
- RBAC 权限控制
- 请求限流保护
- SQL 注入防护（ORM）
- XSS 防护（自动转义）
- CORS 配置

## 监控和日志

- 请求日志记录
- 错误日志追踪
- 性能监控
- 健康检查端点

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 检查 DATABASE_URL 配置
   - 确认 PostgreSQL 服务运行
   - 验证数据库用户权限

2. **JWT 认证失败**
   - 检查 JWT_SECRET_KEY 配置
   - 确认令牌未过期
   - 验证令牌格式

3. **限流触发**
   - 检查请求频率
   - 调整 RATE_LIMIT_PER_MINUTE
   - 查看 X-RateLimit-* 响应头

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式

- 项目主页: <repository-url>
- 问题反馈: <issues-url>
- 文档: <docs-url>

## 更新日志

### v0.1.0 (2026-04-11)
- 初始版本
- 实现样品管理核心功能
- 实现流转和分样合样功能
- 添加 JWT 认证和 RBAC 权限
- 添加请求日志和限流中间件
