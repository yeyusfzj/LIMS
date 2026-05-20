---
inclusion: auto
---

# 屏蔽 Node.js 后端

## 重要提示

**本项目使用 FastAPI (Python) 作为后端框架，不是 Node.js/Express！**

## 需要屏蔽的内容

当用户询问后端相关问题时，请注意：

### ❌ 不要关注这些（Node.js后端）
- `backend-api/` 目录中的 Node.js/Express 代码
- `backend-api/src/` 中的 TypeScript 文件
- `backend-api/package.json` 和 npm 相关配置
- Express.js 相关的中间件和路由
- Prisma ORM（Node.js版本）
- Node.js 相关的任何内容

### ✅ 应该关注这些（FastAPI后端）
- FastAPI 框架和 Python 代码
- Pydantic 模型
- SQLAlchemy ORM
- Python 依赖管理（requirements.txt, poetry, pipenv）
- FastAPI 路由和依赖注入
- Python 异步编程（async/await）
- Uvicorn/Gunicorn 服务器

## 后端技术栈（正确的）

**框架**: FastAPI (Python)
**ORM**: SQLAlchemy
**验证**: Pydantic
**数据库**: PostgreSQL
**缓存**: Redis
**异步**: asyncio, aioredis

## 如果用户提到后端

1. 首先确认他们是在问 FastAPI 后端
2. 如果他们提到 Node.js/Express，礼貌地纠正：
   - "本项目使用 FastAPI (Python) 作为后端，不是 Node.js/Express"
3. 提供 FastAPI 相关的解决方案

## 文档参考

如果需要查看后端架构，应该查找：
- FastAPI 项目目录（如果存在）
- Python 后端相关文档
- 不要参考 `backend-api/` 目录中的 Node.js 代码
