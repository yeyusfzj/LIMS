/**
 * 异常检测相关类型定义
 */

/**
 * 异常检测规则类型
 */
export enum AnomalyRuleType {
  RANGE = 'RANGE',           // 范围检测
  DEVIATION = 'DEVIATION',   // 偏差检测
  TREND = 'TREND',           // 趋势检测
  CUSTOM = 'CUSTOM'          // 自定义规则
}

/**
 * 范围规则配置
 */
export interface RangeRuleConfig {
  min?: number
  max?: number
  unit?: string
}

/**
 * 偏差规则配置
 */
export interface DeviationRuleConfig {
  referenceValue: number
  maxDeviation: number      // 最大偏差值
  deviationType: 'absolute' | 'percentage'  // 绝对值或百分比
}

/**
 * 趋势规则配置
 */
export interface TrendRuleConfig {
  windowSize: number        // 时间窗口大小（样品数量）
  maxChange: number         // 最大变化值
  changeType: 'absolute' | 'percentage'
}

/**
 * 自定义规则配置
 */
export interface CustomRuleConfig {
  expression: string        // 自定义表达式
  description?: string
}

/**
 * 异常检测规则
 */
export interface AnomalyDetectionRule {
  id: string
  name: string
  description?: string
  testMethod: string        // 适用的检测方法
  parameter: string         // 适用的检测参数
  ruleType: AnomalyRuleType
  config: RangeRuleConfig | DeviationRuleConfig | TrendRuleConfig | CustomRuleConfig
  isActive: boolean
  priority: number          // 优先级，数字越大优先级越高
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建异常检测规则 DTO
 */
export interface CreateAnomalyRuleDto {
  name: string
  description?: string
  testMethod: string
  parameter: string
  ruleType: AnomalyRuleType
  config: RangeRuleConfig | DeviationRuleConfig | TrendRuleConfig | CustomRuleConfig
  isActive?: boolean
  priority?: number
  createdBy: string
}

/**
 * 更新异常检测规则 DTO
 */
export interface UpdateAnomalyRuleDto {
  name?: string
  description?: string
  testMethod?: string
  parameter?: string
  ruleType?: AnomalyRuleType
  config?: RangeRuleConfig | DeviationRuleConfig | TrendRuleConfig | CustomRuleConfig
  isActive?: boolean
  priority?: number
}

/**
 * 异常检测结果
 */
export interface AnomalyDetectionResult {
  isAbnormal: boolean
  reason?: string
  ruleId?: string
  ruleName?: string
  detectedValue?: number
  expectedRange?: {
    min?: number
    max?: number
  }
}

/**
 * 复测申请 DTO
 */
export interface RetestRequestDto {
  resultId: string
  reason: string
  requestedBy: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

/**
 * 复测响应
 */
export interface RetestResponse {
  taskId: string
  sampleId: string
  originalResultId: string
  reason: string
  status: string
  createdAt: Date
}
