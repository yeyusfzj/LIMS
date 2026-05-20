/**
 * AI Agent API 服务使用示例
 * 
 * 本文件展示如何在 Vue 组件中使用 AI Agent API 服务
 */

import { agentApi } from '@/services'
import type { ParsedFields, ExperimentPlan, QAResult, AnalysisReport } from '@/types/agent'

/**
 * 示例 1: 解析实验需求文本
 */
export async function example1_parseExperiment() {
  try {
    const text = '我需要检测水样中的重金属含量，包括铅、汞、镉'
    const parsedFields = await agentApi.parseExperiment(text)
    
    console.log('解析结果:', parsedFields)
    console.log('实验目的:', parsedFields.purpose)
    console.log('样品类型:', parsedFields.sample_type)
    console.log('检测指标:', parsedFields.indicators)
    console.log('解析置信度:', parsedFields.confidence)
    
    return parsedFields
  } catch (error: any) {
    console.error('解析失败:', error.message)
    throw error
  }
}

/**
 * 示例 2: 生成实验计划
 */
export async function example2_generatePlan() {
  try {
    // 首先解析实验需求
    const parsedFields = await agentApi.parseExperiment(
      '我需要检测水样中的重金属含量，包括铅、汞、镉'
    )
    
    // 然后生成实验计划
    const plan = await agentApi.generatePlan(parsedFields)
    
    console.log('实验计划 ID:', plan.id)
    console.log('实验目的:', plan.purpose)
    console.log('所需设备:', plan.equipment)
    console.log('所需材料:', plan.materials)
    console.log('实验步骤:', plan.steps)
    console.log('预计时间:', plan.estimated_time)
    console.log('安全注意事项:', plan.safety_notes)
    console.log('Markdown 格式:', plan.markdown)
    
    return plan
  } catch (error: any) {
    console.error('生成计划失败:', error.message)
    throw error
  }
}

/**
 * 示例 3: 完整流程（解析 + 生成计划）
 */
export async function example3_parseAndGeneratePlan() {
  try {
    const text = '我需要检测水样中的重金属含量，包括铅、汞、镉'
    const result = await agentApi.parseAndGeneratePlan(text)
    
    console.log('解析结果:', result.parsedFields)
    console.log('实验计划:', result.plan)
    
    return result
  } catch (error: any) {
    console.error('完整流程失败:', error.message)
    throw error
  }
}

/**
 * 示例 4: 智能问答
 */
export async function example4_askQuestion() {
  try {
    // 不带上下文的问答
    const result1 = await agentApi.askQuestion('水质检测需要什么设备？')
    console.log('问题:', result1.question)
    console.log('回答:', result1.answer)
    console.log('置信度:', result1.confidence)
    
    // 带上下文的问答
    const result2 = await agentApi.askQuestion(
      '需要什么设备？',
      { experiment_type: 'water_heavy_metal' }
    )
    console.log('回答:', result2.answer)
    
    return result1
  } catch (error: any) {
    console.error('问答失败:', error.message)
    throw error
  }
}

/**
 * 示例 5: 分析实验结果
 */
export async function example5_analyzeResult() {
  try {
    // 正常结果
    const normalResult = await agentApi.analyzeResult({
      '铅含量': 0.005,
      '汞含量': 0.0001,
      '镉含量': 0.003
    })
    
    console.log('分析状态:', normalResult.status)
    console.log('异常列表:', normalResult.anomalies)
    console.log('分析摘要:', normalResult.summary)
    
    // 异常结果
    const abnormalResult = await agentApi.analyzeResult({
      '铅含量': 0.05  // 超出阈值
    })
    
    console.log('异常状态:', abnormalResult.status)
    console.log('异常详情:', abnormalResult.anomalies)
    
    if (abnormalResult.anomalies.length > 0) {
      abnormalResult.anomalies.forEach(anomaly => {
        console.log(`异常指标: ${anomaly.indicator}`)
        console.log(`实际值: ${anomaly.value}`)
        console.log(`阈值范围: ${anomaly.threshold_min} - ${anomaly.threshold_max}`)
        console.log(`严重程度: ${anomaly.severity}`)
        console.log(`建议: ${anomaly.suggestion}`)
      })
    }
    
    return abnormalResult
  } catch (error: any) {
    console.error('结果分析失败:', error.message)
    throw error
  }
}

/**
 * 示例 6: 健康检查
 */
export async function example6_healthCheck() {
  try {
    const health = await agentApi.healthCheck()
    
    console.log('服务状态:', health.status)
    console.log('服务名称:', health.service)
    
    if (health.knowledge_graph) {
      console.log('知识图谱统计:')
      console.log('  实验类型数量:', health.knowledge_graph.experiment_types)
      console.log('  设备数量:', health.knowledge_graph.equipment)
      console.log('  材料数量:', health.knowledge_graph.materials)
      console.log('  指标数量:', health.knowledge_graph.indicators)
      console.log('  步骤数量:', health.knowledge_graph.steps)
    }
    
    if (health.modules) {
      console.log('模块状态:')
      console.log('  NLP 解析器:', health.modules.nlp_parser)
      console.log('  计划生成器:', health.modules.plan_generator)
      console.log('  问答引擎:', health.modules.qa_engine)
      console.log('  结果分析器:', health.modules.result_analyzer)
    }
    
    return health
  } catch (error: any) {
    console.error('健康检查失败:', error.message)
    throw error
  }
}

/**
 * 在 Vue 组件中使用的示例
 */
export const vueComponentExample = `
<script setup lang="ts">
import { ref } from 'vue'
import { agentApi } from '@/services'
import type { ParsedFields, ExperimentPlan } from '@/types/agent'

// 响应式数据
const inputText = ref('')
const parsedFields = ref<ParsedFields | null>(null)
const plan = ref<ExperimentPlan | null>(null)
const loading = ref(false)
const error = ref('')

// 解析实验需求
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

// 生成实验计划
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

// 完整流程
const handleFullProcess = async () => {
  try {
    loading.value = true
    error.value = ''
    const result = await agentApi.parseAndGeneratePlan(inputText.value)
    parsedFields.value = result.parsedFields
    plan.value = result.plan
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
    
    <div class="button-group">
      <el-button @click="handleParse" :loading="loading">解析</el-button>
      <el-button @click="handleGeneratePlan" :loading="loading">生成计划</el-button>
      <el-button @click="handleFullProcess" :loading="loading" type="primary">
        完整流程
      </el-button>
    </div>
    
    <el-alert v-if="error" type="error" :title="error" />
    
    <div v-if="parsedFields">
      <h3>解析结果</h3>
      <p>实验目的: {{ parsedFields.purpose }}</p>
      <p>样品类型: {{ parsedFields.sample_type }}</p>
      <p>检测指标: {{ parsedFields.indicators.join(', ') }}</p>
      <p>置信度: {{ parsedFields.confidence }}</p>
    </div>
    
    <div v-if="plan">
      <h3>实验计划</h3>
      <div v-html="plan.markdown" />
    </div>
  </div>
</template>
`

/**
 * 错误处理示例
 */
export async function exampleErrorHandling() {
  try {
    // 尝试解析空文本
    await agentApi.parseExperiment('')
  } catch (error: any) {
    console.error('捕获到错误:', error.message)
    // 在 UI 中显示错误消息
    // ElMessage.error(error.message)
  }
  
  try {
    // 尝试生成计划但缺少必需字段
    await agentApi.generatePlan({
      purpose: '',
      sample_type: '',
      indicators: [],
      equipment: [],
      materials: [],
      steps: [],
      estimated_time: '',
      confidence: 0
    })
  } catch (error: any) {
    console.error('捕获到错误:', error.message)
  }
}
