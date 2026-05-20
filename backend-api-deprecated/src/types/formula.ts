/**
 * 公式相关类型定义
 */

/**
 * 公式参数定义
 */
export interface FormulaParameter {
  name: string // 参数名称
  type: 'number' | 'string' | 'boolean' // 参数类型
  description?: string // 参数描述
  required?: boolean // 是否必需
  defaultValue?: any // 默认值
}

/**
 * 创建公式 DTO
 */
export interface CreateFormulaDto {
  name: string
  description?: string
  expression: string // 公式表达式，如 "a + b * 2"
  parameters: FormulaParameter[] // 参数定义
  isActive?: boolean
  createdBy: string
}

/**
 * 更新公式 DTO
 */
export interface UpdateFormulaDto {
  name?: string
  description?: string
  expression?: string
  parameters?: FormulaParameter[]
  isActive?: boolean
}

/**
 * 公式查询参数
 */
export interface FormulaQuery {
  name?: string
  isActive?: boolean
  createdBy?: string
  page?: number
  pageSize?: number
}

/**
 * 公式响应
 */
export interface FormulaResponse {
  id: string
  name: string
  description?: string
  expression: string
  parameters: FormulaParameter[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 分页公式响应
 */
export interface PaginatedFormulaResponse {
  items: FormulaResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 公式计算输入
 */
export interface FormulaCalculationInput {
  formulaId: string
  parameters: Record<string, any> // 参数值映射
}

/**
 * 公式计算结果
 */
export interface FormulaCalculationResult {
  success: boolean
  value?: number
  error?: string
  expression?: string
  parameters?: Record<string, any>
}

/**
 * 公式验证结果
 */
export interface FormulaValidationResult {
  valid: boolean
  errors: string[]
}
