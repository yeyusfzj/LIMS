# 需求文档

## 介绍

审核管理架构重构旨在优化当前分散的审核管理功能，将审核配置和模板功能整合到审核任务流程中，减少用户在多个页面间的切换，提升审核效率和用户体验。

当前系统包含4个独立页面（审核任务列表、审核任务详情、审核流程配置、审核意见模板），导致用户操作繁琐，配置与实际审核任务脱节。重构后将保持审核任务的独立性，同时将配置和模板功能嵌入到审核工作流程中。

## 术语表

- **Audit_System**: 审核管理系统，负责处理审核任务、流程配置和意见模板的整体系统
- **Task_List_Page**: 审核任务列表页面，显示所有待审核和已审核任务的页面
- **Task_Detail_Page**: 审核任务详情页面，显示单个审核任务详细信息和执行审核操作的页面
- **Comment_Template**: 审核意见模板，预定义的常用审核意见文本
- **Workflow_Config**: 审核流程配置，定义审核级别、审核人和审核顺序的配置信息
- **Template_Selector**: 模板选择器，用于快速选择和插入审核意见模板的UI组件
- **Settings_Dialog**: 设置对话框，用于管理模板和流程配置的弹出式界面
- **Audit_Operation_Area**: 审核操作区域，任务详情页面中用于输入审核意见和执行审核操作的区域
- **Sidebar_Menu**: 侧边栏菜单，系统主导航菜单
- **User**: 审核员，执行审核任务的用户

## 需求

### 需求 1: 保持审核任务菜单独立性

**用户故事:** 作为审核员，我希望审核任务在侧边栏保持独立菜单项，以便快速访问审核功能。

#### 验收标准

1. THE Sidebar_Menu SHALL 包含审核任务作为独立的一级菜单项
2. WHEN User 点击审核任务菜单项, THE Audit_System SHALL 导航到 Task_List_Page
3. THE Sidebar_Menu SHALL 保持审核任务菜单项的可见性和可访问性

### 需求 2: 移除独立的配置和模板页面

**用户故事:** 作为系统管理员，我希望简化页面结构，以便减少用户的认知负担。

#### 验收标准

1. THE Audit_System SHALL 移除独立的审核流程配置页面（AuditWorkflowConfig.vue）
2. THE Audit_System SHALL 移除独立的审核意见模板页面（AuditCommentTemplates.vue）
3. THE Sidebar_Menu SHALL NOT 显示审核流程配置和审核意见模板的菜单项
4. THE Audit_System SHALL 保留审核任务列表页面（AuditTaskList.vue）和审核任务详情页面（AuditTaskDetail.vue）

### 需求 3: 任务详情页面集成模板选择功能

**用户故事:** 作为审核员，我希望在审核任务详情页面直接选择审核意见模板，以便快速填写审核意见。

#### 验收标准

1. WHEN User 访问 Task_Detail_Page, THE Audit_Operation_Area SHALL 在审核意见输入框旁边显示"选择模板"按钮
2. WHEN User 点击"选择模板"按钮, THE Audit_System SHALL 显示 Template_Selector
3. THE Template_Selector SHALL 列出所有可用的 Comment_Template
4. WHEN User 选择一个 Comment_Template, THE Audit_System SHALL 将模板内容插入到审核意见输入框中
5. THE Template_Selector SHALL 支持搜索和过滤模板功能
6. THE Template_Selector SHALL 显示每个模板的名称和预览内容

### 需求 4: 任务详情页面显示流程信息

**用户故事:** 作为审核员，我希望在审核任务详情页面查看当前审核流程信息，以便了解审核级别和流程状态。

#### 验收标准

1. WHEN User 访问 Task_Detail_Page, THE Audit_System SHALL 显示当前审核任务的流程信息
2. THE Task_Detail_Page SHALL 显示当前审核级别
3. THE Task_Detail_Page SHALL 显示审核流程中的所有审核节点
4. THE Task_Detail_Page SHALL 标识当前审核节点的状态（待审核、已审核、已通过、已驳回）
5. THE Task_Detail_Page SHALL 显示每个审核节点的审核人信息

### 需求 5: 任务列表页面集成设置功能

**用户故事:** 作为系统管理员，我希望在审核任务列表页面管理模板和流程配置，以便集中管理审核相关设置。

#### 验收标准

1. WHEN User 访问 Task_List_Page, THE Audit_System SHALL 在页面顶部显示"设置"按钮
2. WHEN User 点击"设置"按钮, THE Audit_System SHALL 显示 Settings_Dialog
3. THE Settings_Dialog SHALL 包含"审核意见模板"和"审核流程配置"两个标签页
4. WHEN User 选择"审核意见模板"标签, THE Settings_Dialog SHALL 显示模板管理界面
5. WHEN User 选择"审核流程配置"标签, THE Settings_Dialog SHALL 显示流程配置界面

### 需求 6: 审核意见模板管理

**用户故事:** 作为系统管理员，我希望管理审核意见模板，以便维护常用的审核意见。

#### 验收标准

1. THE Settings_Dialog SHALL 允许 User 创建新的 Comment_Template
2. THE Settings_Dialog SHALL 允许 User 编辑现有的 Comment_Template
3. THE Settings_Dialog SHALL 允许 User 删除 Comment_Template
4. WHEN User 创建或编辑 Comment_Template, THE Audit_System SHALL 要求输入模板名称和模板内容
5. WHEN User 保存 Comment_Template, THE Audit_System SHALL 验证模板名称不为空
6. WHEN User 保存 Comment_Template, THE Audit_System SHALL 验证模板内容不为空
7. WHEN User 删除 Comment_Template, THE Audit_System SHALL 显示确认对话框
8. THE Settings_Dialog SHALL 显示所有 Comment_Template 的列表

### 需求 7: 审核流程配置管理

**用户故事:** 作为系统管理员，我希望配置审核流程，以便定义审核级别和审核人。

#### 验收标准

1. THE Settings_Dialog SHALL 允许 User 创建新的 Workflow_Config
2. THE Settings_Dialog SHALL 允许 User 编辑现有的 Workflow_Config
3. THE Settings_Dialog SHALL 允许 User 删除 Workflow_Config
4. WHEN User 创建或编辑 Workflow_Config, THE Audit_System SHALL 允许定义审核级别数量
5. WHEN User 创建或编辑 Workflow_Config, THE Audit_System SHALL 允许为每个审核级别指定审核人
6. WHEN User 创建或编辑 Workflow_Config, THE Audit_System SHALL 允许设置审核级别的顺序
7. WHEN User 保存 Workflow_Config, THE Audit_System SHALL 验证至少包含一个审核级别
8. WHEN User 保存 Workflow_Config, THE Audit_System SHALL 验证每个审核级别至少有一个审核人
9. THE Settings_Dialog SHALL 显示所有 Workflow_Config 的列表

### 需求 8: 保持现有 API 接口兼容性

**用户故事:** 作为开发人员，我希望保持现有 API 接口不变，以便减少后端改动和测试工作。

#### 验收标准

1. THE Audit_System SHALL 使用现有的审核任务 API 接口
2. THE Audit_System SHALL 使用现有的审核意见模板 API 接口
3. THE Audit_System SHALL 使用现有的审核流程配置 API 接口
4. THE Audit_System SHALL NOT 要求后端 API 进行结构性变更

### 需求 9: 组件结构优化

**用户故事:** 作为开发人员，我希望优化组件结构，以便提高代码复用性和可维护性。

#### 验收标准

1. THE Audit_System SHALL 将模板选择功能封装为独立的可复用组件
2. THE Audit_System SHALL 将流程信息显示功能封装为独立的可复用组件
3. THE Audit_System SHALL 将设置对话框封装为独立的可复用组件
4. THE Audit_System SHALL 将模板管理功能封装为独立的可复用组件
5. THE Audit_System SHALL 将流程配置管理功能封装为独立的可复用组件

### 需求 10: 用户交互体验优化

**用户故事:** 作为审核员，我希望获得流畅的用户体验，以便高效完成审核工作。

#### 验收标准

1. WHEN User 选择 Comment_Template, THE Audit_System SHALL 在 200 毫秒内将模板内容插入到输入框
2. WHEN User 打开 Settings_Dialog, THE Audit_System SHALL 在 300 毫秒内显示对话框
3. WHEN User 保存模板或配置, THE Audit_System SHALL 显示保存成功的提示消息
4. IF 保存操作失败, THEN THE Audit_System SHALL 显示错误消息并保留用户输入的数据
5. THE Template_Selector SHALL 支持键盘导航（上下箭头选择，回车确认）
6. THE Audit_System SHALL 在执行异步操作时显示加载指示器

### 需求 11: 响应式设计支持

**用户故事:** 作为审核员，我希望在不同设备上使用审核功能，以便灵活地完成审核工作。

#### 验收标准

1. THE Task_Detail_Page SHALL 在桌面设备（宽度 >= 1024px）上以横向布局显示审核操作区域
2. THE Task_Detail_Page SHALL 在平板设备（宽度 768px - 1023px）上自适应调整布局
3. THE Task_Detail_Page SHALL 在移动设备（宽度 < 768px）上以纵向布局显示审核操作区域
4. THE Template_Selector SHALL 在移动设备上以全屏模式显示
5. THE Settings_Dialog SHALL 在移动设备上以全屏模式显示

### 需求 12: 数据持久化和同步

**用户故事:** 作为审核员，我希望我的配置和模板数据能够持久保存，以便在不同会话中使用。

#### 验收标准

1. WHEN User 创建或修改 Comment_Template, THE Audit_System SHALL 将数据保存到后端数据库
2. WHEN User 创建或修改 Workflow_Config, THE Audit_System SHALL 将数据保存到后端数据库
3. WHEN User 登录系统, THE Audit_System SHALL 从后端加载用户可访问的所有模板和配置
4. WHEN 多个 User 同时修改同一配置, THE Audit_System SHALL 使用最后保存的版本
5. IF 网络连接失败, THEN THE Audit_System SHALL 显示错误消息并允许 User 重试

### 需求 13: 权限控制

**用户故事:** 作为系统管理员，我希望控制用户对模板和配置的访问权限，以便保护系统配置的安全性。

#### 验收标准

1. WHERE User 具有管理员权限, THE Audit_System SHALL 显示"设置"按钮
2. WHERE User 不具有管理员权限, THE Audit_System SHALL 隐藏"设置"按钮
3. WHERE User 具有审核员权限, THE Audit_System SHALL 允许使用 Template_Selector
4. WHERE User 具有管理员权限, THE Audit_System SHALL 允许创建、编辑和删除 Comment_Template
5. WHERE User 具有管理员权限, THE Audit_System SHALL 允许创建、编辑和删除 Workflow_Config
6. WHERE User 不具有管理员权限, THE Audit_System SHALL 仅允许查看和使用现有的模板和配置

### 需求 14: 审核操作完整性

**用户故事:** 作为审核员，我希望审核操作功能保持完整，以便正常完成审核任务。

#### 验收标准

1. THE Task_Detail_Page SHALL 保留所有现有的审核操作功能（通过、驳回、退回）
2. WHEN User 提交审核意见, THE Audit_System SHALL 验证审核意见不为空
3. WHEN User 提交审核意见, THE Audit_System SHALL 将审核结果保存到后端
4. WHEN 审核提交成功, THE Audit_System SHALL 显示成功消息并更新任务状态
5. IF 审核提交失败, THEN THE Audit_System SHALL 显示错误消息并保留用户输入的审核意见
6. WHEN 审核任务状态更新, THE Audit_System SHALL 刷新流程信息显示

### 需求 15: 模板内容格式化

**用户故事:** 作为审核员，我希望模板支持基本的文本格式，以便创建结构化的审核意见。

#### 验收标准

1. THE Comment_Template SHALL 支持多行文本内容
2. THE Comment_Template SHALL 保留文本中的换行符和空格
3. WHEN User 插入 Comment_Template, THE Audit_System SHALL 保持模板的原始格式
4. THE Template_Selector SHALL 在预览中显示模板的格式化内容
5. THE Audit_System SHALL 允许 User 在插入模板后继续编辑审核意见

