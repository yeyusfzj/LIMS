# 审核任务样品信息增强 Bug修复设计

## 概述

本次修复旨在解决审核任务列表和详情页面中样品信息显示不完整的问题。当前系统在查询审核任务时,只返回样品的4个基本字段(barcode、sampleNumber、sampleName、clientName),缺少样品类型、采样日期、检测项目、检测方法等关键信息,导致审核人员无法充分了解样品背景就进行审核决策。

修复策略包括:
1. 修改后端auditService.ts的formatAuditTask方法,增加样品详细信息的查询和返回
2. 修改后端auditService.ts的listAuditTasks和getAuditTask方法,使用Prisma的include来关联查询完整的样品信息
3. 在backend-api/prisma/seed.ts中添加审核任务示例数据的创建逻辑
4. 更新前端的审核任务类型定义,添加样品详细信息字段
5. 修改前端AuditTaskList.vue组件,显示样品的完整基本信息
6. 修改前端AuditTaskDetail.vue组件,显示样品的完整详细信息

## 术语表

- **Bug_Condition (C)**: 触发bug的条件 - 当查询审核任务时,返回的样品信息字段不完整
- **Property (P)**: 期望的行为 - 查询审核任务时应返回样品的完整信息,包括基本信息、采样信息、检测信息等
- **Preservation**: 修复不应影响的现有行为 - 审核任务的基本查询、审核决策流程、其他数据的种子创建逻辑
- **formatAuditTask**: backend-api/src/services/auditService.ts中的方法,负责格式化审核任务数据
- **listAuditTasks**: backend-api/src/services/auditService.ts中的方法,负责查询审核任务列表
- **getAuditTask**: backend-api/src/services/auditService.ts中的方法,负责查询单个审核任务详情
- **Prisma include**: Prisma ORM的关联查询功能,用于在查询时包含关联的模型数据
- **seed.ts**: backend-api/prisma/seed.ts,数据库种子脚本,用于创建初始示例数据

## Bug详情

### Bug条件

当后端API查询审核任务(列表或详情)时,系统只返回样品的4个基本字段,缺少审核人员做出决策所需的关键信息。这导致前端无法展示完整的样品信息,审核人员需要额外查询样品详情才能了解样品背景。

**形式化规范:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AuditTaskQuery (包含查询参数)
  OUTPUT: boolean
  
  RETURN (input.queryType IN ['listAuditTasks', 'getAuditTask'])
         AND (返回的sample对象只包含 ['barcode', 'sampleNumber', 'sampleName', 'clientName'])
         AND NOT (返回的sample对象包含 ['sampleType', 'samplingDate', 'samplingLocation', 'testItems', 'results'])
END FUNCTION
```

### 示例

- **示例1**: 调用listAuditTasks API,返回的审核任务列表中,每个任务的sample字段只有{barcode, sampleNumber, sampleName, clientName},缺少sampleType、samplingDate等字段,前端无法显示样品类型和采样日期
- **示例2**: 调用getAuditTask API查询任务详情,返回的sample字段同样只有4个基本字段,前端无法显示采样信息(samplingLocation、samplingPerson)和检测信息(testItems、results)
- **示例3**: 执行npm run seed创建种子数据,数据库中只有用户、角色、样品等数据,没有审核任务示例数据,导致测试环境审核任务列表为空
- **边界情况**: 当样品的某些可选字段(如samplingLocation、samplingPerson)为空时,系统应返回null或空字符串,而不是导致查询失败

## 预期行为

### 保留需求

**不变行为:**
- 审核任务的基本查询逻辑(分页、筛选、排序)必须继续正常工作
- 审核决策流程(通过、拒绝、退回)必须继续正常执行,不受样品信息查询增强的影响
- 数据库种子脚本创建的其他数据(用户、角色、权限、工作流模板、检测方法等)必须继续正常创建

**范围:**
所有不涉及样品信息查询的审核任务操作应完全不受此修复的影响。这包括:
- 审核任务的创建(submitForAudit)
- 审核决策的执行(performAudit)
- 审核任务的转交(reassignAuditTask)
- 审核统计信息的查询(getAuditStatistics)

## 假设的根本原因

基于bug描述,最可能的问题是:

1. **Prisma查询缺少include**: listAuditTasks和getAuditTask方法在查询审核任务时,使用了include来关联sample,但只select了4个基本字段,没有包含完整的样品信息
   - 当前代码: `include: { sample: { select: { barcode: true, sampleNumber: true, sampleName: true, clientName: true } } }`
   - 需要改为包含更多字段或关联查询testItems、results等

2. **formatAuditTask方法未处理完整样品信息**: formatAuditTask方法只是简单地将task.sample传递给返回对象,没有进行额外的数据查询或格式化

3. **种子脚本缺少审核任务数据**: seed.ts中没有创建审核任务示例数据的逻辑,导致测试环境中审核任务列表为空

4. **前端类型定义不完整**: 前端的AuditTask类型定义中,sample字段的类型可能只包含基本字段,没有定义完整的样品信息结构

## 正确性属性

Property 1: Bug条件 - 审核任务查询返回完整样品信息

_对于任何_审核任务查询输入(列表查询或详情查询),修复后的API应返回包含完整样品信息的审核任务数据,包括:
- 基本信息: sampleNumber、sampleName、barcode、clientName、clientContact
- 样品属性: sampleType、sampleCategory、quantity、unit、status、priority
- 采样信息: samplingDate、samplingLocation、samplingPerson
- 存储信息: storageLocation、storageCondition
- 检测信息: testItems数组(包含testMethod、testStandard、status等)
- 检测结果: results数组(包含parameter、value、unit、method等)

**验证: 需求 2.1, 2.2, 2.4, 2.5**

Property 2: 保留 - 非样品信息查询的审核操作

_对于任何_不涉及样品信息查询的审核任务操作(创建审核任务、执行审核决策、转交任务、查询统计信息),修复后的代码应产生与原始代码完全相同的结果,保留所有现有的审核流程逻辑和验证规则。

**验证: 需求 3.1, 3.2, 3.3, 3.4**

## 修复实现

### 需要的更改

假设我们的根本原因分析是正确的:

**文件1**: `backend-api/src/services/auditService.ts`

**方法**: `listAuditTasks`

**具体更改**:
1. **扩展Prisma include查询**: 将sample的select改为完整的include,包含testItems和results关联
   - 修改前: `include: { sample: { select: { barcode: true, sampleNumber: true, sampleName: true, clientName: true } } }`
   - 修改后: `include: { sample: { include: { testItems: true, results: true } } }`

2. **保持分页和筛选逻辑不变**: 确保where条件、orderBy、skip、take等参数保持不变

**文件2**: `backend-api/src/services/auditService.ts`

**方法**: `getAuditTask`

**具体更改**:
1. **扩展Prisma include查询**: 与listAuditTasks相同,使用完整的include来关联样品信息
   - 修改前: `include: { sample: { select: { barcode: true, sampleNumber: true, sampleName: true, clientName: true } } }`
   - 修改后: `include: { sample: { include: { testItems: true, results: true } } }`

**文件3**: `backend-api/src/services/auditService.ts`

**方法**: `formatAuditTask`

**具体更改**:
1. **保持现有格式化逻辑**: formatAuditTask方法不需要修改,因为它只是将task对象传递给返回值,Prisma查询已经包含了完整的样品信息

**文件4**: `backend-api/prisma/seed.ts`

**具体更改**:
1. **添加审核任务示例数据创建逻辑**: 在创建样品数据之后,添加创建审核任务的代码
   - 创建至少3个不同状态的审核任务(PENDING、APPROVED、REJECTED)
   - 每个审核任务关联到已创建的样品
   - 设置不同的审核级别(1、2、3)
   - 为已完成的审核任务设置decision和completedAt

2. **确保审核任务关联的样品已存在**: 在创建审核任务之前,确保相关样品已经创建并且状态正确(IN_AUDIT或AUDIT_COMPLETE)

**文件5**: `vue-project/src/types/audit.ts`

**具体更改**:
1. **扩展AuditTask接口的sample字段类型**: 将sample字段从简单的对象改为完整的Sample类型
   - 添加sampleType、samplingDate、samplingLocation等字段
   - 添加testItems和results数组字段

**文件6**: `vue-project/src/views/audit/AuditTaskList.vue`

**具体更改**:
1. **在表格中添加样品类型列**: 显示row.sample.sampleType
2. **在样品信息列中添加客户名称**: 显示row.sample.clientName
3. **添加采样日期列**: 显示formatDate(row.sample.samplingDate)

**文件7**: `vue-project/src/views/audit/AuditTaskDetail.vue`

**具体更改**:
1. **扩展样品信息卡片**: 添加更多字段显示
   - 样品类型、样品分类、数量、单位
   - 采样日期、采样地点、采样人员
   - 存储位置、存储条件
   
2. **添加检测项目展示**: 使用el-table显示testItems数组
   - 检测方法、检测标准、状态、负责人

3. **扩展检测结果展示**: 确保testResults表格显示完整的results数据
   - 检测参数、检测值、单位、方法、操作人、时间

## 测试策略

### 验证方法

测试策略遵循两阶段方法:首先在未修复的代码上暴露反例以演示bug,然后验证修复后的代码正确工作并保留现有行为。

### 探索性Bug条件检查

**目标**: 在实施修复之前,在未修复的代码上暴露反例以演示bug。确认或反驳根本原因分析。如果反驳,我们需要重新假设。

**测试计划**: 编写测试来调用listAuditTasks和getAuditTask API,断言返回的样品信息只包含4个基本字段,缺少sampleType、samplingDate等字段。在未修复的代码上运行这些测试以观察失败并理解根本原因。

**测试用例**:
1. **列表查询测试**: 调用listAuditTasks API,检查返回的sample对象是否只有4个字段(将在未修复代码上失败)
2. **详情查询测试**: 调用getAuditTask API,检查返回的sample对象是否缺少testItems和results(将在未修复代码上失败)
3. **种子数据测试**: 运行seed脚本后查询审核任务,检查是否有示例数据(将在未修复代码上失败)
4. **前端显示测试**: 在前端组件中尝试访问sample.sampleType,检查是否为undefined(将在未修复代码上失败)

**预期反例**:
- API返回的sample对象只包含{barcode, sampleNumber, sampleName, clientName}
- 可能原因: Prisma查询使用了select限制字段,formatAuditTask未进行额外查询,种子脚本未创建审核任务数据

### 修复检查

**目标**: 验证对于所有满足bug条件的输入,修复后的函数产生预期行为。

**伪代码:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := listAuditTasks_fixed(input) OR getAuditTask_fixed(input)
  ASSERT result.sample包含完整字段(sampleType, samplingDate, testItems, results等)
  ASSERT result.sample.testItems是数组且包含testMethod字段
  ASSERT result.sample.results是数组且包含parameter、value字段
END FOR
```

### 保留检查

**目标**: 验证对于所有不满足bug条件的输入,修复后的函数产生与原始函数相同的结果。

**伪代码:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT auditService_original.submitForAudit(input) = auditService_fixed.submitForAudit(input)
  ASSERT auditService_original.performAudit(input) = auditService_fixed.performAudit(input)
  ASSERT auditService_original.reassignAuditTask(input) = auditService_fixed.reassignAuditTask(input)
END FOR
```

**测试方法**: 推荐使用基于属性的测试进行保留检查,因为:
- 它自动生成许多跨输入域的测试用例
- 它捕获手动单元测试可能遗漏的边界情况
- 它为所有非bug输入提供强有力的保证,确保行为不变

**测试计划**: 首先在未修复的代码上观察非样品查询操作的行为,然后编写基于属性的测试来捕获该行为。

**测试用例**:
1. **审核任务创建保留**: 观察submitForAudit在未修复代码上正常工作,编写测试验证修复后继续工作
2. **审核决策保留**: 观察performAudit在未修复代码上正常工作,编写测试验证修复后继续工作
3. **任务转交保留**: 观察reassignAuditTask在未修复代码上正常工作,编写测试验证修复后继续工作
4. **其他种子数据保留**: 观察seed脚本创建用户、角色、样品等数据正常,编写测试验证修复后继续创建这些数据

### 单元测试

- 测试listAuditTasks返回的sample对象包含所有必需字段
- 测试getAuditTask返回的sample对象包含testItems和results关联数据
- 测试seed脚本创建至少3个审核任务示例数据
- 测试当样品的可选字段为空时,API正常返回null而不是失败

### 基于属性的测试

- 生成随机的审核任务查询参数,验证返回的样品信息始终完整
- 生成随机的样品数据(包括可选字段为空的情况),验证审核任务查询不会失败
- 生成随机的审核决策操作,验证修复后的代码与原始代码产生相同的结果

### 集成测试

- 测试完整的审核流程:创建样品 -> 提交审核 -> 查询审核任务(验证样品信息完整) -> 执行审核决策
- 测试前端组件:加载审核任务列表 -> 验证样品类型、客户名称正确显示 -> 点击查看详情 -> 验证采样信息、检测结果正确显示
- 测试种子数据:运行seed脚本 -> 查询审核任务列表 -> 验证至少有3个不同状态的审核任务
