/**
 * AI Agent API 服务单元测试
 * 
 * 测试策略:
 * 1. 测试每个 API 方法的基本功能
 * 2. 测试错误处理
 * 3. 测试数据格式转换
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { agentApi } from '../agent'
import type { ParsedFields, ExperimentPlan, QAResult, AnalysisReport } from '@/types/agent'
import http from '../../http'

// Mock http 模块
vi.mock('../../http', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

describe('AgentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseExperiment', () => {
    it('应该成功解析实验需求文本', async () => {
      // 准备测试数据
      const mockResponse = {
        success: true,
        data: {
          purpose: '检测水样重金属含量',
          sample_type: '水样',
          indicators: ['铅', '汞', '镉'],
          equipment: [],
          materials: [],
          steps: [],
          estimated_time: '',
          confidence: 0.85
        }
      }

      // Mock http.post 方法
      vi.mocked(http.post).mockResolvedValue(mockResponse)

      // 调用方法
      const result = await agentApi.parseExperiment('我需要检测水样中的重金属含量')

      // 验证结果
      expect(result).toEqual(mockResponse.data)
      expect(http.post).toHaveBeenCalledWith(
        '/api/agent/parse',
        { text: '我需要检测水样中的重金属含量' },
        { showError: false }
      )
    })

    it('应该处理解析失败的情况', async () => {
      // Mock 失败响应
      const mockResponse = {
        success: false,
        error: '输入文本不能为空',
        error_code: 'INVALID_INPUT'
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      // 验证抛出错误
      await expect(agentApi.parseExperiment('')).rejects.toThrow('输入文本不能为空')
    })
  })

  describe('generatePlan', () => {
    it('应该成功生成实验计划', async () => {
      // 准备测试数据
      const parsedFields: ParsedFields = {
        purpose: '检测水样重金属含量',
        sample_type: '水样',
        indicators: ['铅', '汞', '镉'],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '',
        confidence: 0.85
      }

      const mockResponse = {
        success: true,
        data: {
          id: 'plan_001',
          purpose: '检测水样重金属含量',
          sample_type: '水样',
          indicators: [],
          equipment: [],
          materials: [],
          steps: [],
          estimated_time: '2小时',
          safety_notes: [],
          markdown: '# 实验计划\n\n...',
          created_at: '2026-05-06T10:30:00'
        }
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      // 调用方法
      const result = await agentApi.generatePlan(parsedFields)

      // 验证结果
      expect(result).toEqual(mockResponse.data)
      expect(http.post).toHaveBeenCalledWith(
        '/api/agent/plan',
        { parsed_fields: parsedFields },
        { showError: false }
      )
    })

    it('应该处理生成计划失败的情况', async () => {
      const parsedFields: ParsedFields = {
        purpose: '',
        sample_type: '',
        indicators: [],
        equipment: [],
        materials: [],
        steps: [],
        estimated_time: '',
        confidence: 0
      }

      const mockResponse = {
        success: false,
        error: '必须包含实验目的和样品类型',
        error_code: 'INVALID_INPUT'
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      await expect(agentApi.generatePlan(parsedFields)).rejects.toThrow(
        '必须包含实验目的和样品类型'
      )
    })
  })

  describe('askQuestion', () => {
    it('应该成功回答问题', async () => {
      const mockResponse = {
        success: true,
        data: {
          question: '水质检测需要什么设备？',
          answer: '进行水质检测需要以下设备：\n1. 原子吸收光谱仪',
          confidence: 0.9,
          sources: ['knowledge_graph']
        }
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const result = await agentApi.askQuestion('水质检测需要什么设备？')

      expect(result).toEqual(mockResponse.data)
      expect(http.post).toHaveBeenCalledWith(
        '/api/agent/qa',
        { question: '水质检测需要什么设备？', context: undefined },
        { showError: false }
      )
    })

    it('应该支持传递上下文信息', async () => {
      const mockResponse = {
        success: true,
        data: {
          question: '需要什么设备？',
          answer: '需要原子吸收光谱仪',
          confidence: 0.9,
          sources: ['knowledge_graph']
        }
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const context = { experiment_type: 'water_heavy_metal' }
      await agentApi.askQuestion('需要什么设备？', context)

      expect(http.post).toHaveBeenCalledWith(
        '/api/agent/qa',
        { question: '需要什么设备？', context },
        { showError: false }
      )
    })
  })

  describe('analyzeResult', () => {
    it('应该成功分析实验结果', async () => {
      const resultData = {
        '铅含量': 0.005,
        '汞含量': 0.0001,
        '镉含量': 0.003
      }

      const mockResponse = {
        success: true,
        data: {
          result_id: 'result_001',
          status: 'normal',
          anomalies: [],
          summary: '分析摘要：共检测 3 项指标，其中 3 项正常，0 项异常。',
          analyzed_at: '2026-05-06T10:30:00'
        }
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const result = await agentApi.analyzeResult(resultData)

      expect(result).toEqual(mockResponse.data)
      expect(http.post).toHaveBeenCalledWith(
        '/api/agent/result-analysis',
        { result_data: resultData, experiment_type: undefined },
        { showError: false }
      )
    })

    it('应该检测异常结果', async () => {
      const resultData = {
        '铅含量': 0.05  // 超出阈值
      }

      const mockResponse = {
        success: true,
        data: {
          result_id: 'result_002',
          status: 'error',
          anomalies: [
            {
              indicator: '铅含量',
              value: 0.05,
              threshold_min: 0,
              threshold_max: 0.01,
              severity: 'high',
              message: '铅含量超标',
              suggestion: '建议重新采样检测'
            }
          ],
          summary: '分析摘要：共检测 1 项指标，其中 0 项正常，1 项异常。',
          analyzed_at: '2026-05-06T10:30:00'
        }
      }

      vi.mocked(http.post).mockResolvedValue(mockResponse)

      const result = await agentApi.analyzeResult(resultData)

      expect(result.status).toBe('error')
      expect(result.anomalies).toHaveLength(1)
      expect(result.anomalies[0].indicator).toBe('铅含量')
    })
  })

  describe('healthCheck', () => {
    it('应该返回健康状态', async () => {
      const mockResponse = {
        status: 'healthy',
        service: 'ai-agent',
        knowledge_graph: {
          experiment_types: 5,
          equipment: 15,
          materials: 20,
          indicators: 25,
          steps: 30
        },
        modules: {
          nlp_parser: 'ok',
          plan_generator: 'ok',
          qa_engine: 'ok',
          result_analyzer: 'ok'
        }
      }

      vi.mocked(http.get).mockResolvedValue(mockResponse)

      const result = await agentApi.healthCheck()

      expect(result.status).toBe('healthy')
      expect(result.service).toBe('ai-agent')
      expect(http.get).toHaveBeenCalledWith('/api/agent/health')
    })
  })

  describe('parseAndGeneratePlan', () => {
    it('应该完成从解析到生成计划的完整流程', async () => {
      // Mock 解析响应
      const parseResponse = {
        success: true,
        data: {
          purpose: '检测水样重金属含量',
          sample_type: '水样',
          indicators: ['铅', '汞', '镉'],
          equipment: [],
          materials: [],
          steps: [],
          estimated_time: '',
          confidence: 0.85
        }
      }

      // Mock 计划生成响应
      const planResponse = {
        success: true,
        data: {
          id: 'plan_001',
          purpose: '检测水样重金属含量',
          sample_type: '水样',
          indicators: [],
          equipment: [],
          materials: [],
          steps: [],
          estimated_time: '2小时',
          safety_notes: [],
          markdown: '# 实验计划\n\n...',
          created_at: '2026-05-06T10:30:00'
        }
      }

      // 设置 Mock 按顺序返回不同的响应
      vi.mocked(http.post)
        .mockResolvedValueOnce(parseResponse)
        .mockResolvedValueOnce(planResponse)

      // 调用方法
      const result = await agentApi.parseAndGeneratePlan('我需要检测水样中的重金属含量')

      // 验证结果
      expect(result.parsedFields).toEqual(parseResponse.data)
      expect(result.plan).toEqual(planResponse.data)
      expect(http.post).toHaveBeenCalledTimes(2)
    })
  })
})
