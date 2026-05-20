# 实现计划：审核统计与报表

## 概述

本实现计划将审核统计与报表功能分解为一系列增量式的编码任务。该功能为实验室管理系统提供全面的审核数据分析和可视化能力，包括工作量统计、通过率分析、时效性分析和问题分类统计，并支持数据导出和缓存优化。

实现将按照后端API → 前端页面 → 图表组件 → 数据导出 → 缓存优化的顺序进行，确保每个步骤都能独立验证和测试。

## 任务列表

- [x] 1. 后端基础设施搭建
  - [x] 1.1 创建统计数据类型定义
    - 在 `backend-api/src/types/statistics.ts` 中定义 `StatisticsFilters`、`WorkloadData`、`PassRateData`、`DurationData`、`IssueData` 等类型
    - 定义缓存键生成函数的类型
    - _需求: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 1.2 编写数据类型单元测试
    - 测试类型定义的完整性和正确性
    - _需求: 9.1, 9.2, 9.3, 9.4_

- [x] 2. 审核统计服务实现
  - [x] 2.1 实现 AuditStatisticsService 核心类
    - 在 `backend-api/src/services/auditStatisticsService.ts` 中创建服务类
    - 实现 `getWorkloadStatistics` 方法：查询审核任务，按审核人员和时间段聚合数据
    - 实现 `getPassRateStatistics` 方法：计算通过率，支持按级别和样品类型分组
    - 实现 `getDurationStatistics` 方法：计算平均时长、中位数、超时率等指标
    - 实现 `getIssueStatistics` 方法：统计退回原因和问题分类
    - _需求: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2_

  - [ ]* 2.2 编写工作量统计属性测试
    - **属性 1: 工作量统计数据完整性**
    - **验证需求: 1.1, 1.3**
    - 使用 fast-check 生成随机审核任务数据
    - 验证返回数据包含所有必需字段
    - 验证 completedTasks + pendingTasks = totalTasks

  - [ ]* 2.3 编写通过率计算属性测试
    - **属性 3: 通过率计算正确性**
    - **验证需求: 2.1**
    - 验证通过率 = (通过任务数 / 总任务数) × 100
    - 验证通过率在 0-100 范围内

  - [ ]* 2.4 编写分组统计一致性属性测试
    - **属性 4: 分组统计一致性**
    - **验证需求: 2.2, 2.3**
    - 验证所有分组的任务总数之和等于整体任务总数

  - [ ]* 2.5 编写时长计算属性测试
    - **属性 6: 平均时长计算**
    - **属性 7: 超时任务统计**
    - **验证需求: 3.1, 3.2**
    - 验证平均时长计算的正确性
    - 验证超时任务统计的准确性

  - [ ]* 2.6 编写问题分类属性测试
    - **属性 10: 问题分类计数**
    - **属性 11: 问题分类排序**
    - **验证需求: 4.1, 4.2**
    - 验证退回原因计数的准确性
    - 验证结果按出现次数降序排列

- [x] 3. 缓存机制实现
  - [x] 3.1 实现统计数据缓存逻辑
    - 在 `auditStatisticsService.ts` 中添加缓存方法
    - 实现 `getCacheKey` 方法：根据统计类型和筛选条件生成缓存键
    - 实现 `getFromCache` 方法：从 Redis 读取缓存数据
    - 实现 `setToCache` 方法：将统计结果存入 Redis，TTL 设置为 300 秒
    - 实现 `clearStatisticsCache` 方法：清除相关统计缓存
    - _需求: 8.1, 8.2, 8.4, 8.5_

  - [ ]* 3.2 编写缓存行为属性测试
    - **属性 16: 缓存存储行为**
    - **属性 17: 缓存失效机制**
    - **属性 18: 缓存键完整性**
    - **验证需求: 8.1, 8.2, 8.4**
    - 验证缓存存储和读取的正确性
    - 验证缓存键包含所有筛选条件

  - [ ]* 3.3 编写缓存降级测试
    - **属性 19: 缓存降级处理**
    - **验证需求: 8.5**
    - 模拟 Redis 不可用场景
    - 验证系统能够降级到数据库查询

- [x] 4. 统计API控制器实现
  - [x] 4.1 创建 AuditStatisticsController
    - 在 `backend-api/src/controllers/auditStatisticsController.ts` 中创建控制器
    - 实现 `getWorkload` 方法：处理 GET /api/statistics/audit/workload 请求
    - 实现 `getPassRate` 方法：处理 GET /api/statistics/audit/pass-rate 请求
    - 实现 `getDuration` 方法：处理 GET /api/statistics/audit/duration 请求
    - 实现 `getIssues` 方法：处理 GET /api/statistics/audit/issues 请求
    - 添加输入验证和权限检查
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 4.2 编写输入验证属性测试
    - **属性 20: 输入验证**
    - **验证需求: 9.5**
    - 验证无效时间范围返回 400 错误
    - 验证错误消息的描述性

  - [ ]* 4.3 编写权限验证属性测试
    - **属性 21: 权限验证**
    - **验证需求: 9.6**
    - 验证无权限用户返回 403 错误

- [x] 5. 统计API路由配置
  - [x] 5.1 配置统计API路由
    - 在 `backend-api/src/routes/statisticsRoutes.ts` 中添加审核统计路由
    - 配置 GET /api/statistics/audit/workload 路由
    - 配置 GET /api/statistics/audit/pass-rate 路由
    - 配置 GET /api/statistics/audit/duration 路由
    - 配置 GET /api/statistics/audit/issues 路由
    - 添加权限中间件验证
    - 在 `backend-api/src/routes/index.ts` 中注册路由
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [ ]* 5.2 编写API集成测试
    - 测试所有统计API端点的正确性
    - 测试权限验证和错误处理
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 6. 检查点 - 后端API验证
  - 确保所有统计API端点正常工作，所有测试通过，如有问题请询问用户

- [ ] 7. 数据导出服务实现
  - [ ] 7.1 实现 ExportService 导出功能
    - 在 `backend-api/src/services/exportService.ts` 中扩展导出服务
    - 实现 `exportWorkloadToExcel` 方法：导出工作量统计为 Excel
    - 实现 `exportPassRateToExcel` 方法：导出通过率统计为 Excel
    - 实现 `exportDurationToExcel` 方法：导出时效性统计为 Excel
    - 实现 `exportIssuesToExcel` 方法：导出问题分类统计为 Excel
    - 使用 xlsx 库生成 Excel 文件，包含数据表格
    - _需求: 6.1, 6.2, 6.3_

  - [ ]* 7.2 编写导出格式属性测试
    - **属性 14: Excel导出格式**
    - **验证需求: 6.1, 6.2, 6.3**
    - 验证导出的 Excel 文件格式正确
    - 验证文件名包含统计类型和时间戳

  - [ ]* 7.3 编写导出错误处理测试
    - **属性 15: 导出错误处理**
    - **验证需求: 6.6**
    - 测试导出失败时的错误处理
    - 验证错误日志记录

- [ ] 8. 导出API实现
  - [ ] 8.1 在控制器中添加导出方法
    - 在 `auditStatisticsController.ts` 中实现 `exportStatistics` 方法
    - 处理 POST /api/statistics/audit/export 请求
    - 根据请求类型调用相应的导出方法
    - 设置正确的响应头（Content-Type、Content-Disposition）
    - 返回文件流
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 8.2 配置导出API路由
    - 在 `statisticsRoutes.ts` 中添加 POST /api/statistics/audit/export 路由
    - 添加权限验证中间件
    - _需求: 6.1_

  - [ ]* 8.3 编写导出API集成测试
    - 测试导出功能的端到端流程
    - 验证文件下载和格式正确性
    - _需求: 6.1, 6.2, 6.3, 6.5_

- [ ] 9. 检查点 - 后端完整性验证
  - 确保所有后端功能（统计查询、缓存、导出）正常工作，所有测试通过，如有问题请询问用户

- [ ] 10. 前端统计服务实现
  - [ ] 10.1 创建前端统计服务
    - 在 `vue-project/src/services/auditStatisticsService.ts` 中创建服务
    - 实现 `getWorkloadStatistics` 方法：调用工作量统计API
    - 实现 `getPassRateStatistics` 方法：调用通过率统计API
    - 实现 `getDurationStatistics` 方法：调用时效性统计API
    - 实现 `getIssueStatistics` 方法：调用问题分类统计API
    - 实现 `exportStatistics` 方法：调用导出API并触发文件下载
    - 添加错误处理和加载状态管理
    - _需求: 9.1, 9.2, 9.3, 9.4, 6.1_

- [ ] 11. 前端类型定义
  - [ ] 11.1 创建前端统计类型定义
    - 在 `vue-project/src/types/statistics.ts` 中定义类型
    - 定义 `StatisticsFilters`、`WorkloadData`、`PassRateData`、`DurationData`、`IssueData` 接口
    - 确保与后端类型定义一致
    - _需求: 1.1, 2.1, 3.1, 4.1_

- [ ] 12. 筛选条件组件实现
  - [ ] 12.1 创建 StatisticsFilters 组件
    - 在 `vue-project/src/components/statistics/StatisticsFilters.vue` 中创建组件
    - 实现时间范围选择器（日期范围）
    - 实现审核人员下拉选择器
    - 实现审核级别下拉选择器
    - 实现样品类型下拉选择器
    - 实现审核状态下拉选择器
    - 实现查询和重置按钮
    - 添加表单验证（开始时间不能晚于结束时间）
    - 触发 `filter-change` 事件传递筛选条件
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 10.2_

  - [ ]* 12.2 编写筛选条件属性测试
    - **属性 12: 筛选条件应用**
    - **验证需求: 7.1, 7.2, 7.3, 7.4, 7.5**
    - 验证筛选条件正确传递
    - 验证表单验证逻辑

- [ ] 13. 图表组件实现
  - [ ] 13.1 创建 WorkloadChart 组件
    - 在 `vue-project/src/components/statistics/WorkloadChart.vue` 中创建组件
    - 使用 ECharts 渲染柱状图
    - 显示按审核人员和时间段的工作量数据
    - 实现图表交互（悬停提示、缩放、平移）
    - 实现响应式布局和窗口大小变化时的重新渲染
    - _需求: 1.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 13.2 创建 PassRateChart 组件
    - 在 `vue-project/src/components/statistics/PassRateChart.vue` 中创建组件
    - 使用 ECharts 渲染饼图和折线图
    - 显示整体通过率、按级别和按样品类型的通过率
    - 显示通过率趋势折线图
    - 实现警告阈值标记（通过率低于阈值时高亮显示）
    - _需求: 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 13.3 创建 DurationChart 组件
    - 在 `vue-project/src/components/statistics/DurationChart.vue` 中创建组件
    - 使用 ECharts 渲染箱线图和散点图
    - 显示审核时长分布、平均值、中位数等统计指标
    - 显示按审核人员的平均时长对比
    - 标记超时任务
    - _需求: 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 13.4 创建 IssueChart 组件
    - 在 `vue-project/src/components/statistics/IssueChart.vue` 中创建组件
    - 使用 ECharts 渲染帕累托图（柱状图 + 累积折线图）
    - 显示退回原因的出现次数和累积百分比
    - 按出现频率降序排列
    - _需求: 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 14. 数据表格组件实现
  - [ ] 14.1 创建统计数据表格组件
    - 在 `vue-project/src/components/statistics/WorkloadTable.vue` 中创建工作量数据表格
    - 在 `vue-project/src/components/statistics/PassRateTable.vue` 中创建通过率数据表格
    - 在 `vue-project/src/components/statistics/DurationTable.vue` 中创建时效性数据表格
    - 在 `vue-project/src/components/statistics/IssueTable.vue` 中创建问题分类数据表格
    - 使用 Element Plus 的 el-table 组件
    - 实现排序、分页功能
    - _需求: 10.4_

- [ ] 15. 统计报表主页面实现
  - [ ] 15.1 创建 AuditStatistics 页面
    - 在 `vue-project/src/views/statistics/AuditStatistics.vue` 中创建页面
    - 集成 StatisticsFilters 组件
    - 使用 el-tabs 组织四个统计标签页（工作量、通过率、时效性、问题分类）
    - 在每个标签页中集成对应的图表组件和数据表格组件
    - 实现导出按钮，调用导出服务
    - 实现加载状态和错误提示
    - 实现筛选条件变更时的数据刷新（500毫秒内）
    - 默认加载最近30天的统计数据
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 7.6_

  - [ ]* 15.2 编写页面集成测试
    - 测试页面加载和数据展示
    - 测试筛选条件变更和数据刷新
    - 测试导出功能
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 16. 路由和权限配置
  - [ ] 16.1 配置统计报表路由
    - 在 `vue-project/src/router/index.ts` 中添加路由
    - 配置路由路径 `/statistics/audit`
    - 添加路由元信息（标题、权限要求）
    - 实现权限守卫：无权限用户重定向到403页面
    - _需求: 10.1, 10.7_

  - [ ] 16.2 更新导航菜单
    - 在 `vue-project/src/components/SideMenu.vue` 中添加统计报表菜单项
    - 放置在"统计分析"菜单组下
    - 根据用户权限显示/隐藏菜单项
    - _需求: 10.1_

- [ ] 17. 检查点 - 前端功能验证
  - 确保统计报表页面正常显示，图表渲染正确，筛选和导出功能正常，如有问题请询问用户

- [ ] 18. 样式和用户体验优化
  - [ ] 18.1 优化统计页面样式
    - 创建 `vue-project/src/assets/styles/statistics.css` 样式文件
    - 优化图表容器布局和间距
    - 优化筛选表单的响应式布局
    - 优化数据表格的样式和交互
    - 添加加载动画和骨架屏
    - 优化移动端适配
    - _需求: 5.5, 5.6_

  - [ ] 18.2 实现图表动画效果
    - 配置 ECharts 的动画参数
    - 实现数据更新时的平滑过渡动画
    - 优化图表交互的视觉反馈
    - _需求: 5.5_

- [ ] 19. 错误处理和日志记录
  - [ ] 19.1 完善后端错误处理
    - 在统计服务和控制器中添加完整的错误处理逻辑
    - 实现输入验证错误、权限错误、数据库错误、缓存错误、导出错误的处理
    - 添加详细的错误日志记录
    - 确保错误响应格式统一
    - _需求: 9.5, 9.6, 6.6, 8.5_

  - [ ] 19.2 完善前端错误处理
    - 在统计服务中添加错误处理和重试逻辑
    - 在页面组件中显示友好的错误提示
    - 实现网络错误、权限错误、数据为空等场景的处理
    - _需求: 1.5, 10.6, 10.7_

- [ ] 20. 性能优化
  - [ ] 20.1 优化数据库查询性能
    - 检查审核任务表的索引是否满足统计查询需求
    - 如需要，添加复合索引（auditorId + submittedAt、level + decision 等）
    - 优化聚合查询，避免 N+1 查询问题
    - _需求: 8.3_

  - [ ] 20.2 优化前端性能
    - 实现图表组件的懒加载
    - 优化大数据量时的表格渲染（虚拟滚动）
    - 实现防抖处理，避免频繁的API请求
    - _需求: 7.6_

- [ ] 21. 文档和测试完善
  - [ ] 21.1 更新API文档
    - 在 `backend-api/src/config/swagger.ts` 中添加统计API的Swagger文档
    - 包含请求参数、响应格式、错误码说明
    - 生成API文档并验证
    - _需求: 9.1, 9.2, 9.3, 9.4_

  - [ ] 21.2 编写用户使用文档
    - 创建 `backend-api/docs/AUDIT_STATISTICS_GUIDE.md` 文档
    - 说明统计功能的使用方法、筛选条件、图表解读、导出功能
    - 包含常见问题和故障排除
    - _需求: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 21.3 补充单元测试覆盖
    - 确保代码覆盖率达到 80% 以上
    - 补充边界情况和错误条件的测试
    - _需求: 所有需求_

- [ ] 22. 最终检查点 - 完整性验证
  - 运行所有测试，确保测试通过率 100%
  - 手动测试所有功能点，验证用户体验
  - 检查性能指标（查询响应时间、缓存命中率、导出速度）
  - 确认文档完整性和准确性
  - 如有问题请询问用户，否则功能开发完成

## 注意事项

1. **增量开发**: 每个任务都应该是可独立验证的，确保代码在每一步都是可运行的
2. **测试驱动**: 核心逻辑应该先编写属性测试，确保正确性
3. **代码复用**: 统计服务中的公共逻辑应该提取为独立函数
4. **性能优先**: 注意数据库查询优化和缓存使用，避免性能瓶颈
5. **用户体验**: 图表应该直观易懂，交互应该流畅自然
6. **错误处理**: 所有错误场景都应该有友好的提示和详细的日志
7. **权限控制**: 所有API和页面都应该进行权限验证
8. **文档同步**: 代码变更时同步更新API文档和用户文档

## 技术栈参考

- **后端**: Node.js + TypeScript + Express + Prisma ORM + Redis
- **前端**: Vue 3 + TypeScript + Element Plus + ECharts + Pinia
- **测试**: Jest + fast-check (属性测试)
- **导出**: xlsx 库
- **缓存**: Redis (TTL: 300秒)

## 预期成果

完成所有任务后，系统将具备：
- 完整的审核统计API（工作量、通过率、时效性、问题分类）
- 直观的可视化图表展示（柱状图、饼图、折线图、箱线图、帕累托图）
- 灵活的多维度数据筛选功能
- 高效的缓存机制（5分钟TTL，自动失效）
- Excel格式的数据导出功能
- 完善的错误处理和日志记录
- 全面的测试覆盖（单元测试 + 属性测试）
- 详细的API文档和用户文档
