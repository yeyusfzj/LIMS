# 仪器服务实现文档

## 概述

InstrumentService 是仪器管理模块的核心服务层,负责处理仪器的 CRUD 操作、状态管理和业务逻辑验证。

## 实现的功能

### 1. 创建仪器 (createInstrument)

**功能描述:**
- 创建新的仪器记录
- 验证仪器编码的唯一性
- 支持完整的仪器信息录入

**参数:**
- `data: CreateInstrumentDto` - 仪器创建数据
- `createdBy: string` - 创建人ID

**返回值:**
- `Promise<Instrument>` - 创建的仪器对象

**业务规则:**
- 仪器编码必须唯一
- 必填字段: code, name
- 默认状态为 IN_USE

**示例:**
```typescript
const instrument = await instrumentService.createInstrument({
  code: 'INS-2024-001',
  name: '高效液相色谱仪',
  model: 'LC-2030C',
  manufacturer: '岛津',
  status: InstrumentStatus.IN_USE
}, 'user-id')
```

### 2. 获取仪器列表 (getInstruments)

**功能描述:**
- 分页查询仪器列表
- 支持多条件筛选
- 支持模糊搜索
- 返回统计信息(流转次数、维护次数等)

**参数:**
- `query: InstrumentQueryDto` - 查询参数

**查询参数支持:**
- `page` - 页码(默认1)
- `pageSize` - 每页数量(默认20)
- `code` - 仪器编码(模糊搜索)
- `name` - 仪器名称(模糊搜索)
- `status` - 仪器状态
- `department` - 所属部门
- `location` - 当前位置
- `manufacturer` - 制造商
- `search` - 全局搜索(编码、名称、型号)
- `startDate` / `endDate` - 购置日期范围

**返回值:**
- `Promise<PaginatedInstrumentResult>` - 分页结果

**示例:**
```typescript
const result = await instrumentService.getInstruments({
  page: 1,
  pageSize: 20,
  status: InstrumentStatus.IN_USE,
  department: '理化检测部'
})
```

### 3. 获取仪器详情 (getInstrumentById)

**功能描述:**
- 通过ID获取仪器完整信息
- 包含关联的流转记录、维护记录、校准记录、文档等

**参数:**
- `id: string` - 仪器ID

**返回值:**
- `Promise<Instrument | null>` - 仪器详情或null

**示例:**
```typescript
const instrument = await instrumentService.getInstrumentById('uuid-1234')
```

### 4. 通过编码获取仪器 (getInstrumentByCode)

**功能描述:**
- 通过仪器编码获取仪器信息
- 包含关联记录

**参数:**
- `code: string` - 仪器编码

**返回值:**
- `Promise<Instrument | null>` - 仪器详情或null

**示例:**
```typescript
const instrument = await instrumentService.getInstrumentByCode('INS-2024-001')
```

### 5. 更新仪器信息 (updateInstrument)

**功能描述:**
- 更新仪器的基本信息
- 验证仪器是否存在

**参数:**
- `id: string` - 仪器ID
- `data: UpdateInstrumentDto` - 更新数据

**返回值:**
- `Promise<Instrument>` - 更新后的仪器对象

**业务规则:**
- 仪器必须存在
- 不能修改仪器编码(code字段不在UpdateDto中)

**示例:**
```typescript
const updated = await instrumentService.updateInstrument('uuid-1234', {
  name: '更新后的名称',
  status: InstrumentStatus.MAINTENANCE
})
```

### 6. 删除仪器 (deleteInstrument)

**功能描述:**
- 软删除仪器(更新状态为DISPOSED)
- 验证是否有未完成的流转记录

**参数:**
- `id: string` - 仪器ID

**返回值:**
- `Promise<void>`

**业务规则:**
- 仪器必须存在
- 不能有未完成的流转记录(PENDING或CONFIRMED状态)
- 软删除:将状态更新为DISPOSED

**示例:**
```typescript
await instrumentService.deleteInstrument('uuid-1234')
```

### 7. 验证仪器编码唯一性 (validateInstrumentCode)

**功能描述:**
- 验证仪器编码是否已存在
- 支持排除指定ID(用于更新时验证)

**参数:**
- `code: string` - 仪器编码
- `excludeId?: string` - 要排除的仪器ID(可选)

**返回值:**
- `Promise<boolean>` - true表示编码可用,false表示已存在

**示例:**
```typescript
const isValid = await instrumentService.validateInstrumentCode('INS-2024-001')
// 更新时验证
const isValid = await instrumentService.validateInstrumentCode('INS-2024-001', 'uuid-1234')
```

### 8. 更新仪器状态 (updateInstrumentStatus)

**功能描述:**
- 更新仪器状态
- 验证状态转换的合法性

**参数:**
- `id: string` - 仪器ID
- `status: InstrumentStatus` - 新状态

**返回值:**
- `Promise<Instrument>` - 更新后的仪器对象

**业务规则:**
- 仪器必须存在
- 已报废的仪器不能恢复到其他状态

**示例:**
```typescript
const updated = await instrumentService.updateInstrumentStatus(
  'uuid-1234',
  InstrumentStatus.MAINTENANCE
)
```

### 9. 批量删除仪器 (batchDeleteInstruments)

**功能描述:**
- 批量删除多个仪器
- 返回成功和失败的统计信息

**参数:**
- `ids: string[]` - 仪器ID数组

**返回值:**
- `Promise<{ success: number; failed: number; errors: string[] }>` - 批量操作结果

**示例:**
```typescript
const result = await instrumentService.batchDeleteInstruments([
  'uuid-1',
  'uuid-2',
  'uuid-3'
])
// result: { success: 2, failed: 1, errors: ['仪器 uuid-2: 该仪器存在未完成的流转记录，无法删除'] }
```

## 数据模型

### CreateInstrumentDto

```typescript
interface CreateInstrumentDto {
  code: string                      // 必填: 仪器编码
  name: string                      // 必填: 仪器名称
  model?: string                    // 可选: 型号
  manufacturer?: string             // 可选: 制造商
  serialNumber?: string             // 可选: 序列号
  purchaseDate?: Date | string      // 可选: 购置日期
  purchasePrice?: number            // 可选: 购置价格
  technicalParams?: TechnicalParams // 可选: 技术参数
  status?: InstrumentStatus         // 可选: 状态(默认IN_USE)
  currentLocation?: string          // 可选: 当前位置
  currentDepartment?: string        // 可选: 当前部门
  currentResponsible?: string       // 可选: 当前负责人
  usageYears?: number               // 可选: 使用年限
  warrantyExpiry?: Date | string    // 可选: 保修到期日期
  description?: string              // 可选: 描述
  remarks?: string                  // 可选: 备注
}
```

### UpdateInstrumentDto

```typescript
interface UpdateInstrumentDto {
  name?: string                     // 可选: 仪器名称
  model?: string                    // 可选: 型号
  manufacturer?: string             // 可选: 制造商
  serialNumber?: string             // 可选: 序列号
  purchaseDate?: Date | string      // 可选: 购置日期
  purchasePrice?: number            // 可选: 购置价格
  technicalParams?: TechnicalParams // 可选: 技术参数
  status?: InstrumentStatus         // 可选: 状态
  currentLocation?: string          // 可选: 当前位置
  currentDepartment?: string        // 可选: 当前部门
  currentResponsible?: string       // 可选: 当前负责人
  usageYears?: number               // 可选: 使用年限
  warrantyExpiry?: Date | string    // 可选: 保修到期日期
  description?: string              // 可选: 描述
  remarks?: string                  // 可选: 备注
}
```

### InstrumentQueryDto

```typescript
interface InstrumentQueryDto {
  page?: number                     // 页码
  pageSize?: number                 // 每页数量
  code?: string                     // 仪器编码
  name?: string                     // 仪器名称
  status?: InstrumentStatus         // 状态
  department?: string               // 部门
  location?: string                 // 位置
  manufacturer?: string             // 制造商
  search?: string                   // 全局搜索
  startDate?: Date | string         // 开始日期
  endDate?: Date | string           // 结束日期
}
```

## 仪器状态枚举

```typescript
enum InstrumentStatus {
  IN_USE = 'IN_USE',                    // 在用
  STANDBY = 'STANDBY',                  // 备用
  MAINTENANCE = 'MAINTENANCE',          // 维修中
  CALIBRATING = 'CALIBRATING',          // 校准中
  PENDING_DISPOSAL = 'PENDING_DISPOSAL', // 待报废
  DISPOSED = 'DISPOSED'                 // 已报废
}
```

## 错误处理

服务层会抛出以下错误:

1. **仪器编码已存在** - 创建仪器时编码重复
2. **仪器不存在** - 操作不存在的仪器
3. **该仪器存在未完成的流转记录，无法删除** - 删除时有未完成流转
4. **已报废的仪器不能恢复到其他状态** - 状态转换验证失败

## 日志记录

服务层使用 logger 记录以下信息:

- **info**: 操作成功(创建、更新、删除等)
- **error**: 操作失败及错误详情

## 测试

单元测试文件: `backend-api/src/__tests__/instrumentService.test.ts`

测试覆盖:
- ✅ 服务实例化
- ✅ 所有方法存在性验证
- ✅ 数据类型验证
- ✅ 状态枚举验证

运行测试:
```bash
npm test -- instrumentService.test.ts --run
```

## 依赖项

- `@prisma/client` - 数据库ORM
- `../types/instrument` - 类型定义
- `../config/logger` - 日志工具

## 使用示例

```typescript
import instrumentService from './services/instrumentService'

// 创建仪器
const instrument = await instrumentService.createInstrument({
  code: 'INS-2024-001',
  name: '高效液相色谱仪',
  model: 'LC-2030C',
  manufacturer: '岛津',
  purchaseDate: '2024-01-15',
  purchasePrice: 350000,
  technicalParams: {
    measurementRange: '190-800nm',
    precision: '±0.5%',
    resolution: '0.1nm'
  },
  status: InstrumentStatus.IN_USE,
  currentLocation: '检测室A',
  currentDepartment: '理化检测部',
  currentResponsible: '张三'
}, 'user-id')

// 查询仪器列表
const result = await instrumentService.getInstruments({
  page: 1,
  pageSize: 20,
  status: InstrumentStatus.IN_USE,
  department: '理化检测部'
})

// 获取仪器详情
const detail = await instrumentService.getInstrumentById(instrument.id)

// 更新仪器
const updated = await instrumentService.updateInstrument(instrument.id, {
  status: InstrumentStatus.MAINTENANCE,
  remarks: '进入维修状态'
})

// 删除仪器
await instrumentService.deleteInstrument(instrument.id)
```

## 后续扩展

InstrumentService 为仪器管理模块提供了核心功能,后续可以基于此服务实现:

1. Controller层 - API路由处理
2. 流转管理服务 - TransferService
3. 维护管理服务 - MaintenanceService
4. 校准管理服务 - CalibrationService
5. 报废管理服务 - DisposalService
6. 文档管理服务 - DocumentService
7. 统计分析服务 - StatisticsService

## 版本历史

- **v1.0.0** (2024-01-15) - 初始实现
  - 实现基本的CRUD操作
  - 实现仪器编码唯一性验证
  - 实现仪器状态管理逻辑
  - 实现软删除功能
  - 实现批量删除功能
