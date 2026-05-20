# 登录429错误修复实现计划

- [x] 1. 编写bug条件探索测试
  - **Property 1: Bug Condition** - 登录限流友好错误响应
  - **重要**: 此测试必须在未修复代码上失败 - 失败确认bug存在
  - **不要尝试修复测试或代码当它失败时**
  - **注意**: 此测试编码了期望行为 - 它将在实现后通过时验证修复
  - **目标**: 暴露演示bug存在的反例
  - **作用域PBT方法**: 对于确定性bug，将属性作用域限定为具体失败案例以确保可重现性
  - 测试实现来自设计中Bug Condition的详细信息
  - 测试断言应匹配设计中的期望行为属性
  - 在未修复代码上运行测试
  - **预期结果**: 测试失败（这是正确的 - 它证明bug存在）
  - 记录发现的反例以理解根本原因
  - 当测试编写、运行并记录失败时标记任务完成
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. 编写保持不变属性测试（在实现修复之前）
  - **Property 2: Preservation** - 非限流场景行为
  - **重要**: 遵循观察优先方法
  - 在未修复代码上观察非bug输入的行为
  - 从设计中的保持不变需求编写捕获观察行为模式的基于属性的测试
  - 基于属性的测试生成许多测试用例以提供更强保证
  - 在未修复代码上运行测试
  - **预期结果**: 测试通过（这确认了要保持的基线行为）
  - 当测试编写、在未修复代码上运行并通过时标记任务完成
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. 登录429错误修复

  - [x] 3.1 实现后端限流响应增强
    - 修改`backend-api/src/middleware/rateLimitMiddleware.ts`中的`loginRateLimiter`配置
    - 添加`onLimitReached`回调设置Retry-After响应头
    - 在响应体中包含`retryAfter`秒数和友好的中文错误消息
    - 提供具体的等待时间信息和重试建议
    - _Bug_Condition: isBugCondition(input) 来自设计_
    - _Expected_Behavior: expectedBehavior(result) 来自设计_
    - _Preservation: 设计中的保持不变需求_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 实现前端HTTP客户端429错误处理
    - 修改`vue-project/src/services/http.ts`中的`handleError`方法
    - 添加429状态码的专门处理逻辑
    - 解析Retry-After头信息和响应体中的retryAfter字段
    - 返回包含等待时间的结构化错误对象
    - _Bug_Condition: isBugCondition(input) 来自设计_
    - _Expected_Behavior: expectedBehavior(result) 来自设计_
    - _Preservation: 设计中的保持不变需求_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.3 实现登录页面限流UI处理
    - 修改`vue-project/src/views/Login.vue`中的`handleLogin`方法
    - 添加429错误的特殊UI处理逻辑
    - 实现倒计时显示组件
    - 添加自动重试选项
    - 在倒计时结束后重新启用登录按钮
    - _Bug_Condition: isBugCondition(input) 来自设计_
    - _Expected_Behavior: expectedBehavior(result) 来自设计_
    - _Preservation: 设计中的保持不变需求_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [ ] 3.4 验证bug条件探索测试现在通过
    - **Property 1: Expected Behavior** - 登录限流友好错误响应
    - **重要**: 重新运行步骤1中的相同测试 - 不要编写新测试
    - 步骤1中的测试编码了期望行为
    - 当此测试通过时，它确认期望行为得到满足
    - 运行步骤1中的bug条件探索测试
    - **预期结果**: 测试通过（确认bug已修复）
    - _Requirements: 设计中的期望行为属性_

  - [ ] 3.5 验证保持不变测试仍然通过
    - **Property 2: Preservation** - 非限流场景行为
    - **重要**: 重新运行步骤2中的相同测试 - 不要编写新测试
    - 运行步骤2中的保持不变属性测试
    - **预期结果**: 测试通过（确认无回归）
    - 确认修复后所有测试仍然通过（无回归）

- [ ] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。