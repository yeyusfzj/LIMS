# 本地轻量化 AI 智能体 - MVP 版本

## 概述

本地轻量化 AI 智能体是一个完全本地部署的实验室智能分析系统，通过规则引擎和知识图谱技术实现实验需求的智能解析、实验计划生成和智能问答功能。

## 已实现功能

### Phase 1: 基础数据层 ✅

1. **数据模型** (`models.py`)
   - ParsedFields: 解析后的结构化字段
   - KnowledgeEntry: 知识图谱实体（设备、材料、指标、步骤、实验类型）
   - ExperimentPlan: 实验计划
   - AnalysisReport: 分析报告（数据结构已定义）

2. **API 请求/响应模型** (`schemas.py`)
   - ParseRequest, PlanRequest, QARequest, AnalysisRequest
   - APIResponse, ParseResponse, PlanResponse, QAResponse
   - ErrorResponse

3. **知识图谱** (`knowledge_graph.py` + `data/knowledge_graph.json`)
   - 3种实验类型：水样重金属检测、土壤有机物检测、空气质量检测
   - 9个设备、8个材料、12个指标、12个步骤
   - 支持查询、添加、导入导出

4. **解析器词典** (`parser_dictionary.py` + `data/parser_dictionary.json`)
   - 关键词列表（目的、样品类型、指标、设备、材料）
   - 正则表达式模式（时间、数值）
   - 实验类型映射

### Phase 2: 核心模块 ✅

5. **NLP 解析器** (`nlp_parser.py`)
   - 提取实验目的、样品类型、检测指标
   - 提取设备、材料、步骤、时间
   - 计算解析置信度

6. **问答引擎** (`qa_engine.py` + `data/answer_templates.json`)
   - 意图识别（设备、材料、步骤、指标查询）
   - 知识检索（从知识图谱查询）
   - 回答生成（基于模板）

7. **实验计划生成器** (`plan_generator.py` + `data/plan_templates.json`)
   - 知识增强（从知识图谱补充信息）
   - 模板填充
   - Markdown 格式输出

### Phase 3: API 接口 ✅

8. **API 路由** (`routes.py`)
   - `POST /api/agent/parse` - 解析实验需求文本
   - `POST /api/agent/plan` - 生成实验计划
   - `POST /api/agent/qa` - 智能问答
   - `GET /api/agent/health` - 健康检查

9. **错误处理**
   - 统一错误响应格式
   - 输入验证错误（400）
   - 解析失败错误（422）
   - 系统内部错误（500）

### Phase 4: 演示数据 ✅

10. **演示案例** (`data/demo_cases.json`)
    - 水样重金属检测
    - 土壤有机物检测
    - 空气质量检测

## 项目结构

```
fastapi-backend/app/agent/
├── __init__.py                 # 模块初始化
├── models.py                   # 数据模型
├── schemas.py                  # API 请求/响应模型
├── knowledge_graph.py          # 知识图谱管理器
├── parser_dictionary.py        # 解析器词典管理器
├── nlp_parser.py               # NLP 解析器
├── qa_engine.py                # 问答引擎
├── plan_generator.py           # 实验计划生成器
├── routes.py                   # API 路由
├── data/                       # 数据文件
│   ├── knowledge_graph.json    # 知识图谱数据
│   ├── parser_dictionary.json  # 解析器词典
│   ├── answer_templates.json   # 问答模板
│   ├── plan_templates.json     # 计划模板
│   └── demo_cases.json         # 演示案例
└── README.md                   # 本文档
```

## 使用方法

### 1. 启动 FastAPI 服务

```bash
cd fastapi-backend
uvicorn app.main:app --reload
```

### 2. 访问 API 文档

打开浏览器访问：http://localhost:8000/docs

### 3. 测试 API 端点

#### 解析实验需求

```bash
curl -X POST "http://localhost:8000/api/agent/parse" \
  -H "Content-Type: application/json" \
  -d '{"text": "我需要检测水样中的重金属含量，包括铅、汞、镉"}'
```

#### 生成实验计划

```bash
curl -X POST "http://localhost:8000/api/agent/plan" \
  -H "Content-Type: application/json" \
  -d '{
    "parsed_fields": {
      "purpose": "检测水样重金属含量",
      "sample_type": "水样",
      "indicators": ["铅", "汞", "镉"],
      "equipment": [],
      "materials": [],
      "steps": [],
      "estimated_time": "",
      "confidence": 0.85
    }
  }'
```

#### 智能问答

```bash
curl -X POST "http://localhost:8000/api/agent/qa" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "水质检测需要什么设备？",
    "context": {"experiment_type": "water_heavy_metal"}
  }'
```

## 核心特性

### 1. 完全本地化
- 所有处理在本地完成
- 不依赖外部 AI API
- 数据不向外部发送

### 2. 轻量高效
- 使用关键词匹配和规则引擎
- 无需重型机器学习框架
- 快速响应（< 2秒）

### 3. 易于扩展
- 支持动态添加知识条目
- 支持自定义规则配置
- 支持导入导出数据

### 4. 用户友好
- 直观的 Web 界面（待实现）
- 清晰的 API 文档
- 详细的错误提示

## 技术栈

- **后端框架**: FastAPI (Python)
- **知识存储**: JSON 文件
- **NLP 处理**: 正则表达式 + 关键词匹配
- **数据验证**: Pydantic
- **API 文档**: OpenAPI/Swagger

## 依赖说明

### 核心依赖

AI Agent 模块依赖以下核心包（已包含在 `requirements.txt` 中）：

#### 运行时依赖
- **fastapi** (0.104.1) - 高性能异步 Web 框架
- **uvicorn[standard]** (0.24.0) - ASGI 服务器
- **pydantic** (2.5.0) - 数据验证和设置管理
- **python-dotenv** (1.0.0) - 环境变量管理
- **python-dateutil** (2.8.2) - 日期时间处理

#### 测试依赖
- **pytest** (7.4.3) - 单元测试框架
- **pytest-asyncio** (0.21.1) - 异步测试支持
- **pytest-cov** (4.1.0) - 测试覆盖率报告
- **hypothesis** (6.92.0) - 属性测试框架
- **httpx** (0.25.2) - HTTP 客户端（用于 API 测试）

### 安装依赖

```bash
# 进入项目目录
cd fastapi-backend

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装所有依赖
pip install -r requirements.txt
```

### 验证安装

```bash
# 检查关键依赖
pip show fastapi pydantic pytest hypothesis

# 运行测试验证环境
pytest tests/test_agent_*.py -v
```

详细的开发环境配置说明，请参考 [DEVELOPMENT_SETUP.md](../../DEVELOPMENT_SETUP.md)。

## 待实现功能

### Phase 4: 前端集成
- [ ] 创建 AI Agent API 服务（agent.ts）
- [ ] 创建 TypeScript 类型定义
- [ ] 创建 AI Agent Store
- [ ] 创建 AI Agent 主页面（AgentAnalysis.vue）
- [ ] 创建输入区域组件
- [ ] 创建解析结果显示组件
- [ ] 创建输出区域组件

### Phase 5: 结果分析
- [ ] 实现规则引擎（rule_engine.py）
- [ ] 实现结果分析器（result_analyzer.py）
- [ ] 创建规则配置文件（rules_config.json）
- [ ] 实现异常检测
- [ ] 实现建议生成

### Phase 6: 测试和优化
- [ ] 单元测试
- [ ] 属性测试（使用 hypothesis）
- [ ] 集成测试
- [ ] 性能测试

## 性能指标

- 解析响应时间: < 500ms
- 知识图谱查询: < 500ms
- 问答响应时间: < 300ms
- 计划生成时间: < 1s
- 完整流程: < 2s

## 知识图谱统计

- 实验类型: 3 个
- 设备: 9 个
- 材料: 8 个
- 指标: 12 个
- 步骤: 12 个

## 贡献指南

### 添加新的实验类型

1. 在 `data/knowledge_graph.json` 中添加实验类型定义
2. 添加相关的设备、材料、指标、步骤
3. 在 `data/parser_dictionary.json` 中添加关键词映射

### 扩展解析能力

1. 在 `data/parser_dictionary.json` 中添加新的关键词
2. 添加新的正则表达式模式
3. 更新 `nlp_parser.py` 中的提取逻辑（如需要）

### 添加新的问答模板

1. 在 `data/answer_templates.json` 中添加新模板
2. 在 `qa_engine.py` 中添加新的意图类型（如需要）

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系技术支持团队。

---

**版本**: 1.0.0 (MVP)  
**创建日期**: 2026-05-06  
**状态**: ✅ 核心功能已完成
