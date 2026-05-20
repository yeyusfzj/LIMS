# 审核API连接修复技术设计

## 概述

审核功能的前端组件目前使用模拟数据，没有与后端API建立连接。本设计方案将创建审核API服务层，修改前端组件以使用真实API调用，并添加完整的错误处理和加载状态管理。修复后，用户将能够执行真正的审核操作，数据将持久化到后端数据库。

## 术语表

- **Bug_Condition (C)**: 前端审核组件调用模拟数据而非真实API的条件
- **Property (P)**: 前端组件应该调用真实后端API并正确处理响应的期望行为
- **Preservation**: 现有的UI布局、用户交互体验和权限控制必须保持不变
- **AuditService**: 新创建的审核API服务层，封装所有审核相关的HTTP请求
- **AuditTaskList**: 审核任务列表组件，需要替换模拟数据调用
- **AuditTaskDetail**: 审核任务详情组件，需要实现真实的审核操作API调用

## Bug详情

### Bug条件

Bug在前端审核组件需要获取或提交审核数据时发生。组件要么使用硬编码的模拟数据，要么仅显示成功消息而不调用后端API，导致审核操作没有实际效果。

**正式规范:**
```
FUNCTION isBugCondition(operation)
  INPUT: operation of type AuditOperation
  OUTPUT: boolean
  
  RETURN operation.type IN ['loadTaskList', 'loadTaskDetail', 'performAudit', 'quickApprove']
         AND operation.usesRealAPI = false
         AND operation.usesMockData = true
END FUNCTION
```

### 示例

- 用户在审核任务列表页面加载数据时，系统显示硬编码的模拟任务，而不是调用 GET /api/audits
- 用户点击"通过审核"按钮时，系统仅显示成功消息，不调用 POST /api/audits/:id/review
- 用户刷新页面时，之前的"审核操作"全部丢失，因为没有真正提交到后端
- 用户在不同浏览器或设备上访问时，看到的是相同的模拟数据，而不是真实的审核状态

## 预期行为

### 保持不变的行为

**不变行为:**
- 审核任务的基本信息显示（任务ID、样品名称、审核级别、状态等）必须继续正确显示
- 用户权限控制和审核操作按钮的显示逻辑必须保持不变
- 页面布局、样式和用户交互体验必须保持现有设计
- 错误提示信息的显示方式必须保持一致

**范围:**
所有不涉及数据获取和提交的功能应该完全不受此修复影响。这包括:
- UI组件的渲染和样式
- 表单验证逻辑
- 页面导航和路由
- 非审核相关的功能模块

## 假设的根本原因

基于bug描述，最可能的问题是:

1. **缺少API服务层**: 前端没有创建专门的审核API服务来封装HTTP请求
   - AuditTaskList.vue 和 AuditTaskDetail.vue 直接使用模拟数据
   - 没有统一的API调用接口和错误处理

2. **组件实现不完整**: 组件中的API调用逻辑没有实现
   - loadAuditTasks 函数使用 setTimeout 模拟API调用
   - 审核操作函数只显示成功消息，没有实际的HTTP请求

3. **类型定义不匹配**: 前后端的数据结构可能存在差异

4. **错误处理缺失**: 没有实现完整的加载状态和错误处理机制

## 正确性属性

Property 1: Bug条件 - API调用替换

_对于任何_ 需要审核数据的操作（isBugCondition返回true），修复后的组件应该调用相应的后端API端点，正确处理响应数据，并更新UI状态以反映真实的审核进度。

**验证: 需求 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: 保持不变 - 非API功能保持

_对于任何_ 不涉及数据获取和提交的操作（isBugCondition返回false），修复后的代码应该产生与原始代码完全相同的行为，保持所有现有的UI交互、样式和用户体验。

**验证: 需求 3.1, 3.2, 3.3, 3.4, 3.5**

## 修复实现

### 需要的更改

假设我们的根本原因分析是正确的:

**文件**: `vue-project/src/services/auditService.ts`

**新建审核API服务**:
1. **创建AuditService类**: 封装所有审核相关的API调用
   - listAuditTasks(): 获取审核任务列表
   - getAuditTask(): 获取审核任务详情
   - performAudit(): 执行审核操作
   - getAuditStatistics(): 获取审核统计信息

2. **统一错误处理**: 使用现有的http客户端进行API调用

**文件**: `vue-project/src/views/audit/AuditTaskList.vue`

**替换模拟数据调用**:
1. **导入AuditService**: 替换模拟数据逻辑
2. **更新loadAuditTasks函数**: 调用真实API
3. **更新handleQuickApprove函数**: 调用审核API
4. **添加错误处理**: 处理API调用失败的情况

**文件**: `vue-project/src/views/audit/AuditTaskDetail.vue`

**实现真实审核操作**:
1. **更新loadAuditTaskDetail函数**: 调用真实API获取详情
2. **实现审核操作函数**: handleApprove, handleReject, handleReturn
3. **添加加载状态管理**: 显示操作进度
4. **类型安全**: 确保前后端数据格式兼容

**文件**: `vue-project/src/types/audit.ts`

**新建前端审核类型**:
1. **API响应类型**: 定义与后端兼容的数据结构
2. **请求参数类型**: 定义API调用参数
3. **统计信息类型**: 定义审核统计数据结构

## 测试策略

### 验证方法

测试策略遵循两阶段方法：首先在未修复的代码上展示bug的反例，然后验证修复后的代码能正确工作并保持现有行为。

### 探索性Bug条件检查

**目标**: 在实施修复之前展示bug的反例。确认或反驳根本原因分析。如果反驳，我们需要重新假设。

**测试计划**: 编写测试来模拟审核操作，并断言相应的API调用被执行。在未修复的代码上运行这些测试以观察失败并理解根本原因。

**测试用例**:
1. **任务列表加载测试**: 模拟页面加载，验证是否调用 GET /api/audits（在未修复代码上会失败）
2. **任务详情加载测试**: 模拟详情页面加载，验证是否调用 GET /api/audits/:id（在未修复代码上会失败）
3. **审核操作测试**: 模拟点击审核按钮，验证是否调用 POST /api/audits/:id/review（在未修复代码上会失败）
4. **快速通过测试**: 模拟快速通过操作，验证API调用和状态更新（在未修复代码上会失败）

**预期反例**:
- API调用没有被执行，组件使用硬编码的模拟数据
- 可能原因：缺少API服务层，组件实现不完整，错误处理缺失

### 修复检查

**目标**: 验证对于所有bug条件成立的输入，修复后的函数产生预期行为。

**伪代码:**
```
FOR ALL operation WHERE isBugCondition(operation) DO
  result := auditComponent_fixed(operation)
  ASSERT expectedBehavior(result)
END FOR
```

### 保持检查

**目标**: 验证对于所有bug条件不成立的输入，修复后的函数产生与原始函数相同的结果。

**伪代码:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT auditComponent_original(operation) = auditComponent_fixed(operation)
END FOR
```

**测试方法**: 推荐使用基于属性的测试进行保持检查，因为:
- 它自动生成输入域中的许多测试用例
- 它捕获手动单元测试可能遗漏的边缘情况
- 它为所有非bug输入提供强有力的行为不变保证

**测试计划**: 首先在未修复代码上观察UI交互和样式渲染的行为，然后编写基于属性的测试来捕获该行为。

**测试用例**:
1. **UI渲染保持**: 验证页面布局和样式在修复后保持不变
2. **权限控制保持**: 验证按钮显示和禁用逻辑继续正确工作
3. **表单验证保持**: 验证输入验证规则继续按预期工作
4. **导航保持**: 验证页面跳转和路由继续正常工作

### 单元测试

- 测试AuditService的每个API方法
- 测试组件的数据加载和状态管理
- 测试错误处理和加载状态显示

### 基于属性的测试

- 生成随机审核任务数据并验证API调用正确性
- 生成随机用户权限配置并验证UI行为保持
- 测试各种网络条件下的错误处理

### 集成测试

- 测试完整的审核流程从列表到详情到操作
- 测试多用户并发审核场景
- 测试API调用失败时的用户体验