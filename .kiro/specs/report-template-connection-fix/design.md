# 报告模板连接修复设计文档

## Overview

本设计文档描述报告模板页面网络连接失败的 bug 修复方案。该 bug 影响 ReportTemplateList.vue（报告模板列表页面）和 ReportTemplateEditor.vue（报告模板编辑器页面），导致用户无法加载报告模板数据和使用报告模板功能。

**Bug 根本原因**：这两个 Vue 组件文件中使用了 `http` 服务调用后端 API，但缺少 `import http from '@/services/http'` 导入语句，导致运行时 `http` 对象未定义。

**修复策略**：在两个组件文件的 `<script setup>` 部分添加 `import http from '@/services/http'` 导入语句，使组件能够正确访问 HTTP 服务。这是一个简单直接的修复，不涉及业务逻辑变更，只是补充缺失的依赖导入。

## Glossary

- **Bug_Condition (C)**: 组件使用 `http` 服务但未导入 - 当 Vue 组件调用 `http.get()`, `http.post()` 等方法但缺少 `import http from '@/services/http'` 语句时
- **Property (P)**: 组件能够成功调用 HTTP 服务方法 - 添加导入后，组件可以正常发送网络请求到后端 API
- **Preservation**: 其他已正确导入 `http` 服务的组件保持不变，HTTP 服务本身的实现和配置不受影响
- **http 服务**: 位于 `vue-project/src/services/http.ts` 的 HTTP 客户端封装，基于 Axios 实现，提供统一的请求/响应处理
- **ReportTemplateList.vue**: 报告模板列表页面组件，位于 `vue-project/src/views/report/ReportTemplateList.vue`
- **ReportTemplateEditor.vue**: 报告模板编辑器页面组件，位于 `vue-project/src/views/report/ReportTemplateEditor.vue`

## Bug Details

### Bug Condition

该 bug 在用户访问报告模板相关页面时触发。具体表现为：当用户打开报告模板列表页面或编辑器页面时，组件尝试调用 `http` 服务的方法（如 `http.get()`, `http.post()`, `http.put()`, `http.delete()`），但由于 `http` 对象未定义，导致 JavaScript 运行时错误，页面显示"网络连接失败"。

**形式化规范：**
```
FUNCTION isBugCondition(component)
  INPUT: component of type VueComponent
  OUTPUT: boolean
  
  RETURN component.usesHttpService = true 
         AND component.hasHttpImport = false
         AND component.callsHttpMethods = true
END FUNCTION
```

### Examples

**示例 1 - ReportTemplateList.vue 加载模板列表失败**
- **触发条件**：用户访问 `/report/templates` 路由
- **实际行为**：组件挂载时调用 `fetchTemplates()` 方法，该方法执行 `await http.get('/report-templates', { params })`，由于 `http` 未定义导致运行时错误
- **错误信息**：`Uncaught ReferenceError: http is not defined`
- **用户体验**：页面显示"网络连接失败"错误消息，无法加载模板列表

**示例 2 - ReportTemplateEditor.vue 保存模板失败**
- **触发条件**：用户在编辑器中点击"保存草稿"或"保存并启用"按钮
- **实际行为**：`handleSaveDraft()` 或 `handleSave()` 方法尝试调用 `await http.post('/report-templates', saveData)` 或 `await http.put('/report-templates/${formData.id}', saveData)`，由于 `http` 未定义导致运行时错误
- **错误信息**：`Uncaught ReferenceError: http is not defined`
- **用户体验**：保存操作失败，显示"保存失败"错误消息

**示例 3 - ReportTemplateList.vue 删除模板失败**
- **触发条件**：用户在模板列表中点击"删除"按钮并确认删除
- **实际行为**：`handleDelete()` 方法尝试调用 `await http.delete('/report-templates/${template.id}')`，由于 `http` 未定义导致运行时错误
- **错误信息**：`Uncaught ReferenceError: http is not defined`
- **用户体验**：删除操作失败，显示"删除模板失败"错误消息

**示例 4 - ReportTemplateEditor.vue 加载模板数据失败（编辑模式）**
- **触发条件**：用户访问 `/report/template-editor/:id` 路由编辑现有模板
- **实际行为**：组件挂载时调用 `loadTemplateData()` 方法，该方法执行 `await http.get('/report-templates/${route.params.id}')`，由于 `http` 未定义导致运行时错误
- **错误信息**：`Uncaught ReferenceError: http is not defined`
- **用户体验**：无法加载模板数据，页面自动跳转回列表页

## Expected Behavior

### Preservation Requirements

**不变的行为：**
- 其他已正确导入 `http` 服务的 Vue 组件（如 SampleManagement.vue, AuditTaskList.vue 等）必须继续正常工作
- HTTP 服务本身的实现（`vue-project/src/services/http.ts`）保持不变，包括拦截器、错误处理、认证逻辑等
- FastAPI 后端的报告模板路由（`/api/v1/report-templates`）保持不变
- 其他报告相关组件（ReportGenerator.vue, ReportDistribution.vue）保持不变
- HTTP 服务的配置（baseURL, timeout, headers）保持不变

**作用域：**
所有不涉及 ReportTemplateList.vue 和 ReportTemplateEditor.vue 的输入和操作应该完全不受此修复影响。这包括：
- 其他页面的网络请求
- HTTP 服务的全局配置和拦截器
- 后端 API 的实现和响应格式
- 其他组件对 `http` 服务的使用

## Hypothesized Root Cause

基于 bug 描述和代码分析，最可能的原因是：

1. **缺失导入语句**：开发过程中，在 `<script setup>` 部分编写了使用 `http` 服务的代码，但忘记添加 `import http from '@/services/http'` 导入语句
   - ReportTemplateList.vue 第 218 行有 `import http from '@/services/http'`，说明导入语句存在
   - ReportTemplateEditor.vue 第 363 行也有 `import http from '@/services/http'`，说明导入语句也存在
   - **重新分析**：查看代码发现两个文件都已经有导入语句，需要进一步检查

2. **重复的 script setup 块**：ReportTemplateEditor.vue 文件中存在两个 `<script setup>` 块
   - 第一个块（第 363-672 行）包含完整的实现和 `import http from '@/services/http'`
   - 第二个块（第 676-1006 行）是简化版本，**没有** `import http from '@/services/http'`
   - Vue 可能使用了第二个 script 块，导致 `http` 未定义

3. **代码合并冲突**：可能在代码合并或重构过程中，导入语句被意外删除或覆盖

4. **IDE 自动导入失败**：某些 IDE 的自动导入功能可能未能正确识别 `http` 服务的导入路径

## Correctness Properties

Property 1: Bug Condition - HTTP 服务导入修复

_For any_ Vue 组件，当该组件使用 `http` 服务调用后端 API（isBugCondition 返回 true）时，修复后的组件 SHALL 包含 `import http from '@/services/http'` 导入语句，能够成功调用 `http.get()`, `http.post()`, `http.put()`, `http.delete()` 等方法，不出现 `http is not defined` 运行时错误，网络请求能够正常发送到后端 API。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - 其他组件行为不变

_For any_ Vue 组件，当该组件已正确导入 `http` 服务或不使用 `http` 服务（isBugCondition 返回 false）时，修复后的代码 SHALL 产生与原始代码完全相同的行为，保持所有现有功能正常工作，包括网络请求、错误处理、数据处理等。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

基于根本原因分析，修复方案如下：

**文件 1**: `vue-project/src/views/report/ReportTemplateList.vue`

**当前状态**: 第 218 行已有 `import http from '@/services/http'`，但可能存在其他问题

**具体变更**:
1. **验证导入语句位置**：确认 `import http from '@/services/http'` 在 `<script setup>` 块的顶部，位于其他导入语句之后
2. **检查是否有多个 script 块**：确保只有一个 `<script setup>` 块
3. **如果导入语句缺失**：在 `<script setup>` 块中添加 `import http from '@/services/http'`，位置在其他服务导入之后、组件逻辑之前

**文件 2**: `vue-project/src/views/report/ReportTemplateEditor.vue`

**当前状态**: 存在两个 `<script setup>` 块，第一个块（第 363 行）有导入，第二个块（第 676 行）没有导入

**具体变更**:
1. **删除重复的 script 块**：删除第二个 `<script setup>` 块（第 676-1006 行），保留第一个完整的实现块
2. **验证导入语句**：确认第一个 `<script setup>` 块中的 `import http from '@/services/http'` 语句存在且位置正确
3. **如果第一个块也缺失导入**：在 `<script setup>` 块顶部添加 `import http from '@/services/http'`

**导入语句格式**:
```typescript
import http from '@/services/http'
```

**插入位置**（如果需要添加）:
- 在 `<script setup lang="ts">` 标签之后
- 在其他 import 语句之后（如 vue, vue-router, element-plus 等）
- 在类型导入（`import type`）之后
- 在组件逻辑代码（变量声明、函数定义）之前

## Testing Strategy

### Validation Approach

测试策略遵循两阶段方法：首先在未修复的代码上运行探索性测试以确认 bug 存在，然后验证修复后的代码能够正常工作并保持现有行为不变。

### Exploratory Bug Condition Checking

**目标**：在实施修复之前，在未修复的代码上运行测试以展示 bug。确认或反驳根本原因分析。如果反驳，需要重新假设原因。

**测试计划**：编写测试用例模拟用户访问报告模板页面的场景，在未修复的代码上运行这些测试，观察失败并理解根本原因。

**测试用例**:
1. **ReportTemplateList 加载测试**：模拟访问 `/report/templates` 路由，验证 `fetchTemplates()` 方法调用失败（未修复代码上会失败）
2. **ReportTemplateEditor 保存测试**：模拟在编辑器中保存模板，验证 `handleSave()` 方法调用失败（未修复代码上会失败）
3. **ReportTemplateList 删除测试**：模拟删除模板操作，验证 `handleDelete()` 方法调用失败（未修复代码上会失败）
4. **ReportTemplateEditor 加载测试**：模拟编辑模式下加载模板数据，验证 `loadTemplateData()` 方法调用失败（未修复代码上会失败）

**预期反例**:
- 所有涉及 `http` 服务调用的方法都会抛出 `ReferenceError: http is not defined` 错误
- 可能的原因：缺少导入语句、重复的 script 块、导入路径错误

### Fix Checking

**目标**：验证对于所有满足 bug 条件的输入，修复后的函数产生预期行为。

**伪代码：**
```
FOR ALL component WHERE isBugCondition(component) DO
  result := addHttpImport_fixed(component)
  ASSERT result.hasHttpImport = true
  ASSERT result.canCallHttpMethods = true
  ASSERT no_runtime_error(result)
END FOR
```

**测试方法**：
1. 验证导入语句存在：检查修复后的文件包含 `import http from '@/services/http'`
2. 验证方法调用成功：测试所有使用 `http` 服务的方法能够正常执行
3. 验证网络请求发送：使用 Mock 或实际后端验证请求能够发送到正确的 API 端点

### Preservation Checking

**目标**：验证对于所有不满足 bug 条件的输入，修复后的函数产生与原始函数相同的结果。

**伪代码：**
```
FOR ALL component WHERE NOT isBugCondition(component) DO
  ASSERT original(component) = fixed(component)
END FOR
```

**测试方法**：属性测试（Property-based testing）推荐用于保持性检查，因为：
- 它自动生成大量测试用例覆盖输入域
- 它能捕获手动单元测试可能遗漏的边界情况
- 它提供强有力的保证，确保所有非 bug 输入的行为保持不变

**测试计划**：首先在未修复的代码上观察其他组件的行为，然后编写属性测试捕获该行为。

**测试用例**:
1. **其他组件 HTTP 调用保持性**：观察 SampleManagement.vue, AuditTaskList.vue 等组件在未修复代码上正常工作，编写测试验证修复后继续正常工作
2. **HTTP 服务配置保持性**：观察 HTTP 服务的拦截器、错误处理在未修复代码上的行为，验证修复后行为相同
3. **后端 API 响应保持性**：观察后端 API 的响应格式和数据，验证修复后响应处理逻辑不变
4. **其他报告组件保持性**：观察 ReportGenerator.vue, ReportDistribution.vue 在未修复代码上的行为，验证修复后行为不变

### Unit Tests

- 测试 ReportTemplateList.vue 的 `fetchTemplates()` 方法能够成功调用 `http.get()`
- 测试 ReportTemplateEditor.vue 的 `handleSave()` 方法能够成功调用 `http.post()` 或 `http.put()`
- 测试 ReportTemplateList.vue 的 `handleDelete()` 方法能够成功调用 `http.delete()`
- 测试 ReportTemplateEditor.vue 的 `loadTemplateData()` 方法能够成功调用 `http.get()`
- 测试导入语句存在性：验证修复后的文件包含正确的导入语句
- 测试边界情况：空响应、错误响应、网络超时等

### Property-Based Tests

- 生成随机的模板数据，验证 ReportTemplateList 能够正确加载和显示
- 生成随机的保存操作，验证 ReportTemplateEditor 能够正确保存模板
- 生成随机的删除操作，验证删除功能正常工作
- 测试其他组件的 HTTP 调用在修复后继续产生相同的结果
- 测试 HTTP 服务的拦截器在各种场景下行为一致

### Integration Tests

- 测试完整的模板管理流程：创建 → 保存 → 列表显示 → 编辑 → 删除
- 测试从列表页跳转到编辑器页的完整流程
- 测试模板预览功能与 HTTP 服务的集成
- 测试错误处理：后端返回错误时的用户体验
- 测试与其他模块的集成：报告生成、报告分发等功能不受影响
