# 开发环境配置指南

本文档说明如何配置本地轻量化 AI 智能体的开发环境。

## 系统要求

- **Python**: 3.9 或更高版本
- **操作系统**: Windows, macOS, 或 Linux
- **内存**: 至少 4GB RAM（推荐 8GB）
- **磁盘空间**: 至少 2GB 可用空间

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd fastapi-backend
```

### 2. 创建虚拟环境

#### Windows

```bash
# 使用 venv 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate
```

#### macOS/Linux

```bash
# 使用 venv 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate
```

### 3. 安装依赖

```bash
# 升级 pip
pip install --upgrade pip

# 安装所有依赖
pip install -r requirements.txt
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必要的环境变量
```

### 5. 初始化数据库

```bash
# 运行数据库迁移
alembic upgrade head
```

### 6. 启动开发服务器

```bash
# 启动 FastAPI 开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务器将在 `http://localhost:8000` 启动。

## AI Agent 模块依赖

AI Agent 模块使用以下核心依赖：

### 核心框架
- **FastAPI** (0.104.1): 高性能异步 Web 框架
- **Pydantic** (2.5.0): 数据验证和设置管理
- **Uvicorn** (0.24.0): ASGI 服务器

### 测试框架
- **pytest** (7.4.3): 单元测试框架
- **pytest-asyncio** (0.21.1): 异步测试支持
- **pytest-cov** (4.1.0): 测试覆盖率报告
- **hypothesis** (6.92.0): 属性测试框架
- **httpx** (0.25.2): HTTP 客户端（用于 API 测试）

### 数据处理
- **python-dateutil** (2.8.2): 日期时间处理
- **openpyxl** (3.1.2): Excel 文件处理

### 其他工具
- **python-dotenv** (1.0.0): 环境变量管理

## 验证安装

### 检查 Python 版本

```bash
python --version
# 应该显示 Python 3.9.x 或更高版本
```

### 检查依赖安装

```bash
# 列出已安装的包
pip list

# 验证关键包
pip show fastapi pydantic pytest hypothesis
```

### 运行测试

```bash
# 运行所有测试
pytest

# 运行 AI Agent 模块测试
pytest tests/test_agent_*.py

# 运行测试并生成覆盖率报告
pytest --cov=app/agent --cov-report=html
```

## 开发工具配置

### 代码格式化

```bash
# 使用 Black 格式化代码
black app/agent/

# 使用 isort 排序导入
isort app/agent/
```

### 代码检查

```bash
# 使用 flake8 检查代码风格
flake8 app/agent/

# 使用 mypy 进行类型检查
mypy app/agent/
```

## 常见问题

### 1. 虚拟环境激活失败

**Windows PowerShell 执行策略问题**：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. 依赖安装失败

**升级 pip 和 setuptools**：
```bash
pip install --upgrade pip setuptools wheel
```

### 3. 数据库连接失败

检查 `.env` 文件中的数据库配置：
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
```

### 4. 端口被占用

更改启动端口：
```bash
uvicorn app.main:app --reload --port 8001
```

## 性能要求验证

根据需求 9.1，系统应满足以下性能要求：

1. **本地运行**: 所有处理在本地完成，不依赖外部 AI API
2. **快速响应**: 完整流程在 2 秒内完成
3. **并发支持**: 支持至少 10 个并发用户
4. **内存限制**: 运行时内存使用不超过 1GB
5. **快速启动**: 系统在 10 秒内完成初始化

### 性能测试

```bash
# 运行性能测试
pytest tests/test_performance.py -v

# 使用 Locust 进行负载测试
locust -f locustfile.py --host=http://localhost:8000
```

## 下一步

- 阅读 [API 文档](docs/API.md)
- 查看 [用户指南](docs/USER_GUIDE.md)
- 了解 [开发者文档](docs/DEVELOPER.md)
- 参考 [部署文档](docs/DEPLOYMENT.md)

## 技术支持

如有问题，请查看：
- 项目 README.md
- 需求文档：`.kiro/specs/local-ai-agent/requirements.md`
- 设计文档：`.kiro/specs/local-ai-agent/design.md`
- 任务文档：`.kiro/specs/local-ai-agent/tasks.md`

---

**文档版本**: 1.0  
**最后更新**: 2026-05-06  
**状态**: ✅ 已完成
