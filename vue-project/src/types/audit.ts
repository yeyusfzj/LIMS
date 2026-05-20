/**
 * 审核相关类型定义
 * 
 * 定义审核功能所需的所有TypeScript接口和类型，
 * 确保前后端数据结构的一致性和类型安全。
 */

// 检测项目状态
export type TestItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ABNORMAL'

// 结果来源
export type ResultSource = 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'

// 样品状态
export type SampleStatus = 'REGISTERED' | 'IN_TESTING' | 'TESTING_COMPLETE' | 'IN_AUDIT' | 'AUDIT_COMPLETE' | 'RELEASED' | 'ARCHIVED'

// 优先级
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

// 检测项目接口
export interface TestItem {
  id: string
  taskId: string
  testMethod: string
  testStandard?: string
  testParameters: any
  status: TestItemStatus
  assignedTo?: string
  assignedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 检测结果接口
export interface TestResult {
  id: string
  taskId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  version: number
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

// 样品信息接口（完整版）
export interface SampleInfo {
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
  status: SampleStatus
  priority: Priority
  description?: string
  remarks?: string
  version: number
  parentSampleId?: string
  mergedFromIds?: string[]
  workflowInstanceId?: string
  testItems?: TestItem[]
  results?: TestResult[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  releasedAt?: Date
  releasedBy?: string
}

// 审核任务接口（扩展现有的AuditTask）
export interface AuditTask {
  id: string
  taskId: string
  sampleName: string
  sampleBarcode: string
  level: number
  levelName: string
  auditor: string
  auditorName?: string
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  comments?: string
  attachments?: AuditAttachment[]
  submittedAt: Date
  auditedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
  // 扩展任务信息字段
  task?: {
    id: string
    taskNumber: string
    name: string
    description?: string
    status: string
    sampleId?: string
    sample?: {
      barcode: string
      sampleNumber: string
      sampleName: string
      clientName: string
    }
  }
}

// 审核决策接口
export interface AuditDecision {
  taskId: string
  decision: 'approved' | 'rejected' | 'returned'
  comments: string
  attachments?: File[]
  reviewedBy?: string
  reviewedAt?: Date
}

// 审核统计信息接口
export interface AuditStatistics {
  pending: number
  todayCompleted: number
  weekCompleted: number
  monthCompleted: number
  approvalRate: number
  averageProcessingTime: number // 平均处理时间（小时）
  levelStatistics: AuditLevelStatistics[]
}

// 审核级别统计
export interface AuditLevelStatistics {
  level: number
  levelName: string
  pending: number
  completed: number
  approvalRate: number
}

// 审核API响应格式
export interface AuditApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    currentPage: number
    pageSize: number
    total: number
    totalPages: number
  }
  timestamp?: number
}

// 审核附件接口
export interface AuditAttachment {
  id: string
  taskId: string
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string
  uploadedBy: string
  uploadedAt: Date
}

// 审核历史记录接口
export interface AuditHistoryRecord {
  id: string
  taskId: string
  action: string
  result: string
  operator: string
  operatorName?: string
  levelName: string
  timestamp: Date
  comments?: string
  attachments?: AuditAttachment[]
}

// 审核级别配置接口
export interface AuditLevel {
  id: string
  order: number
  name: string
  description?: string
  role: string
  roleName?: string
  required: boolean
  autoAssign: boolean
  assignmentRule?: AuditAssignmentRule
  createdAt: Date
  updatedAt: Date
}

// 审核分配规则接口
export interface AuditAssignmentRule {
  type: 'skill' | 'workload' | 'round_robin' | 'manual'
  criteria?: {
    skills?: string[]
    maxWorkload?: number
    excludeUsers?: string[]
  }
}

// 审核工作流配置接口
export interface AuditWorkflowConfig {
  id: string
  name: string
  sampleTypes: string[]
  levels: AuditLevel[]
  parallelAudit: boolean // 是否支持并行审核
  escalationRules: AuditEscalationRule[]
  status: 'active' | 'inactive'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// 审核升级规则接口
export interface AuditEscalationRule {
  id: string
  condition: string // 升级条件
  targetLevel: number // 目标审核级别
  notificationUsers: string[] // 通知用户列表
  autoEscalate: boolean // 是否自动升级
  escalationDelay: number // 升级延迟（小时）
}

// 审核查询参数接口
export interface AuditQueryParams {
  level?: number
  status?: string
  barcode?: string
  auditor?: string
  priority?: string
  dateRange?: {
    start: Date
    end: Date
  }
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 批量审核请求接口
export interface BatchAuditRequest {
  taskIds: string[]
  decision: 'approved' | 'rejected' | 'returned'
  comments: string
  batchReason?: string
}

// 批量审核响应接口
export interface BatchAuditResponse {
  success: boolean
  message: string
  results: BatchAuditResult[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// 批量审核结果接口
export interface BatchAuditResult {
  taskId: string
  success: boolean
  message: string
  error?: string
}

// 审核通知接口
export interface AuditNotification {
  id: string
  type: 'task_assigned' | 'task_completed' | 'task_escalated' | 'task_overdue'
  taskId: string
  recipientId: string
  title: string
  message: string
  read: boolean
  createdAt: Date
  readAt?: Date
}

// 审核权限接口
export interface AuditPermission {
  canView: boolean
  canAudit: boolean
  canReassign: boolean
  canViewHistory: boolean
  canExport: boolean
  canBatchAudit: boolean
  levels: number[] // 可审核的级别
}

// 审核表单数据接口
export interface AuditFormData {
  comments: string
  attachments: File[]
  decision?: 'approved' | 'rejected' | 'returned'
}

// 审核表单验证规则接口
export interface AuditFormRules {
  comments: Array<{
    required?: boolean
    min?: number
    max?: number
    message: string
    trigger: string
  }>
}

// 审核筛选条件接口
export interface AuditFilters {
  level: number | null
  status: string
  barcode: string
  auditor: string
  priority: string
  dateRange: [Date, Date] | null
}

// 审核分页信息接口
export interface AuditPagination {
  currentPage: number
  pageSize: number
  total: number
  totalPages?: number
}

// 审核操作日志接口
export interface AuditOperationLog {
  id: string
  taskId: string
  operation: 'create' | 'update' | 'delete' | 'assign' | 'complete' | 'escalate'
  operatorId: string
  operatorName: string
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// 审核性能指标接口
export interface AuditPerformanceMetrics {
  averageProcessingTime: number // 平均处理时间（小时）
  onTimeCompletionRate: number // 按时完成率
  overdueTasksCount: number // 逾期任务数量
  workloadDistribution: Array<{
    auditorId: string
    auditorName: string
    pendingTasks: number
    completedTasks: number
    averageProcessingTime: number
  }>
  levelPerformance: Array<{
    level: number
    levelName: string
    averageProcessingTime: number
    completionRate: number
  }>
}

// 导出所有类型
export type {
  TestItemStatus,
  ResultSource,
  SampleStatus,
  Priority,
  TestItem,
  TestResult,
  SampleInfo,
  AuditTask,
  AuditDecision,
  AuditStatistics,
  AuditApiResponse,
  AuditAttachment,
  AuditHistoryRecord,
  AuditLevel,
  AuditAssignmentRule,
  AuditWorkflowConfig,
  AuditEscalationRule,
  AuditQueryParams,
  BatchAuditRequest,
  BatchAuditResponse,
  BatchAuditResult,
  AuditNotification,
  AuditPermission,
  AuditFormData,
  AuditFormRules,
  AuditFilters,
  AuditPagination,
  AuditOperationLog,
  AuditPerformanceMetrics,
  AuditLevelStatistics
}