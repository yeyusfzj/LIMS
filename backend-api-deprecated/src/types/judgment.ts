/**
 * 质量判定模块类型定义
 */

import { JudgmentResult } from '@prisma/client'

/**
 * 判定规则类型枚举
 */
export enum JudgmentRuleType {
  RANGE = 'RANGE', // 范围判定
  FORMULA = 'FORMULA', // 公式判定
  LOGIC = 'LOGIC' // 逻辑表达式判定
}

/**
 * 判定规则条件
 */
export interface JudgmentRuleCondition {
  type: JudgmentRuleType
  parameter?: string // 检测参数名称
  minValue?: number // 最小值（范围判定）
  maxValue?: number // 最大值（范围判定）
  formula?: string // 公式表达式（公式判定）
  logicExpression?: string // 逻辑表达式（逻辑判定）
  expectedResult?: JudgmentResult // 期望结果
}

/**
 * 判定规则配置
 */
export interface JudgmentRuleConfig {
  id: string
  name: string
  description?: string
  testItemType: string // 检测项类型
  conditions: JudgmentRuleCondition[] // 判定条件（AND 关系）
  priority: number // 优先级（数字越大优先级越高）
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建判定规则 DTO
 */
export interface CreateJudgmentRuleDto {
  name: string
  description?: string
  testItemType: string
  conditions: JudgmentRuleCondition[]
  priority?: number
}

/**
 * 更新判定规则 DTO
 */
export interface UpdateJudgmentRuleDto {
  name?: string
  description?: string
  conditions?: JudgmentRuleCondition[]
  priority?: number
  isActive?: boolean
}

/**
 * 判定规则查询参数
 */
export interface JudgmentRuleQuery {
  testItemType?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

/**
 * 执行质量判定 DTO
 */
export interface PerformJudgmentDto {
  sampleId: string
  ruleIds?: string[] // 指定使用的规则 ID，如果不指定则自动匹配
  performedBy: string
}

/**
 * 判定依据详情
 */
export interface JudgmentBasisDetail {
  ruleId: string
  ruleName: string
  conditionType: JudgmentRuleType
  parameter?: string
  actualValue?: number | string
  expectedRange?: { min?: number; max?: number }
  formula?: string
  calculatedValue?: number
  logicExpression?: string
  evaluationResult: boolean
  message: string
}

/**
 * 判定结果响应
 */
export interface JudgmentResponse {
  id: string
  sampleId: string
  result: JudgmentResult
  basis: string // JSON 字符串，包含判定依据详情
  basisDetails: JudgmentBasisDetail[] // 解析后的判定依据
  isAutomatic: boolean
  judgedBy: string
  judgedAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

/**
 * 人工复核判定 DTO
 */
export interface ReviewJudgmentDto {
  judgmentId: string
  newResult: JudgmentResult
  reason: string
  reviewedBy: string
}

/**
 * 判定历史记录
 */
export interface JudgmentHistory {
  id: string
  judgmentId: string
  sampleId: string
  previousResult: JudgmentResult
  newResult: JudgmentResult
  changeReason: string
  changedBy: string
  changedAt: Date
}

/**
 * 判定历史查询参数
 */
export interface JudgmentHistoryQuery {
  sampleId?: string
  judgmentId?: string
  page?: number
  pageSize?: number
}

/**
 * 批量判定 DTO
 */
export interface BatchJudgmentDto {
  sampleIds: string[]
  performedBy: string
}

/**
 * 批量判定结果
 */
export interface BatchJudgmentResult {
  total: number
  successful: number
  failed: number
  results: Array<{
    sampleId: string
    success: boolean
    judgment?: JudgmentResponse
    error?: string
  }>
}
