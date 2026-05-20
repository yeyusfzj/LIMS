# 工作流模板保存功能修复设计文档

## 概述

本文档描述了工作流设计器（WorkflowDesigner.vue）中保存模板功能的两个关键缺陷的修复方案：

1. **403 Forbidden 错误**：保存模板时后端返回 403 错误，原因是前端未正确调用后端 API 或权限配置问题
2. **缺少命名功能**：保存时没有提供界面让用户输入模板名称和描述，导致无法创建有意义的模板

修复策略采用最小化改动原则，在现有代码基础上添加保存对话框组件，并正确调用后端 API，同时确保不影响工作流设计器的其他功能。

## 术语表

- **Bug_Condition (C)**: 触发缺陷的条件 - 用户点击保存按钮时
- **Property (P)**: 期望的正确行为 - 显示命名对话框并成功保存到后端
- **Preservation**: 必须保持不变的现有功能 - 节点拖拽、连接、配置、验证、预览等所有设计器功能
- **handleSave**: WorkflowDesigner.vue 中的保存函数，当前只打印到控制台
- **workflowRoutes**: 后端路由文件，定义了工作流相关的 API 端点和权限要求
- **requirePermission**: 权限中间件，要求用户具有特定资源的操作权限
- **http.ts**: 前端 HTTP 客户端，用于发送 API 请求

## 缺陷详情

### Bug Condition 1: 403 Forbidden 错误

当用户点击保存按钮时，系统应该调用后端 API 保存工作流模板，但当前实现只是将数据打印到控制台，没有实际的 HTTP 请求。如果尝试手动调用 API，可能会遇到 403 错误。

**形式化规范:**
```
FUNCTION isBugCondition1(action)
  INPUT: action of type UserAction
  OUTPUT: boolean
  
  RETURN action.type == 'CLICK_SAVE_BUTTON'
         AND action.hasWorkflowNodes == true
         AND NOT apiRequestSent()
         AND (IF apiRequestSent() THEN responseStatus == 403)
END FUNCTION
```

### Bug Condition 2: 缺少命名功能

当用户点击保存按钮时，系统应该首先弹出对话框让用户输入模板名称和描述，但当前实现直接尝试保存，没有任何用户输入界面。

**形式化规范:**
```
FUNCTION isBugCondition2(action)
  INPUT: action of type UserAction
  OUTPUT: boolean
  
  RETURN action.type == 'CLICK_SAVE_BUTTON'
         AND action.hasWorkflowNodes == true
         AND NOT dialogShown()
         AND NOT templateNameProvided()
END FUNCTION
```

### 示例

- **示例 1**: 用户创建了包含 3 个节点的工作流，点击保存按钮 → 控制台打印数据，没有对话框，没有 API 请求
- **示例 2**: 用户尝试手动调用 POST /api/workflows → 返回 403 Forbidden（如果权限未正确配置）
- **示例 3**: 用户期望看到命名对话框输入模板名称 → 实际没有任何界面提示
- **边缘情况**: 用户在没有节点的情况下点击保存 → 应该显示警告而不是尝试保存

## 期望行为

### Preservation Requirements（保持不变的行为）

**不变行为:**
- 节点拖拽功能必须继续正常工作（从左侧面板拖拽节点到画布）
- 节点连接功能必须继续正常工作（在属性面板中选择目标节点创建连接）
- 节点配置功能必须继续正常工作（在属性面板中配置节点属性）
- 节点删除功能必须继续正常工作（点击节点上的删除按钮）
- 工作流验证功能必须继续正常工作（点击验证按钮检查工作流有效性）
- 预览功能必须继续显示开发中提示
- 画布缩放和重置功能必须继续正常工作

**范围:**
所有不涉及保存按钮点击的操作都应该完全不受影响。这包括：
- 所有节点操作（拖拽、选择、配置、删除）
- 所有连接线操作（创建、显示）
- 所有画布操作（缩放、重置、拖动节点）
- 所有工具栏按钮（验证、预览）

## 假设的根本原因

基于缺陷描述和代码分析，最可能的问题是：

1. **未实现 API 调用**: handleSave 函数只打印到控制台，没有调用后端 API
   - 当前代码：`console.log('保存工作流:', workflow)`
   - 缺少：HTTP POST 请求到 `/api/workflows`

2. **缺少用户输入界面**: 没有对话框组件让用户输入模板名称和描述
   - 当前代码直接尝试保存，没有收集必要的模板元数据
   - 缺少：模态对话框组件和表单验证

3. **权限配置问题**: 后端 API 要求 `workflow:create` 权限
   - 路由配置：`requirePermission('workflow', 'create')`
   - 可能原因：用户角色没有分配该权限

4. **请求数据格式不匹配**: 后端期望的数据格式可能与前端发送的不一致
   - 后端使用 `createWorkflowSchema` 验证请求
   - 需要确保发送正确的字段（name, description, definition 等）

## 正确性属性

Property 1: Bug Condition - 保存对话框和 API 调用

_对于任何_ 用户点击保存按钮且工作流包含节点的操作，修复后的 handleSave 函数应该首先显示一个模态对话框，让用户输入模板名称和描述，然后在用户确认后发送 HTTP POST 请求到 `/api/workflows` 端点，并在成功时显示成功提示，在失败时显示具体错误信息。

**验证需求: 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - 非保存操作行为

_对于任何_ 不是点击保存按钮的操作（节点拖拽、连接、配置、删除、验证、预览、缩放等），修复后的代码应该产生与原始代码完全相同的行为，保持所有现有工作流设计器功能不变。

**验证需求: 3.1, 3.2, 3.3, 3.4, 3.5**

## 修复实现

### 需要的更改

假设我们的根本原因分析是正确的：

**文件**: `vue-project/src/views/workflow/WorkflowDesigner.vue`

**函数**: `handleSave`

**具体更改**:

1. **添加保存对话框状态管理**:
   - 添加响应式变量：`saveDialogVisible`（控制对话框显示）
   - 添加响应式变量：`templateForm`（存储模板名称和描述）
   - 添加表单验证规则

2. **修改 handleSave 函数**:
   - 移除 `console.log` 语句
   - 添加节点数量检查（已存在）
   - 显示保存对话框而不是直接保存
   - 等待用户输入模板信息

3. **添加 handleConfirmSave 函数**:
   - 验证表单输入（名称不为空）
   - 构建符合后端 API 要求的请求数据
   - 发送 POST 请求到 `/api/workflows`
   - 处理成功响应（显示成功提示，可选返回列表）
   - 处理错误响应（显示具体错误信息，保留用户输入）

4. **添加对话框模板**:
   - 使用 `el-dialog` 组件创建模态对话框
   - 包含表单字段：模板名称（必填）、模板描述（可选）
   - 包含操作按钮：确定、取消
   - 添加表单验证提示

5. **集成 HTTP 客户端**:
   - 导入 `http` 服务（从 `@/services/http`）
   - 使用 `http.post('/api/workflows', data)` 发送请求
   - 处理 403 错误（提示权限不足）
   - 处理其他错误（显示具体错误信息）

**文件**: `backend-api/src/routes/workflowRoutes.ts`（可能需要检查）

**潜在问题**: 权限配置

**具体更改**:
- 检查用户角色是否具有 `workflow:create` 权限
- 如果需要，在种子数据中为测试用户添加该权限
- 确保权限中间件正确工作

## 测试策略

### 验证方法

测试策略遵循两阶段方法：首先在未修复的代码上展示缺陷的反例，然后验证修复后的代码正确工作并保持现有行为不变。

### 探索性 Bug Condition 检查

**目标**: 在实施修复之前展示缺陷的反例。确认或反驳根本原因分析。如果反驳，需要重新假设。

**测试计划**: 编写测试模拟用户点击保存按钮的操作，并断言应该显示对话框和发送 API 请求。在未修复的代码上运行这些测试以观察失败并理解根本原因。

**测试用例**:
1. **保存对话框测试**: 点击保存按钮时应该显示对话框（在未修复代码上会失败）
2. **API 调用测试**: 确认保存后应该发送 HTTP 请求（在未修复代码上会失败）
3. **403 错误测试**: 模拟权限不足的情况，应该显示权限错误提示（可能在未修复代码上失败）
4. **空节点测试**: 没有节点时点击保存应该显示警告（当前已正常工作）

**预期反例**:
- 点击保存按钮时没有显示对话框
- 没有发送 HTTP 请求到后端
- 可能的原因：未实现对话框组件、未调用 API、权限配置错误

### Fix Checking（修复检查）

**目标**: 验证对于所有触发缺陷条件的输入，修复后的函数产生期望的行为。

**伪代码:**
```
FOR ALL action WHERE isBugCondition1(action) OR isBugCondition2(action) DO
  result := handleSave_fixed(action)
  ASSERT dialogShown(result)
  ASSERT apiRequestSent(result)
  ASSERT (responseStatus == 200 OR errorMessageShown(result))
END FOR
```

### Preservation Checking（保持检查）

**目标**: 验证对于所有不触发缺陷条件的输入，修复后的函数产生与原始函数相同的结果。

**伪代码:**
```
FOR ALL action WHERE NOT (isBugCondition1(action) OR isBugCondition2(action)) DO
  ASSERT workflowDesigner_original(action) = workflowDesigner_fixed(action)
END FOR
```

**测试方法**: 建议使用基于属性的测试进行保持检查，因为：
- 它自动生成许多测试用例覆盖输入域
- 它捕获手动单元测试可能遗漏的边缘情况
- 它为所有非缺陷输入提供强有力的保证，确保行为不变

**测试计划**: 首先在未修复的代码上观察非保存操作的行为，然后编写基于属性的测试捕获该行为。

**测试用例**:
1. **节点拖拽保持**: 验证拖拽节点到画布后修复继续工作
2. **节点连接保持**: 验证创建节点连接后修复继续工作
3. **节点配置保持**: 验证配置节点属性后修复继续工作
4. **验证功能保持**: 验证工作流验证功能后修复继续工作
5. **画布操作保持**: 验证缩放、重置等画布操作后修复继续工作

### 单元测试

- 测试保存对话框的显示和隐藏逻辑
- 测试表单验证（名称不为空、长度限制等）
- 测试 API 请求数据格式是否正确
- 测试成功响应的处理（显示提示、关闭对话框）
- 测试错误响应的处理（403、400、500 等）
- 测试边缘情况（空节点、网络错误等）

### 基于属性的测试

- 生成随机工作流配置并验证保存功能正确工作
- 生成随机用户操作序列并验证非保存操作的行为保持不变
- 测试在多种场景下保存对话框的显示和数据提交

### 集成测试

- 测试完整的保存流程：点击保存 → 显示对话框 → 输入信息 → 提交 → 成功保存
- 测试权限检查：使用不同权限的用户测试保存功能
- 测试错误处理：模拟后端错误并验证前端正确显示错误信息
- 测试保存后的状态：验证保存成功后可以继续编辑或返回列表
