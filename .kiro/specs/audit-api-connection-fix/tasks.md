# 审核API连接修复实施计划

## 任务概述

本实施计划遵循探索性bug修复工作流程，通过以下步骤修复审核功能的前后端API连接问题：
1. **探索** - 编写测试验证bug存在（Bug条件）
2. **保持** - 编写测试确保非bug行为不变（保持需求）
3. **实施** - 应用修复并验证（预期行为）
4. **验证** - 确保所有测试通过

## 实施任务

- [x] 1. 编写bug条件探索测试
  - **Property 1: Bug条件** - 审核API调用缺失验证
  - **重要**: 在实施修复之前编写此基于属性的测试
  - **目标**: 展示证明bug存在的反例
  - **范围化PBT方法**: 针对确定性bug，将属性范围限定为具体的失败案例：审核操作使用模拟数据而非真实API
  - 测试 loadAuditTasks() 使用模拟数据而不调用 GET /api/audits（来自设计中的Bug条件）
  - 测试 performAudit() 仅显示成功消息而不调用 POST /api/audits/:id/review
  - 测试 getAuditTask() 使用硬编码数据而不调用 GET /api/audits/:id
  - 在未修复代码上运行测试 - 预期失败（这证实了bug的存在）
  - **预期结果**: 测试失败（这是正确的 - 证明bug存在）
  - 记录发现的反例以理解根本原因
  - 当测试编写完成、运行并记录失败时标记任务完成
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. 编写保持属性测试（在实施修复之前）
  - **Property 2: 保持** - 非API功能行为保持
  - **重要**: 遵循观察优先方法
  - 观察未修复代码上非bug输入的行为（isBugCondition返回false的情况）
  - 编写基于属性的测试捕获来自保持需求的观察行为模式
  - 基于属性的测试为更强的保持保证生成许多测试用例
  - 在未修复代码上运行测试
  - **预期结果**: 测试通过（这确认了要保持的基线行为）
  - 当测试在未修复代码上编写、运行并通过时标记任务完成
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 审核API连接修复

  - [x] 3.1 创建审核API服务层
    - 创建 `vue-project/src/services/auditService.ts`
    - 实现 AuditService 类封装所有审核相关的API调用
    - 实现 listAuditTasks() 方法调用 GET /api/audits
    - 实现 getAuditTask(id) 方法调用 GET /api/audits/:id
    - 实现 performAudit(id, decision) 方法调用 POST /api/audits/:id/review
    - 实现 getAuditStatistics() 方法获取审核统计信息
    - 添加统一的错误处理和响应数据转换
    - _Bug_Condition: isBugCondition(operation) 其中 operation.usesRealAPI = false_
    - _Expected_Behavior: expectedBehavior(result) 来自设计_
    - _Preservation: 来自设计的保持需求_
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 添加前端审核类型定义
    - 创建 `vue-project/src/types/audit.ts`
    - 定义 AuditTask 接口匹配后端数据结构
    - 定义 AuditDecision 接口用于审核操作参数
    - 定义 AuditStatistics 接口用于统计数据
    - 定义 AuditApiResponse 接口用于API响应
    - 确保类型与后端 auditController.ts 兼容
    - _Bug_Condition: 前后端数据结构不匹配导致的类型错误_
    - _Expected_Behavior: 类型安全的API调用和数据处理_
    - _Preservation: 保持现有的TypeScript类型检查_
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.3 修改审核任务列表组件
    - 修改 `vue-project/src/views/audit/AuditTaskList.vue`
    - 导入 AuditService 替换模拟数据逻辑
    - 更新 loadAuditTasks() 函数调用 auditService.listAuditTasks()
    - 更新 handleQuickApprove() 函数调用 auditService.performAudit()
    - 添加加载状态管理（loading, error状态）
    - 添加API调用失败的错误处理和用户提示
    - 保持现有的UI布局和用户交互体验
    - _Bug_Condition: 组件使用模拟数据而非真实API_
    - _Expected_Behavior: 组件调用真实API并正确处理响应_
    - _Preservation: UI布局、样式和用户交互保持不变_
    - _需求: 2.1, 2.5, 3.1, 3.2, 3.4, 3.5_

  - [x] 3.4 修改审核任务详情组件
    - 修改 `vue-project/src/views/audit/AuditTaskDetail.vue`
    - 导入 AuditService 和审核类型定义
    - 更新 loadAuditTaskDetail() 函数调用 auditService.getAuditTask()
    - 实现 handleApprove() 函数调用审核API
    - 实现 handleReject() 函数调用审核API
    - 实现 handleReturn() 函数调用审核API
    - 添加操作进度显示和成功/失败反馈
    - 保持现有的表单验证和权限控制逻辑
    - _Bug_Condition: 审核操作仅显示消息而不调用API_
    - _Expected_Behavior: 审核操作调用API并更新真实状态_
    - _Preservation: 表单界面、验证逻辑和权限控制保持不变_
    - _需求: 2.2, 2.3, 2.4, 3.2, 3.3, 3.5_

  - [x] 3.5 验证bug条件探索测试现在通过
    - **Property 1: 预期行为** - 审核API调用正确实现
    - **重要**: 重新运行步骤1中的相同测试 - 不要编写新测试
    - 步骤1中的测试编码了预期行为
    - 当此测试通过时，它确认预期行为得到满足
    - 运行步骤1中的bug条件探索测试
    - **预期结果**: 测试通过（确认bug已修复）
    - _需求: 来自设计的预期行为属性_

  - [x] 3.6 验证保持测试仍然通过
    - **Property 2: 保持** - 非API功能行为保持
    - **重要**: 重新运行步骤2中的相同测试 - 不要编写新测试
    - 运行步骤2中的保持属性测试
    - **预期结果**: 测试通过（确认没有回归）
    - 确认修复后所有测试仍然通过（没有回归）

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 测试注释

### 探索测试要求（基于属性的测试）

探索测试必须：
- 是独立任务（不是子任务）
- 使用格式 `**Property 1: Bug条件** - [标题]` 以启用悬停状态
- 包含来自Bug条件规范的详细信息
- 指定来自 isBugCondition 伪代码的bug条件
- 指定来自 expectedBehavior 伪代码的预期行为
- 测试应在未修复代码上失败（这确认bug存在）
- 对于确定性bug：将属性范围限定为具体失败案例以确保可重现性
- 修复后：测试应通过（确认bug已解决）
- 必须包含 "_需求: X.Y_"

### 保持测试要求（基于属性的测试）

**观察优先方法**意味着：
1. 在非bug输入上运行未修复代码（isBugCondition返回false的情况）
2. 观察并记录实际输出
3. 编写基于属性的测试，在输入域上断言这些观察到的输出
4. 在实施修复之前验证测试在未修复代码上通过

这确保保持测试捕获真实行为，而不是假设行为。

**为什么使用基于属性的测试进行保持？**
- 保持本质上是关于通用属性（"对于所有非bug输入"）
- 基于属性的测试自动生成许多测试用例
- 它捕获手动单元测试可能遗漏的边缘情况
- 它为行为不变提供更强的保证

保持测试必须：
- 是独立任务（不是子任务）
- 使用格式 `**Property 2: 保持** - [标题]` 以启用悬停状态
- 包含来自保持需求部分的详细信息
- 指定非bug条件（isBugCondition返回false的情况）
- 指定应保持的观察行为
- 测试应在未修复代码上通过（确认基线行为）
- 修复后：测试应仍然通过（确认没有回归）
- 必须包含 "_需求: X.Y_"