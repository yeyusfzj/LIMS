# AI Agent Store 使用指南

## 概述

AI Agent Store 是用于管理本地轻量化 AI 智能体状态的 Pinia store。它提供了实验需求解析、计划生成、智能问答和结果分析的完整功能。

## 功能特性

- ✅ 实验需求文本解析
- ✅ 实验计划自动生成
- ✅ 智能问答功能
- ✅ 实验结果分析
- ✅ 完整的加载状态管理
- ✅ 细粒度的错误处理
- ✅ 问答历史记录
- ✅ TypeScript 类型安全

## 快速开始

### 1. 导入 Store

```typescript
import { useAgentStore } from '@/stores/agent'

// 在组件中使用
const agentStore = useAgentStore()
```

### 2. 解析实验需求

```typescript
// 解析用户输入的实验需求文本
const parsedFields = await agentStore.parseExperiment(
  '我需要检测水样中的重金属含量，包括铅、汞、镉'
)

if (parsedFields) {
  console.log('实验目的:', parsedFields.purpose)
  console.log('样品类型:', parsedFields.sample_type)
  console.log('检测指标:', parsedFields.indicators)
}
```

### 3. 生成实验计划

```typescript
// 使用解析后的字段生成实验计划
const plan = await agentStore.generatePlan()

if (plan) {
  console.log('实验计划:', plan.markdown)
  console.log('所需设备:', plan.equipment)
  console.log('实验步骤:', plan.steps)
}
```

### 4. 完整流程（推荐）

```typescript
// 一次性完成解析和生成计划
const { parsedFields, plan } = await agentStore.parseAndGeneratePlan(
  '我需要检测水样中的重金属含量'
)

if (plan) {
  console.log('实验计划已生成')
}
```

### 5. 智能问答

```typescript
// 向 AI Agent 提问
const qaResult = await agentStore.askQuestion('需要什么设备？')

if (qaResult) {
  console.log('问题:', qaResult.question)
  console.log('回答:', qaResult.answer)
  console.log('置信度:', qaResult.confidence)
}

// 查看问答历史
console.log('历史记录数:', agentStore.qaHistoryCount)
console.log('最新问答:', agentStore.latestQA)
```

### 6. 结果分析

```typescript
// 分析实验结果
const report = await agentStore.analyzeResult({
  '铅含量': 0.05,
  '汞含量': 0.002
})

if (report) {
  console.log('分析状态:', report.status)
  console.log('异常数量:', report.anomalies.length)
  
  report.anomalies.forEach(anomaly => {
    console.log(`${anomaly.indicator}: ${anomaly.message}`)
    console.log(`建议: ${anomaly.suggestion}`)
  })
}
```

## 状态管理

### 状态字段

```typescript
// 解析后的结构化字段
agentStore.parsedFields: ParsedFields | null

// 生成的实验计划
agentStore.experimentPlan: ExperimentPlan | null

// 问答历史记录
agentStore.qaHistory: QAResult[]

// 结果分析报告
agentStore.analysisReport: AnalysisReport | null

// 原始输入文本
agentStore.inputText: string

// 加载状态
agentStore.loading: {
  parsing: boolean
  planning: boolean
  qa: boolean
  analyzing: boolean
}

// 错误状态
agentStore.error: {
  parsing: string | null
  planning: string | null
  qa: string | null
  analyzing: string | null
}
```

### 计算属性

```typescript
// 是否有任何操作正在进行
agentStore.isLoading: boolean

// 是否有任何错误
agentStore.hasError: boolean

// 是否已完成解析
agentStore.hasParsedFields: boolean

// 是否已生成计划
agentStore.hasExperimentPlan: boolean

// 问答历史数量
agentStore.qaHistoryCount: number

// 最近的问答结果
agentStore.latestQA: QAResult | null

// 是否有分析报告
agentStore.hasAnalysisReport: boolean

// 分析报告状态摘要
agentStore.analysisStatus: {
  status: string
  anomalyCount: number
  hasAnomalies: boolean
} | null
```

## 错误处理

### 检查错误

```typescript
// 检查是否有错误
if (agentStore.hasError) {
  console.log('解析错误:', agentStore.error.parsing)
  console.log('计划生成错误:', agentStore.error.planning)
  console.log('问答错误:', agentStore.error.qa)
  console.log('分析错误:', agentStore.error.analyzing)
}
```

### 清除错误

```typescript
// 清除特定类型的错误
agentStore.clearError('parsing')

// 清除所有错误
agentStore.clearAllErrors()
```

## 清除操作

```typescript
// 清除解析结果
agentStore.clearParsedFields()

// 清除实验计划
agentStore.clearExperimentPlan()

// 清除问答历史
agentStore.clearQAHistory()

// 清除分析报告
agentStore.clearAnalysisReport()

// 重置所有状态
agentStore.reset()
```

## 在 Vue 组件中使用

### Composition API

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAgentStore } from '@/stores/agent'

const agentStore = useAgentStore()
const inputText = ref('')

const handleParse = async () => {
  await agentStore.parseExperiment(inputText.value)
}

const handleGeneratePlan = async () => {
  await agentStore.generatePlan()
}
</script>

<template>
  <div>
    <!-- 输入区域 -->
    <textarea v-model="inputText" placeholder="输入实验需求"></textarea>
    <button @click="handleParse" :disabled="agentStore.loading.parsing">
      {{ agentStore.loading.parsing ? '解析中...' : '解析' }}
    </button>
    
    <!-- 错误提示 -->
    <div v-if="agentStore.error.parsing" class="error">
      {{ agentStore.error.parsing }}
    </div>
    
    <!-- 解析结果 -->
    <div v-if="agentStore.parsedFields">
      <h3>解析结果</h3>
      <p>实验目的: {{ agentStore.parsedFields.purpose }}</p>
      <p>样品类型: {{ agentStore.parsedFields.sample_type }}</p>
      <p>检测指标: {{ agentStore.parsedFields.indicators.join(', ') }}</p>
      
      <button @click="handleGeneratePlan" :disabled="agentStore.loading.planning">
        {{ agentStore.loading.planning ? '生成中...' : '生成计划' }}
      </button>
    </div>
    
    <!-- 实验计划 -->
    <div v-if="agentStore.experimentPlan">
      <h3>实验计划</h3>
      <div v-html="agentStore.experimentPlan.markdown"></div>
    </div>
  </div>
</template>
```

### Options API

```vue
<script lang="ts">
import { defineComponent } from 'vue'
import { useAgentStore } from '@/stores/agent'

export default defineComponent({
  setup() {
    const agentStore = useAgentStore()
    return { agentStore }
  },
  
  data() {
    return {
      inputText: ''
    }
  },
  
  methods: {
    async handleParse() {
      await this.agentStore.parseExperiment(this.inputText)
    },
    
    async handleGeneratePlan() {
      await this.agentStore.generatePlan()
    }
  }
})
</script>
```

## 最佳实践

### 1. 使用完整流程方法

对于大多数场景，推荐使用 `parseAndGeneratePlan` 方法：

```typescript
const { parsedFields, plan } = await agentStore.parseAndGeneratePlan(text)
```

### 2. 检查加载状态

在执行操作前检查加载状态，避免重复请求：

```typescript
if (!agentStore.loading.parsing) {
  await agentStore.parseExperiment(text)
}
```

### 3. 处理错误

始终检查错误状态并向用户提供反馈：

```typescript
const result = await agentStore.parseExperiment(text)

if (!result && agentStore.error.parsing) {
  // 显示错误提示
  showErrorMessage(agentStore.error.parsing)
}
```

### 4. 清理状态

在组件卸载或切换场景时清理状态：

```typescript
import { onUnmounted } from 'vue'

onUnmounted(() => {
  agentStore.reset()
})
```

### 5. 使用计算属性

利用 store 提供的计算属性简化逻辑：

```typescript
// 不推荐
if (agentStore.parsedFields !== null) { ... }

// 推荐
if (agentStore.hasParsedFields) { ... }
```

## 类型定义

所有类型定义位于 `@/types/agent.ts`：

- `ParsedFields` - 解析后的结构化字段
- `ExperimentPlan` - 实验计划
- `QAResult` - 问答结果
- `AnalysisReport` - 分析报告
- `Anomaly` - 异常信息
- `Equipment` - 设备信息
- `Material` - 材料信息
- `Indicator` - 指标信息
- `Step` - 实验步骤

## 相关文档

- [需求文档](.kiro/specs/local-ai-agent/requirements.md)
- [设计文档](.kiro/specs/local-ai-agent/design.md)
- [API 服务](../services/api/agent.ts)
- [类型定义](../types/agent.ts)

## 验证需求

本 Store 实现验证了以下需求：

- ✅ 需求 8.1: 前端用户界面 - 提供输入框和显示区域
- ✅ 需求 8.2: 前端用户界面 - 显示解析结果和实验计划
- ✅ 需求 8.15: 前端用户界面 - 调用解析接口
- ✅ 需求 8.16: 前端用户界面 - 调用生成计划接口
- ✅ 需求 8.17: 前端用户界面 - 调用问答接口
- ✅ 需求 8.18: 前端用户界面 - 显示错误提示信息
- ✅ 需求 8.19: 前端用户界面 - 更新显示区域
