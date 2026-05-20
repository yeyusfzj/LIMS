/**
 * AI Agent 类型定义
 * 
 * 本地轻量化 AI 智能体相关的类型定义
 * 包括实验需求解析、计划生成、智能问答和结果分析功能
 * 
 * 设计参考:
 * - 需求文档: .kiro/specs/local-ai-agent/requirements.md (需求 8.3-8.9)
 * - 设计文档: .kiro/specs/local-ai-agent/design.md (数据模型设计)
 * 
 * 验证需求: 需求 8.3-8.9
 */

/**
 * 解析后的结构化字段接口
 * 
 * 从用户输入的实验需求文本中提取的结构化信息
 * 
 * 验证需求: 需求 1.1-1.7, 1.11
 */
export interface ParsedFields {
  /** 实验目的 */
  purpose: string
  
  /** 样品类型 */
  sample_type: string
  
  /** 检测指标列表 */
  indicators: string[]
  
  /** 所需设备列表 */
  equipment: string[]
  
  /** 所需材料列表 */
  materials: string[]
  
  /** 实验步骤列表 */
  steps: string[]
  
  /** 预计时间 */
  estimated_time: string
  
  /** 解析置信度 (0.0-1.0) */
  confidence: number
}

/**
 * 指标详细信息接口
 * 
 * 检测指标的完整信息，包括单位、方法和阈值
 * 
 * 验证需求: 需求 2.3, 2.9
 */
export interface Indicator {
  /** 指标唯一标识 */
  id: string
  
  /** 指标名称 */
  name: string
  
  /** 单位 */
  unit: string
  
  /** 检测方法 */
  method: string
  
  /** 阈值下限 */
  threshold_min: number | null
  
  /** 阈值上限 */
  threshold_max: number | null
}

/**
 * 设备详细信息接口
 * 
 * 实验设备的完整信息，包括型号、类别和规格
 * 
 * 验证需求: 需求 2.1, 2.7
 */
export interface Equipment {
  /** 设备唯一标识 */
  id: string
  
  /** 设备名称 */
  name: string
  
  /** 设备型号 */
  model: string
  
  /** 设备类别 */
  category: string
  
  /** 设备规格说明 */
  specifications: string
}

/**
 * 材料详细信息接口
 * 
 * 实验材料的完整信息，包括浓度、CAS号和安全等级
 * 
 * 验证需求: 需求 2.2, 2.8
 */
export interface Material {
  /** 材料唯一标识 */
  id: string
  
  /** 材料名称 */
  name: string
  
  /** 浓度 */
  concentration: string
  
  /** CAS号 */
  cas_number: string
  
  /** 安全等级 */
  safety_level: string
}

/**
 * 实验步骤接口
 * 
 * 实验步骤的详细信息，包括顺序、描述、时长和温度
 * 
 * 验证需求: 需求 2.4, 2.10
 */
export interface Step {
  /** 步骤唯一标识 */
  id: string
  
  /** 步骤顺序 */
  order: number
  
  /** 步骤标题 */
  title: string
  
  /** 步骤描述 */
  description: string
  
  /** 步骤时长 */
  duration: string
  
  /** 温度要求 */
  temperature: string
}

/**
 * 实验计划接口
 * 
 * 完整的实验计划，包含所有必要的信息和步骤
 * 
 * 验证需求: 需求 5.6-5.13
 */
export interface ExperimentPlan {
  /** 计划唯一标识 */
  id: string
  
  /** 实验目的 */
  purpose: string
  
  /** 样品类型 */
  sample_type: string
  
  /** 检测指标列表 */
  indicators: Indicator[]
  
  /** 所需设备列表 */
  equipment: Equipment[]
  
  /** 所需材料列表 */
  materials: Material[]
  
  /** 实验步骤列表 */
  steps: Step[]
  
  /** 预计时间 */
  estimated_time: string
  
  /** 安全注意事项 */
  safety_notes: string[]
  
  /** Markdown 格式的计划文档 */
  markdown: string
  
  /** 创建时间 */
  created_at: string
}

/**
 * 异常信息接口
 * 
 * 实验结果分析中检测到的异常信息
 * 
 * 验证需求: 需求 6.4-6.7
 */
export interface Anomaly {
  /** 异常指标名称 */
  indicator: string
  
  /** 实际测量值 */
  value: number
  
  /** 阈值下限 */
  threshold_min: number | null
  
  /** 阈值上限 */
  threshold_max: number | null
  
  /** 异常严重程度: "low", "medium", "high" */
  severity: 'low' | 'medium' | 'high'
  
  /** 异常提示信息 */
  message: string
  
  /** 分析建议 */
  suggestion: string
}

/**
 * 分析报告接口
 * 
 * 实验结果的完整分析报告
 * 
 * 验证需求: 需求 6.8-6.10
 */
export interface AnalysisReport {
  /** 结果唯一标识 */
  result_id: string
  
  /** 分析状态: "normal", "warning", "error" */
  status: 'normal' | 'warning' | 'error'
  
  /** 检测到的异常列表 */
  anomalies: Anomaly[]
  
  /** 分析摘要 */
  summary: string
  
  /** 分析时间 */
  analyzed_at: string
}

/**
 * 问答结果接口
 * 
 * 智能问答的结果信息
 * 
 * 验证需求: 需求 4.8-4.10
 */
export interface QAResult {
  /** 用户问题 */
  question: string
  
  /** 系统回答 */
  answer: string
  
  /** 回答置信度 (0.0-1.0) */
  confidence: number
  
  /** 信息来源列表 */
  sources: string[]
}

/**
 * API 响应接口
 * 
 * 统一的 API 响应格式
 * 
 * 验证需求: 需求 7.13-7.15, 14.8-14.10
 */
export interface APIResponse<T = any> {
  /** 请求是否成功 */
  success: boolean
  
  /** 响应数据 */
  data?: T
  
  /** 错误信息 */
  error?: string
  
  /** 错误代码 */
  error_code?: string
  
  /** 建议的解决方案 */
  suggestion?: string
  
  /** 响应时间戳 */
  timestamp?: string
}

/**
 * 解析请求接口
 * 
 * 实验需求文本解析的请求参数
 * 
 * 验证需求: 需求 7.1-7.2
 */
export interface ParseRequest {
  /** 实验需求文本 */
  text: string
}

/**
 * 计划生成请求接口
 * 
 * 实验计划生成的请求参数
 * 
 * 验证需求: 需求 7.4-7.5
 */
export interface PlanRequest {
  /** 解析后的结构化字段 */
  parsed_fields: ParsedFields
}

/**
 * 问答请求接口
 * 
 * 智能问答的请求参数
 * 
 * 验证需求: 需求 7.7-7.8
 */
export interface QARequest {
  /** 用户问题 */
  question: string
  
  /** 上下文信息（可选） */
  context?: Record<string, any>
}

/**
 * 结果分析请求接口
 * 
 * 实验结果分析的请求参数
 * 
 * 验证需求: 需求 7.10-7.11
 */
export interface AnalysisRequest {
  /** 实验结果数据，格式为 {indicator_name: value} */
  result_data: Record<string, number>
  
  /** 实验类型（可选） */
  experiment_type?: string
}

/**
 * 健康检查响应接口
 * 
 * AI Agent 服务健康状态信息
 */
export interface HealthCheckResponse {
  /** 服务状态 */
  status: string
  
  /** 服务名称 */
  service: string
  
  /** 知识图谱统计信息 */
  knowledge_graph?: {
    /** 实验类型数量 */
    experiment_types: number
    /** 设备数量 */
    equipment: number
    /** 材料数量 */
    materials: number
    /** 指标数量 */
    indicators: number
    /** 步骤数量 */
    steps: number
  }
  
  /** 核心模块状态 */
  modules?: {
    /** NLP 解析器状态 */
    nlp_parser: string
    /** 计划生成器状态 */
    plan_generator: string
    /** 问答引擎状态 */
    qa_engine: string
    /** 结果分析器状态 */
    result_analyzer: string
  }
  
  /** 错误信息 */
  error?: string
}

/**
 * 完整流程响应接口
 * 
 * 从解析到生成计划的完整流程结果
 */
export interface ParseAndPlanResponse {
  /** 解析后的结构化字段 */
  parsedFields: ParsedFields
  
  /** 生成的实验计划 */
  plan: ExperimentPlan
}
