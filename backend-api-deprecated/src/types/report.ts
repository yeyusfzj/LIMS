/**
 * 报告生成类型定义
 */

export interface Report {
  id: string
  reportNumber: string
  sampleId: string
  templateId: string
  content: string
  status: ReportStatus
  generatedBy: string
  generatedAt: Date
  approvedAt?: Date
  recalledAt?: Date
  recallReason?: string
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  DISTRIBUTED = 'DISTRIBUTED',
  RECALLED = 'RECALLED'
}

export interface GenerateReportDto {
  sampleId: string
  templateId: string
  preview?: boolean // 是否为预览模式
}

export interface ReportData {
  sample: SampleData
  testItems: TestItemData[]
  results: ResultData[]
  qualityJudgment?: QualityJudgmentData
  auditTasks: AuditTaskData[]
  reportNumber?: string
  generatedAt: Date
  generatedBy: string
}

export interface SampleData {
  id: string
  barcode: string
  sampleNumber: string
  clientName: string
  clientContact?: string
  sampleName: string
  sampleType: string
  sampleCategory: string
  quantity: number
  unit: string
  receivedDate: Date
  samplingDate?: Date
  samplingLocation?: string
  samplingPerson?: string
  storageLocation?: string
  storageCondition?: string
  status: string
  priority: string
  description?: string
  remarks?: string
}

export interface TestItemData {
  id: string
  testMethod: string
  testStandard?: string
  status: string
  assignedTo?: string
  completedAt?: Date
}

export interface ResultData {
  id: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source: string
  isAbnormal: boolean
  abnormalReason?: string
  enteredBy: string
  enteredAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

export interface QualityJudgmentData {
  id: string
  result: string
  basis: string
  isAutomatic: boolean
  judgedBy: string
  judgedAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

export interface AuditTaskData {
  id: string
  level: number
  auditorId: string
  status: string
  decision?: string
  comments?: string
  submittedAt: Date
  completedAt?: Date
}

export interface ReportGenerationResult {
  reportId?: string
  reportNumber?: string
  content: string
  preview: boolean
}

export interface ReportQuery {
  sampleId?: string
  status?: ReportStatus
  startDate?: Date
  endDate?: Date
  search?: string
  page?: number
  pageSize?: number
}

// 分发方式枚举
export enum DistributionMethod {
  EMAIL = 'EMAIL',
  DOWNLOAD = 'DOWNLOAD',
  PRINT = 'PRINT'
}

// 分发状态枚举
export enum DistributionStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  FAILED = 'FAILED'
}

// 分发记录接口
export interface Distribution {
  id: string
  reportId: string
  method: DistributionMethod
  recipient: string
  recipientEmail?: string
  status: DistributionStatus
  sentAt?: Date
  receivedAt?: Date
}

// 分发请求DTO
export interface DistributeReportDto {
  reportId: string
  method: DistributionMethod
  recipient: string
  recipientEmail?: string
}

// 回收报告DTO
export interface RecallReportDto {
  reportId: string
  reason: string
}

// 分发历史查询
export interface DistributionQuery {
  reportId?: string
  method?: DistributionMethod
  status?: DistributionStatus
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}
