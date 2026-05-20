# 仪器管理功能实现任务列表

## 概述

本任务列表基于仪器管理功能的需求文档和设计文档,将功能实现分解为可执行的编码任务。实现将使用 TypeScript 作为主要编程语言,前端使用 Vue 3 + Element Plus,后端使用 Node.js + Express + Prisma ORM。

## 任务列表

- [x] 1. 数据库模型和迁移
  - 创建 Prisma schema 定义所有仪器相关模型
  - 生成数据库迁移文件
  - 执行迁移并验证数据库结构
  - _需求: 10.1-10.10_

- [x] 2. 后端基础设施
  - [x] 2.1 创建 TypeScript 类型定义
    - 在 `backend-api/src/types/instrument.ts` 中定义所有接口和枚举
    - 包括 Instrument, InstrumentTransfer, MaintenanceRecord, CalibrationRecord, DisposalRecord 等
    - _需求: 9.1-9.15, 10.1-10.10_
  
  - [x] 2.2 实现文件上传中间件
    - 创建 `backend-api/src/middleware/fileUploadMiddleware.ts`
    - 配置 multer 存储策略和文件过滤
    - 支持最大 20MB 文件上传
    - _需求: 1.7, 15.3_
  
  - [x] 2.3 实现权限中间件
    - 创建 `backend-api/src/middleware/instrumentPermissionMiddleware.ts`
    - 实现 checkInstrumentPermission 函数
    - 定义所有仪器管理相关权限
    - _需求: 11.1-11.6_

- [ ] 3. 仪器核心服务层
  - [x] 3.1 实现 InstrumentService
    - 创建 `backend-api/src/services/instrumentService.ts`
    - 实现 createInstrument, getInstruments, getInstrumentById, updateInstrument, deleteInstrument 方法
    - 实现仪器编码唯一性验证
    - 实现仪器状态管理逻辑
    - _需求: 1.1-1.10, 2.1-2.6_
  
  - [ ]* 3.2 编写 InstrumentService 单元测试
    - 创建 `backend-api/src/__tests__/instrumentService.test.ts`
    - 测试创建、查询、更新、删除仪器的各种场景
    - 测试边界条件和错误处理
    - _需求: 1.1-1.10, 2.1-2.6_

- [x] 4. 仪器 API 控制器和路由
  - [ ] 4.1 实现 InstrumentController
    - 创建 `backend-api/src/controllers/instrumentController.ts`
    - 实现所有仪器管理 API 端点的控制器方法
    - 实现请求验证和错误处理
    - _需求: 9.1-9.5_
  
  - [x] 4.2 创建仪器路由
    - 创建 `backend-api/src/routes/instrumentRoutes.ts`
    - 配置所有仪器管理路由和权限中间件
    - 集成到主路由文件
    - _需求: 9.1-9.15_
  
  - [x] 4.3 实现请求验证器
    - 创建 `backend-api/src/validators/instrumentValidator.ts`
    - 使用 Joi 或 Zod 验证请求数据
    - _需求: 9.14_
  
  - [ ]* 4.4 编写仪器 API 集成测试
    - 创建 `backend-api/src/__tests__/instrumentApi.integration.test.ts`
    - 测试所有 API 端点的正常流程和异常情况
    - _需求: 9.1-9.15_

- [ ] 5. 流转管理功能
  - [ ] 5.1 实现 TransferService
    - 创建 `backend-api/src/services/transferService.ts`
    - 实现 createTransfer, confirmTransfer, rejectTransfer 方法
    - 实现流转状态管理和仪器位置更新逻辑
    - _需求: 3.1-3.10_
  
  - [ ] 5.2 实现 TransferController
    - 创建 `backend-api/src/controllers/transferController.ts`
    - 实现流转相关 API 端点
    - _需求: 9.6-9.8_
  
  - [ ] 5.3 创建流转路由
    - 在 `backend-api/src/routes/instrumentRoutes.ts` 中添加流转路由
    - 配置权限中间件
    - _需求: 9.6-9.8_
  
  - [ ]* 5.4 编写流转功能测试
    - 测试流转申请、确认、拒绝的完整流程
    - 测试流转对仪器状态的影响
    - _需求: 3.1-3.10_

- [ ] 6. 维护管理功能
  - [ ] 6.1 实现 MaintenanceService
    - 创建 `backend-api/src/services/maintenanceService.ts`
    - 实现 createMaintenance, getMaintenanceRecords, updateMaintenance, deleteMaintenance 方法
    - 实现维护提醒查询逻辑
    - _需求: 7.1-7.7_
  
  - [ ] 6.2 实现 MaintenanceController
    - 创建 `backend-api/src/controllers/maintenanceController.ts`
    - 实现维护记录相关 API 端点
    - _需求: 9.11_
  
  - [ ] 6.3 创建维护路由
    - 添加维护管理路由和权限配置
    - _需求: 9.11_
  
  - [ ]* 6.4 编写维护功能测试
    - 测试维护记录的增删改查
    - 测试维护提醒功能
    - _需求: 7.1-7.7_

- [ ] 7. 校准管理功能
  - [ ] 7.1 实现 CalibrationService
    - 创建 `backend-api/src/services/calibrationService.ts`
    - 实现 createCalibration, getCalibrationRecords, updateCalibration, deleteCalibration 方法
    - 实现校准到期查询和提醒逻辑
    - 实现校准不合格时自动更新仪器状态
    - _需求: 8.1-8.8_
  
  - [ ] 7.2 实现 CalibrationController
    - 创建 `backend-api/src/controllers/calibrationController.ts`
    - 实现校准记录相关 API 端点
    - _需求: 9.12_
  
  - [ ] 7.3 创建校准路由
    - 添加校准管理路由和权限配置
    - _需求: 9.12_
  
  - [ ]* 7.4 编写校准功能测试
    - 测试校准记录的增删改查
    - 测试校准到期提醒功能
    - 测试校准不合格时的状态更新
    - _需求: 8.1-8.8_

- [ ] 8. 报废管理功能
  - [ ] 8.1 实现 DisposalService
    - 创建 `backend-api/src/services/disposalService.ts`
    - 实现 createDisposal, approveDisposal, rejectDisposal 方法
    - 实现报废前的流转记录检查
    - 实现报废审批工作流
    - _需求: 4.1-4.10_
  
  - [ ] 8.2 实现 DisposalController
    - 创建 `backend-api/src/controllers/disposalController.ts`
    - 实现报废相关 API 端点
    - _需求: 9.9-9.10_
  
  - [ ] 8.3 创建报废路由
    - 添加报废管理路由和权限配置
    - _需求: 9.9-9.10_
  
  - [ ]* 8.4 编写报废功能测试
    - 测试报废申请、审批流程
    - 测试报废前的验证逻辑
    - _需求: 4.1-4.10_

- [ ] 9. 文档管理功能
  - [ ] 9.1 实现 DocumentService
    - 创建 `backend-api/src/services/documentService.ts`
    - 实现文档上传、下载、删除功能
    - 实现文档与仪器、维护、报废记录的关联
    - _需求: 1.7, 7.4, 8.4_
  
  - [ ] 9.2 实现 DocumentController
    - 创建 `backend-api/src/controllers/documentController.ts`
    - 实现文档相关 API 端点
    - 实现文件下载响应头设置
    - _需求: 9.13_
  
  - [ ] 9.3 创建文档路由
    - 添加文档管理路由
    - 集成文件上传中间件
    - _需求: 9.13_
  
  - [ ]* 9.4 编写文档管理测试
    - 测试文件上传、下载、删除
    - 测试文件类型和大小限制
    - _需求: 1.7, 15.3_

- [ ] 10. 统计分析功能
  - [ ] 10.1 实现 StatisticsService
    - 创建 `backend-api/src/services/instrumentStatisticsService.ts`
    - 实现仪器统计数据查询(按状态、部门、价值等)
    - 实现使用年限分布统计
    - 实现校准到期统计
    - 实现维护频率统计
    - _需求: 13.1-13.9_
  
  - [ ] 10.2 实现 StatisticsController
    - 创建 `backend-api/src/controllers/instrumentStatisticsController.ts`
    - 实现统计数据 API 端点
    - _需求: 13.1-13.9_
  
  - [ ] 10.3 创建统计路由
    - 添加统计分析路由
    - _需求: 13.1-13.9_
  
  - [ ]* 10.4 编写统计功能测试
    - 测试各种统计查询的准确性
    - _需求: 13.1-13.9_

- [ ] 11. 数据导出功能
  - [ ] 11.1 实现 ExportService
    - 创建 `backend-api/src/services/instrumentExportService.ts`
    - 实现 Excel 导出功能(使用 exceljs)
    - 实现 CSV 导出功能
    - 实现异步导出和通知机制(数据量>10000)
    - _需求: 12.1-12.8_
  
  - [ ] 11.2 实现导出 API 端点
    - 在 InstrumentController 中添加导出方法
    - 支持导出仪器列表、流转记录、维护记录
    - _需求: 12.1-12.8_
  
  - [ ]* 11.3 编写导出功能测试
    - 测试 Excel 和 CSV 导出
    - 测试大数据量异步导出
    - _需求: 12.1-12.8_

- [ ] 12. Checkpoint - 后端功能验证
  - 确保所有后端 API 端点正常工作
  - 运行所有单元测试和集成测试
  - 验证权限控制正确实施
  - 询问用户是否有问题或需要调整

- [ ] 13. 前端类型定义和服务
  - [ ] 13.1 创建前端类型定义
    - 创建 `vue-project/src/types/instrument.ts`
    - 定义所有接口、枚举和 DTO 类型
    - 与后端类型保持一致
    - _需求: 9.1-9.15_
  
  - [ ] 13.2 实现 API 服务层
    - 创建 `vue-project/src/services/instrumentService.ts`
    - 实现所有仪器管理 API 调用方法
    - 使用现有的 http 服务进行请求
    - _需求: 9.1-9.15_
  
  - [ ] 13.3 创建 Pinia Store
    - 创建 `vue-project/src/stores/instrument.ts`
    - 实现状态管理(instruments, currentInstrument, filters, pagination)
    - 实现 actions(fetchInstruments, createInstrument, updateInstrument 等)
    - _需求: 5.1-5.10, 6.1-6.10_

- [ ] 14. 仪器列表页面
  - [ ] 14.1 创建 InstrumentManagement.vue
    - 创建 `vue-project/src/views/instrument/InstrumentManagement.vue`
    - 实现操作栏(新建、导出、刷新按钮)
    - 实现筛选栏(编码、名称、状态、部门)
    - 实现仪器列表表格
    - 实现分页组件
    - _需求: 5.1-5.10_
  
  - [ ] 14.2 实现搜索和筛选功能
    - 实现模糊搜索和精确搜索
    - 实现多条件筛选
    - 实现排序功能
    - _需求: 5.3-5.9_
  
  - [ ] 14.3 实现响应式布局
    - 适配移动端显示(卡片列表)
    - 优化触摸操作
    - _需求: 14.1-14.6_
  
  - [ ]* 14.4 编写列表页面测试
    - 测试组件渲染
    - 测试搜索和筛选功能
    - 测试分页功能
    - _需求: 5.1-5.10_

- [ ] 15. 仪器登记/编辑页面
  - [ ] 15.1 创建 InstrumentRegistration.vue
    - 创建 `vue-project/src/views/instrument/InstrumentRegistration.vue`
    - 实现仪器信息表单(基本信息、购置信息、技术参数、使用信息)
    - 实现表单验证
    - 支持新建和编辑模式
    - _需求: 1.1-1.10, 2.1-2.6_
  
  - [ ] 15.2 创建 InstrumentForm 组件
    - 创建 `vue-project/src/components/instrument/InstrumentForm.vue`
    - 实现可复用的仪器表单组件
    - 实现动态技术参数字段
    - _需求: 1.8-1.9_
  
  - [ ] 15.3 实现文档上传功能
    - 创建 `vue-project/src/components/instrument/DocumentUpload.vue`
    - 集成 Element Plus Upload 组件
    - 实现文件类型和大小验证
    - _需求: 1.7, 15.3_
  
  - [ ]* 15.4 编写登记页面测试
    - 测试表单验证
    - 测试新建和编辑模式
    - 测试文件上传
    - _需求: 1.1-1.10_

- [ ] 16. 仪器详情页面
  - [ ] 16.1 创建 InstrumentDetail.vue
    - 创建 `vue-project/src/views/instrument/InstrumentDetail.vue`
    - 实现基本信息展示
    - 实现技术参数展示
    - 实现操作按钮(编辑、流转、维护、校准、报废)
    - _需求: 6.1-6.10_
  
  - [ ] 16.2 创建时间线组件
    - 创建 `vue-project/src/components/instrument/TransferTimeline.vue`
    - 创建 `vue-project/src/components/instrument/MaintenanceTimeline.vue`
    - 创建 `vue-project/src/components/instrument/CalibrationTimeline.vue`
    - 使用 Element Plus Timeline 组件
    - _需求: 6.5-6.7_
  
  - [ ] 16.3 实现文档列表展示
    - 显示关联文档列表
    - 实现文档下载功能
    - _需求: 6.8_
  
  - [ ]* 16.4 编写详情页面测试
    - 测试信息展示
    - 测试时间线组件
    - 测试权限控制
    - _需求: 6.1-6.10_

- [ ] 17. 流转管理页面
  - [ ] 17.1 创建 InstrumentTransfer.vue
    - 创建 `vue-project/src/views/instrument/InstrumentTransfer.vue`
    - 实现流转申请列表
    - 实现流转状态筛选
    - _需求: 3.1-3.10_
  
  - [ ] 17.2 创建 TransferForm 组件
    - 创建 `vue-project/src/components/instrument/TransferForm.vue`
    - 实现流转申请表单
    - 实现流转确认/拒绝对话框
    - _需求: 3.1-3.7_
  
  - [ ]* 17.3 编写流转页面测试
    - 测试流转申请流程
    - 测试确认和拒绝操作
    - _需求: 3.1-3.10_

- [ ] 18. 维护管理页面
  - [ ] 18.1 创建 MaintenanceManagement.vue
    - 创建 `vue-project/src/views/instrument/MaintenanceManagement.vue`
    - 实现维护记录列表
    - 实现维护提醒列表
    - _需求: 7.1-7.7_
  
  - [ ] 18.2 创建 MaintenanceForm 组件
    - 创建 `vue-project/src/components/instrument/MaintenanceForm.vue`
    - 实现维护记录表单
    - 支持上传维护文档
    - _需求: 7.1-7.4_
  
  - [ ]* 18.3 编写维护页面测试
    - 测试维护记录添加
    - 测试维护提醒功能
    - _需求: 7.1-7.7_

- [ ] 19. 校准管理页面
  - [ ] 19.1 创建 CalibrationManagement.vue
    - 创建 `vue-project/src/views/instrument/CalibrationManagement.vue`
    - 实现校准记录列表
    - 实现校准到期提醒列表
    - _需求: 8.1-8.8_
  
  - [ ] 19.2 创建 CalibrationForm 组件
    - 创建 `vue-project/src/components/instrument/CalibrationForm.vue`
    - 实现校准记录表单
    - 支持上传校准证书
    - _需求: 8.1-8.4_
  
  - [ ]* 19.3 编写校准页面测试
    - 测试校准记录添加
    - 测试校准到期提醒
    - _需求: 8.1-8.8_

- [ ] 20. 报废管理页面
  - [ ] 20.1 创建 DisposalManagement.vue
    - 创建 `vue-project/src/views/instrument/DisposalManagement.vue`
    - 实现报废申请列表
    - 实现报废审批功能
    - _需求: 4.1-4.10_
  
  - [ ] 20.2 创建 DisposalForm 组件
    - 创建 `vue-project/src/components/instrument/DisposalForm.vue`
    - 实现报废申请表单
    - 支持上传报废证明文件
    - _需求: 4.1-4.3_
  
  - [ ]* 20.3 编写报废页面测试
    - 测试报废申请流程
    - 测试报废审批流程
    - _需求: 4.1-4.10_

- [ ] 21. 统计分析页面
  - [ ] 21.1 创建 InstrumentStatistics.vue
    - 创建 `vue-project/src/views/instrument/InstrumentStatistics.vue`
    - 实现统计仪表板
    - 使用 ECharts 展示图表(状态分布、价值统计、使用年限分布)
    - 实现时间范围筛选
    - _需求: 13.1-13.9_
  
  - [ ] 21.2 实现统计报表导出
    - 实现统计数据导出功能
    - _需求: 13.9_
  
  - [ ]* 21.3 编写统计页面测试
    - 测试图表渲染
    - 测试数据筛选
    - _需求: 13.1-13.9_

- [ ] 22. 路由配置和菜单集成
  - [ ] 22.1 配置前端路由
    - 在 `vue-project/src/router/index.ts` 中添加仪器管理路由
    - 配置路由守卫和权限验证
    - _需求: 11.1-11.6_
  
  - [ ] 22.2 集成到侧边菜单
    - 在 `vue-project/src/components/SideMenu.vue` 中添加仪器管理菜单项
    - 配置菜单权限显示
    - _需求: 11.6_

- [ ] 23. 权限配置和初始化
  - [ ] 23.1 添加权限数据
    - 在 `backend-api/prisma/seed.ts` 中添加仪器管理权限
    - 为各角色分配相应权限
    - _需求: 11.1-11.6_
  
  - [ ] 23.2 创建权限配置脚本
    - 创建脚本用于添加仪器管理权限到现有系统
    - _需求: 11.1-11.6_

- [ ] 24. Checkpoint - 前端功能验证
  - 验证所有页面正常渲染和交互
  - 验证前后端集成正常
  - 验证权限控制在前端正确实施
  - 验证响应式布局在不同设备上的表现
  - 询问用户是否有问题或需要调整

- [ ] 25. 性能优化
  - [ ] 25.1 实现数据库查询优化
    - 验证所有必要的索引已创建
    - 优化复杂查询(使用 select 和 include)
    - _需求: 15.5_
  
  - [ ] 25.2 实现缓存策略(可选)
    - 使用 Redis 缓存仪器列表和详情
    - 实现缓存失效机制
    - _需求: 15.1-15.6_
  
  - [ ] 25.3 前端性能优化
    - 实现组件懒加载
    - 实现搜索防抖
    - 优化大列表渲染
    - _需求: 15.1-15.2_

- [ ] 26. 文档编写
  - [ ] 26.1 编写 API 文档
    - 使用 Swagger/OpenAPI 生成 API 文档
    - 添加请求/响应示例
    - _需求: 9.1-9.15_
  
  - [ ] 26.2 编写用户使用文档
    - 创建仪器管理功能使用指南
    - 包含截图和操作步骤
    - _需求: 1.1-15.6_
  
  - [ ] 26.3 编写开发者文档
    - 记录技术架构和设计决策
    - 记录扩展点和自定义方法
    - _需求: 所有_

- [ ] 27. 最终集成测试
  - [ ]* 27.1 端到端测试
    - 测试完整的仪器生命周期流程
    - 测试跨模块集成(与样品管理、审核管理等)
    - _需求: 所有_
  
  - [ ]* 27.2 性能测试
    - 测试并发访问性能
    - 测试大数据量查询性能
    - _需求: 15.1-15.6_
  
  - [ ]* 27.3 安全测试
    - 测试权限控制
    - 测试文件上传安全性
    - 测试 SQL 注入防护
    - _需求: 11.1-11.6, 15.3_

- [ ] 28. 最终 Checkpoint
  - 确保所有功能正常工作
  - 确保所有测试通过
  - 确保文档完整
  - 准备部署到生产环境
  - 向用户演示完整功能

## 注意事项

1. **任务标记说明**:
   - `*` 标记的子任务为可选测试任务,可根据项目进度决定是否执行
   - 未标记的任务为必须完成的核心实现任务

2. **实现顺序**:
   - 建议按照任务编号顺序执行
   - 后端功能优先于前端功能
   - 核心功能优先于辅助功能

3. **测试策略**:
   - 单元测试和集成测试为可选任务
   - 建议至少执行关键功能的测试
   - 端到端测试可在最后阶段执行

4. **权限控制**:
   - 所有 API 端点必须实施权限验证
   - 前端界面需根据权限显示/隐藏功能

5. **性能要求**:
   - 列表查询响应时间 < 2秒
   - 表单提交响应时间 < 3秒
   - 支持最大 20MB 文件上传

6. **兼容性**:
   - 参考现有样品管理模块的实现模式
   - 保持代码风格和架构一致性
   - 复用现有的中间件和工具函数
