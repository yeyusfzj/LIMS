/**
 * 结果相关类型定义
 */

export interface CreateResultDto {
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source?: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  instrumentId?: string
  enteredBy?: string
}

export interface UpdateResultDto {
  value?: number
  textValue?: string
  unit?: string
  method?: string
  source?: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  instrumentId?: string
  isAbnormal?: boolean
  abnormalReason?: string
  reviewedBy?: string
}

export interface ResultQuery {
  sampleId?: string
  testItemId?: string
  parameter?: string
  source?: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  isAbnormal?: boolean
  isRetest?: boolean
  enteredBy?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

export interface ResultResponse {
  id: string
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  instrumentId?: string
  formulaId?: string
  isCalculated?: boolean
  isAbnormal?: boolean
  abnormalReason?: string
  isRetest?: boolean
  originalResultId?: string
  retestReason?: string
  enteredBy: string
  enteredAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

export interface PaginatedResultResponse {
  items: ResultResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface FieldMapping {
  parameter: string
  method: string
  value?: string
  unit?: string
  sampleId?: string
  testItemId?: string
}