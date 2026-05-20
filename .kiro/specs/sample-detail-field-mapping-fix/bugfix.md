# 样品详情页面字段映射问题修复

## 问题描述

用户反馈样品详情页面显示不完整，很多字段（如样品名称、委托方等）都不显示，数据关联有问题。

## 问题分析

### 根本原因

**前后端字段命名不一致**：

1. **后端返回蛇形命名**：
   - `sample_name`（样品名称）
   - `client_name`（委托方）
   - `sample_category`（样品类别）
   - `storage_location`（存储位置）
   - 等等...

2. **前端 API 服务已做转换**：
   - `vue-project/src/services/api/sample.ts` 中的 `getById` 方法
   - 将后端的蛇形命名转换为驼峰命名
   - 返回 `sampleName`, `clientName`, `sampleCategory` 等

3. **详情页面使用错误的字段名**：
   - 模板中使用 `sampleData.name`（错误）
   - 应该使用 `sampleData.sampleName`（正确）
   - 模板中使用 `sampleData.source`（错误）
   - 应该使用 `sampleData.sampleCategory`（正确）

### 字段映射对照表

| 后端字段（蛇形） | API 转换后（驼峰） | 详情页面错误使用 | 正确使用 |
|-----------------|-------------------|-----------------|---------|
| sample_name | sampleName | name | sampleName |
| client_name | clientName | client | clientName |
| sample_category | sampleCategory | source | sampleCategory |
| sample_type | sampleType | sampleType | sampleType ✓ |
| storage_location | storageLocation | currentLocation | storageLocation |
| storage_condition | storageCondition | storageConditions | storageCondition |
| description | description | description | description ✓ |
| priority | priority | - | priority |

## 解决方案

### 1. 修复样品详情页面的字段映射

**文件**: `vue-project/src/views/sample/SampleDetail.vue`

#### 修改前（错误的字段名）

```vue
<el-descriptions-item label="样品名称">
  {{ sampleData.name }}
</el-descriptions-item>
<el-descriptions-item label="样品来源">
  {{ sampleData.source }}
</el-descriptions-item>
<el-descriptions-item label="委托方">
  {{ sampleData.client }}
</el-descriptions-item>
<el-descriptions-item label="当前位置">
  {{ sampleData.currentLocation }}
</el-descriptions-item>
```

#### 修改后（正确的字段名）

```vue
<el-descriptions-item label="样品名称">
  {{ sampleData.sampleName }}
</el-descriptions-item>
<el-descriptions-item label="样品类别">
  {{ sampleData.sampleCategory }}
</el-descriptions-item>
<el-descriptions-item label="委托方">
  {{ sampleData.clientName }}
</el-descriptions-item>
<el-descriptions-item label="存储位置">
  {{ sampleData.storageLocation }}
</el-descriptions-item>
```

### 2. 添加缺失的字段显示

添加了以下字段的显示：

- **优先级**：显示样品的优先级（低/普通/高/紧急）
- **描述**：显示样品的描述信息
- **存储条件**：显示存储条件（如"4°C冷藏"）

### 3. 添加优先级辅助方法

```typescript
// 优先级相关
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    LOW: '低',
    NORMAL: '普通',
    HIGH: '高',
    URGENT: '紧急'
  }
  return priorityMap[priority] || priority
}

const getPriorityType = (priority: string) => {
  const typeMap: Record<string, any> = {
    LOW: 'info',
    NORMAL: '',
    HIGH: 'warning',
    URGENT: 'danger'
  }
  return typeMap[priority] || ''
}
```

## 完整的字段映射

### 后端返回（蛇形命名）

```json
{
  "id": "c9a8a88e-4b51-4715-b290-52f8b052a46c",
  "barcode": "SAMPLE-2024-003",
  "sample_number": "S2024003",
  "sample_name": "蔬菜样品",
  "client_name": "某食品厂",
  "client_contact": "13700137003",
  "sample_type": "食品",
  "sample_category": "蔬菜",
  "quantity": 500,
  "unit": "g",
  "received_date": "2024-01-17T00:00:00",
  "storage_location": "A区-03号冷藏柜",
  "storage_condition": "4°C冷藏",
  "priority": "URGENT",
  "description": "测试更新 - 2026-04-23T07:34:07.830Z",
  "status": "TESTING_COMPLETE",
  "created_at": "2026-04-23T05:42:08.395000",
  "updated_at": "2026-04-23T07:38:22.649000"
}
```

### API 服务转换后（驼峰命名）

```typescript
{
  id: "c9a8a88e-4b51-4715-b290-52f8b052a46c",
  barcode: "SAMPLE-2024-003",
  sampleNumber: "S2024003",
  sampleName: "蔬菜样品",
  clientName: "某食品厂",
  clientContact: "13700137003",
  sampleType: "食品",
  sampleCategory: "蔬菜",
  quantity: 500,
  unit: "g",
  receivedDate: "2024-01-17T00:00:00",
  storageLocation: "A区-03号冷藏柜",
  storageCondition: "4°C冷藏",
  priority: "URGENT",
  description: "测试更新 - 2026-04-23T07:34:07.830Z",
  status: "TESTING_COMPLETE",
  createdAt: "2026-04-23T05:42:08.395000",
  updatedAt: "2026-04-23T07:38:22.649000"
}
```

### 详情页面使用（正确）

```vue
<template>
  <el-descriptions :column="2" border v-if="sampleData">
    <el-descriptions-item label="样品条码">
      {{ sampleData.barcode }}
    </el-descriptions-item>
    <el-descriptions-item label="样品名称">
      {{ sampleData.sampleName }}
    </el-descriptions-item>
    <el-descriptions-item label="样品类别">
      {{ sampleData.sampleCategory }}
    </el-descriptions-item>
    <el-descriptions-item label="委托方">
      {{ sampleData.clientName }}
    </el-descriptions-item>
    <el-descriptions-item label="样品类型">
      {{ sampleData.sampleType }}
    </el-descriptions-item>
    <el-descriptions-item label="存储位置">
      {{ sampleData.storageLocation }}
    </el-descriptions-item>
    <el-descriptions-item label="存储条件">
      {{ sampleData.storageCondition }}
    </el-descriptions-item>
    <el-descriptions-item label="优先级">
      <el-tag :type="getPriorityType(sampleData.priority)">
        {{ getPriorityText(sampleData.priority) }}
      </el-tag>
    </el-descriptions-item>
    <el-descriptions-item label="描述" :span="2">
      {{ sampleData.description }}
    </el-descriptions-item>
  </el-descriptions>
</template>
```

## 测试验证

### 测试脚本

创建了 `test-sample-detail-display.js` 测试脚本，验证：

1. ✓ 后端返回数据正常
2. ✓ 字段名称为蛇形命名
3. ✓ API 服务正确转换为驼峰命名
4. ✓ 所有字段都有值

### 测试结果

```
✓ 样品名称 (sample_name): 蔬菜样品
✓ 委托方 (client_name): 某食品厂
✓ 样品类别 (sample_category): 蔬菜
✓ 样品类型 (sample_type): 食品
✓ 存储位置 (storage_location): A区-03号冷藏柜
✓ 描述 (description): 测试更新 - 2026-04-23T07:34:07.830Z
✓ 优先级 (priority): URGENT
```

## 影响范围

### 修改的文件

1. `vue-project/src/views/sample/SampleDetail.vue`
   - 修复所有字段名映射
   - 添加优先级显示
   - 添加描述和存储条件显示
   - 添加优先级辅助方法

### 影响的功能

- ✓ 样品详情查看（现在显示完整数据）
- ✓ 样品编辑（字段映射正确）
- ✓ 样品信息展示（所有字段都能正确显示）

### 不影响的功能

- 样品列表（已经正确）
- 样品创建（已经正确）
- 样品删除
- 样品流转

## 相关问题修复

本次修复同时解决了以下问题：

1. **样品编辑 405 错误**：前端使用 PATCH 方法
2. **样品编辑后数据不刷新**：使用真实 API 并添加刷新机制
3. **样品详情字段不显示**：修复字段映射

## 最佳实践

### 命名规范

1. **后端使用蛇形命名**：`sample_name`, `client_name`
2. **前端使用驼峰命名**：`sampleName`, `clientName`
3. **API 服务负责转换**：在 API 服务层统一转换命名风格

### 字段映射

1. **明确字段对应关系**：维护字段映射文档
2. **统一转换逻辑**：在 API 服务层统一处理
3. **类型定义**：使用 TypeScript 类型定义确保字段正确

### 测试验证

1. **端到端测试**：测试完整的数据流
2. **字段验证**：验证所有字段都能正确显示
3. **边界情况**：测试空值、null 值的处理

## 预防措施

1. **使用 TypeScript 类型**：定义明确的接口类型
2. **代码审查**：检查字段名是否正确
3. **自动化测试**：编写测试用例验证字段映射
4. **文档维护**：维护字段映射对照表

## 修复日期

2026-04-23

## 修复人员

Kiro AI Assistant
