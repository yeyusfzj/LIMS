# 电子签名组件使用说明

## 组件概述

`ElectronicSignature.vue` 是一个用于报告电子签名的 Vue 组件,支持多角色签名流程、签名验证和签名历史记录。

## 功能特性

1. **多角色签名支持**
   - 编制人 (preparer)
   - 审核人 (reviewer)
   - 批准人 (approver)

2. **签名流程控制**
   - 按顺序签名(前序签名完成后才能进行下一个签名)
   - 必需签名和可选签名标识
   - 签名完成后自动锁定报告

3. **签名验证**
   - 密码验证身份
   - 签名数据加密存储
   - 签名意见记录

4. **可视化展示**
   - 签名进度步骤条
   - 签名状态实时更新
   - 签名历史时间线

## 使用方法

### 基本用法

```vue
<template>
  <ElectronicSignature
    :report-id="reportId"
    :signatures="signatures"
    :readonly="false"
    @sign="handleSign"
    @complete="handleSignatureComplete"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ElectronicSignature from '@/components/ElectronicSignature.vue'
import type { Signature } from '@/types'

const reportId = ref('R20240001')
const signatures = ref<Signature[]>([])

const handleSign = (signature: Signature) => {
  // 处理签名事件
  signatures.value.push(signature)
  console.log('新签名:', signature)
}

const handleSignatureComplete = () => {
  // 所有必需签名完成
  console.log('所有签名已完成')
}
</script>
```

### Props

| 属性名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| reportId | string | 是 | - | 报告ID |
| signatures | Signature[] | 否 | [] | 已有的签名列表 |
| readonly | boolean | 否 | false | 是否只读模式 |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| sign | signature: Signature | 添加签名时触发 |
| complete | - | 所有必需签名完成时触发 |

### Signature 类型定义

```typescript
interface Signature {
  role: 'preparer' | 'reviewer' | 'approver'
  userId: string
  userName: string
  signedAt: Date
  signatureData: string // 加密的签名数据
  comments?: string // 签名意见
}
```

## 签名流程

1. **编制人签名**
   - 第一个签名,无前置条件
   - 必需签名

2. **审核人签名**
   - 需要编制人签名完成
   - 必需签名

3. **批准人签名**
   - 需要编制人和审核人签名完成
   - 必需签名

4. **签名完成**
   - 所有必需签名完成后,触发 `complete` 事件
   - 报告自动锁定,无法再修改

## 密码验证

当前演示版本使用简单的密码验证:
- 测试密码: `123456`

实际项目中应该:
1. 调用后端 API 进行身份验证
2. 使用更安全的加密算法
3. 实现数字证书签名

## 样式定制

组件使用 Element Plus 主题色,可以通过修改 Element Plus 主题变量来定制样式:

```scss
// 在你的全局样式文件中
:root {
  --el-color-primary: #409eff;
  --el-color-success: #67c23a;
  --el-color-warning: #e6a23c;
}
```

## 注意事项

1. **签名顺序**: 签名必须按照配置的顺序进行,不能跳过前序签名
2. **签名锁定**: 所有必需签名完成后,报告将被锁定,无法再修改内容
3. **签名验证**: 实际项目中应该实现更严格的身份验证机制
4. **数据持久化**: 签名数据应该及时保存到后端,避免数据丢失

## 集成示例

在报告生成器中的集成示例:

```vue
<template>
  <el-tabs v-model="activeTab">
    <el-tab-pane label="报告内容" name="content">
      <!-- 报告内容 -->
    </el-tab-pane>
    
    <el-tab-pane label="电子签名" name="signature">
      <ElectronicSignature
        :report-id="report.id"
        :signatures="report.signatures"
        :readonly="report.status === 'signed'"
        @sign="handleSign"
        @complete="handleSignatureComplete"
      />
    </el-tab-pane>
  </el-tabs>
</template>
```

## 相关需求

- 需求 16.3: 支持多人电子签名
- 需求 16.4: 验证签名人员的身份和权限
- 需求 16.5: 签名完成后锁定报告内容

## 相关属性

- 属性 34: 签名权限验证
- 属性 35: 报告锁定不可变性
