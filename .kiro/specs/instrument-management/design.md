# 仪器管理功能技术设计文档

## 概述

本文档描述了实验室信息管理系统(LIMS)中仪器管理模块的技术设计。该模块负责管理实验室仪器设备的全生命周期,包括仪器登记、信息管理、流转、维护、校准和报废等功能。

### 设计目标

- 提供完整的仪器资产管理能力
- 支持仪器全生命周期跟踪
- 与现有样品管理、审核管理等模块无缝集成
- 确保数据一致性和可追溯性
- 提供良好的用户体验和性能

### 技术栈

- **前端**: Vue 3 + TypeScript + Element Plus
- **后端**: Node.js + Express + TypeScript
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **文件存储**: 本地文件系统(可扩展至云存储)

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Vue 3)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 仪器列表页面  │  │ 仪器详情页面  │  │ 仪器登记页面  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 流转管理页面  │  │ 维护记录页面  │  │ 校准记录页面  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端层 (Express + TypeScript)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Routes                         │   │
│  │  /api/instruments  /api/transfers  /api/maintenance  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Controllers                         │   │
│  │  InstrumentController  TransferController  etc.      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Services                           │   │
│  │  InstrumentService  TransferService  etc.            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Middleware                            │   │
│  │  Auth  Validation  ErrorHandler  FileUpload          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   数据层 (PostgreSQL)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Instrument   │  │ Transfer     │  │ Maintenance  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Calibration  │  │ Disposal     │  │ Document     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 模块划分

1. **仪器管理核心模块**
   - 仪器登记
   - 仪器信息管理
   - 仪器查询

2. **流转管理模块**
   - 流转申请
   - 流转确认/拒绝
   - 流转历史查询

3. **维护管理模块**
   - 维护记录添加
   - 维护提醒

4. **校准管理模块**
   - 校准记录添加
   - 校准提醒
   - 校准到期查询

5. **报废管理模块**
   - 报废申请
   - 报废审批

6. **文档管理模块**
   - 文档上传
   - 文档下载
   - 文档关联

7. **统计分析模块**
   - 仪器统计
   - 使用分析
   - 报表生成

## 数据模型设计

### Prisma Schema



```prisma
// 仪器状态枚举
enum InstrumentStatus {
  IN_USE        // 在用
  STANDBY       // 备用
  MAINTENANCE   // 维修中
  CALIBRATING   // 校准中
  PENDING_DISPOSAL // 待报废
  DISPOSED      // 已报废
}

// 流转状态枚举
enum InstrumentTransferStatus {
  PENDING    // 待确认
  CONFIRMED  // 已确认
  REJECTED   // 已拒绝
  COMPLETED  // 已完成
}

// 报废状态枚举
enum DisposalStatus {
  PENDING   // 待审批
  APPROVED  // 已批准
  REJECTED  // 已拒绝
  COMPLETED // 已完成
}

// 维护类型枚举
enum MaintenanceType {
  ROUTINE      // 例行保养
  REPAIR       // 维修
  PARTS_REPLACEMENT // 部件更换
  CLEANING     // 清洁
  OTHER        // 其他
}

// 校准结果枚举
enum CalibrationResult {
  QUALIFIED     // 合格
  UNQUALIFIED   // 不合格
  CONDITIONAL   // 有条件合格
}

// 仪器模型
model Instrument {
  id                String            @id @default(uuid())
  code              String            @unique // 仪器编码
  name              String            // 仪器名称
  model             String?           // 型号
  manufacturer      String?           // 制造商
  serialNumber      String?           // 序列号
  purchaseDate      DateTime?         // 购置日期
  purchasePrice     Float?            // 购置价格
  
  // 技术参数 (JSON格式存储)
  technicalParams   Json?             // { measurementRange, precision, resolution, etc. }
  
  // 当前状态
  status            InstrumentStatus  @default(IN_USE)
  currentLocation   String?           // 当前位置
  currentDepartment String?           // 当前部门
  currentResponsible String?          // 当前负责人
  
  // 使用信息
  usageYears        Int?              // 使用年限
  warrantyExpiry    DateTime?         // 保修到期日期
  
  // 描述信息
  description       String?           @db.Text
  remarks           String?           @db.Text
  
  // 关联关系
  transfers         InstrumentTransfer[]
  maintenanceRecords MaintenanceRecord[]
  calibrationRecords CalibrationRecord[]
  documents         InstrumentDocument[]
  disposalRecord    DisposalRecord?
  
  // 审计字段
  createdBy         String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([code])
  @@index([status])
  @@index([currentDepartment])
  @@index([name])
  @@map("instruments")
}

// 仪器流转记录模型
model InstrumentTransfer {
  id                String                    @id @default(uuid())
  instrumentId      String
  instrument        Instrument                @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  
  // 流转信息
  fromDepartment    String
  toDepartment      String
  fromResponsible   String
  toResponsible     String
  transferReason    String?                   @db.Text
  expectedReturnDate DateTime?
  
  // 状态
  status            InstrumentTransferStatus  @default(PENDING)
  
  // 确认信息
  confirmedAt       DateTime?
  confirmedBy       String?
  rejectedAt        DateTime?
  rejectedBy        String?
  rejectionReason   String?                   @db.Text
  
  // 审计字段
  createdBy         String
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt
  
  @@index([instrumentId])
  @@index([status])
  @@index([createdAt])
  @@map("instrument_transfers")
}

// 维护记录模型
model MaintenanceRecord {
  id                String            @id @default(uuid())
  instrumentId      String
  instrument        Instrument        @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  
  // 维护信息
  maintenanceDate   DateTime
  maintenanceType   MaintenanceType
  maintenanceContent String           @db.Text
  maintenancePerson String
  maintenanceCost   Float?
  
  // 下次维护
  nextMaintenanceDate DateTime?
  
  // 描述
  remarks           String?           @db.Text
  
  // 关联文档
  documents         MaintenanceDocument[]
  
  // 审计字段
  createdBy         String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@index([instrumentId])
  @@index([maintenanceDate])
  @@map("maintenance_records")
}

// 校准记录模型
model CalibrationRecord {
  id                String              @id @default(uuid())
  instrumentId      String
  instrument        Instrument          @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  
  // 校准信息
  calibrationDate   DateTime
  calibrationOrg    String              // 校准机构
  certificateNumber String?             // 证书编号
  calibrationResult CalibrationResult
  
  // 下次校准
  nextCalibrationDate DateTime?
  
  // 描述
  remarks           String?             @db.Text
  
  // 证书文件
  certificateFileId String?
  certificateFile   InstrumentDocument? @relation(fields: [certificateFileId], references: [id])
  
  // 审计字段
  createdBy         String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index([instrumentId])
  @@index([calibrationDate])
  @@index([nextCalibrationDate])
  @@map("calibration_records")
}

// 报废记录模型
model DisposalRecord {
  id                String          @id @default(uuid())
  instrumentId      String          @unique
  instrument        Instrument      @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  
  // 报废信息
  disposalReason    String          @db.Text
  disposalDate      DateTime?
  
  // 审批信息
  status            DisposalStatus  @default(PENDING)
  approvedBy        String?
  approvedAt        DateTime?
  rejectedBy        String?
  rejectedAt        DateTime?
  rejectionReason   String?         @db.Text
  
  // 关联文档
  documents         DisposalDocument[]
  
  // 审计字段
  createdBy         String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  @@index([status])
  @@index([createdAt])
  @@map("disposal_records")
}

// 仪器文档模型
model InstrumentDocument {
  id                String              @id @default(uuid())
  instrumentId      String
  instrument        Instrument          @relation(fields: [instrumentId], references: [id], onDelete: Cascade)
  
  // 文档信息
  fileName          String
  fileSize          Int
  filePath          String
  fileType          String
  documentType      String              // manual, certificate, photo, report, other
  
  // 描述
  description       String?
  
  // 关联
  calibrationRecords CalibrationRecord[]
  
  // 审计字段
  uploadedBy        String
  uploadedAt        DateTime            @default(now())
  
  @@index([instrumentId])
  @@index([documentType])
  @@map("instrument_documents")
}

// 维护文档模型
model MaintenanceDocument {
  id                String              @id @default(uuid())
  maintenanceId     String
  maintenance       MaintenanceRecord   @relation(fields: [maintenanceId], references: [id], onDelete: Cascade)
  
  // 文档信息
  fileName          String
  fileSize          Int
  filePath          String
  fileType          String
  
  // 描述
  description       String?
  
  // 审计字段
  uploadedBy        String
  uploadedAt        DateTime            @default(now())
  
  @@index([maintenanceId])
  @@map("maintenance_documents")
}

// 报废文档模型
model DisposalDocument {
  id                String          @id @default(uuid())
  disposalId        String
  disposal          DisposalRecord  @relation(fields: [disposalId], references: [id], onDelete: Cascade)
  
  // 文档信息
  fileName          String
  fileSize          Int
  filePath          String
  fileType          String
  
  // 描述
  description       String?
  
  // 审计字段
  uploadedBy        String
  uploadedAt        DateTime        @default(now())
  
  @@index([disposalId])
  @@map("disposal_documents")
}
```

### 数据模型说明

1. **Instrument (仪器主表)**
   - 存储仪器的基本信息和当前状态
   - 技术参数使用JSON格式存储,便于扩展
   - 通过外键关联流转、维护、校准等记录

2. **InstrumentTransfer (流转记录)**
   - 记录仪器在部门/人员之间的流转
   - 支持确认/拒绝机制
   - 可设置预期归还时间

3. **MaintenanceRecord (维护记录)**
   - 记录仪器的维护保养历史
   - 支持多种维护类型
   - 可设置下次维护提醒

4. **CalibrationRecord (校准记录)**
   - 记录仪器的校准历史
   - 关联校准证书文件
   - 支持校准到期提醒

5. **DisposalRecord (报废记录)**
   - 记录仪器的报废流程
   - 支持审批工作流
   - 关联报废证明文件

6. **文档模型**
   - 分别为仪器、维护、报废创建独立的文档表
   - 支持多种文档类型
   - 记录上传者和上传时间

## 后端API设计

### API端点列表

#### 仪器管理



| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments` | 创建仪器 | instrument:create |
| GET | `/api/instruments` | 获取仪器列表(分页、筛选) | instrument:read |
| GET | `/api/instruments/:id` | 获取仪器详情 | instrument:read |
| PUT | `/api/instruments/:id` | 更新仪器信息 | instrument:update |
| DELETE | `/api/instruments/:id` | 删除仪器(软删除) | instrument:delete |
| GET | `/api/instruments/code/:code` | 通过编码获取仪器 | instrument:read |
| GET | `/api/instruments/statistics` | 获取仪器统计数据 | instrument:read |

#### 流转管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments/:id/transfers` | 创建流转申请 | transfer:create |
| GET | `/api/instruments/:id/transfers` | 获取仪器流转历史 | transfer:read |
| GET | `/api/transfers` | 获取流转列表 | transfer:read |
| GET | `/api/transfers/:id` | 获取流转详情 | transfer:read |
| PUT | `/api/transfers/:id/confirm` | 确认流转 | transfer:confirm |
| PUT | `/api/transfers/:id/reject` | 拒绝流转 | transfer:reject |

#### 维护管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments/:id/maintenance` | 添加维护记录 | maintenance:create |
| GET | `/api/instruments/:id/maintenance` | 获取仪器维护历史 | maintenance:read |
| GET | `/api/maintenance/:id` | 获取维护记录详情 | maintenance:read |
| PUT | `/api/maintenance/:id` | 更新维护记录 | maintenance:update |
| DELETE | `/api/maintenance/:id` | 删除维护记录 | maintenance:delete |
| GET | `/api/maintenance/reminders` | 获取维护提醒列表 | maintenance:read |

#### 校准管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments/:id/calibration` | 添加校准记录 | calibration:create |
| GET | `/api/instruments/:id/calibration` | 获取仪器校准历史 | calibration:read |
| GET | `/api/calibration/:id` | 获取校准记录详情 | calibration:read |
| PUT | `/api/calibration/:id` | 更新校准记录 | calibration:update |
| DELETE | `/api/calibration/:id` | 删除校准记录 | calibration:delete |
| GET | `/api/calibration/expiring` | 获取即将到期的校准列表 | calibration:read |

#### 报废管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments/:id/disposal` | 创建报废申请 | disposal:create |
| GET | `/api/disposals` | 获取报废申请列表 | disposal:read |
| GET | `/api/disposals/:id` | 获取报废申请详情 | disposal:read |
| PUT | `/api/disposals/:id/approve` | 批准报废申请 | disposal:approve |
| PUT | `/api/disposals/:id/reject` | 拒绝报废申请 | disposal:approve |

#### 文档管理

| 方法 | 端点 | 描述 | 权限 |
|------|------|------|------|
| POST | `/api/instruments/:id/documents` | 上传仪器文档 | document:create |
| GET | `/api/instruments/:id/documents` | 获取仪器文档列表 | document:read |
| GET | `/api/documents/:id` | 下载文档 | document:read |
| DELETE | `/api/documents/:id` | 删除文档 | document:delete |
| POST | `/api/maintenance/:id/documents` | 上传维护文档 | document:create |
| POST | `/api/disposals/:id/documents` | 上传报废文档 | document:create |

### API请求/响应示例

#### 创建仪器

**请求**
```http
POST /api/instruments
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "INS-2024-001",
  "name": "高效液相色谱仪",
  "model": "LC-2030C",
  "manufacturer": "岛津",
  "serialNumber": "C12345678",
  "purchaseDate": "2024-01-15",
  "purchasePrice": 350000,
  "technicalParams": {
    "measurementRange": "190-800nm",
    "precision": "±0.5%",
    "resolution": "0.1nm"
  },
  "status": "IN_USE",
  "currentLocation": "检测室A",
  "currentDepartment": "理化检测部",
  "currentResponsible": "张三",
  "description": "用于水质检测",
  "remarks": "新购设备"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "code": "INS-2024-001",
    "name": "高效液相色谱仪",
    "model": "LC-2030C",
    "manufacturer": "岛津",
    "serialNumber": "C12345678",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "purchasePrice": 350000,
    "technicalParams": {
      "measurementRange": "190-800nm",
      "precision": "±0.5%",
      "resolution": "0.1nm"
    },
    "status": "IN_USE",
    "currentLocation": "检测室A",
    "currentDepartment": "理化检测部",
    "currentResponsible": "张三",
    "description": "用于水质检测",
    "remarks": "新购设备",
    "createdBy": "user-id",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 获取仪器列表

**请求**
```http
GET /api/instruments?page=1&pageSize=20&status=IN_USE&department=理化检测部&search=色谱
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid-1234",
        "code": "INS-2024-001",
        "name": "高效液相色谱仪",
        "model": "LC-2030C",
        "manufacturer": "岛津",
        "status": "IN_USE",
        "currentLocation": "检测室A",
        "currentDepartment": "理化检测部",
        "currentResponsible": "张三",
        "purchaseDate": "2024-01-15T00:00:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

#### 创建流转申请

**请求**
```http
POST /api/instruments/uuid-1234/transfers
Content-Type: application/json
Authorization: Bearer <token>

{
  "fromDepartment": "理化检测部",
  "toDepartment": "微生物检测部",
  "fromResponsible": "张三",
  "toResponsible": "李四",
  "transferReason": "支援微生物检测项目",
  "expectedReturnDate": "2024-03-15"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "transfer-uuid",
    "instrumentId": "uuid-1234",
    "fromDepartment": "理化检测部",
    "toDepartment": "微生物检测部",
    "fromResponsible": "张三",
    "toResponsible": "李四",
    "transferReason": "支援微生物检测项目",
    "expectedReturnDate": "2024-03-15T00:00:00.000Z",
    "status": "PENDING",
    "createdBy": "user-id",
    "createdAt": "2024-01-20T14:30:00.000Z"
  }
}
```

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "INSTRUMENT_NOT_FOUND",
    "message": "仪器不存在",
    "details": {
      "instrumentId": "uuid-1234"
    }
  }
}
```

### 错误码定义

| 错误码 | HTTP状态码 | 描述 |
|--------|-----------|------|
| INSTRUMENT_NOT_FOUND | 404 | 仪器不存在 |
| INSTRUMENT_CODE_EXISTS | 409 | 仪器编码已存在 |
| INVALID_INSTRUMENT_STATUS | 400 | 无效的仪器状态 |
| TRANSFER_NOT_FOUND | 404 | 流转记录不存在 |
| TRANSFER_ALREADY_CONFIRMED | 409 | 流转已确认 |
| DISPOSAL_NOT_ALLOWED | 400 | 不允许报废(存在未完成流转) |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 无权限 |
| VALIDATION_ERROR | 400 | 数据验证失败 |

## 前端设计

### 页面结构



```
src/views/instrument/
├── InstrumentManagement.vue      # 仪器列表页面
├── InstrumentDetail.vue          # 仪器详情页面
├── InstrumentRegistration.vue    # 仪器登记/编辑页面
├── InstrumentTransfer.vue        # 流转管理页面
├── MaintenanceManagement.vue     # 维护管理页面
├── CalibrationManagement.vue     # 校准管理页面
├── DisposalManagement.vue        # 报废管理页面
└── InstrumentStatistics.vue      # 统计分析页面

src/components/instrument/
├── InstrumentForm.vue            # 仪器表单组件
├── TransferForm.vue              # 流转表单组件
├── MaintenanceForm.vue           # 维护表单组件
├── CalibrationForm.vue           # 校准表单组件
├── DisposalForm.vue              # 报废表单组件
├── InstrumentCard.vue            # 仪器卡片组件
├── TransferTimeline.vue          # 流转时间线组件
├── MaintenanceTimeline.vue       # 维护时间线组件
├── CalibrationTimeline.vue       # 校准时间线组件
└── DocumentUpload.vue            # 文档上传组件

src/stores/
└── instrument.ts                 # 仪器状态管理

src/services/
└── instrumentService.ts          # 仪器API服务

src/types/
└── instrument.ts                 # 仪器类型定义
```

### 核心组件设计

#### 1. InstrumentManagement.vue (仪器列表页面)

**功能**
- 显示仪器列表(表格形式)
- 支持搜索和筛选(编码、名称、状态、部门)
- 支持分页
- 提供新建、编辑、删除、查看详情等操作
- 支持批量导出

**布局**
```
┌─────────────────────────────────────────────────────────┐
│ 操作栏: [新建仪器] [导入] [导出] [刷新]                    │
├─────────────────────────────────────────────────────────┤
│ 筛选栏:                                                   │
│ 编码: [____] 名称: [____] 状态: [下拉] 部门: [下拉]       │
│ [搜索] [重置]                                             │
├─────────────────────────────────────────────────────────┤
│ 表格:                                                     │
│ ┌──────┬────────┬────────┬────────┬────────┬──────────┐ │
│ │ 编码 │ 名称   │ 型号   │ 状态   │ 位置   │ 操作     │ │
│ ├──────┼────────┼────────┼────────┼────────┼──────────┤ │
│ │ ...  │ ...    │ ...    │ ...    │ ...    │ [查看]   │ │
│ └──────┴────────┴────────┴────────┴────────┴──────────┘ │
├─────────────────────────────────────────────────────────┤
│ 分页: [<] 1 2 3 [>] 共100条                              │
└─────────────────────────────────────────────────────────┘
```

**关键代码结构**
```vue
<template>
  <div class="instrument-management">
    <!-- 操作栏 -->
    <el-card class="operation-bar">
      <el-button type="primary" @click="handleCreate">新建仪器</el-button>
      <el-button @click="handleExport">导出</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
    </el-card>

    <!-- 筛选栏 -->
    <el-card class="filter-bar">
      <el-form :inline="true">
        <el-form-item label="编码">
          <el-input v-model="filters.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="filters.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status">
            <el-option label="在用" value="IN_USE" />
            <el-option label="备用" value="STANDBY" />
            <!-- 其他状态 -->
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="code" label="编码" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="model" label="型号" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentLocation" label="位置" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link @click="handleView(row)">查看</el-button>
            <el-button link @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        @current-change="fetchInstruments"
        @size-change="fetchInstruments"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInstrumentStore } from '@/stores/instrument'
import type { Instrument } from '@/types/instrument'

const router = useRouter()
const instrumentStore = useInstrumentStore()

const loading = ref(false)
const tableData = ref<Instrument[]>([])
const filters = reactive({
  code: '',
  name: '',
  status: '',
  department: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const fetchInstruments = async () => {
  loading.value = true
  try {
    const result = await instrumentStore.fetchInstruments({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    tableData.value = result.items
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  router.push('/instrument/registration')
}

const handleView = (row: Instrument) => {
  router.push(`/instrument/detail/${row.id}`)
}

const handleEdit = (row: Instrument) => {
  router.push(`/instrument/registration?id=${row.id}`)
}

const handleDelete = async (row: Instrument) => {
  // 删除逻辑
}

onMounted(() => {
  fetchInstruments()
})
</script>
```

#### 2. InstrumentDetail.vue (仪器详情页面)

**功能**
- 显示仪器完整信息
- 显示流转历史(时间线)
- 显示维护记录(时间线)
- 显示校准记录(时间线)
- 显示关联文档列表
- 提供编辑、流转、维护、校准、报废等操作入口

**布局**
```
┌─────────────────────────────────────────────────────────┐
│ [返回列表] [编辑] [流转] [维护] [校准] [报废]              │
├─────────────────────────────────────────────────────────┤
│ 基本信息                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 编码: INS-2024-001    名称: 高效液相色谱仪           │ │
│ │ 型号: LC-2030C        制造商: 岛津                   │ │
│ │ 状态: 在用            位置: 检测室A                  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 技术参数                                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 测量范围: 190-800nm   精度: ±0.5%                    │ │
│ │ 分辨率: 0.1nm                                        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 流转历史 [查看全部]                                       │
│ ○─────○─────○                                           │
│ 2024-01  2024-02  2024-03                               │
├─────────────────────────────────────────────────────────┤
│ 维护记录 [添加记录]                                       │
│ ○─────○─────○                                           │
├─────────────────────────────────────────────────────────┤
│ 校准记录 [添加记录]                                       │
│ ○─────○─────○                                           │
├─────────────────────────────────────────────────────────┤
│ 关联文档 [上传文档]                                       │
│ 📄 说明书.pdf  📄 合格证.pdf                             │
└─────────────────────────────────────────────────────────┘
```

#### 3. InstrumentRegistration.vue (仪器登记/编辑页面)

**功能**
- 提供仪器信息录入表单
- 支持新建和编辑模式
- 表单验证
- 支持上传文档

**表单字段**
- 基本信息: 编码、名称、型号、制造商、序列号
- 购置信息: 购置日期、购置价格、保修到期日期
- 技术参数: 测量范围、精度、分辨率等(动态字段)
- 使用信息: 当前位置、当前部门、当前负责人
- 描述信息: 描述、备注

### 状态管理设计

#### instrument.ts (Pinia Store)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import instrumentService from '@/services/instrumentService'
import type { Instrument, InstrumentQuery, PaginatedResult } from '@/types/instrument'

export const useInstrumentStore = defineStore('instrument', () => {
  // State
  const instruments = ref<Instrument[]>([])
  const currentInstrument = ref<Instrument | null>(null)
  const loading = ref(false)
  const filters = ref<InstrumentQuery>({})
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })

  // Actions
  const fetchInstruments = async (query?: InstrumentQuery): Promise<PaginatedResult<Instrument>> => {
    loading.value = true
    try {
      const result = await instrumentService.getInstruments({
        ...filters.value,
        ...query,
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      })
      instruments.value = result.items
      pagination.value = {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
      return result
    } finally {
      loading.value = false
    }
  }

  const fetchInstrumentById = async (id: string): Promise<Instrument> => {
    loading.value = true
    try {
      const instrument = await instrumentService.getInstrumentById(id)
      currentInstrument.value = instrument
      return instrument
    } finally {
      loading.value = false
    }
  }

  const createInstrument = async (data: CreateInstrumentDto): Promise<Instrument> => {
    const instrument = await instrumentService.createInstrument(data)
    instruments.value.unshift(instrument)
    return instrument
  }

  const updateInstrument = async (id: string, data: UpdateInstrumentDto): Promise<Instrument> => {
    const instrument = await instrumentService.updateInstrument(id, data)
    const index = instruments.value.findIndex(i => i.id === id)
    if (index !== -1) {
      instruments.value[index] = instrument
    }
    if (currentInstrument.value?.id === id) {
      currentInstrument.value = instrument
    }
    return instrument
  }

  const deleteInstrument = async (id: string): Promise<void> => {
    await instrumentService.deleteInstrument(id)
    instruments.value = instruments.value.filter(i => i.id !== id)
    if (currentInstrument.value?.id === id) {
      currentInstrument.value = null
    }
  }

  const setFilters = (newFilters: InstrumentQuery) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const setPage = (page: number) => {
    pagination.value.page = page
  }

  const setPageSize = (pageSize: number) => {
    pagination.value.pageSize = pageSize
  }

  return {
    // State
    instruments,
    currentInstrument,
    loading,
    filters,
    pagination,
    // Actions
    fetchInstruments,
    fetchInstrumentById,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    setFilters,
    setPage,
    setPageSize
  }
})
```

### 类型定义

#### instrument.ts (Types)

```typescript
// 仪器状态
export enum InstrumentStatus {
  IN_USE = 'IN_USE',
  STANDBY = 'STANDBY',
  MAINTENANCE = 'MAINTENANCE',
  CALIBRATING = 'CALIBRATING',
  PENDING_DISPOSAL = 'PENDING_DISPOSAL',
  DISPOSED = 'DISPOSED'
}

// 流转状态
export enum InstrumentTransferStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

// 报废状态
export enum DisposalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

// 维护类型
export enum MaintenanceType {
  ROUTINE = 'ROUTINE',
  REPAIR = 'REPAIR',
  PARTS_REPLACEMENT = 'PARTS_REPLACEMENT',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER'
}

// 校准结果
export enum CalibrationResult {
  QUALIFIED = 'QUALIFIED',
  UNQUALIFIED = 'UNQUALIFIED',
  CONDITIONAL = 'CONDITIONAL'
}

// 仪器接口
export interface Instrument {
  id: string
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  usageYears?: number
  warrantyExpiry?: Date
  description?: string
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 创建仪器DTO
export interface CreateInstrumentDto {
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  description?: string
  remarks?: string
}

// 更新仪器DTO
export interface UpdateInstrumentDto {
  name?: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  description?: string
  remarks?: string
}

// 仪器查询参数
export interface InstrumentQuery {
  page?: number
  pageSize?: number
  code?: string
  name?: string
  status?: InstrumentStatus
  department?: string
  search?: string
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 流转记录
export interface InstrumentTransfer {
  id: string
  instrumentId: string
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: Date
  status: InstrumentTransferStatus
  confirmedAt?: Date
  confirmedBy?: string
  rejectedAt?: Date
  rejectedBy?: string
  rejectionReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 创建流转DTO
export interface CreateTransferDto {
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: Date
}

// 维护记录
export interface MaintenanceRecord {
  id: string
  instrumentId: string
  maintenanceDate: Date
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: Date
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 创建维护记录DTO
export interface CreateMaintenanceDto {
  maintenanceDate: Date
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: Date
  remarks?: string
}

// 校准记录
export interface CalibrationRecord {
  id: string
  instrumentId: string
  calibrationDate: Date
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: Date
  remarks?: string
  certificateFileId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 创建校准记录DTO
export interface CreateCalibrationDto {
  calibrationDate: Date
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: Date
  remarks?: string
}

// 报废记录
export interface DisposalRecord {
  id: string
  instrumentId: string
  disposalReason: string
  disposalDate?: Date
  status: DisposalStatus
  approvedBy?: string
  approvedAt?: Date
  rejectedBy?: string
  rejectedAt?: Date
  rejectionReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 创建报废申请DTO
export interface CreateDisposalDto {
  disposalReason: string
}

// 文档
export interface InstrumentDocument {
  id: string
  instrumentId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  documentType: string
  description?: string
  uploadedBy: string
  uploadedAt: Date
}
```

## 文件上传和存储方案

### 存储策略

1. **本地文件系统存储**
   - 开发和测试环境使用本地存储
   - 文件存储路径: `uploads/instruments/{instrumentId}/{documentType}/`
   - 文件命名: `{timestamp}_{originalName}`

2. **云存储(可选扩展)**
   - 生产环境可选择使用云存储(如阿里云OSS、AWS S3)
   - 通过配置切换存储方式

### 文件上传流程



```
1. 前端选择文件
   ↓
2. 前端验证(文件类型、大小)
   ↓
3. 发送POST请求到 /api/instruments/:id/documents
   ↓
4. 后端接收文件(使用multer中间件)
   ↓
5. 后端验证文件
   ↓
6. 保存文件到存储系统
   ↓
7. 创建文档记录到数据库
   ↓
8. 返回文档信息给前端
```

### 文件上传中间件

```typescript
// backend-api/src/middleware/fileUploadMiddleware.ts
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { Request } from 'express'

// 配置存储
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const instrumentId = req.params.id
    const documentType = req.body.documentType || 'other'
    const uploadPath = path.join('uploads', 'instruments', instrumentId, documentType)
    
    // 确保目录存在
    fs.mkdirSync(uploadPath, { recursive: true })
    
    cb(null, uploadPath)
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const timestamp = Date.now()
    const ext = path.extname(file.originalname)
    const basename = path.basename(file.originalname, ext)
    const filename = `${timestamp}_${basename}${ext}`
    cb(null, filename)
  }
})

// 文件过滤
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'))
  }
}

// 创建上传中间件
export const uploadInstrumentDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
})
```

### 文件下载处理

```typescript
// backend-api/src/controllers/documentController.ts
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // 获取文档信息
    const document = await prisma.instrumentDocument.findUnique({
      where: { id }
    })
    
    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: '文档不存在'
        }
      })
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: '文件不存在'
        }
      })
    }
    
    // 设置响应头
    res.setHeader('Content-Type', document.fileType)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`)
    
    // 发送文件
    res.sendFile(path.resolve(document.filePath))
  } catch (error) {
    logger.error('Download document failed', { error })
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: '下载失败'
      }
    })
  }
}
```

## 权限控制方案

### 权限定义

基于现有的RBAC权限系统,为仪器管理模块定义以下权限:

| 权限代码 | 权限名称 | 描述 |
|---------|---------|------|
| instrument:create | 创建仪器 | 允许创建新仪器 |
| instrument:read | 查看仪器 | 允许查看仪器信息 |
| instrument:update | 更新仪器 | 允许更新仪器信息 |
| instrument:delete | 删除仪器 | 允许删除仪器 |
| transfer:create | 创建流转 | 允许创建流转申请 |
| transfer:read | 查看流转 | 允许查看流转记录 |
| transfer:confirm | 确认流转 | 允许确认/拒绝流转 |
| maintenance:create | 创建维护记录 | 允许添加维护记录 |
| maintenance:read | 查看维护记录 | 允许查看维护记录 |
| maintenance:update | 更新维护记录 | 允许更新维护记录 |
| maintenance:delete | 删除维护记录 | 允许删除维护记录 |
| calibration:create | 创建校准记录 | 允许添加校准记录 |
| calibration:read | 查看校准记录 | 允许查看校准记录 |
| calibration:update | 更新校准记录 | 允许更新校准记录 |
| calibration:delete | 删除校准记录 | 允许删除校准记录 |
| disposal:create | 创建报废申请 | 允许创建报废申请 |
| disposal:read | 查看报废申请 | 允许查看报废申请 |
| disposal:approve | 审批报废申请 | 允许审批报废申请 |
| document:create | 上传文档 | 允许上传文档 |
| document:read | 查看文档 | 允许查看和下载文档 |
| document:delete | 删除文档 | 允许删除文档 |

### 角色权限配置

| 角色 | 权限 |
|------|------|
| 设备管理员 | 所有仪器管理权限 |
| 质量管理员 | instrument:read, calibration:*, maintenance:read |
| 部门负责人 | instrument:read, transfer:*, maintenance:read, calibration:read |
| 普通用户 | instrument:read, transfer:create, transfer:read |

### 权限中间件

```typescript
// backend-api/src/middleware/instrumentPermissionMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import { permissionService } from '../services/permissionService'

export const checkInstrumentPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
      }
      
      // 检查权限
      const hasPermission = await permissionService.checkPermission(
        userId,
        'instrument',
        requiredPermission
      )
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: '无权限执行此操作'
          }
        })
      }
      
      next()
    } catch (error) {
      next(error)
    }
  }
}
```

### 路由权限配置

```typescript
// backend-api/src/routes/instrumentRoutes.ts
import express from 'express'
import { instrumentController } from '../controllers/instrumentController'
import { authMiddleware } from '../middleware/authMiddleware'
import { checkInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

const router = express.Router()

// 所有路由都需要认证
router.use(authMiddleware)

// 仪器管理
router.post(
  '/',
  checkInstrumentPermission('create'),
  instrumentController.createInstrument
)

router.get(
  '/',
  checkInstrumentPermission('read'),
  instrumentController.getInstruments
)

router.get(
  '/:id',
  checkInstrumentPermission('read'),
  instrumentController.getInstrumentById
)

router.put(
  '/:id',
  checkInstrumentPermission('update'),
  instrumentController.updateInstrument
)

router.delete(
  '/:id',
  checkInstrumentPermission('delete'),
  instrumentController.deleteInstrument
)

// 流转管理
router.post(
  '/:id/transfers',
  checkInstrumentPermission('transfer:create'),
  instrumentController.createTransfer
)

// ... 其他路由

export default router
```

## 错误处理

### 错误处理策略

1. **统一错误格式**
   - 所有错误响应使用统一的JSON格式
   - 包含错误码、错误消息和详细信息

2. **错误分类**
   - 客户端错误(4xx): 请求参数错误、权限不足等
   - 服务器错误(5xx): 数据库错误、文件系统错误等

3. **错误日志**
   - 记录所有错误到日志系统
   - 包含错误堆栈、请求信息、用户信息

### 错误处理中间件

```typescript
// backend-api/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 记录错误日志
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  })
  
  // 处理已知错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    })
  }
  
  // 处理Prisma错误
  if (err.name === 'PrismaClientKnownRequestError') {
    // 处理唯一约束违反
    if ((err as any).code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '记录已存在',
          details: (err as any).meta
        }
      })
    }
  }
  
  // 处理未知错误
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '服务器内部错误'
    }
  })
}
```

## 测试策略

### 单元测试

**测试范围**
- Service层业务逻辑
- 工具函数
- 数据验证

**测试框架**
- Jest
- @prisma/client (mock)

**示例测试**
```typescript
// backend-api/src/__tests__/instrumentService.test.ts
import { InstrumentService } from '../services/instrumentService'
import { prismaMock } from './mocks/prisma'

describe('InstrumentService', () => {
  let service: InstrumentService
  
  beforeEach(() => {
    service = new InstrumentService()
  })
  
  describe('createInstrument', () => {
    it('should create instrument with valid data', async () => {
      const mockData = {
        code: 'INS-2024-001',
        name: '高效液相色谱仪',
        model: 'LC-2030C',
        manufacturer: '岛津',
        status: 'IN_USE',
        createdBy: 'user-id'
      }
      
      const mockInstrument = {
        id: 'uuid-1234',
        ...mockData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      prismaMock.instrument.create.mockResolvedValue(mockInstrument)
      
      const result = await service.createInstrument(mockData)
      
      expect(result).toEqual(mockInstrument)
      expect(prismaMock.instrument.create).toHaveBeenCalledWith({
        data: mockData
      })
    })
    
    it('should throw error when code already exists', async () => {
      const mockData = {
        code: 'INS-2024-001',
        name: '高效液相色谱仪',
        createdBy: 'user-id'
      }
      
      prismaMock.instrument.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['code'] }
      })
      
      await expect(service.createInstrument(mockData)).rejects.toThrow()
    })
  })
  
  describe('getInstruments', () => {
    it('should return paginated instruments', async () => {
      const mockInstruments = [
        { id: '1', code: 'INS-001', name: '仪器1' },
        { id: '2', code: 'INS-002', name: '仪器2' }
      ]
      
      prismaMock.instrument.findMany.mockResolvedValue(mockInstruments)
      prismaMock.instrument.count.mockResolvedValue(2)
      
      const result = await service.getInstruments({ page: 1, pageSize: 20 })
      
      expect(result.items).toEqual(mockInstruments)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })
  })
})
```

### 集成测试

**测试范围**
- API端点
- 数据库操作
- 文件上传/下载

**测试框架**
- Jest
- Supertest
- 测试数据库

**示例测试**
```typescript
// backend-api/src/__tests__/instrumentApi.integration.test.ts
import request from 'supertest'
import app from '../app'
import { prisma } from '../config/database'

describe('Instrument API Integration Tests', () => {
  let authToken: string
  let instrumentId: string
  
  beforeAll(async () => {
    // 获取测试用户token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass'
      })
    authToken = loginRes.body.data.token
  })
  
  afterAll(async () => {
    // 清理测试数据
    await prisma.instrument.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    })
    await prisma.$disconnect()
  })
  
  describe('POST /api/instruments', () => {
    it('should create instrument successfully', async () => {
      const res = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-001',
          name: '测试仪器',
          model: 'TEST-MODEL',
          status: 'IN_USE'
        })
      
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('id')
      expect(res.body.data.code).toBe('TEST-001')
      
      instrumentId = res.body.data.id
    })
    
    it('should return 409 when code already exists', async () => {
      const res = await request(app)
        .post('/api/instruments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-001',
          name: '测试仪器2'
        })
      
      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('INSTRUMENT_CODE_EXISTS')
    })
  })
  
  describe('GET /api/instruments', () => {
    it('should return instruments list', async () => {
      const res = await request(app)
        .get('/api/instruments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, pageSize: 20 })
      
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('items')
      expect(res.body.data).toHaveProperty('total')
      expect(Array.isArray(res.body.data.items)).toBe(true)
    })
  })
})
```

### 前端测试

**测试范围**
- 组件渲染
- 用户交互
- API调用

**测试框架**
- Vitest
- Vue Test Utils
- MSW (Mock Service Worker)

**示例测试**
```typescript
// vue-project/src/views/instrument/__tests__/InstrumentManagement.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import InstrumentManagement from '../InstrumentManagement.vue'
import { useInstrumentStore } from '@/stores/instrument'

describe('InstrumentManagement.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should render instrument list', async () => {
    const wrapper = mount(InstrumentManagement)
    
    // 等待数据加载
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.instrument-management').exists()).toBe(true)
    expect(wrapper.find('.operation-bar').exists()).toBe(true)
    expect(wrapper.find('.filter-bar').exists()).toBe(true)
  })
  
  it('should call fetchInstruments on mount', async () => {
    const store = useInstrumentStore()
    const fetchSpy = vi.spyOn(store, 'fetchInstruments')
    
    mount(InstrumentManagement)
    
    expect(fetchSpy).toHaveBeenCalled()
  })
  
  it('should navigate to create page when clicking create button', async () => {
    const mockRouter = {
      push: vi.fn()
    }
    
    const wrapper = mount(InstrumentManagement, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })
    
    await wrapper.find('.create-button').trigger('click')
    
    expect(mockRouter.push).toHaveBeenCalledWith('/instrument/registration')
  })
})
```

## 性能优化

### 数据库优化

1. **索引优化**
   - 在常用查询字段上创建索引
   - 复合索引优化多条件查询

2. **查询优化**
   - 使用分页减少数据传输
   - 使用select指定需要的字段
   - 避免N+1查询问题

3. **连接池配置**
   ```typescript
   // backend-api/src/config/database.ts
   export const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL
       }
     },
     log: ['query', 'error', 'warn'],
     // 连接池配置
     __internal: {
       engine: {
         connection_limit: 10
       }
     }
   })
   ```

### 缓存策略

1. **Redis缓存**
   - 缓存仪器列表(5分钟)
   - 缓存仪器详情(10分钟)
   - 缓存统计数据(30分钟)

2. **缓存失效**
   - 创建/更新/删除仪器时清除相关缓存
   - 使用缓存键模式: `instrument:list:{filters}`, `instrument:detail:{id}`

### 前端优化

1. **组件懒加载**
   ```typescript
   const InstrumentDetail = defineAsyncComponent(() =>
     import('./views/instrument/InstrumentDetail.vue')
   )
   ```

2. **虚拟滚动**
   - 对于大量数据列表使用虚拟滚动

3. **防抖和节流**
   - 搜索输入使用防抖
   - 滚动事件使用节流

## 部署方案

### 数据库迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name add_instrument_models

# 应用迁移到生产环境
npx prisma migrate deploy

# 生成Prisma Client
npx prisma generate
```

### 环境变量配置

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/lims"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=20971520
REDIS_URL="redis://localhost:6379"
```

### Docker部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

## 总结

本设计文档详细描述了仪器管理功能的技术实现方案,包括:

1. **数据模型**: 使用Prisma ORM定义了完整的数据模型,支持仪器全生命周期管理
2. **后端API**: 设计了RESTful API接口,提供完整的CRUD操作和业务功能
3. **前端设计**: 基于Vue 3和Element Plus设计了用户界面和组件
4. **文件管理**: 实现了文件上传、存储和下载功能
5. **权限控制**: 基于RBAC实现了细粒度的权限控制
6. **错误处理**: 统一的错误处理机制
7. **测试策略**: 完整的单元测试和集成测试方案
8. **性能优化**: 数据库优化、缓存策略和前端优化
9. **部署方案**: 数据库迁移和Docker部署

该设计参考了现有样品管理模块的成熟模式,确保了与现有系统的一致性和可维护性。

