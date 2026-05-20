/**
 * AI Agent API 服务
 * 
 * 设计参考:
 * 1. 本地轻量化 AI 智能体后端 API
 * 2. 遵循 RESTful API 设计规范
 * 3. 提供实验需求解析、计划生成、智能问答和结果分析功能
 * 
 * API 端点设计:
 * - POST /api/agent/parse              解析实验需求文本
 * - POST /api/agent/plan               生成实验计划
 * - POST /api/agent/qa                 智能问答
 * - POST /api/agent/result-analysis    结果分析
 * - GET  /api/agent/health             健康检查
 */

import http from '../http'
import type {
  ParsedFields,
  ExperimentPlan,
  QAResult,
  AnalysisReport,
  APIResponse,
  HealthCheckResponse
} from '@/types/agent'

/**
 * AI Agent API 服务类
 * 
 * 采用类封装的优势:
 * - 命名空间隔离，避免函数名冲突
 * - 便于扩展和维护
 * - 支持依赖注入和 Mock 测试
 */
class AgentApi {
  private readonly baseUrl = '/api/agent'

  /**
   * 解析实验需求文本
   * 
   * @param text 实验需求文本
   * @returns 解析后的结构化字段
   * 
   * 设计说明:
   * - 使用 NLP 解析器提取关键信息
   * - 返回包含实验目的、样品类型、检测指标等字段
   * - 包含解析置信度评分
   * 
   * 验证需求: 需求 7.1-7.3
   */
  async parseExperiment(text: string): Promise<ParsedFields> {
    try {
      const response = await http.post<APIResponse<ParsedFields>>(
        `${this.baseUrl}/parse`,
        { text },
        { showError: false }  // 不自动显示错误，由调用方处理
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '解析失败')
      }
      
      return response.data
    } catch (error: any) {
      // 重新抛出错误，保留错误信息
      throw new Error(error.message || '解析实验需求失败')
    }
  }

  /**
   * 生成实验计划
   * 
   * @param parsedFields 解析后的结构化字段
   * @returns 完整的实验计划
   * 
   * 设计说明:
   * - 根据结构化字段查询知识图谱
   * - 生成包含详细设备、材料、步骤的完整计划
   * - 返回 Markdown 格式的计划文档
   * 
   * 验证需求: 需求 7.4-7.6
   */
  async generatePlan(parsedFields: ParsedFields): Promise<ExperimentPlan> {
    try {
      const response = await http.post<APIResponse<ExperimentPlan>>(
        `${this.baseUrl}/plan`,
        { parsed_fields: parsedFields },
        { showError: false }
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '生成计划失败')
      }
      
      return response.data
    } catch (error: any) {
      throw new Error(error.message || '生成实验计划失败')
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
   * - 识别问题意图（设备、材料、步骤、指标查询）
   * - 从知识图谱检索相关信息
   * - 生成格式化的回答
   * 
   * 验证需求: 需求 7.7-7.9
   */
  async askQuestion(question: string, context?: Record<string, any>): Promise<QAResult> {
    try {
      const response = await http.post<APIResponse<QAResult>>(
        `${this.baseUrl}/qa`,
        { question, context },
        { showError: false }
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '问答失败')
      }
      
      return response.data
    } catch (error: any) {
      throw new Error(error.message || '智能问答失败')
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
   * 验证需求: 需求 7.10-7.12
   */
  async analyzeResult(
    resultData: Record<string, number>,
    experimentType?: string
  ): Promise<AnalysisReport> {
    try {
      const response = await http.post<APIResponse<AnalysisReport>>(
        `${this.baseUrl}/result-analysis`,
        { result_data: resultData, experiment_type: experimentType },
        { showError: false }
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '分析失败')
      }
      
      return response.data
    } catch (error: any) {
      throw new Error(error.message || '结果分析失败')
    }
  }

  /**
   * 健康检查
   * 
   * @returns 服务健康状态
   * 
   * 设计说明:
   * - 检查 AI Agent 服务是否正常运行
   * - 返回核心模块状态和知识图谱统计信息
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      return await http.get(`${this.baseUrl}/health`)
    } catch (error: any) {
      throw new Error(error.message || '健康检查失败')
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
   * - 简化前端调用
   * - 统一错误处理
   */
  async parseAndGeneratePlan(text: string): Promise<{
    parsedFields: ParsedFields
    plan: ExperimentPlan
  }> {
    try {
      // 1. 解析实验需求
      const parsedFields = await this.parseExperiment(text)
      
      // 2. 生成实验计划
      const plan = await this.generatePlan(parsedFields)
      
      return { parsedFields, plan }
    } catch (error: any) {
      throw new Error(error.message || '完整流程执行失败')
    }
  }

  /**
   * 获取样品检测结果用于 AI 分析
   * 
   * @param sampleId 样品 ID
   * @returns 样品检测结果数据
   * 
   * 设计说明:
   * - 从数据库获取真实的样品检测结果
   * - 格式化为适合 AI 分析的格式
   * - 包含样品基本信息和检测结果数据
   */
  async getSampleResults(sampleId: string): Promise<{
    sample_id: string
    sample_number: string
    sample_name: string
    sample_type: string
    result_data: Record<string, number>
    result_count: number
  }> {
    try {
      const response = await http.get<APIResponse<any>>(
        `${this.baseUrl}/sample-results/${sampleId}`,
        { showError: false }
      )
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '获取样品检测结果失败')
      }
      
      return response.data
    } catch (error: any) {
      throw new Error(error.message || '获取样品检测结果失败')
    }
  }

  /**
   * 完整流程：获取样品结果并进行 AI 分析
   * 
   * @param sampleId 样品 ID
   * @returns 分析报告
   * 
   * 设计说明:
   * - 封装完整的样品分析流程
   * - 自动获取样品检测结果并进行分析
   * - 简化前端调用
   */
  async analyzeSample(sampleId: string): Promise<AnalysisReport> {
    try {
      // 1. 获取样品检测结果
      const sampleResults = await this.getSampleResults(sampleId)
      
      // 2. 进行 AI 分析
      const analysis = await this.analyzeResult(sampleResults.result_data)
      
      return analysis
    } catch (error: any) {
      throw new Error(error.message || '样品分析失败')
    }
  }
}

// 导出单例实例
export const agentApi = new AgentApi()
export default agentApi
