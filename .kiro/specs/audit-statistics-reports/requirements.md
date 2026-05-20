# 需求文档 - 审核统计与报表

## 简介

审核统计与报表功能为实验室审核部门提供全面的统计分析和报表功能，帮助管理层了解审核工作情况、发现问题、优化流程。系统通过可视化图表展示审核工作量、通过率、时效性和问题分类等关键指标，并支持数据导出功能。

## 术语表

- **Statistics_System**: 统计系统，负责收集、计算和展示审核相关的统计数据
- **Report_Generator**: 报表生成器，负责生成和导出各类统计报表
- **Chart_Renderer**: 图表渲染器，负责将统计数据可视化为图表
- **Data_Exporter**: 数据导出器，负责将统计数据导出为Excel等格式
- **Audit_Task**: 审核任务，需要被统计分析的审核工作单元
- **Time_Period**: 时间段，用于筛选统计数据的时间范围
- **Pass_Rate**: 通过率，审核通过的任务数量占总任务数量的比例
- **Audit_Duration**: 审核时长，从审核任务创建到完成的时间间隔
- **Rejection_Reason**: 退回原因，审核未通过时记录的问题分类
- **Workload_Metric**: 工作量指标，衡量审核人员工作量的统计数据

## 需求

### 需求 1: 审核工作量统计

**用户故事:** 作为审核管理员，我想要查看按人员和时间段统计的审核任务数量，以便了解团队工作负荷分布情况。

#### 验收标准

1. WHEN 用户选择时间段，THE Statistics_System SHALL 计算该时间段内每个审核人员完成的任务数量
2. THE Statistics_System SHALL 支持按日、周、月、季度、年的时间粒度进行统计
3. WHEN 用户请求工作量统计，THE Statistics_System SHALL 返回包含审核人员姓名、任务数量、完成数量、待处理数量的数据
4. THE Chart_Renderer SHALL 将工作量数据渲染为柱状图和表格形式
5. WHEN 统计数据为空，THE Statistics_System SHALL 返回空结果集并提示"所选时间段内无审核数据"

### 需求 2: 审核通过率分析

**用户故事:** 作为质量管理员，我想要分析不同级别和样品类型的审核通过率，以便识别质量薄弱环节。

#### 验收标准

1. WHEN 用户请求通过率分析，THE Statistics_System SHALL 计算审核通过任务数除以总任务数的百分比
2. THE Statistics_System SHALL 支持按审核级别（一级审核、二级审核、三级审核）分组统计通过率
3. THE Statistics_System SHALL 支持按样品类型分组统计通过率
4. THE Chart_Renderer SHALL 将通过率数据渲染为饼图和折线图
5. WHEN 通过率低于配置的阈值，THE Statistics_System SHALL 在图表中标记为警告状态

### 需求 3: 审核时效性分析

**用户故事:** 作为审核主管，我想要分析审核任务的平均时长和超时情况，以便优化审核流程效率。

#### 验收标准

1. WHEN 用户请求时效性分析，THE Statistics_System SHALL 计算所选时间段内审核任务的平均完成时长
2. THE Statistics_System SHALL 统计超过预设时限的任务数量和占比
3. THE Statistics_System SHALL 计算每个审核人员的平均审核时长
4. THE Chart_Renderer SHALL 将时效性数据渲染为箱线图和散点图
5. WHEN 审核任务已完成，THE Statistics_System SHALL 使用实际完成时间计算时长
6. WHEN 审核任务未完成，THE Statistics_System SHALL 使用当前时间计算已用时长

### 需求 4: 审核问题分类统计

**用户故事:** 作为质量分析师，我想要统计审核退回原因和常见问题，以便制定针对性的改进措施。

#### 验收标准

1. WHEN 用户请求问题分类统计，THE Statistics_System SHALL 统计每种退回原因的出现次数
2. THE Statistics_System SHALL 按出现频率降序排列退回原因
3. THE Statistics_System SHALL 支持按样品类型和时间段筛选问题统计
4. THE Chart_Renderer SHALL 将问题分类数据渲染为帕累托图（柱状图+累积折线图）
5. WHEN 退回原因包含自定义文本，THE Statistics_System SHALL 将其归类为"其他"类别

### 需求 5: 可视化图表展示

**用户故事:** 作为管理层用户，我想要通过直观的图表查看统计数据，以便快速理解审核工作状况。

#### 验收标准

1. THE Chart_Renderer SHALL 使用ECharts库渲染所有统计图表
2. THE Chart_Renderer SHALL 支持柱状图、折线图、饼图、散点图、箱线图、帕累托图等图表类型
3. WHEN 用户悬停在图表数据点上，THE Chart_Renderer SHALL 显示详细数值的提示框
4. THE Chart_Renderer SHALL 支持图表的缩放、平移、数据区域选择等交互操作
5. WHEN 图表数据更新，THE Chart_Renderer SHALL 使用动画过渡效果展示变化
6. THE Chart_Renderer SHALL 自动适应容器尺寸并在窗口大小变化时重新渲染

### 需求 6: 数据导出功能

**用户故事:** 作为审核管理员，我想要将统计数据导出为Excel文件，以便进行离线分析和存档。

#### 验收标准

1. WHEN 用户点击导出按钮，THE Data_Exporter SHALL 将当前显示的统计数据导出为Excel文件
2. THE Data_Exporter SHALL 在Excel文件中包含数据表格和对应的图表
3. THE Data_Exporter SHALL 在文件名中包含统计类型和导出时间戳
4. WHEN 导出操作开始，THE Statistics_System SHALL 显示进度提示
5. WHEN 导出完成，THE Data_Exporter SHALL 自动触发文件下载
6. IF 导出过程中发生错误，THEN THE Statistics_System SHALL 显示错误消息并记录日志

### 需求 7: 统计数据筛选

**用户故事:** 作为审核人员，我想要通过多种条件筛选统计数据，以便查看特定范围的统计结果。

#### 验收标准

1. THE Statistics_System SHALL 支持按时间范围筛选统计数据
2. THE Statistics_System SHALL 支持按审核人员筛选统计数据
3. THE Statistics_System SHALL 支持按审核级别筛选统计数据
4. THE Statistics_System SHALL 支持按样品类型筛选统计数据
5. THE Statistics_System SHALL 支持按审核状态（通过、退回、待审核）筛选统计数据
6. WHEN 用户修改筛选条件，THE Statistics_System SHALL 在500毫秒内更新统计结果

### 需求 8: 统计数据缓存

**用户故事:** 作为系统管理员，我想要缓存常用的统计数据，以便提高查询性能和减少数据库负载。

#### 验收标准

1. WHEN 统计数据被首次查询，THE Statistics_System SHALL 将结果缓存5分钟
2. WHEN 新的审核任务完成或更新，THE Statistics_System SHALL 清除相关的统计缓存
3. WHEN 用户请求已缓存的统计数据，THE Statistics_System SHALL 在100毫秒内返回结果
4. THE Statistics_System SHALL 在缓存键中包含所有筛选条件参数
5. WHEN 缓存服务不可用，THE Statistics_System SHALL 直接查询数据库并记录警告日志

### 需求 9: 统计API接口

**用户故事:** 作为前端开发者，我想要调用统计API获取数据，以便在界面上展示统计信息。

#### 验收标准

1. THE Statistics_System SHALL 提供GET /api/statistics/workload接口返回工作量统计数据
2. THE Statistics_System SHALL 提供GET /api/statistics/pass-rate接口返回通过率统计数据
3. THE Statistics_System SHALL 提供GET /api/statistics/duration接口返回时效性统计数据
4. THE Statistics_System SHALL 提供GET /api/statistics/issues接口返回问题分类统计数据
5. WHEN API请求包含无效的时间范围参数，THE Statistics_System SHALL 返回400错误和描述性错误消息
6. WHEN API请求的用户无统计查看权限，THE Statistics_System SHALL 返回403错误

### 需求 10: 统计报表页面

**用户故事:** 作为审核管理员，我想要访问统计报表页面，以便集中查看所有审核统计信息。

#### 验收标准

1. THE Statistics_System SHALL 提供统计报表页面路由/statistics/audit
2. THE Statistics_System SHALL 在页面顶部显示筛选条件表单
3. THE Statistics_System SHALL 在页面中部以标签页形式组织不同类型的统计图表
4. THE Statistics_System SHALL 在每个统计图表下方显示对应的数据表格
5. THE Statistics_System SHALL 在页面右上角提供导出按钮
6. WHEN 页面加载，THE Statistics_System SHALL 默认显示最近30天的统计数据
7. WHEN 用户无统计查看权限，THE Statistics_System SHALL 重定向到403错误页面
