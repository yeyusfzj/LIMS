/**
 * 检测结果相关类型定义
 */

import { ResultSource } from '@prisma/client'

/**
 * 创建结果 DTO
 */
export interface CreateResultDto {
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source?: ResultSource
  instrumentId?: string
  enteredBy: string
}

/**
 * 更新结果 DTO
 */
export interface UpdateResultDto {
  value?: number
  textValue?: string
  unit?: string
  method?: string
  source?: ResultSource
  instrumentId?: string
  isAbnormal?: boolean
  abnormalReason?: string
  reviewedBy?: string
}

/**
 * 结果查询参数
 */
export interface ResultQuery {
  sampleId?: string
  testItemId?: string
  parameter?: string
  source?: ResultSource
  isAbnormal?: boolean
  isRetest?: boolean
  enteredBy?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

/**
 * 结果响应
 */
export interface ResultResponse {
  id: string
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source: ResultSource
  instrumentId?: string
  formulaId?: string
  isCalculated: boolean
  isAbnormal: boolean
  abnormalReason?: string
  isRetest: boolean
  originalResultId?: string
  retestReason?: string
  enteredBy: string
  enteredAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

/**
 * 分页结果响应
 */
export interface PaginatedResultResponse {
  items: ResultResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 批量导入结果
 */
export interface ImportResult {
  success: boolean
  totalRecords: number
  successCount: number
  failureCount: number
  errors: ImportError[]
  importedResults?: ResultResponse[]
}

/**
 * 导入错误
 */
export interface ImportError {
  row: number
  field?: string
  value?: any
  message: string
}

/**
 * 字段映射配置
 */
export interface FieldMapping {
  sampleId?: string
  testItemId?: string
  parameter: string
  value?: string
  textValue?: string
  unit?: string
  method: string
  instrumentId?: string
}

/**
 * 导入数据行
 */
export interface ImportDataRow {
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  instrumentId?: string
  [key: string]: any
}
