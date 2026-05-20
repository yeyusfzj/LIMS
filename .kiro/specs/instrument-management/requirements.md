# 仪器管理功能需求文档

## 介绍

本文档定义了实验室信息管理系统(LIMS)中仪器管理模块的功能需求。该模块用于管理实验室的各种检测仪器设备,包括仪器的登记、流转、废弃等全生命周期管理功能。

仪器管理模块将与现有的样品管理、审核管理、报告管理等模块集成,为实验室提供完整的设备资产管理能力。

## 术语表

- **Instrument_Management_System**: 仪器管理系统,负责管理实验室仪器设备的全生命周期
- **Instrument**: 仪器设备,指实验室用于检测、分析的各类设备
- **Instrument_Registry**: 仪器登记模块,负责新仪器的信息录入
- **Transfer_Module**: 流转模块,负责仪器在不同部门或人员之间的转移
- **Disposal_Module**: 废弃模块,负责仪器的报废处理
- **Query_Module**: 查询模块,负责仪器信息的检索和展示
- **Backend_API**: 后端应用程序接口,提供数据处理和业务逻辑
- **Frontend_UI**: 前端用户界面,基于Vue 3构建
- **Database**: 数据库系统,使用PostgreSQL存储仪器数据
- **User**: 系统用户,包括实验室管理员、设备管理员、普通操作员等
- **Department**: 部门,仪器所属或使用的组织单位
- **Instrument_Code**: 仪器编码,唯一标识仪器的编号
- **Calibration_Record**: 校准记录,记录仪器的校准历史
- **Maintenance_Record**: 维护记录,记录仪器的维护保养历史

## 需求

### 需求 1: 仪器登记功能

**用户故事:** 作为设备管理员,我希望能够登记新购入的仪器设备,以便系统能够跟踪和管理这些设备。

#### 验收标准

1. THE Instrument_Registry SHALL 提供仪器信息录入表单
2. WHEN 用户提交仪器登记表单, THE Instrument_Registry SHALL 验证所有必填字段已填写
3. WHEN 仪器编码已存在于系统中, THE Instrument_Registry SHALL 返回错误提示并拒绝登记
4. WHEN 仪器信息验证通过, THE Instrument_Registry SHALL 将仪器信息保存到Database
5. WHEN 仪器登记成功, THE Instrument_Registry SHALL 生成唯一的Instrument_Code
6. WHEN 仪器登记成功, THE Instrument_Registry SHALL 记录登记人和登记时间
7. THE Instrument_Registry SHALL 支持上传仪器相关文档(如说明书、合格证等)
8. THE Instrument_Registry SHALL 支持录入仪器的基本信息(名称、型号、制造商、序列号、购置日期、购置价格)
9. THE Instrument_Registry SHALL 支持录入仪器的技术参数(测量范围、精度、分辨率等)
10. THE Instrument_Registry SHALL 支持设置仪器的初始状态为"在用"、"备用"或"维修中"

### 需求 2: 仪器信息管理

**用户故事:** 作为设备管理员,我希望能够修改和更新仪器信息,以便保持设备信息的准确性。

#### 验收标准

1. THE Instrument_Management_System SHALL 提供仪器信息编辑功能
2. WHEN 用户修改仪器信息, THE Instrument_Management_System SHALL 验证修改后的数据有效性
3. WHEN 用户尝试修改Instrument_Code, THE Instrument_Management_System SHALL 拒绝修改并提示错误
4. WHEN 仪器信息更新成功, THE Instrument_Management_System SHALL 记录修改人、修改时间和修改内容
5. THE Instrument_Management_System SHALL 保留仪器信息的历史版本记录
6. WHEN 仪器正在被使用(关联到检测任务), THE Instrument_Management_System SHALL 限制对关键字段的修改

### 需求 3: 仪器流转功能

**用户故事:** 作为实验室管理员,我希望能够记录仪器在不同部门或人员之间的流转,以便追踪仪器的使用情况和当前位置。

#### 验收标准

1. THE Transfer_Module SHALL 提供仪器流转申请功能
2. WHEN 用户发起流转申请, THE Transfer_Module SHALL 记录源部门、目标部门、源负责人、目标负责人
3. WHEN 用户发起流转申请, THE Transfer_Module SHALL 记录流转原因和预计归还时间
4. WHEN 流转申请创建成功, THE Transfer_Module SHALL 将流转状态设置为"待确认"
5. WHEN 目标负责人确认接收, THE Transfer_Module SHALL 更新流转状态为"已完成"
6. WHEN 目标负责人确认接收, THE Transfer_Module SHALL 更新仪器的当前位置和负责人信息
7. WHEN 目标负责人拒绝接收, THE Transfer_Module SHALL 更新流转状态为"已拒绝"并记录拒绝原因
8. THE Transfer_Module SHALL 支持流转记录的查询和导出
9. THE Transfer_Module SHALL 在流转完成后发送通知给相关人员
10. WHEN 仪器状态为"已报废", THE Transfer_Module SHALL 拒绝创建流转申请

### 需求 4: 仪器废弃功能

**用户故事:** 作为设备管理员,我希望能够对达到使用年限或无法修复的仪器进行报废处理,以便规范设备资产管理。

#### 验收标准

1. THE Disposal_Module SHALL 提供仪器报废申请功能
2. WHEN 用户提交报废申请, THE Disposal_Module SHALL 要求填写报废原因
3. WHEN 用户提交报废申请, THE Disposal_Module SHALL 要求上传相关证明文件(如损坏照片、维修报告等)
4. WHEN 报废申请创建成功, THE Disposal_Module SHALL 将仪器状态更新为"待报废"
5. WHEN 报废申请获得审批通过, THE Disposal_Module SHALL 将仪器状态更新为"已报废"
6. WHEN 报废申请获得审批通过, THE Disposal_Module SHALL 记录报废日期和审批人
7. WHEN 仪器状态为"已报废", THE Disposal_Module SHALL 在仪器列表中标记该仪器为不可用
8. THE Disposal_Module SHALL 保留已报废仪器的历史记录供查询
9. WHEN 仪器存在未完成的流转记录, THE Disposal_Module SHALL 拒绝报废申请并提示错误
10. THE Disposal_Module SHALL 支持报废审批工作流(申请、审核、批准)

### 需求 5: 仪器列表查询

**用户故事:** 作为实验室人员,我希望能够查询和浏览所有仪器的列表,以便了解实验室的设备情况。

#### 验收标准

1. THE Query_Module SHALL 提供仪器列表展示功能
2. THE Query_Module SHALL 显示仪器的关键信息(编码、名称、型号、状态、当前位置、负责人)
3. THE Query_Module SHALL 支持按仪器名称进行模糊搜索
4. THE Query_Module SHALL 支持按仪器编码进行精确搜索
5. THE Query_Module SHALL 支持按仪器状态进行筛选(在用、备用、维修中、待报废、已报废)
6. THE Query_Module SHALL 支持按所属部门进行筛选
7. THE Query_Module SHALL 支持按仪器类型进行筛选
8. THE Query_Module SHALL 支持分页显示,每页显示10、20、50或100条记录
9. THE Query_Module SHALL 支持按登记日期、购置日期排序
10. WHEN 用户点击仪器记录, THE Query_Module SHALL 跳转到仪器详情页面

### 需求 6: 仪器详情查看

**用户故事:** 作为实验室人员,我希望能够查看仪器的完整信息和历史记录,以便全面了解设备状况。

#### 验收标准

1. THE Query_Module SHALL 提供仪器详情页面
2. THE Query_Module SHALL 显示仪器的所有基本信息
3. THE Query_Module SHALL 显示仪器的技术参数信息
4. THE Query_Module SHALL 显示仪器的当前状态和位置信息
5. THE Query_Module SHALL 显示仪器的流转历史记录(按时间倒序)
6. THE Query_Module SHALL 显示仪器的维护保养记录
7. THE Query_Module SHALL 显示仪器的校准记录
8. THE Query_Module SHALL 提供仪器关联文档的下载功能
9. THE Query_Module SHALL 提供返回列表和编辑仪器的操作按钮
10. WHEN 用户无编辑权限, THE Query_Module SHALL 隐藏编辑按钮

### 需求 7: 仪器维护记录管理

**用户故事:** 作为设备管理员,我希望能够记录仪器的维护保养情况,以便跟踪设备的维护历史。

#### 验收标准

1. THE Instrument_Management_System SHALL 提供维护记录添加功能
2. WHEN 用户添加维护记录, THE Instrument_Management_System SHALL 要求填写维护日期、维护类型、维护内容
3. WHEN 用户添加维护记录, THE Instrument_Management_System SHALL 记录维护人员和维护费用
4. THE Instrument_Management_System SHALL 支持上传维护相关文档(如维护报告、更换部件清单)
5. THE Instrument_Management_System SHALL 在仪器详情页展示维护记录列表
6. THE Instrument_Management_System SHALL 支持设置维护提醒(按周期或日期)
7. WHEN 维护周期到期, THE Instrument_Management_System SHALL 发送维护提醒通知

### 需求 8: 仪器校准记录管理

**用户故事:** 作为质量管理员,我希望能够记录仪器的校准情况,以便确保检测结果的准确性和可追溯性。

#### 验收标准

1. THE Instrument_Management_System SHALL 提供校准记录添加功能
2. WHEN 用户添加校准记录, THE Instrument_Management_System SHALL 要求填写校准日期、校准机构、校准证书编号
3. WHEN 用户添加校准记录, THE Instrument_Management_System SHALL 记录校准结果(合格、不合格)和下次校准日期
4. THE Instrument_Management_System SHALL 支持上传校准证书文件
5. THE Instrument_Management_System SHALL 在仪器详情页展示校准记录列表
6. WHEN 校准结果为不合格, THE Instrument_Management_System SHALL 自动将仪器状态更新为"维修中"
7. WHEN 下次校准日期临近(提前30天), THE Instrument_Management_System SHALL 发送校准提醒通知
8. THE Instrument_Management_System SHALL 支持查询校准即将到期的仪器列表

### 需求 9: 后端API设计

**用户故事:** 作为前端开发人员,我需要后端提供RESTful API接口,以便前端能够与后端进行数据交互。

#### 验收标准

1. THE Backend_API SHALL 提供仪器登记接口(POST /api/instruments)
2. THE Backend_API SHALL 提供仪器信息更新接口(PUT /api/instruments/:id)
3. THE Backend_API SHALL 提供仪器列表查询接口(GET /api/instruments)
4. THE Backend_API SHALL 提供仪器详情查询接口(GET /api/instruments/:id)
5. THE Backend_API SHALL 提供仪器删除接口(DELETE /api/instruments/:id)
6. THE Backend_API SHALL 提供流转申请创建接口(POST /api/instruments/:id/transfers)
7. THE Backend_API SHALL 提供流转确认接口(PUT /api/instruments/transfers/:transferId/confirm)
8. THE Backend_API SHALL 提供流转拒绝接口(PUT /api/instruments/transfers/:transferId/reject)
9. THE Backend_API SHALL 提供报废申请创建接口(POST /api/instruments/:id/disposal)
10. THE Backend_API SHALL 提供报废审批接口(PUT /api/instruments/disposals/:disposalId/approve)
11. THE Backend_API SHALL 提供维护记录添加接口(POST /api/instruments/:id/maintenance)
12. THE Backend_API SHALL 提供校准记录添加接口(POST /api/instruments/:id/calibration)
13. THE Backend_API SHALL 提供文件上传接口(POST /api/instruments/:id/documents)
14. WHEN API请求失败, THE Backend_API SHALL 返回标准的错误响应(包含错误码和错误消息)
15. THE Backend_API SHALL 对所有接口实施身份认证和权限验证

### 需求 10: 数据模型设计

**用户故事:** 作为后端开发人员,我需要设计合理的数据模型,以便存储和管理仪器相关数据。

#### 验收标准

1. THE Database SHALL 包含Instrument表存储仪器基本信息
2. THE Database SHALL 包含InstrumentTransfer表存储流转记录
3. THE Database SHALL 包含InstrumentDisposal表存储报废记录
4. THE Database SHALL 包含MaintenanceRecord表存储维护记录
5. THE Database SHALL 包含CalibrationRecord表存储校准记录
6. THE Database SHALL 包含InstrumentDocument表存储文档信息
7. THE Database SHALL 在Instrument表中包含字段: id, code, name, model, manufacturer, serialNumber, purchaseDate, purchasePrice, status, currentLocation, currentResponsible, department
8. THE Database SHALL 在InstrumentTransfer表中包含字段: id, instrumentId, fromDepartment, toDepartment, fromResponsible, toResponsible, transferReason, expectedReturnDate, status, createdAt, confirmedAt
9. THE Database SHALL 在Instrument表的code字段上创建唯一索引
10. THE Database SHALL 在所有表中包含createdAt和updatedAt时间戳字段

### 需求 11: 权限控制

**用户故事:** 作为系统管理员,我希望能够控制不同角色用户对仪器管理功能的访问权限,以便保护敏感数据和关键操作。

#### 验收标准

1. THE Instrument_Management_System SHALL 支持基于角色的权限控制
2. WHEN 用户角色为"设备管理员", THE Instrument_Management_System SHALL 允许执行所有仪器管理操作
3. WHEN 用户角色为"普通用户", THE Instrument_Management_System SHALL 仅允许查看仪器信息和发起流转申请
4. WHEN 用户角色为"质量管理员", THE Instrument_Management_System SHALL 允许添加校准记录和查看所有仪器信息
5. WHEN 用户无相应权限, THE Instrument_Management_System SHALL 拒绝操作并返回403错误
6. THE Instrument_Management_System SHALL 在前端界面根据用户权限显示或隐藏操作按钮

### 需求 12: 数据导出功能

**用户故事:** 作为设备管理员,我希望能够导出仪器数据,以便进行离线分析和报表制作。

#### 验收标准

1. THE Instrument_Management_System SHALL 提供仪器列表导出功能
2. THE Instrument_Management_System SHALL 支持导出为Excel格式(.xlsx)
3. THE Instrument_Management_System SHALL 支持导出为CSV格式(.csv)
4. WHEN 用户选择导出, THE Instrument_Management_System SHALL 导出当前筛选条件下的所有仪器数据
5. THE Instrument_Management_System SHALL 在导出文件中包含所有可见列的数据
6. THE Instrument_Management_System SHALL 支持导出仪器的流转历史记录
7. THE Instrument_Management_System SHALL 支持导出仪器的维护记录
8. WHEN 导出数据量超过10000条, THE Instrument_Management_System SHALL 采用异步导出方式并在完成后通知用户

### 需求 13: 统计分析功能

**用户故事:** 作为实验室主管,我希望能够查看仪器的统计信息,以便了解设备使用情况和资产状况。

#### 验收标准

1. THE Instrument_Management_System SHALL 提供仪器统计仪表板
2. THE Instrument_Management_System SHALL 显示仪器总数统计(按状态分类)
3. THE Instrument_Management_System SHALL 显示仪器价值统计(总价值、各部门价值)
4. THE Instrument_Management_System SHALL 显示仪器使用年限分布图表
5. THE Instrument_Management_System SHALL 显示即将到期校准的仪器数量
6. THE Instrument_Management_System SHALL 显示维护频率统计
7. THE Instrument_Management_System SHALL 显示各部门仪器数量分布
8. THE Instrument_Management_System SHALL 支持按时间范围筛选统计数据
9. THE Instrument_Management_System SHALL 支持导出统计报表

### 需求 14: 响应式设计

**用户故事:** 作为移动设备用户,我希望能够在手机或平板上使用仪器管理功能,以便随时随地查看和管理设备。

#### 验收标准

1. THE Frontend_UI SHALL 采用响应式设计适配不同屏幕尺寸
2. WHEN 屏幕宽度小于768px, THE Frontend_UI SHALL 调整布局为移动端模式
3. WHEN 在移动端模式, THE Frontend_UI SHALL 将表格转换为卡片列表展示
4. WHEN 在移动端模式, THE Frontend_UI SHALL 优化表单布局为单列显示
5. THE Frontend_UI SHALL 确保所有按钮和链接在触摸屏上易于点击(最小44x44px)
6. THE Frontend_UI SHALL 在移动端提供简化的筛选条件面板

### 需求 15: 性能要求

**用户故事:** 作为系统用户,我希望系统响应迅速,以便提高工作效率。

#### 验收标准

1. WHEN 仪器列表包含少于1000条记录, THE Query_Module SHALL 在2秒内返回查询结果
2. WHEN 用户提交仪器登记表单, THE Instrument_Registry SHALL 在3秒内完成保存操作
3. WHEN 用户上传文档, THE Instrument_Management_System SHALL 支持最大20MB的文件
4. THE Backend_API SHALL 对仪器列表查询接口实施分页,每页最多返回100条记录
5. THE Database SHALL 在Instrument表的常用查询字段上创建索引以优化查询性能
6. WHEN 并发用户数超过50, THE Instrument_Management_System SHALL 保持响应时间在5秒以内
