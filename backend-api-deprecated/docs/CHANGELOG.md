# API 文档变更日志

## 版本 1.0.0

**发布时间:** 2026-03-10T02:44:35.200Z

### ✨ 新增端点 (25)

- **POST /api/auth/login** - 用户登录
- **POST /api/auth/refresh** - 刷新访问令牌
- **POST /api/auth/logout** - 用户登出
- **GET /api/auth/me** - 获取当前用户信息
- **POST /api/reports** - 生成报告
- **GET /api/reports** - 查询报告列表
- **GET /api/reports/{id}/preview** - 预览报告
- **GET /api/reports/{id}** - 获取报告详情
- **POST /api/reports/{id}/sign** - 签名报告
- **POST /api/reports/{id}/distribute** - 分发报告
- **POST /api/reports/{id}/recall** - 回收报告
- **POST /api/results** - 创建检测结果
- **GET /api/results** - 查询检测结果列表
- **POST /api/results/import** - 批量导入检测结果
- **GET /api/results/{id}** - 获取检测结果详情
- **POST /api/results/{id}/calculate** - 执行公式计算
- **POST /api/results/{id}/retest** - 申请复测
- **POST /api/samples** - 创建样品
- **GET /api/samples** - 查询样品列表
- **GET /api/samples/{id}** - 获取样品详情
- **POST /api/samples/{id}/transfer** - 样品流转
- **GET /api/samples/{id}/custody** - 获取样品监管链
- **POST /api/samples/{id}/split** - 分样操作
- **POST /api/samples/merge** - 合样操作
- **POST /api/samples/{id}/release** - 样品放行

### 📦 数据模型变更

**新增模型:** ErrorResponse, PaginatedResponse, Sample, CreateSampleRequest, Transfer, User, Result, Report

