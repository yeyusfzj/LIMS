# 需求文档

## 介绍

本功能旨在为实验室管理系统提供测试数据填充能力，确保在开发和演示阶段，所有页面都能展示完整的功能和数据，避免空白页面影响用户体验和功能测试。系统将提供一个统一的数据填充工具，能够为各个模块生成合理的测试数据。

## 术语表

- **Data_Seeder**: 数据填充器，负责生成和插入测试数据的系统组件
- **Test_Data**: 测试数据，用于开发、测试和演示目的的模拟数据
- **Sample_Transfer**: 样品流转，样品在不同地点或人员之间的转移记录
- **Audit_Statistics**: 审核统计，审核任务的各类统计分析数据
- **Report_Template**: 报告模板，用于生成检测报告的模板
- **Workflow_Instance**: 工作流实例，基于工作流模板创建的具体执行实例
- **Quality_Judgment**: 质量判定，对样品检测结果的合格性判断
- **Distribution_Record**: 分发记录，报告分发给客户的记录
- **Seeding_Script**: 填充脚本，执行数据填充的可执行脚本

## 需求

### 需求 1: 样品流转数据填充

**用户故事:** 作为开发人员，我想要为样品流转页面生成测试数据，以便能够测试和演示流转管理功能。

#### 验收标准

1. THE Data_Seeder SHALL 为每个已存在的样品生成至少 2 条流转记录
2. WHEN 生成流转记录时，THE Data_Seeder SHALL 包含所有必需字段（发出地点、接收地点、发出人、接收人、流转日期）
3. THE Data_Seeder SHALL 生成不同状态的流转记录（PENDING、IN_TRANSIT、RECEIVED、REJECTED）
4. THE Data_Seeder SHALL 为流转记录设置合理的时间序列（流转日期早于接收日期）
5. THE Data_Seeder SHALL 为部分流转记录设置发送方和接收方的确认状态

### 需求 2: 审核统计数据填充

**用户故事:** 作为开发人员，我想要为审核统计报表页面生成测试数据，以便能够测试和演示统计分析功能。

#### 验收标准

1. THE Data_Seeder SHALL 生成至少 50 条审核任务记录以支持统计分析
2. THE Data_Seeder SHALL 生成涵盖不同审核级别（1级、2级、3级）的审核任务
3. THE Data_Seeder SHALL 生成不同状态的审核任务（PENDING、IN_PROGRESS、APPROVED、REJECTED）
4. THE Data_Seeder SHALL 为已完成的审核任务设置合理的时长（提交时间到完成时间）
5. THE Data_Seeder SHALL 为退回的审核任务设置退回原因
6. THE Data_Seeder SHALL 确保审核任务关联到有效的样品和审核人员

### 需求 3: 报告模板数据填充

**用户故事:** 作为开发人员，我想要为报告模板页面生成测试数据，以便能够测试和演示报告生成功能。

#### 验收标准

1. THE Data_Seeder SHALL 生成至少 5 个不同类别的报告模板
2. THE Data_Seeder SHALL 为每个报告模板设置完整的 HTML 内容和变量定义
3. THE Data_Seeder SHALL 生成不同状态的报告模板（DRAFT、ACTIVE、ARCHIVED）
4. THE Data_Seeder SHALL 确保至少有 2 个激活状态的报告模板可供使用
5. THE Data_Seeder SHALL 为报告模板设置合理的类别（水质检测报告、土壤检测报告、食品检测报告等）

### 需求 4: 工作流实例数据填充

**用户故事:** 作为开发人员，我想要为工作流管理页面生成测试数据，以便能够测试和演示工作流执行功能。

#### 验收标准

1. THE Data_Seeder SHALL 为已存在的工作流模板生成至少 10 个工作流实例
2. THE Data_Seeder SHALL 生成不同状态的工作流实例（RUNNING、COMPLETED、SUSPENDED、TERMINATED）
3. THE Data_Seeder SHALL 为运行中的工作流实例设置当前节点位置
4. THE Data_Seeder SHALL 为工作流实例生成相关的任务记录
5. THE Data_Seeder SHALL 确保工作流实例关联到有效的样品

### 需求 5: 质量判定数据填充

**用户故事:** 作为开发人员，我想要为质量判定页面生成测试数据，以便能够测试和演示判定功能。

#### 验收标准

1. THE Data_Seeder SHALL 为已完成检测的样品生成质量判定记录
2. THE Data_Seeder SHALL 生成不同判定结果（QUALIFIED、UNQUALIFIED、PENDING）
3. THE Data_Seeder SHALL 为每个判定记录设置判定依据（基于检测结果）
4. THE Data_Seeder SHALL 区分自动判定和人工判定的记录
5. THE Data_Seeder SHALL 为部分判定记录生成判定历史记录

### 需求 6: 报告分发数据填充

**用户故事:** 作为开发人员，我想要为报告分发页面生成测试数据，以便能够测试和演示报告分发功能。

#### 验收标准

1. THE Data_Seeder SHALL 为已生成的报告创建分发记录
2. THE Data_Seeder SHALL 生成不同分发方式的记录（EMAIL、DOWNLOAD、PRINT）
3. THE Data_Seeder SHALL 生成不同分发状态的记录（PENDING、SENT、RECEIVED、FAILED）
4. THE Data_Seeder SHALL 为邮件分发记录设置接收人邮箱地址
5. THE Data_Seeder SHALL 为已发送的分发记录设置发送时间

### 需求 7: 检测结果数据填充

**用户故事:** 作为开发人员，我想要为检测结果页面生成测试数据，以便能够测试和演示结果录入和查询功能。

#### 验收标准

1. THE Data_Seeder SHALL 为每个检测项目生成至少 3 个检测参数的结果
2. THE Data_Seeder SHALL 生成不同来源的检测结果（MANUAL、INSTRUMENT、CALCULATED）
3. THE Data_Seeder SHALL 为部分结果设置异常标记和异常原因
4. THE Data_Seeder SHALL 生成包含复测记录的数据（关联原始结果）
5. THE Data_Seeder SHALL 为检测结果设置合理的数值范围（基于检测方法）

### 需求 8: 数据填充脚本管理

**用户故事:** 作为开发人员，我想要有一个统一的脚本来执行数据填充，以便能够快速重置测试环境。

#### 验收标准

1. THE Seeding_Script SHALL 提供命令行接口以执行数据填充
2. THE Seeding_Script SHALL 支持选择性填充特定模块的数据
3. THE Seeding_Script SHALL 在填充前检查数据库连接状态
4. THE Seeding_Script SHALL 在填充过程中显示进度信息
5. THE Seeding_Script SHALL 在填充完成后输出统计摘要（各模块生成的记录数）
6. IF 数据填充失败，THEN THE Seeding_Script SHALL 回滚已插入的数据
7. THE Seeding_Script SHALL 支持清除已有测试数据的选项

### 需求 9: 数据一致性保证

**用户故事:** 作为开发人员，我想要生成的测试数据保持一致性，以便能够进行可靠的功能测试。

#### 验收标准

1. THE Data_Seeder SHALL 确保所有外键关联指向有效的记录
2. THE Data_Seeder SHALL 确保时间序列的逻辑正确性（创建时间早于更新时间）
3. THE Data_Seeder SHALL 确保状态转换的合理性（不能从 COMPLETED 直接变为 PENDING）
4. THE Data_Seeder SHALL 确保数值数据在合理范围内（检测结果、数量等）
5. THE Data_Seeder SHALL 确保必填字段都有有效值

### 需求 10: 数据多样性

**用户故事:** 作为开发人员，我想要生成的测试数据具有多样性，以便能够测试各种边界情况和场景。

#### 验收标准

1. THE Data_Seeder SHALL 生成不同优先级的样品（LOW、NORMAL、HIGH、URGENT）
2. THE Data_Seeder SHALL 生成不同类别的样品（水质、土壤、食品等）
3. THE Data_Seeder SHALL 生成不同部门和人员的数据
4. THE Data_Seeder SHALL 生成不同时间段的数据（过去 3 个月内）
5. THE Data_Seeder SHALL 生成包含边界值的数据（最小值、最大值、临界值）
