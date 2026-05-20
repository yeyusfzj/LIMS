# Requirements Document

## Introduction

本需求文档定义了 AIInsightCard.vue 组件的完善功能，旨在使该组件能够从真实数据库获取数据并进行智能分析展示。该功能将为实验室管理系统的用户提供实时的数据洞察、异常告警和智能建议，帮助用户更高效地管理样品、仪器和审核任务。

## Glossary

- **AIInsightCard**: AI智能洞察卡片组件，用于在Dashboard页面展示智能分析结果
- **Dashboard_API**: Dashboard统计数据接口，提供样品、任务、质量等统计指标
- **Sample_API**: 样品管理接口，提供样品数据的CRUD操作
- **Instrument_API**: 仪器管理接口，提供仪器状态和使用数据
- **Result_API**: 检测结果接口，提供异常样品数据查询
- **Workflow_API**: 工作流接口，提供审核任务数据查询
- **AI_Context_Service**: AI上下文服务，负责收集数据并生成智能分析
- **Data_Analysis_Module**: 数据分析模块，对收集的数据进行统计和趋势分析
- **Alert_Generator**: 告警生成器，根据数据阈值生成告警信息
- **Recommendation_Engine**: 建议引擎，基于数据分析生成智能建议
- **HTTP_Client**: HTTP客户端，基于Axios封装的网络请求工具

## Requirements

### Requirement 1: 数据获取功能

**User Story:** 作为系统用户，我希望AI智能洞察卡片能够从真实数据库获取最新数据，以便我能看到准确的实时信息。

#### Acceptance Criteria

1. WHEN AIInsightCard组件挂载时，THE AI_Context_Service SHALL 调用Dashboard_API获取统计数据
2. WHEN 用户点击刷新按钮时，THE AI_Context_Service SHALL 重新调用Dashboard_API获取最新数据
3. THE Dashboard_API SHALL 返回包含totalSamples、pendingTasks、qualityRate、abnormalSamples及其趋势数据的响应
4. WHEN Dashboard_API调用失败时，THE AI_Context_Service SHALL 返回空数据结构并记录错误日志
5. THE HTTP_Client SHALL 在请求头中包含认证令牌
6. THE AI_Context_Service SHALL 在200毫秒内完成数据收集操作

### Requirement 2: 样品数据分析

**User Story:** 作为实验室管理员，我希望看到样品数据的统计分析和趋势变化，以便我能了解样品处理情况。

#### Acceptance Criteria

1. THE Data_Analysis_Module SHALL 计算样品总数及其与上周的百分比变化
2. THE Data_Analysis_Module SHALL 计算待处理任务数量及其与上周的百分比变化
3. THE Data_Analysis_Module SHALL 计算合格率及其与上周的百分比变化
4. THE Data_Analysis_Module SHALL 计算异常样品数量及其与上周的百分比变化
5. WHEN 趋势值大于0时，THE Data_Analysis_Module SHALL 标记趋势为"up"
6. WHEN 趋势值小于0时，THE Data_Analysis_Module SHALL 标记趋势为"down"
7. WHEN 趋势值等于0时，THE Data_Analysis_Module SHALL 标记趋势为"stable"
8. THE Data_Analysis_Module SHALL 为每个指标生成简短的文字洞察

### Requirement 3: 仪器状态监控

**User Story:** 作为实验室技术员，我希望看到仪器的使用状态和维护提醒，以便我能及时处理仪器问题。

#### Acceptance Criteria

1. THE AI_Context_Service SHALL 调用Instrument_API获取仪器列表数据
2. THE Data_Analysis_Module SHALL 统计在线仪器数量
3. THE Data_Analysis_Module SHALL 统计离线仪器数量
4. THE Data_Analysis_Module SHALL 统计维护中仪器数量
5. WHEN 离线仪器数量大于0时，THE Alert_Generator SHALL 生成中等级别告警
6. WHEN 需要维护的仪器数量大于2时，THE Alert_Generator SHALL 生成低等级别告警
7. THE AIInsightCard SHALL 在数据分析区域展示仪器状态统计

### Requirement 4: 异常样品告警

**User Story:** 作为质量控制人员，我希望及时收到异常样品的告警信息，以便我能快速处理质量问题。

#### Acceptance Criteria

1. THE AI_Context_Service SHALL 调用Result_API查询isAbnormal为true的样品数据
2. WHEN 异常样品数量大于10时，THE Alert_Generator SHALL 生成高等级别告警
3. WHEN 异常样品数量在6到10之间时，THE Alert_Generator SHALL 生成中等级别告警
4. WHEN 异常样品数量在1到5之间时，THE Alert_Generator SHALL 生成低等级别告警
5. THE Alert_Generator SHALL 在告警消息中包含异常样品的具体数量
6. THE Alert_Generator SHALL 为告警提供"查看详情"操作链接
7. THE AIInsightCard SHALL 在告警区域按严重程度排序展示告警信息

### Requirement 5: 审核任务提醒

**User Story:** 作为审核人员，我希望看到待审核任务的统计和紧急提醒，以便我能优先处理重要任务。

#### Acceptance Criteria

1. THE AI_Context_Service SHALL 调用Workflow_API获取待办任务列表
2. THE Data_Analysis_Module SHALL 统计类型为"audit"的待办任务数量
3. THE Data_Analysis_Module SHALL 统计类型为"entry"的待办任务数量
4. WHEN 紧急审核任务数量大于0时，THE Alert_Generator SHALL 生成高等级别告警
5. WHEN 紧急录入任务数量大于5时，THE Alert_Generator SHALL 生成中等级别告警
6. THE Alert_Generator SHALL 在告警消息中包含任务类型和数量
7. THE AIInsightCard SHALL 为每个告警提供跳转到任务管理页面的操作按钮

### Requirement 6: 智能建议生成

**User Story:** 作为系统用户，我希望收到基于数据分析的智能建议，以便我能优化工作流程。

#### Acceptance Criteria

1. WHEN 紧急审核任务数量大于0时，THE Recommendation_Engine SHALL 生成时间管理建议
2. WHEN 紧急录入任务数量大于5时，THE Recommendation_Engine SHALL 生成批量操作建议
3. WHEN 样品总数趋势大于15%时，THE Recommendation_Engine SHALL 生成资源规划建议
4. WHEN 合格率低于95%时，THE Recommendation_Engine SHALL 生成质量控制建议
5. WHEN 异常样品趋势下降超过10%时，THE Recommendation_Engine SHALL 生成质量改进肯定建议
6. WHEN 合格率大于等于98%时，THE Recommendation_Engine SHALL 生成质量保持鼓励建议
7. WHEN 没有特殊情况时，THE Recommendation_Engine SHALL 生成通用鼓励建议
8. THE AIInsightCard SHALL 在建议区域展示所有生成的建议

### Requirement 7: 智能问候功能

**User Story:** 作为系统用户，我希望看到个性化的问候语和关键信息摘要，以便我能快速了解当前状态。

#### Acceptance Criteria

1. THE AI_Context_Service SHALL 根据当前时间生成时段问候语
2. WHEN 当前时间在0点到12点之间时，THE AI_Context_Service SHALL 生成"早上好"问候
3. WHEN 当前时间在12点到18点之间时，THE AI_Context_Service SHALL 生成"下午好"问候
4. WHEN 当前时间在18点到24点之间时，THE AI_Context_Service SHALL 生成"晚上好"问候
5. WHEN 样品总数趋势绝对值大于10%时，THE AI_Context_Service SHALL 在问候语中包含样品趋势洞察
6. WHEN 存在紧急待办任务时，THE AI_Context_Service SHALL 在问候语中包含紧急任务提醒
7. WHEN 异常样品趋势下降超过10%时，THE AI_Context_Service SHALL 在问候语中包含质量改进肯定
8. WHEN 合格率大于等于98%时，THE AI_Context_Service SHALL 在问候语中包含质量表扬
9. THE AIInsightCard SHALL 在问候区域展示问候语和时段信息

### Requirement 8: 数据加载状态管理

**User Story:** 作为系统用户，我希望在数据加载过程中看到明确的加载状态，以便我知道系统正在工作。

#### Acceptance Criteria

1. WHEN 数据加载开始时，THE AIInsightCard SHALL 显示加载动画
2. WHEN 数据加载完成时，THE AIInsightCard SHALL 隐藏加载动画并展示数据
3. WHEN 数据加载失败时，THE AIInsightCard SHALL 隐藏加载动画并在控制台记录错误
4. THE AIInsightCard SHALL 在刷新按钮上显示加载状态
5. WHEN 正在加载数据时，THE AIInsightCard SHALL 禁用刷新按钮
6. THE AIInsightCard SHALL 在500毫秒内响应用户的刷新操作

### Requirement 9: 用户交互功能

**User Story:** 作为系统用户，我希望能够通过点击操作快速访问相关功能页面，以便我能高效完成工作。

#### Acceptance Criteria

1. WHEN 用户点击告警的操作链接时，THE AIInsightCard SHALL 导航到对应的功能页面
2. WHEN 用户点击"与AI助手对话"按钮时，THE AIInsightCard SHALL 触发打开AI助手的自定义事件
3. WHEN 用户点击"查看详细分析"按钮时，THE AIInsightCard SHALL 导航到AI分析页面
4. THE AIInsightCard SHALL 使用Vue Router进行页面导航
5. THE AIInsightCard SHALL 在导航前验证目标路由的有效性

### Requirement 10: 数据刷新机制

**User Story:** 作为系统用户，我希望能够手动刷新数据或自动获取最新数据，以便我能看到实时信息。

#### Acceptance Criteria

1. WHEN 组件挂载时，THE AIInsightCard SHALL 自动调用refreshInsights方法
2. WHEN 用户点击刷新按钮时，THE AIInsightCard SHALL 调用refreshInsights方法
3. THE refreshInsights方法 SHALL 设置loading状态为true
4. THE refreshInsights方法 SHALL 调用AI_Context_Service收集Dashboard上下文
5. THE refreshInsights方法 SHALL 调用AI_Context_Service生成洞察数据
6. THE refreshInsights方法 SHALL 更新insights响应式数据
7. WHEN 数据刷新完成或失败时，THE refreshInsights方法 SHALL 设置loading状态为false

### Requirement 11: 错误处理和容错

**User Story:** 作为系统用户，我希望在API调用失败时系统能够优雅降级，以便我仍然能够使用其他功能。

#### Acceptance Criteria

1. WHEN Dashboard_API调用失败时，THE AI_Context_Service SHALL 返回默认的空数据结构
2. WHEN Instrument_API调用失败时，THE AI_Context_Service SHALL 跳过仪器数据分析
3. WHEN Result_API调用失败时，THE AI_Context_Service SHALL 跳过异常样品分析
4. WHEN Workflow_API调用失败时，THE AI_Context_Service SHALL 跳过任务数据分析
5. THE AI_Context_Service SHALL 在控制台记录所有API调用错误
6. THE AIInsightCard SHALL 在数据为空时显示友好的空状态提示
7. THE AIInsightCard SHALL 不因单个API失败而阻止其他数据的展示

### Requirement 12: 性能优化

**User Story:** 作为系统用户，我希望AI智能洞察卡片能够快速加载和响应，以便我能流畅地使用系统。

#### Acceptance Criteria

1. THE AI_Context_Service SHALL 并行调用多个API接口以减少总加载时间
2. THE AIInsightCard SHALL 使用Vue 3的响应式系统优化渲染性能
3. THE AIInsightCard SHALL 避免不必要的组件重渲染
4. THE Data_Analysis_Module SHALL 在100毫秒内完成数据分析计算
5. THE AIInsightCard SHALL 在1秒内完成首次数据加载和渲染
6. THE AIInsightCard SHALL 使用Element Plus的v-loading指令实现高效的加载状态展示

### Requirement 13: 数据展示格式化

**User Story:** 作为系统用户，我希望看到格式化良好的数据展示，以便我能快速理解信息。

#### Acceptance Criteria

1. THE AIInsightCard SHALL 使用toLocaleString方法格式化大数字
2. THE AIInsightCard SHALL 为趋势上升的指标显示绿色和向上箭头图标
3. THE AIInsightCard SHALL 为趋势下降的指标显示红色和向下箭头图标
4. THE AIInsightCard SHALL 为趋势稳定的指标不显示箭头图标
5. THE AIInsightCard SHALL 为高等级告警使用红色主题
6. THE AIInsightCard SHALL 为中等级告警使用橙色主题
7. THE AIInsightCard SHALL 为低等级告警使用蓝色主题
8. THE AIInsightCard SHALL 使用Element Plus图标库展示所有图标

### Requirement 14: 响应式布局

**User Story:** 作为系统用户，我希望AI智能洞察卡片在不同屏幕尺寸下都能正常显示，以便我能在各种设备上使用。

#### Acceptance Criteria

1. THE AIInsightCard SHALL 使用CSS Grid布局实现数据分析区域的响应式展示
2. THE AIInsightCard SHALL 在小屏幕上自动调整为单列布局
3. THE AIInsightCard SHALL 在大屏幕上自动调整为多列布局
4. THE AIInsightCard SHALL 使用flex布局实现卡片头部的响应式排列
5. THE AIInsightCard SHALL 确保所有文本内容在小屏幕上可读
6. THE AIInsightCard SHALL 确保所有交互元素在触摸设备上可点击

### Requirement 15: 可访问性支持

**User Story:** 作为有特殊需求的用户，我希望AI智能洞察卡片支持无障碍访问，以便我能使用辅助技术访问信息。

#### Acceptance Criteria

1. THE AIInsightCard SHALL 为所有图标提供语义化的Element Plus图标组件
2. THE AIInsightCard SHALL 为所有交互按钮提供清晰的文本标签
3. THE AIInsightCard SHALL 使用语义化的HTML结构组织内容
4. THE AIInsightCard SHALL 确保颜色对比度符合WCAG 2.1 AA标准
5. THE AIInsightCard SHALL 支持键盘导航访问所有交互元素
6. THE AIInsightCard SHALL 为加载状态提供屏幕阅读器可识别的提示
