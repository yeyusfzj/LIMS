/**
 * AI Agent Store 测试
 * 
 * 测试 AI Agent Store 的基本功能
 * 包括状态管理、actions 调用和错误处理
 * 
 * 验证需求: 需求 8.1, 8.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentStore } from '../agent'
import { agentApi } from '@/services/api/agent'
import type { ParsedFields, ExperimentPlan, QAResult, AnalysisReport } from '@/types/agent'

// Mock agentApi
vi.mock('@/services/api/agent', () => ({
  agentApi: {
    parseExperiment: vi.fn(),
    generatePlan: vi.fn(),
    askQuestion: vi.fn(),
    analyzeResult: vi.fn(),
    healthCheck: vi.fn()
  }
}))

describe('useAgentStore', () => {
  beforeEach(() => {
    // 创建新的 Pinia 实例
    setActivePinia(createPinia())
    // 清除所有 mock
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useAgentStore()
      
      expect(store.parsedFields).toBeNull()
      expect(store.experimentPlan).toBeNull()
      expect(store.qaHistory).toEqual([])
      expect(store.analysisReport).toBeNull()
      expect(store.inputText).toBe('')
      expect(store.isLoading).toBe(false)
      expect(store.hasError).toBe(false)
    })
  })

  describe('parseExperiment', () => {
    it('应该成功解析实验需求', async () => {
      const store = useAgentStore()
      const mockParsedFields: ParsedFields = {
        purpose: '检测水样重金属',
        sample_type: '水样',
        indicators: ['铅', '汞'],
        equipment: ['原子吸收光谱仪'],
        materials: ['硝酸'],
        steps: ['样品预处理', '上机检测'],
        estimated_time: '2小时',
        confidence: 0.85
      }

      vi.mocked(agentApi.parseExperiment).mockResolvedValue(mockParsedFields)

      const result = await store.parseExperiment('我需要检测水样中的重金属含量')

      expect(result).toEqual(mockParsedFields)
      expect(store.parsedFields).toEqual(mockParsedFields)
      expect(store.inputText).toBe('我需要检测水样中的重金属含量')
      expect(store.hasParsedFields).toBe(true)
      expect(store.error.parsing).toBeNull()
    })

    it('应该处理解析失败的情况', async () => {
      const store = useAgentStore()
      const errorMessage = '解析失败'

      vi.mocked(agentApi.parseExperiment).mockRejectedValue(new Error(errorMessage))

      const result = await store.parseExperiment('无效文本')

      expect(result).toBeNull()
      expect(store.parsedFields).toBeNull()
      expect(store.error.parsing).toBe(errorMessage)
      expect(store.hasParsedFields).toBe(false)
    })

    it('应该在解析时设置加载状态', async () => {
      const store = useAgentStore()
      
      vi.mocked(agentApi.parseExperiment).mockImplementation(() => {
        expect(store.loading.parsing).toBe(true)
        return Promise.resolve({
          purpose: '',
          sample_type: '',
          indicators: [],
          equipment: [],
          materials: [],
          steps: [],
          estimated_time: '',
          confidence: 0
        })
      })

      await store.parseExperiment('测试文本')
      
      expect(store.loading.parsing).toBe(false)
    })
  })

  describe('generatePlan', () => {
    it('应该成功生成实验计划', async () => {
      const store = useAgentStore()
      const mockParsedFields: ParsedFields = {
        purpose: '检测水样重金属',
        sample_type: '水样',
        indicators: ['铅'],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '2小时',
        confidence: 0.85
      }
      
      const mockPlan: ExperimentPlan = {
        id: 'plan_001',
        purpose: '检测水样重金属',
        sample_type: '水样',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '2小时',
        safety_notes: [],
        markdown: '# 实验计划',
        created_at: new Date().toISOString()
      }

      store.parsedFields = mockParsedFields
      vi.mocked(agentApi.generatePlan).mockResolvedValue(mockPlan)

      const result = await store.generatePlan()

      expect(result).toEqual(mockPlan)
      expect(store.experimentPlan).toEqual(mockPlan)
      expect(store.hasExperimentPlan).toBe(true)
      expect(store.error.planning).toBeNull()
    })

    it('应该在没有解析字段时返回错误', async () => {
      const store = useAgentStore()

      const result = await store.generatePlan()

      expect(result).toBeNull()
      expect(store.error.planning).toBe('请先解析实验需求')
    })

    it('应该支持使用自定义字段生成计划', async () => {
      const store = useAgentStore()
      const customFields: ParsedFields = {
        purpose: '自定义实验',
        sample_type: '土壤',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '1小时',
        confidence: 0.9
      }

      const mockPlan: ExperimentPlan = {
        id: 'plan_002',
        purpose: '自定义实验',
        sample_type: '土壤',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '1小时',
        safety_notes: [],
        markdown: '# 实验计划',
        created_at: new Date().toISOString()
      }

      vi.mocked(agentApi.generatePlan).mockResolvedValue(mockPlan)

      const result = await store.generatePlan(customFields)

      expect(result).toEqual(mockPlan)
      expect(agentApi.generatePlan).toHaveBeenCalledWith(customFields)
    })
  })

  describe('askQuestion', () => {
    it('应该成功回答问题', async () => {
      const store = useAgentStore()
      const mockQAResult: QAResult = {
        question: '需要什么设备？',
        answer: '需要原子吸收光谱仪',
        confidence: 0.9,
        sources: ['knowledge_graph']
      }

      vi.mocked(agentApi.askQuestion).mockResolvedValue(mockQAResult)

      const result = await store.askQuestion('需要什么设备？')

      expect(result).toEqual(mockQAResult)
      expect(store.qaHistory).toHaveLength(1)
      expect(store.qaHistory[0]).toEqual(mockQAResult)
      expect(store.latestQA).toEqual(mockQAResult)
      expect(store.qaHistoryCount).toBe(1)
    })

    it('应该支持多次问答并保存历史', async () => {
      const store = useAgentStore()
      const mockQA1: QAResult = {
        question: '问题1',
        answer: '答案1',
        confidence: 0.9,
        sources: []
      }
      const mockQA2: QAResult = {
        question: '问题2',
        answer: '答案2',
        confidence: 0.85,
        sources: []
      }

      vi.mocked(agentApi.askQuestion)
        .mockResolvedValueOnce(mockQA1)
        .mockResolvedValueOnce(mockQA2)

      await store.askQuestion('问题1')
      await store.askQuestion('问题2')

      expect(store.qaHistory).toHaveLength(2)
      expect(store.latestQA).toEqual(mockQA2)
    })
  })

  describe('analyzeResult', () => {
    it('应该成功分析实验结果', async () => {
      const store = useAgentStore()
      const mockReport: AnalysisReport = {
        result_id: 'result_001',
        status: 'warning',
        anomalies: [{
          indicator: '铅含量',
          value: 0.05,
          threshold_min: 0,
          threshold_max: 0.01,
          severity: 'high',
          message: '铅含量超标',
          suggestion: '建议重新检测'
        }],
        summary: '检测到1个异常',
        analyzed_at: new Date().toISOString()
      }

      vi.mocked(agentApi.analyzeResult).mockResolvedValue(mockReport)

      const result = await store.analyzeResult({ '铅含量': 0.05 })

      expect(result).toEqual(mockReport)
      expect(store.analysisReport).toEqual(mockReport)
      expect(store.hasAnalysisReport).toBe(true)
      expect(store.analysisStatus).toEqual({
        status: 'warning',
        anomalyCount: 1,
        hasAnomalies: true
      })
    })
  })

  describe('parseAndGeneratePlan', () => {
    it('应该完成完整流程', async () => {
      const store = useAgentStore()
      const mockParsedFields: ParsedFields = {
        purpose: '检测水样',
        sample_type: '水样',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '2小时',
        confidence: 0.85
      }
      
      const mockPlan: ExperimentPlan = {
        id: 'plan_001',
        purpose: '检测水样',
        sample_type: '水样',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '2小时',
        safety_notes: [],
        markdown: '# 实验计划',
        created_at: new Date().toISOString()
      }

      vi.mocked(agentApi.parseExperiment).mockResolvedValue(mockParsedFields)
      vi.mocked(agentApi.generatePlan).mockResolvedValue(mockPlan)

      const result = await store.parseAndGeneratePlan('检测水样')

      expect(result.parsedFields).toEqual(mockParsedFields)
      expect(result.plan).toEqual(mockPlan)
      expect(store.parsedFields).toEqual(mockParsedFields)
      expect(store.experimentPlan).toEqual(mockPlan)
    })

    it('应该在解析失败时停止流程', async () => {
      const store = useAgentStore()

      vi.mocked(agentApi.parseExperiment).mockRejectedValue(new Error('解析失败'))

      const result = await store.parseAndGeneratePlan('无效文本')

      expect(result.parsedFields).toBeNull()
      expect(result.plan).toBeNull()
      expect(agentApi.generatePlan).not.toHaveBeenCalled()
    })
  })

  describe('清除操作', () => {
    it('应该能够清除解析结果', () => {
      const store = useAgentStore()
      store.parsedFields = {
        purpose: '测试',
        sample_type: '测试',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '',
        confidence: 0.5
      }
      store.error.parsing = '错误'

      store.clearParsedFields()

      expect(store.parsedFields).toBeNull()
      expect(store.error.parsing).toBeNull()
    })

    it('应该能够清除问答历史', () => {
      const store = useAgentStore()
      store.qaHistory = [{
        question: '测试',
        answer: '测试',
        confidence: 0.9,
        sources: []
      }]

      store.clearQAHistory()

      expect(store.qaHistory).toEqual([])
      expect(store.qaHistoryCount).toBe(0)
    })

    it('应该能够重置所有状态', () => {
      const store = useAgentStore()
      
      // 设置一些状态
      store.parsedFields = {
        purpose: '测试',
        sample_type: '测试',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '',
        confidence: 0.5
      }
      store.inputText = '测试文本'
      store.error.parsing = '错误'

      store.reset()

      expect(store.parsedFields).toBeNull()
      expect(store.experimentPlan).toBeNull()
      expect(store.qaHistory).toEqual([])
      expect(store.analysisReport).toBeNull()
      expect(store.inputText).toBe('')
      expect(store.error.parsing).toBeNull()
    })
  })

  describe('计算属性', () => {
    it('isLoading 应该正确反映加载状态', () => {
      const store = useAgentStore()
      
      expect(store.isLoading).toBe(false)
      
      store.loading.parsing = true
      expect(store.isLoading).toBe(true)
      
      store.loading.parsing = false
      store.loading.planning = true
      expect(store.isLoading).toBe(true)
    })

    it('hasError 应该正确反映错误状态', () => {
      const store = useAgentStore()
      
      expect(store.hasError).toBe(false)
      
      store.error.parsing = '错误'
      expect(store.hasError).toBe(true)
      
      store.clearAllErrors()
      expect(store.hasError).toBe(false)
    })
  })
})
