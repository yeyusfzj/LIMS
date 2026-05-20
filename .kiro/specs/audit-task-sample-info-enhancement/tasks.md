# 实现计划

- [x] 1. 编写bug条件探索测试
  - **Property 1: Bug Condition** - 审核任务查询返回不完整样品信息
  - **关键**: 此测试必须在未修复的代码上失败 - 失败确认bug存在
  - **不要在测试失败时尝试修复测试或代码**
  - **注意**: 此测试编码了预期行为 - 在实现后通过时将验证修复
  - **目标**: 暴露反例以演示bug存在
  - **作用域PBT方法**: 针对确定性bug,将属性作用域限定为具体的失败案例以确保可重现性
  - 测试listAuditTasks API返回的sample对象只包含4个基本字段(barcode、sampleNumber、sampleName、clientName)
  - 测试getAuditTask API返回的sample对象缺少testItems和results关联数据
  - 测试seed脚本执行后审核任务数量为0或只有1个
  - 测试断言应匹配设计文档中的预期行为属性(完整样品信息)
  - 在未修复的代码上运行测试
  - **预期结果**: 测试失败(这是正确的 - 证明bug存在)
  - 记录发现的反例以理解根本原因
  - 当测试编写完成、运行并记录失败时标记任务完成
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. 编写保留属性测试(在实现修复之前)
  - **Property 2: Preservation** - 非样品查询的审核操作
  - **重要**: 遵循观察优先方法
  - 在未修复的代码上观察非bug输入的行为
  - 编写基于属性的测试,捕获保留需求中的观察行为模式
  - 基于属性的测试生成许多测试用例以提供更强的保证
  - 测试submitForAudit(创建审核任务)在未修复代码上正常工作
  - 测试performAudit(执行审核决策)在未修复代码上正常工作
  - 测试reassignAuditTask(转交任务)在未修复代码上正常工作
  - 测试seed脚本创建其他数据(用户、角色、样品等)在未修复代码上正常工作
  - 在未修复的代码上运行测试
  - **预期结果**: 测试通过(这确认了要保留的基线行为)
  - 当测试编写完成、在未修复代码上运行并通过时标记任务完成
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 修复审核任务样品信息显示不完整问题

  - [x] 3.1 修改后端auditService.ts的查询方法
    - 修改listAuditTasks方法,将sample的select改为完整的include
    - 修改include配置: `include: { sample: { include: { testItems: true, results: true } } }`
    - 修改getAuditTask方法,使用相同的include配置
    - formatAuditTask方法保持不变(Prisma查询已包含完整信息)
    - _Bug_Condition: isBugCondition(input) where input.queryType IN ['listAuditTasks', 'getAuditTask'] AND 返回的sample对象字段不完整_
    - _Expected_Behavior: 返回的sample对象包含完整字段(sampleType, samplingDate, testItems, results等) from design_
    - _Preservation: 审核任务的基本查询逻辑、审核决策流程、其他种子数据创建 from design_
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 3.2 在seed.ts中添加审核任务示例数据
    - 在创建样品数据之后添加审核任务创建逻辑
    - 创建至少3个不同状态的审核任务(PENDING、APPROVED、REJECTED)
    - 每个审核任务关联到已创建的样品(确保样品状态为IN_AUDIT或AUDIT_COMPLETE)
    - 设置不同的审核级别(1、2、3)
    - 为已完成的审核任务设置decision、comments和completedAt
    - _Bug_Condition: 执行seed脚本后审核任务数量为0或只有1个_
    - _Expected_Behavior: 创建至少3个不同状态的审核任务示例数据_
    - _Preservation: 其他种子数据(用户、角色、样品等)的创建逻辑保持不变_
    - _Requirements: 1.3, 2.3_

  - [x] 3.3 更新前端类型定义
    - 修改vue-project/src/types/audit.ts中的AuditTask接口
    - 扩展sample字段类型,添加sampleType、samplingDate、samplingLocation等字段
    - 添加testItems数组类型定义(包含testMethod、testStandard、status等)
    - 添加results数组类型定义(包含parameter、value、unit、method等)
    - 确保类型定义与后端返回的数据结构一致
    - _Requirements: 2.4, 2.5_

  - [x] 3.4 修改前端AuditTaskList.vue组件
    - 在表格中添加"样品类型"列,显示row.sample.sampleType
    - 在"样品信息"列中添加客户名称显示
    - 添加"采样日期"列,使用formatDate格式化显示
    - 确保表格列宽度和响应式布局合理
    - _Bug_Condition: 前端无法显示样品类型、客户名称、采样日期_
    - _Expected_Behavior: 正确展示样品的基本信息字段_
    - _Preservation: 审核操作按钮和表单的交互逻辑保持不变_
    - _Requirements: 1.4, 2.4_

  - [x] 3.5 修改前端AuditTaskDetail.vue组件
    - 扩展样品信息卡片,添加样品类型、样品分类、数量、单位字段
    - 添加采样信息显示区域(采样日期、采样地点、采样人员)
    - 添加存储信息显示(存储位置、存储条件)
    - 添加检测项目表格,显示testItems数组(检测方法、检测标准、状态、负责人)
    - 扩展检测结果表格,确保显示完整的results数据
    - 处理可选字段为空的情况,显示"-"或默认值
    - _Bug_Condition: 前端无法显示采样信息、检测项目、检测结果_
    - _Expected_Behavior: 正确展示样品的完整详细信息_
    - _Preservation: 审核操作按钮和表单的交互逻辑保持不变_
    - _Requirements: 1.5, 2.5_

  - [x] 3.6 验证bug条件探索测试现在通过
    - **Property 1: Expected Behavior** - 审核任务查询返回完整样品信息
    - **重要**: 重新运行任务1中的相同测试 - 不要编写新测试
    - 任务1中的测试编码了预期行为
    - 当此测试通过时,确认预期行为得到满足
    - 运行任务1中的bug条件探索测试
    - **预期结果**: 测试通过(确认bug已修复)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.7 验证保留测试仍然通过
    - **Property 2: Preservation** - 非样品查询的审核操作
    - **重要**: 重新运行任务2中的相同测试 - 不要编写新测试
    - 运行任务2中的保留属性测试
    - **预期结果**: 测试通过(确认没有回归)
    - 确认修复后所有测试仍然通过(没有回归)

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有问题请询问用户
