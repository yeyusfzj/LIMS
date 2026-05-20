/**
 * AI Agent 状态管理 Store
 * 
 * 设计理念:
 * 1. 使用 Pinia 的 Composition API 风格
 * 2. 管理本地轻量化 AI 智能体的所有状态
 * 3. 提供实验需求解析、计划生成、智能问答和结果分析功能
 * 
 * 架构优势:
 * - 集中式状态管理: 统一管理 AI Agent 的所有交互状态
 * - 响应式更新: 状态变化自动通知所有订阅组件
 * - 错误处理: 统一的错误处理和用户提示
 * - 类型安全: 完整的 TypeScript 支持
 * 
 * 设计参考:
 * - 需求文档: .kiro/specs/local-ai-agent/requirements.md (需求 8.1, 8.2)
 * - 设计文档: .kiro/specs/local-ai-agent/design.md (前端架构设计)
 * - API 服务: vue-project/src/services/api/agent.ts
 * 
 * 验证需求: 需求 8.1, 8.2
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { agentApi } from '@/services/api/agent'
import type {
  ParsedFields,
  ExperimentPlan,
  QAResult,
  AnalysisReport
} from '@/types/agent'

export const useAgentStore = defineStore('agent', () => {
  // ========== State ==========
  
  /**
   * 解析后的结构化字段
   * 
   * 存储从用户输入的实验需求文本中提取的结构化信息
   * 包括实验目的、样品类型、检测指标、设备、材料、步骤、预计时间
   * 
   * 验证需求: 需求 1.11, 8.2
   */
  const parsedFields = ref<ParsedFields | null>(null)
  
  /**
   * 生成的实验计划
   * 
   * 存储根据解析字段和知识图谱生成的完整实验计划
   * 包括详细的设备列表、材料列表、实验步骤和安全注意事项
   * 
   * 验证需求: 需求 5.13, 8.2
   */
  const experimentPlan = ref<ExperimentPlan | null>(null)
  
  /**
   * 问答历史记录
   * 
   * 存储用户与 AI Agent 的问答交互历史
   * 支持查看历史对话和上下文理解
   * 
   * 验证需求: 需求 4.8, 8.2
   */
  const qaHistory = ref<QAResult[]>([])
  
  /**
   * 结果分析报告
   * 
   * 存储实验结果的分析报告
   * 包括异常检测、状态评估和改进建议
   * 
   * 验证需求: 需求 6.9, 8.2
   */
  const analysisReport = ref<AnalysisReport | null>(null)
  
  /**
   * 加载状态管理
   * 
   * 细粒度的加载状态控制，支持同时进行多个操作
   * 避免不同操作之间的加载状态冲突
   */
  const loading = ref({
    parsing: false,      // 解析中
    planning: false,     // 生成计划中
    qa: false,          // 问答中
    analyzing: false    // 分析中
  })
  
  /**
   * 错误状态管理
   * 
   * 存储各个操作的错误信息
   * 支持针对性的错误提示和处理
   */
  const error = ref({
    parsing: null as string | null,
    planning: null as string | null,
    qa: null as string | null,
    analyzing: null as string | null
  })
  
  /**
   * 原始输入文本
   * 
   * 保存用户输入的原始实验需求文本
   * 用于重新解析或显示
   */
  const inputText = ref<string>('')

  // ========== Getters ==========
  
  /**
   * 是否有任何操作正在进行
   */
  const isLoading = computed(() => {
    return Object.values(loading.value).some(v => v)
  })
  
  /**
   * 是否有任何错误
   */
  const hasError = computed(() => {
    return Object.values(error.value).some(v => v !== null)
  })
  
  /**
   * 是否已完成解析
   */
  const hasParsedFields = computed(() => {
    return parsedFields.value !== null
  })
  
  /**
   * 是否已生成计划
   */
  const hasExperimentPlan = computed(() => {
    return experimentPlan.value !== null
  })
  
  /**
   * 问答历史数量
   */
  const qaHistoryCount = computed(() => {
    return qaHistory.value.length
  })
  
  /**
   * 最近的问答结果
   */
  const latestQA = computed(() => {
    return qaHistory.value.length > 0 
      ? qaHistory.value[qaHistory.value.length - 1] 
      : null
  })
  
  /**
   * 是否有分析报告
   */
  const hasAnalysisReport = computed(() => {
    return analysisReport.value !== null
  })
  
  /**
   * 分析报告状态摘要
   */
  const analysisStatus = computed(() => {
    if (!analysisReport.value) return null
    
    return {
      status: analysisReport.value.status,
      anomalyCount: analysisReport.value.anomalies.length,
      hasAnomalies: analysisReport.value.anomalies.length > 0
    }
  })

  // ========== Actions ==========
  
  /**
   * 解析实验需求文本
   * 
   * @param text 实验需求文本
   * @returns 解析后的结构化字段
   * 
   * 设计说明:
   * - 调用 NLP 解析器提取关键信息
   * - 自动处理加载状态和错误
   * - 保存原始输入文本
   * 
   * 验证需求: 需求 7.1-7.3, 8.15
   */
  async function parseExperiment(text: string): Promise<ParsedFields | null> {
    // 清除之前的错误
    error.value.parsing = null
    loading.value.parsing = true
    
    try {
      // 保存原始输入
      inputText.value = text
      
      // 调用 API 解析
      const result = await agentApi.parseExperiment(text)
      
      // 保存解析结果
      parsedFields.value = result
      
      return result
    } catch (err: any) {
      // 保存错误信息
      error.value.parsing = err.message || '解析失败'
      
      // 清空解析结果
      parsedFields.value = null
      
      return null
    } finally {
      loading.value.parsing = false
    }
  }
  
  /**
   * 生成实验计划
   * 
   * @param fields 解析后的结构化字段（可选，默认使用 store 中的）
   * @returns 生成的实验计划
   * 
   * 设计说明:
   * - 根据结构化字段查询知识图谱
   * - 生成包含详细信息的完整计划
   * - 支持使用自定义字段或 store 中的字段
   * 
   * 验证需求: 需求 7.4-7.6, 8.16
   */
  async function generatePlan(fields?: ParsedFields): Promise<ExperimentPlan | null> {
    // 使用传入的字段或 store 中的字段
    const fieldsToUse = fields || parsedFields.value
    
    if (!fieldsToUse) {
      error.value.planning = '请先解析实验需求'
      return null
    }
    
    // 清除之前的错误
    error.value.planning = null
    loading.value.planning = true
    
    try {
      // 调用 API 生成计划
      const plan = await agentApi.generatePlan(fieldsToUse)
      
      // 保存计划
      experimentPlan.value = plan
      
      return plan
    } catch (err: any) {
      // 保存错误信息
      error.value.planning = err.message || '生成计划失败'
      
      // 清空计划
      experimentPlan.value = null
      
      return null
    } finally {
      loading.value.planning = false
    }
  }
  
  /**
   * 智能问答
   * 
   * @param question 用户问题
   * @param context 上下文信息（可选）
   * @returns 问答结果
   * 
   * 设计说明:
   * - 识别问题意图并从知识图谱检索信息
   * - 自动添加到问答历史
   * - 支持上下文理解
   * 
   * 验证需求: 需求 7.7-7.9, 8.17
   */
  async function askQuestion(
    question: string, 
    context?: Record<string, any>
  ): Promise<QAResult | null> {
    // 清除之前的错误
    error.value.qa = null
    loading.value.qa = true
    
    try {
      // 调用 API 问答
      const result = await agentApi.askQuestion(question, context)
      
      // 添加到历史记录
      qaHistory.value.push(result)
      
      return result
    } catch (err: any) {
      // 保存错误信息
      error.value.qa = err.message || '问答失败'
      
      return null
    } finally {
      loading.value.qa = false
    }
  }
  
  /**
   * 分析实验结果
   * 
   * @param resultData 实验结果数据，格式为 {indicator_name: value}
   * @param experimentType 实验类型（可选）
   * @returns 分析报告
   * 
   * 设计说明:
   * - 使用规则引擎评估结果数据
   * - 检测超出阈值的异常
   * - 生成分析建议
   * 
   * 验证需求: 需求 7.10-7.12, 8.18
   */
  async function analyzeResult(
    resultData: Record<string, number>,
    experimentType?: string
  ): Promise<AnalysisReport | null> {
    // 清除之前的错误
    error.value.analyzing = null
    loading.value.analyzing = true
    
    try {
      // 调用 API 分析
      const report = await agentApi.analyzeResult(resultData, experimentType)
      
      // 保存分析报告
      analysisReport.value = report
      
      return report
    } catch (err: any) {
      // 保存错误信息
      error.value.analyzing = err.message || '分析失败'
      
      // 清空报告
      analysisReport.value = null
      
      return null
    } finally {
      loading.value.analyzing = false
    }
  }
  
  /**
   * 完整流程：从解析到生成计划
   * 
   * @param text 实验需求文本
   * @returns 包含解析结果和实验计划的对象
   * 
   * 设计说明:
   * - 封装完整的解析-生成流程
   * - 简化组件调用
   * - 统一错误处理
   * 
   * 验证需求: 需求 15.1-15.4
   */
  async function parseAndGeneratePlan(text: string): Promise<{
    parsedFields: ParsedFields | null
    plan: ExperimentPlan | null
  }> {
    // 1. 解析实验需求
    const fields = await parseExperiment(text)
    
    if (!fields) {
      return { parsedFields: null, plan: null }
    }
    
    // 2. 生成实验计划
    const plan = await generatePlan(fields)
    
    return { parsedFields: fields, plan }
  }
  
  /**
   * 清除解析结果
   */
  function clearParsedFields() {
    parsedFields.value = null
    error.value.parsing = null
  }
  
  /**
   * 清除实验计划
   */
  function clearExperimentPlan() {
    experimentPlan.value = null
    error.value.planning = null
  }
  
  /**
   * 清除问答历史
   */
  function clearQAHistory() {
    qaHistory.value = []
    error.value.qa = null
  }
  
  /**
   * 清除分析报告
   */
  function clearAnalysisReport() {
    analysisReport.value = null
    error.value.analyzing = null
  }
  
  /**
   * 清除特定类型的错误
   */
  function clearError(type: keyof typeof error.value) {
    error.value[type] = null
  }
  
  /**
   * 清除所有错误
   */
  function clearAllErrors() {
    error.value = {
      parsing: null,
      planning: null,
      qa: null,
      analyzing: null
    }
  }
  
  /**
   * 重置所有状态
   * 
   * 设计说明:
   * - 清空所有数据和状态
   * - 用于切换场景或重新开始
   */
  function reset() {
    parsedFields.value = null
    experimentPlan.value = null
    qaHistory.value = []
    analysisReport.value = null
    inputText.value = ''
    
    loading.value = {
      parsing: false,
      planning: false,
      qa: false,
      analyzing: false
    }
    
    error.value = {
      parsing: null,
      planning: null,
      qa: null,
      analyzing: null
    }
  }

  return {
    // State
    parsedFields,
    experimentPlan,
    qaHistory,
    analysisReport,
    loading,
    error,
    inputText,
    
    // Getters
    isLoading,
    hasError,
    hasParsedFields,
    hasExperimentPlan,
    qaHistoryCount,
    latestQA,
    hasAnalysisReport,
    analysisStatus,
    
    // Actions
    parseExperiment,
    generatePlan,
    askQuestion,
    analyzeResult,
    parseAndGeneratePlan,
    clearParsedFields,
    clearExperimentPlan,
    clearQAHistory,
    clearAnalysisReport,
    clearError,
    clearAllErrors,
    reset
  }
})
