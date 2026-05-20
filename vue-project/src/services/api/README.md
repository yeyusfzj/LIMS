# AI Agent API 服务文档

## 概述

AI Agent API 服务提供了与后端本地轻量化 AI 智能体交互的接口，支持实验需求解析、实验计划生成、智能问答和结果分析功能。

## 功能特性

- ✅ **实验需求解析**: 将自然语言描述的实验需求转换为结构化字段
- ✅ **实验计划生成**: 根据结构化字段生成完整的实验计划文档
- ✅ **智能问答**: 回答用户关于实验的问题（设备、材料、步骤、指标等）
- ✅ **结果分析**: 分析实验结果并检测异常
- ✅ **健康检查**: 检查 AI Agent 服务状态
- ✅ **完整流程**: 封装从解析到生成计划的完整流程

## 安装和导入

```typescript
// 导入 API 服务
import { agentApi } from '@/services'

// 或者直接导入
import agentApi from '@/services/api/agent'

// 导入类型定义
import type {
  ParsedFields,
  ExperimentPlan,
  QAResult,
  AnalysisReport,
  Indicator,
  Equipment,
  Material,
  Step,
  Anomaly
} from '@/services/api/agent'
```

## API 方法

### 1. parseExperiment - 解析实验需求

将自然语言描述的实验需求转换为结构化字段。

**方法签名:**
```typescript
async parseExperiment(text: string): Promise<ParsedFields>
```

**参数:**
- `text` (string): 实验需求文本

**返回值:**
```typescript
interface ParsedFields {
  purpose: string           // 实验目的
  sample_type: string       // 样品类型
  indicators: string[]      // 检测指标列表
  equipment: string[]       // 所需设备列表
  materials: string[]       // 所需材料列表
  steps: string[]           // 实验步骤列表
  estimated_time: string    // 预计时间
  confidence: number        // 解析置信度 (0.0-1.0)
}
```

**使用示例:**
```typescript
try {
  const parsedFields = await agentApi.parseExperiment(
    '我需要检测水样中的重金属含量，包括铅、汞、镉'
  )
  console.log('实验目的:', parsedFields.purpose)
  console.log('样品类型:', parsedFields.sample_type)
  console.log('检测指标:', parsedFields.indicators)
} catch (error) {
  console.error('解析失败:', error.message)
}
```

**验证需求:** 需求 7.1-7.3

---

### 2. generatePlan - 生成实验计划

根据解析后的结构化字段生成完整的实验计划。

**方法签名:**
```typescript
async generatePlan(parsedFields: ParsedFields): Promise<ExperimentPlan>
```

**参数:**
- `parsedFields` (ParsedFields): 解析后的结构化字段

**返回值:**
```typescript
interface ExperimentPlan {
  id: string                  // 计划 ID
  purpose: string             // 实验目的
  sample_type: string         // 样品类型
  indicators: Indicator[]     // 检测指标详细信息
  equipment: Equipment[]      // 设备详细信息
  materials: Material[]       // 材料详细信息
  steps: Step[]               // 详细步骤
  estimated_time: string      // 预计时间
  safety_notes: string[]      // 安全注意事项
  markdown: string            // Markdown 格式的计划文档
  created_at: string          // 创建时间
}
```

**使用示例:**
```typescript
try {
  const parsedFields = await agentApi.parseExperiment('...')
  const plan = await agentApi.generatePlan(parsedFields)
  
  console.log('实验计划 ID:', plan.id)
  console.log('所需设备:', plan.equipment)
  console.log('实验步骤:', plan.steps)
  console.log('Markdown 格式:', plan.markdown)
} catch (error) {
  console.error('生成计划失败:', error.message)
}
```

**验证需求:** 需求 7.4-7.6

---

### 3. askQuestion - 智能问答

回答用户关于实验的问题。

**方法签名:**
```typescript
async askQuestion(
  question: string,
  context?: Record<string, any>
): Promise<QAResult>
```

**参数:**
- `question` (string): 用户问题
- `context` (object, 可选): 上下文信息

**返回值:**
```typescript
interface QAResult {
  question: string      // 用户问题
  answer: string        // 回答内容
  confidence: number    // 回答置信度 (0.0-1.0)
  sources: string[]     // 信息来源列表
}
```

**使用示例:**
```typescript
try {
  // 不带上下文
  const result1 = await agentApi.askQuestion('水质检测需要什么设备？')
  console.log('回答:', result1.answer)
  
  // 带上下文
  const result2 = await agentApi.askQuestion(
    '需要什么设备？',
    { experiment_type: 'water_heavy_metal' }
  )
  console.log('回答:', result2.answer)
} catch (error) {
  console.error('问答失败:', error.message)
}
```

**支持的问题类型:**
- 设备查询: "需要什么设备？"、"用什么仪器？"
- 材料查询: "需要哪些试剂？"、"用什么材料？"
- 步骤查询: "怎么做？"、"实验步骤是什么？"
- 指标查询: "检测什么指标？"、"测什么？"
- 时间查询: "需要多久？"、"时间多长？"

**验证需求:** 需求 7.7-7.9

---

### 4. analyzeResult - 分析实验结果

分析实验结果并检测异常。

**方法签名:**
```typescript
async analyzeResult(
  resultData: Record<string, number>,
  experimentType?: string
): Promise<AnalysisReport>
```

**参数:**
- `resultData` (object): 实验结果数据，格式为 `{indicator_name: value}`
- `experimentType` (string, 可选): 实验类型

**返回值:**
```typescript
interface AnalysisReport {
  result_id: string       // 结果 ID
  status: string          // 状态 ("normal", "warning", "error")
  anomalies: Anomaly[]    // 异常列表
  summary: string         // 分析摘要
  analyzed_at: string     // 分析时间
}

interface Anomaly {
  indicator: string           // 指标名称
  value: number               // 实际值
  threshold_min: number | null  // 阈值下限
  threshold_max: number | null  // 阈值上限
  severity: string            // 严重程度 ("low", "medium", "high")
  message: string             // 异常消息
  suggestion: string          // 建议
}
```

**使用示例:**
```typescript
try {
  // 正常结果
  const normalResult = await agentApi.analyzeResult({
    '铅含量': 0.005,
    '汞含量': 0.0001,
    '镉含量': 0.003
  })
  console.log('状态:', normalResult.status)  // "normal"
  
  // 异常结果
  const abnormalResult = await agentApi.analyzeResult({
    '铅含量': 0.05  // 超出阈值
  })
  console.log('状态:', abnormalResult.status)  // "error"
  console.log('异常列表:', abnormalResult.anomalies)
  
  // 处理异常
  if (abnormalResult.anomalies.length > 0) {
    abnormalResult.anomalies.forEach(anomaly => {
      console.log(`异常指标: ${anomaly.indicator}`)
      console.log(`实际值: ${anomaly.value}`)
      console.log(`阈值范围: ${anomaly.threshold_min} - ${anomaly.threshold_max}`)
      console.log(`严重程度: ${anomaly.severity}`)
      console.log(`建议: ${anomaly.suggestion}`)
    })
  }
} catch (error) {
  console.error('结果分析失败:', error.message)
}
```

**验证需求:** 需求 7.10-7.12

---

### 5. healthCheck - 健康检查

检查 AI Agent 服务的健康状态。

**方法签名:**
```typescript
async healthCheck(): Promise<HealthStatus>
```

**返回值:**
```typescript
interface HealthStatus {
  status: string              // 服务状态 ("healthy" 或 "unhealthy")
  service: string             // 服务名称
  knowledge_graph?: {         // 知识图谱统计信息
    experiment_types: number
    equipment: number
    materials: number
    indicators: number
    steps: number
  }
  modules?: {                 // 核心模块状态
    nlp_parser: string
    plan_generator: string
    qa_engine: string
    result_analyzer: string
  }
  error?: string              // 错误信息（如果不健康）
}
```

**使用示例:**
```typescript
try {
  const health = await agentApi.healthCheck()
  console.log('服务状态:', health.status)
  
  if (health.status === 'healthy') {
    console.log('知识图谱统计:', health.knowledge_graph)
    console.log('模块状态:', health.modules)
  } else {
    console.error('服务不健康:', health.error)
  }
} catch (error) {
  console.error('健康检查失败:', error.message)
}
```

---

### 6. parseAndGeneratePlan - 完整流程

封装从解析到生成计划的完整流程。

**方法签名:**
```typescript
async parseAndGeneratePlan(text: string): Promise<{
  parsedFields: ParsedFields
  plan: ExperimentPlan
}>
```

**参数:**
- `text` (string): 实验需求文本

**返回值:**
```typescript
{
  parsedFields: ParsedFields    // 解析结果
  plan: ExperimentPlan          // 实验计划
}
```

**使用示例:**
```typescript
try {
  const result = await agentApi.parseAndGeneratePlan(
    '我需要检测水样中的重金属含量，包括铅、汞、镉'
  )
  
  console.log('解析结果:', result.parsedFields)
  console.log('实验计划:', result.plan)
} catch (error) {
  console.error('完整流程失败:', error.message)
}
```

---

## 在 Vue 组件中使用

### 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { agentApi } from '@/services'
import type { ParsedFields, ExperimentPlan } from '@/services/api/agent'

const inputText = ref('')
const parsedFields = ref<ParsedFields | null>(null)
const plan = ref<ExperimentPlan | null>(null)
const loading = ref(false)
const error = ref('')

const handleParse = async () => {
  try {
    loading.value = true
    error.value = ''
    parsedFields.value = await agentApi.parseExperiment(inputText.value)
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleGeneratePlan = async () => {
  if (!parsedFields.value) {
    error.value = '请先解析实验需求'
    return
  }
  
  try {
    loading.value = true
    error.value = ''
    plan.value = await agentApi.generatePlan(parsedFields.value)
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <el-input
      v-model="inputText"
      type="textarea"
      placeholder="请输入实验需求"
      :rows="4"
    />
    
    <el-button @click="handleParse" :loading="loading">解析</el-button>
    <el-button @click="handleGeneratePlan" :loading="loading">生成计划</el-button>
    
    <el-alert v-if="error" type="error" :title="error" />
    
    <div v-if="parsedFields">
      <h3>解析结果</h3>
      <p>实验目的: {{ parsedFields.purpose }}</p>
      <p>样品类型: {{ parsedFields.sample_type }}</p>
    </div>
    
    <div v-if="plan">
      <h3>实验计划</h3>
      <div v-html="plan.markdown" />
    </div>
  </div>
</template>
```

### 使用 Pinia Store

```typescript
// stores/agent.ts
import { defineStore } from 'pinia'
import { agentApi } from '@/services'
import type { ParsedFields, ExperimentPlan } from '@/services/api/agent'

export const useAgentStore = defineStore('agent', {
  state: () => ({
    parsedFields: null as ParsedFields | null,
    plan: null as ExperimentPlan | null,
    loading: false,
    error: ''
  }),
  
  actions: {
    async parseExperiment(text: string) {
      this.loading = true
      this.error = ''
      try {
        this.parsedFields = await agentApi.parseExperiment(text)
      } catch (error: any) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async generatePlan() {
      if (!this.parsedFields) {
        throw new Error('请先解析实验需求')
      }
      
      this.loading = true
      this.error = ''
      try {
        this.plan = await agentApi.generatePlan(this.parsedFields)
      } catch (error: any) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
```

## 错误处理

所有 API 方法都会在失败时抛出错误，建议使用 try-catch 进行错误处理：

```typescript
try {
  const result = await agentApi.parseExperiment(text)
  // 处理成功结果
} catch (error: any) {
  // 处理错误
  console.error('操作失败:', error.message)
  ElMessage.error(error.message)
}
```

常见错误类型：
- **输入验证错误 (400)**: 输入文本为空或格式不正确
- **解析失败 (422)**: 无法识别文本或解析置信度过低
- **系统错误 (500)**: 服务器内部错误

## 性能指标

- 解析响应时间: < 500ms
- 计划生成响应时间: < 1s
- 问答响应时间: < 300ms
- 结果分析响应时间: < 500ms

## 相关文档

- [需求文档](.kiro/specs/local-ai-agent/requirements.md)
- [设计文档](.kiro/specs/local-ai-agent/design.md)
- [任务文档](.kiro/specs/local-ai-agent/tasks.md)
- [使用示例](./agent.example.ts)

## 测试

运行单元测试：

```bash
npm run test -- src/services/api/__tests__/agent.test.ts
```

## 版本历史

- **v1.0.0** (2026-05-06): 初始版本
  - 实现解析实验需求功能
  - 实现生成实验计划功能
  - 实现智能问答功能
  - 实现结果分析功能
  - 实现健康检查功能
  - 添加完整流程封装
  - 添加错误处理
  - 添加单元测试
