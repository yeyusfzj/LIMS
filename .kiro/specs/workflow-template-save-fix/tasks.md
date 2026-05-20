# 工作流模板保存功能修复 - 实现任务

- [x] 1. 编写 Bug Condition 探索性测试（修复前运行）
  - **Property 1: Bug Condition** - 保存对话框和 API 调用缺失
  - **重要**: 在未修复的代码上编写并运行此测试
  - **目标**: 展示缺陷的反例，确认保存功能确实存在问题
  - **范围化 PBT 方法**: 针对具体失败场景 - 用户点击保存按钮时应显示对话框并发送 API 请求
  - 测试实现细节：
    - 模拟用户在工作流设计器中添加节点
    - 模拟用户点击保存按钮
    - 断言应该显示保存对话框（从 Bug Condition 规范：isBugCondition1 和 isBugCondition2）
    - 断言应该发送 HTTP POST 请求到 `/api/workflows`
    - 断言成功时应显示成功提示，失败时应显示错误信息
  - 在未修复的代码上运行测试
  - **预期结果**: 测试失败（这是正确的 - 证明缺陷存在）
  - 记录反例：
    - 点击保存按钮时没有显示对话框
    - 没有发送 HTTP 请求，只是打印到控制台
    - 用户无法输入模板名称和描述
  - 完成标准：测试已编写、已运行、失败已记录
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. 编写 Preservation 保持测试（修复前运行）
  - **Property 2: Preservation** - 非保存操作行为保持不变
  - **重要**: 遵循观察优先方法
  - 观察步骤：
    - 在未修复的代码上测试节点拖拽功能 → 记录正常工作
    - 在未修复的代码上测试节点连接功能 → 记录正常工作
    - 在未修复的代码上测试节点配置功能 → 记录正常工作
    - 在未修复的代码上测试节点删除功能 → 记录正常工作
    - 在未修复的代码上测试验证功能 → 记录正常工作
    - 在未修复的代码上测试预览功能 → 记录正常工作
    - 在未修复的代码上测试画布操作（缩放、重置）→ 记录正常工作
  - 编写基于属性的测试捕获观察到的行为模式（从设计文档的 Preservation Requirements）：
    - 对于所有非保存按钮点击的操作，行为应该与原始代码完全相同
    - 节点拖拽、连接、配置、删除功能应该继续正常工作
    - 工作流验证和预览功能应该继续正常工作
    - 画布缩放和重置功能应该继续正常工作
  - 基于属性的测试生成多个测试用例以提供更强的保证
  - 在未修复的代码上运行测试
  - **预期结果**: 测试通过（确认基线行为需要保持）
  - 完成标准：测试已编写、已在未修复代码上运行并通过
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 修复工作流模板保存功能

  - [x] 3.1 添加保存对话框组件和状态管理
    - 在 WorkflowDesigner.vue 中添加响应式变量：
      - `saveDialogVisible: boolean` - 控制对话框显示/隐藏
      - `templateForm: { name: string, description: string }` - 存储用户输入
      - `formRules` - 表单验证规则（名称必填、长度限制等）
    - 在模板中添加 `el-dialog` 组件：
      - 包含表单字段：模板名称（必填）、模板描述（可选）
      - 包含操作按钮：确定、取消
      - 添加表单验证提示
    - _Bug_Condition: isBugCondition1(action) 和 isBugCondition2(action) - 用户点击保存按钮时应显示对话框_
    - _Expected_Behavior: 显示模态对话框让用户输入模板名称和描述（从设计文档的 expectedBehavior）_
    - _Preservation: 不影响节点拖拽、连接、配置、删除、验证、预览、画布操作等功能_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 修改 handleSave 函数显示对话框
    - 移除当前的 `console.log('保存工作流:', workflow)` 语句
    - 保留节点数量检查逻辑（已存在）
    - 添加逻辑：设置 `saveDialogVisible = true` 显示对话框
    - 重置表单数据为空值
    - _Bug_Condition: 当前只打印到控制台，没有显示对话框_
    - _Expected_Behavior: 显示对话框而不是直接保存_
    - _Preservation: 保持节点数量检查和警告提示功能_
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 实现 handleConfirmSave 函数调用后端 API
    - 创建新函数 `handleConfirmSave`
    - 验证表单输入（使用 Element Plus 表单验证）
    - 构建符合后端 API 要求的请求数据：
      ```typescript
      {
        name: templateForm.name,
        description: templateForm.description,
        definition: workflow, // 当前工作流配置
        isActive: true
      }
      ```
    - 导入并使用 `http` 服务发送请求：
      ```typescript
      await http.post('/api/workflows', data)
      ```
    - 处理成功响应：
      - 显示成功提示消息
      - 关闭对话框
      - 可选：询问用户是否返回模板列表或继续编辑
    - 处理错误响应：
      - 403 错误：显示"权限不足，请联系管理员"
      - 400 错误：显示具体的验证错误信息
      - 500 错误：显示"服务器错误，请稍后重试"
      - 保留用户输入的表单数据（不关闭对话框）
    - _Bug_Condition: 当前没有 API 调用，可能遇到 403 错误_
    - _Expected_Behavior: 成功保存到后端并显示适当的反馈_
    - _Preservation: 不影响其他功能_
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 3.4 检查并修复后端权限配置（如需要）
    - 检查 `backend-api/src/routes/workflowRoutes.ts` 中的权限配置
    - 确认 POST `/api/workflows` 路由使用 `requirePermission('workflow', 'create')`
    - 检查测试用户是否具有 `workflow:create` 权限
    - 如果需要，在 `prisma/seed.ts` 中为测试用户添加该权限
    - 验证权限中间件正确工作
    - _Bug_Condition: 可能的 403 错误原因是权限配置问题_
    - _Expected_Behavior: 用户应该能够成功保存模板（如果有权限）_
    - _Preservation: 不影响其他 API 端点的权限配置_
    - _Requirements: 2.1_

  - [x] 3.5 验证 Bug Condition 探索性测试现在通过
    - **Property 1: Expected Behavior** - 保存对话框和 API 调用正常工作
    - **重要**: 重新运行任务 1 中的相同测试 - 不要编写新测试
    - 任务 1 的测试编码了期望的行为
    - 当此测试通过时，确认期望行为已满足
    - 运行 Bug Condition 探索性测试
    - **预期结果**: 测试通过（确认缺陷已修复）
    - 验证：
      - 点击保存按钮时显示对话框
      - 输入模板信息后发送 HTTP 请求
      - 成功时显示成功提示
      - 失败时显示具体错误信息
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 验证 Preservation 保持测试仍然通过
    - **Property 2: Preservation** - 非保存操作行为保持不变
    - **重要**: 重新运行任务 2 中的相同测试 - 不要编写新测试
    - 运行 Preservation 保持测试
    - **预期结果**: 测试通过（确认没有回归）
    - 确认修复后所有测试仍然通过（没有回归）：
      - 节点拖拽功能正常
      - 节点连接功能正常
      - 节点配置功能正常
      - 节点删除功能正常
      - 验证功能正常
      - 预览功能正常
      - 画布操作正常
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - 确保所有测试通过
  - 运行所有单元测试和集成测试
  - 验证 Bug Condition 测试通过（缺陷已修复）
  - 验证 Preservation 测试通过（没有回归）
  - 手动测试完整的保存流程：
    - 创建工作流 → 点击保存 → 输入名称和描述 → 提交 → 验证成功保存
    - 测试错误场景：空名称、网络错误、权限不足等
  - 如有问题，请咨询用户
