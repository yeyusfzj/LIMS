# 实施计划

- [x] 1. 编写 bug condition 探索测试
  - **Property 1: Bug Condition** - HTTP 服务未定义错误
  - **关键要求**：此测试必须在未修复的代码上失败 - 失败确认 bug 存在
  - **不要在测试失败时尝试修复测试或代码**
  - **注意**：此测试编码了预期行为 - 它将在实施后通过时验证修复
  - **目标**：展示导致 bug 存在的反例
  - **作用域 PBT 方法**：对于确定性 bug，将属性作用域限定为具体的失败案例以确保可重现性
  - 测试 ReportTemplateList.vue 中的 `fetchTemplates()` 方法在未修复代码上调用 `http.get()` 时抛出 `ReferenceError: http is not defined`
  - 测试 ReportTemplateEditor.vue 中的 `handleSave()` 方法在未修复代码上调用 `http.post()` 或 `http.put()` 时抛出 `ReferenceError: http is not defined`
  - 测试 ReportTemplateEditor.vue 中的 `loadTemplateData()` 方法在未修复代码上调用 `http.get()` 时抛出 `ReferenceError: http is not defined`
  - 测试断言应匹配设计文档中的预期行为属性
  - 在未修复的代码上运行测试
  - **预期结果**：测试失败（这是正确的 - 它证明 bug 存在）
  - 记录发现的反例以理解根本原因
  - 当测试编写、运行并记录失败时，标记任务完成
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 编写保持性属性测试（在实施修复之前）
  - **Property 2: Preservation** - 其他组件 HTTP 调用保持不变
  - **重要**：遵循观察优先方法
  - 观察未修复代码上其他已正确导入 `http` 服务的组件（如 SampleManagement.vue, AuditTaskList.vue）的行为
  - 编写属性测试捕获保持性需求中观察到的行为模式
  - 推荐使用属性测试以获得更强的保持性保证
  - 在未修复的代码上运行测试
  - **预期结果**：测试通过（这确认了要保持的基线行为）
  - 当测试编写、运行并在未修复代码上通过时，标记任务完成
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 修复报告模板连接问题

  - [x] 3.1 修复 ReportTemplateEditor.vue 的重复 script 块问题
    - 删除第二个 `<script setup>` 块（第 676-1006 行）
    - 保留第一个完整的 `<script setup>` 块（第 363-672 行），该块包含 `import http from '@/services/http'`
    - 验证第一个块中的导入语句位置正确（在其他导入之后，组件逻辑之前）
    - _Bug_Condition: isBugCondition(component) where component.usesHttpService = true AND component.hasHttpImport = false_
    - _Expected_Behavior: component.hasHttpImport = true AND component.canCallHttpMethods = true AND no_runtime_error(component)_
    - _Preservation: 其他已正确导入 http 服务的组件保持不变，HTTP 服务本身的实现和配置保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 验证 ReportTemplateList.vue 的导入语句
    - 确认第 218 行的 `import http from '@/services/http'` 存在且位置正确
    - 确保只有一个 `<script setup>` 块
    - 如果导入语句缺失或位置不正确，进行修正
    - _Bug_Condition: isBugCondition(component) where component.usesHttpService = true AND component.hasHttpImport = false_
    - _Expected_Behavior: component.hasHttpImport = true AND component.canCallHttpMethods = true AND no_runtime_error(component)_
    - _Preservation: 其他已正确导入 http 服务的组件保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 验证 bug condition 探索测试现在通过
    - **Property 1: Expected Behavior** - HTTP 服务正常工作
    - **重要**：重新运行任务 1 中的相同测试 - 不要编写新测试
    - 任务 1 中的测试编码了预期行为
    - 当此测试通过时，它确认预期行为得到满足
    - 运行任务 1 中的 bug condition 探索测试
    - **预期结果**：测试通过（确认 bug 已修复）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 验证保持性测试仍然通过
    - **Property 2: Preservation** - 其他组件行为不变
    - **重要**：重新运行任务 2 中的相同测试 - 不要编写新测试
    - 运行任务 2 中的保持性属性测试
    - **预期结果**：测试通过（确认没有回归）
    - 确认修复后所有测试仍然通过（没有回归）

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。
