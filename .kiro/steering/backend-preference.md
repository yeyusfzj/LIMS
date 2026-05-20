---
inclusion: auto
---

# 后端服务偏好设置

## 默认后端选择

本项目包含两个后端实现:
- **backend-api**: Node.js + Express + TypeScript + Prisma
- **fastapi-backend**: Python + FastAPI + SQLAlchemy

**重要规则**: 
- 当用户提到"后端"时,**始终指 fastapi-backend (Python + FastAPI)**
- 除非用户明确指定要使用 Node.js 后端,否则一律使用 FastAPI 后端
- 启动、测试、开发后端功能时,默认操作 fastapi-backend 目录

## 后端服务信息

### FastAPI 后端 (默认)
- **目录**: `fastapi-backend/`
- **端口**: 8000
- **启动命令**: `uvicorn app.main:app --reload` (在 fastapi-backend 目录下)
- **数据库**: PostgreSQL (与 Node.js 后端共享同一数据库)
- **API 文档**: http://localhost:8000/docs

### Node.js 后端 (备用)
- **目录**: `backend-api/`
- **端口**: 3000
- **启动命令**: `npm run dev` (在 backend-api 目录下)
- **数据库**: PostgreSQL + Prisma ORM
- **API 文档**: http://localhost:3000/api-docs

## 操作指南

### 启动后端服务
当用户说"启动后端"时:
1. 停止 Node.js 后端(如果正在运行)
2. 启动 FastAPI 后端: `uvicorn app.main:app --reload --port 8000`

### 测试后端 API
- 默认测试 FastAPI 后端的端点: http://localhost:8000
- API 文档地址: http://localhost:8000/docs

### 开发后端功能
- 在 `fastapi-backend/` 目录下进行开发
- 使用 Python/FastAPI 的代码风格和最佳实践

## 前端配置

前端 API 基础地址应配置为:
- 开发环境: `http://localhost:8000` (FastAPI)
- 生产环境: 根据实际部署配置

## 注意事项

- 两个后端共享同一个 PostgreSQL 数据库 (lims_dev)
- 数据库迁移和种子数据需要在两个后端中保持同步
- 如果需要使用 Node.js 后端,用户必须明确说明
