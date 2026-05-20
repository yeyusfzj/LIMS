# 需求文档 - 实验室智能管理系统

## 简介

实验室智能管理系统（Laboratory Management System）是一个基于 Vue 的前端应用，旨在为实验室提供全面的样品管理、检测流程控制、结果处理、质量审核和报告发布功能。系统支持样品全生命周期追踪、可配置化工作流、多级审核机制和自动化报告生成。

## 术语表

- **System**: 实验室智能管理系统
- **Sample**: 样品，实验室接收并处理的物理或虚拟检测对象
- **Barcode**: 条码，用于唯一标识样品的编码
- **SOP**: 标准操作程序（Standard Operating Procedure）
- **Chain_of_Custody**: 监管链，记录样品流转的完整历史
- **Workflow**: 工作流，定义检测过程的步骤序列
- **Test_Result**: 检测结果，样品检测后产生的数据
- **Audit**: 审核，对检测结果和样品状态的质量检查
- **Report**: 报告，包含检测结果和结论的正式文档
- **User**: 用户，使用系统的实验室工作人员
- **Administrator**: 管理员，具有系统配置权限的用户

## 需求

### 需求 1：样品登记与标识

**用户故事：** 作为实验室接样员，我希望能够登记新样品并生成唯一条码，以便准确追踪每个样品。

#### 验收标准

1. WHEN 用户输入样品基本信息（名称、来源、委托方、接收日期）并提交 THEN THE System SHALL 创建新样品记录并生成唯一条码
2. WHEN 生成条码 THEN THE System SHALL 确保条码在系统中的唯一性
3. WHEN 样品登记完成 THEN THE System SHALL 显示条码并支持打印功能
4. WHEN 用户扫描或输入条码 THEN THE System SHALL 快速检索并显示对应样品信息
5. THE System SHALL 记录样品登记的时间戳和操作人员信息

### 需求 2：样品分样与合样

**用户故事：** 作为实验室技术员，我希望能够对样品进行分样或合样操作，以便满足不同检测项目的需求。

#### 验收标准

1. WHEN 用户选择一个样品并执行分样操作 THEN THE System SHALL 创建多个子样品并保持与母样品的关联关系
2. WHEN 创建子样品 THEN THE System SHALL 为每个子样品生成新的唯一条码
3. WHEN 用户选择多个样品并执行合样操作 THEN THE System SHALL 创建一个新的合并样品并记录来源样品
4. WHEN 分样或合样完成 THEN THE System SHALL 更新所有相关样品的状态和关联关系
5. THE System SHALL 在样品详情中显示分样/合样的历史记录

### 需求 3：样品流转与位置管理

**用户故事：** 作为实验室管理员，我希望能够追踪样品的流转路径和当前位置，以便快速定位样品并确保样品安全。

#### 验收标准

1. WHEN 样品位置发生变化 THEN THE System SHALL 记录新位置、时间戳和操作人员
2. WHEN 用户查询样品 THEN THE System SHALL 显示样品当前位置和保存条件（温度、湿度等）
3. THE System SHALL 维护完整的样品流转历史记录（Chain of Custody）
4. WHEN 样品在不同实验室区域或人员间交接 THEN THE System SHALL 要求双方确认并记录交接信息
5. THE System SHALL 支持按位置、状态或时间范围查询样品

### 需求 4：检测方法与 SOP 管理

**用户故事：** 作为实验室主管，我希望能够配置检测方法和 SOP，以便标准化检测流程并确保操作一致性。

#### 验收标准

1. THE System SHALL 支持创建和编辑检测方法库
2. WHEN 创建检测方法 THEN THE System SHALL 允许定义方法名称、步骤序列、所需设备和预期时长
3. THE System SHALL 支持将 SOP 文档关联到检测方法
4. WHEN 用户查看检测方法 THEN THE System SHALL 显示完整的步骤列表和相关 SOP
5. THE System SHALL 支持检测方法的版本控制和历史记录

### 需求 5：可配置化工作流

**用户故事：** 作为实验室管理员，我希望能够配置不同类型检测的工作流，以便适应不同实验室的流程需求。

#### 验收标准

1. THE System SHALL 提供工作流配置界面，支持拖拽式节点编排
2. WHEN 配置工作流 THEN THE System SHALL 允许定义节点类型（检测、审核、等待等）、节点顺序和条件分支
3. THE System SHALL 支持为不同样品类型或检测项目分配不同的工作流模板
4. WHEN 工作流节点包含条件分支 THEN THE System SHALL 根据条件自动路由到相应分支
5. THE System SHALL 验证工作流配置的完整性（无死循环、无孤立节点）

### 需求 6：自动派工与任务分配

**用户故事：** 作为实验室调度员，我希望系统能够自动分配检测任务，以便优化资源利用和工作效率。

#### 验收标准

1. WHEN 样品进入检测流程 THEN THE System SHALL 根据工作流配置自动创建检测任务
2. THE System SHALL 支持基于规则的自动派工（按人员技能、工作负载、设备可用性等）
3. WHEN 自动派工无法完成 THEN THE System SHALL 提示管理员手动分配
4. WHEN 任务分配给人员 THEN THE System SHALL 在该人员的任务列表中显示新任务
5. THE System SHALL 支持任务优先级设置和紧急任务标记

### 需求 7：检测节点控制

**用户故事：** 作为实验室技术员，我希望能够按照工作流节点执行检测任务，以便确保流程规范性。

#### 验收标准

1. WHEN 用户打开检测任务 THEN THE System SHALL 显示当前节点的操作指引和 SOP
2. THE System SHALL 只允许用户操作当前激活的工作流节点
3. WHEN 用户完成当前节点操作 THEN THE System SHALL 验证必填信息并允许提交
4. WHEN 节点提交成功 THEN THE System SHALL 自动激活下一个节点或触发派工
5. THE System SHALL 记录每个节点的开始时间、完成时间和操作人员

### 需求 8：结果录入（手工与自动）

**用户故事：** 作为实验室分析员，我希望能够录入检测结果或从仪器自动导入结果，以便高效完成数据采集。

#### 验收标准

1. THE System SHALL 提供表单界面供用户手工录入检测结果
2. WHEN 手工录入结果 THEN THE System SHALL 根据检测方法验证数据格式和范围
3. THE System SHALL 支持从仪器设备自动导入结果数据（通过文件上传或接口）
4. WHEN 自动导入结果 THEN THE System SHALL 解析数据并映射到对应的样品和检测项
5. THE System SHALL 记录结果录入的时间戳、来源（手工/自动）和操作人员

### 需求 9：公式计算与结果处理

**用户故事：** 作为实验室分析员，我希望系统能够自动计算衍生结果，以便减少手工计算错误。

#### 验收标准

1. THE System SHALL 支持为检测项配置计算公式（使用原始结果和常量）
2. WHEN 原始结果录入完成 THEN THE System SHALL 自动执行公式计算并显示计算结果
3. THE System SHALL 支持常见数学函数（加减乘除、平方根、对数等）
4. WHEN 计算公式引用的数据缺失或无效 THEN THE System SHALL 标记计算失败并提示用户
5. THE System SHALL 允许用户查看计算公式和中间计算过程

### 需求 10：异常标记与复测

**用户故事：** 作为实验室分析员，我希望能够标记异常结果并申请复测，以便确保数据准确性。

#### 验收标准

1. WHEN 用户发现异常结果 THEN THE System SHALL 允许标记异常并输入异常原因
2. THE System SHALL 支持自动异常检测（超出正常范围、与历史数据偏差过大等）
3. WHEN 结果被标记为异常 THEN THE System SHALL 允许用户申请复测
4. WHEN 复测申请提交 THEN THE System SHALL 创建新的检测任务并关联到原样品
5. THE System SHALL 在样品历史中记录所有异常标记和复测记录

### 需求 11：留样管理

**用户故事：** 作为实验室管理员，我希望能够管理留样信息，以便满足质量追溯和法规要求。

#### 验收标准

1. WHEN 样品检测完成 THEN THE System SHALL 允许用户标记样品为留样状态
2. THE System SHALL 记录留样的位置、保存条件和预期保存期限
3. WHEN 留样期限临近 THEN THE System SHALL 提醒相关人员处理留样
4. THE System SHALL 支持留样的延期、销毁或转移操作
5. THE System SHALL 维护留样的完整历史记录

### 需求 12：多级审核机制

**用户故事：** 作为实验室质量负责人，我希望能够实施多级审核流程，以便确保结果质量和合规性。

#### 验收标准

1. THE System SHALL 支持配置多级审核流程（分析审核、样品审核、技术审核等）
2. WHEN 检测结果提交审核 THEN THE System SHALL 按配置的顺序分配给审核人员
3. WHEN 审核人员打开审核任务 THEN THE System SHALL 显示完整的样品信息、检测结果和历史记录
4. THE System SHALL 允许审核人员通过、退回或要求补充信息
5. WHEN 审核退回 THEN THE System SHALL 通知原操作人员并记录退回原因

### 需求 13：质量判定

**用户故事：** 作为实验室质量人员，我希望系统能够自动进行质量判定并支持人工复核，以便高效完成质量评估。

#### 验收标准

1. THE System SHALL 支持配置质量判定规则（基于结果范围、标准限值等）
2. WHEN 检测结果完成 THEN THE System SHALL 自动执行质量判定并标记合格/不合格
3. THE System SHALL 允许质量人员查看自动判定结果并进行人工复核
4. WHEN 人工判定与自动判定不一致 THEN THE System SHALL 要求输入判定依据
5. THE System SHALL 记录所有判定结果和判定依据

### 需求 14：样品放行与退回

**用户故事：** 作为实验室负责人，我希望能够对样品进行最终放行或退回决策，以便控制样品流出。

#### 验收标准

1. WHEN 所有审核和判定完成 THEN THE System SHALL 允许授权人员执行放行或退回操作
2. THE System SHALL 验证样品是否满足放行条件（所有必需审核已完成、质量判定合格等）
3. WHEN 样品放行 THEN THE System SHALL 更新样品状态并记录放行时间和人员
4. WHEN 样品退回 THEN THE System SHALL 要求输入退回原因并通知相关人员
5. THE System SHALL 支持批量放行功能（对多个样品同时放行）

### 需求 15：报告模板管理

**用户故事：** 作为实验室管理员，我希望能够创建和管理报告模板，以便生成标准化的检测报告。

#### 验收标准

1. THE System SHALL 提供报告模板编辑器，支持富文本和变量占位符
2. WHEN 创建报告模板 THEN THE System SHALL 允许定义模板名称、适用范围和版本
3. THE System SHALL 支持在模板中插入动态数据（样品信息、检测结果、图表等）
4. THE System SHALL 支持模板预览功能
5. THE System SHALL 支持报告模板的版本控制和历史记录

### 需求 16：报告生成与电子签名

**用户故事：** 作为实验室报告员，我希望能够基于模板生成报告并添加电子签名，以便快速发布正式报告。

#### 验收标准

1. WHEN 用户选择样品并选择报告模板 THEN THE System SHALL 自动填充数据并生成报告预览
2. THE System SHALL 允许用户在生成报告前编辑和调整内容
3. THE System SHALL 支持多人电子签名（编制、审核、批准等角色）
4. WHEN 添加电子签名 THEN THE System SHALL 验证签名人员的身份和权限
5. WHEN 所有必需签名完成 THEN THE System SHALL 锁定报告内容并生成最终版本

### 需求 17：报告分发与回收

**用户故事：** 作为实验室报告管理员，我希望能够分发报告给客户并追踪报告状态，以便管理报告生命周期。

#### 验收标准

1. WHEN 报告生成完成 THEN THE System SHALL 允许用户选择分发方式（邮件、下载、打印等）
2. THE System SHALL 记录报告分发的时间、接收方和分发方式
3. THE System SHALL 支持报告回收功能（撤回已分发的报告）
4. WHEN 报告被回收 THEN THE System SHALL 通知接收方并记录回收原因
5. THE System SHALL 维护报告的完整分发和回收历史

### 需求 18：统计报表

**用户故事：** 作为实验室管理者，我希望能够查看统计报表，以便了解实验室运营状况和绩效指标。

#### 验收标准

1. THE System SHALL 提供预定义的统计报表（样品数量、检测周期、合格率等）
2. THE System SHALL 支持按时间范围、样品类型、检测项目等维度筛选数据
3. THE System SHALL 以图表形式展示统计数据（柱状图、折线图、饼图等）
4. THE System SHALL 支持导出统计报表为 Excel 或 PDF 格式
5. THE System SHALL 允许管理员自定义统计报表的指标和维度

### 需求 19：用户权限管理

**用户故事：** 作为系统管理员，我希望能够管理用户权限，以便控制不同角色的操作范围。

#### 验收标准

1. THE System SHALL 支持创建和管理用户账户
2. THE System SHALL 支持基于角色的权限控制（接样员、技术员、审核员、管理员等）
3. WHEN 分配角色给用户 THEN THE System SHALL 自动授予该角色对应的权限
4. THE System SHALL 支持细粒度权限控制（功能模块级别和数据级别）
5. THE System SHALL 记录所有权限变更的历史

### 需求 20：系统日志与审计

**用户故事：** 作为质量管理员，我希望系统能够记录所有关键操作，以便进行审计和问题追溯。

#### 验收标准

1. THE System SHALL 记录所有关键操作（样品登记、结果录入、审核、报告发布等）
2. WHEN 记录操作日志 THEN THE System SHALL 包含时间戳、操作人员、操作类型和操作对象
3. THE System SHALL 支持按时间、用户、操作类型等条件查询日志
4. THE System SHALL 确保日志数据的完整性和不可篡改性
5. THE System SHALL 支持导出日志数据用于外部审计
