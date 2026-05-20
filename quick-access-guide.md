# 快速访问指南

## 🚀 服务地址

### 前端应用
```
http://localhost:5173
```

### 后端API
```
http://localhost:3000
```

### 健康检查
```
http://localhost:3000/health
```

## 🔑 测试账号

### 管理员账号
- 用户名: `admin`
- 密码: `Admin@123456`
- 权限: 完整系统权限

### 普通用户账号
- 用户名: `testuser`
- 密码: `User@123456`
- 权限: 实验室技术员权限

## 📋 主要功能页面

### 样品管理
- 样品列表: http://localhost:5173/sample/list
- 样品登记: http://localhost:5173/sample/registration
- 样品流转: http://localhost:5173/sample/transfer
- 样品放行: http://localhost:5173/sample/release

### 工作流管理
- 工作流模板: http://localhost:5173/workflow/templates
- 工作流设计器: http://localhost:5173/workflow/designer
- 任务列表: http://localhost:5173/workflow/tasks
- 任务派工: http://localhost:5173/workflow/assignment

### 检测方法
- 方法库: http://localhost:5173/method/library

### 结果管理
- 结果录入: http://localhost:5173/result/entry
- 结果导入: http://localhost:5173/result/import
- 公式配置: http://localhost:5173/result/formula
- 异常管理: http://localhost:5173/result/anomaly
- 结果查询: http://localhost:5173/result/list

### 审核判定
- 审核任务: http://localhost:5173/audit/tasks
- 审核配置: http://localhost:5173/audit/config
- 质量判定: http://localhost:5173/quality/judgment
- 判定规则: http://localhost:5173/quality/judgment-rules

### 报告管理
- 报告模板: http://localhost:5173/report/templates
- 报告生成: http://localhost:5173/report/generator
- 报告分发: http://localhost:5173/report/distribution

### 统计分析
- 统计仪表板: http://localhost:5173/statistics/dashboard
- 自定义报表: http://localhost:5173/statistics/custom-report

### AI智能分析
- AI分析: http://localhost:5173/ai/analysis

### 系统管理
- 用户管理: http://localhost:5173/system/users
- 角色权限: http://localhost:5173/system/roles
- 审计日志: http://localhost:5173/system/audit-log
- 系统配置: http://localhost:5173/system/settings

## 🔧 API测试端点

### 认证
```bash
# 登录
POST http://localhost:3000/api/auth/login
Body: {"username":"admin","password":"Admin@123456"}
```

### 样品
```bash
# 获取样品列表
GET http://localhost:3000/api/samples
Headers: Authorization: Bearer {token}
```

### 工作流
```bash
# 获取工作流列表
GET http://localhost:3000/api/workflows
Headers: Authorization: Bearer {token}
```

### 检测方法
```bash
# 获取方法列表
GET http://localhost:3000/api/methods
Headers: Authorization: Bearer {token}
```

### 用户
```bash
# 获取用户列表
GET http://localhost:3000/api/users
Headers: Authorization: Bearer {token}
```

## 📊 测试数据

### 样品数据
- 总数: 6个样品
- 包含: 水质样品、土壤样品、食品样品

### 工作流模板
- 总数: 5个模板
- 包含: 水质检测、土壤检测、食品检测流程

### 检测方法
- 总数: 4个方法
- 包含: 国标方法、行业标准方法

### 用户数据
- 总数: 7个用户
- 包含: 管理员、技术员、普通用户

## 🎯 快速测试流程

1. **启动服务** (已完成 ✓)
   - 后端: 运行在 3000 端口
   - 前端: 运行在 5173 端口

2. **登录系统**
   - 访问: http://localhost:5173
   - 使用管理员账号登录

3. **测试核心功能**
   - 查看首页仪表盘
   - 浏览样品列表
   - 查看工作流模板
   - 测试结果录入
   - 查看统计报表

4. **验证权限控制**
   - 使用不同账号登录
   - 测试权限限制

## 💡 提示

- 所有页面都需要登录后才能访问
- 首次访问会自动跳转到登录页
- 登录后Token会保存在localStorage中
- 退出登录会清除Token并跳转到登录页

---

**更新时间**: 2026-03-31  
**服务状态**: ✓ 运行正常
