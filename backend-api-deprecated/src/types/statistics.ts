/**
 * 统计数据类型定义
 */

/**
 * 统计维度
 */
export enum StatisticsDimension {
  TIME = 'time',              // 时间维度
  SAMPLE_TYPE = 'sampleType', // 样品类型
  TEST_ITEM = 'testItem',     // 检测项目
  STATUS = 'status',          // 状态
  DEPARTMENT = 'department',  // 部门
  CLIENT = 'client'           // 客户
}

/**
 * 时间粒度
 */
export enum TimeGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * 统计查询参数
 */
export interface StatisticsQuery {
  // 时间范围
  startDate?: Date
  endDate?: Date
  
  // 统计维度
  dimensions: StatisticsDimension[]
  
  // 时间粒度（当包含时间维度时）
  timeGranularity?: TimeGranularity
  
  // 过滤条件
  filters?: {
    sampleType?: string[]
    testItem?: string[]
    status?: string[]
    department?: string[]
    clientName?: string[]
  }
  
  // 是否使用缓存
  useCache?: boolean
  
  // 是否异步查询（大数据量）
  async?: boolean
}

/**
 * 统计结果数据点
 */
export interface StatisticsDataPoint {
  // 维度值
  dimensions: Record<string, string>
  
  // 指标值
  metrics: {
    count: number           // 样品数量
    completedCount?: number // 完成数量
    avgDuration?: number    // 平均耗时（天）
    qualifiedRate?: number  // 合格率
  }
}

/**
 * 统计结果
 */
export interface StatisticsResult {
  // 查询参数
  query: StatisticsQuery
  
  // 数据点
  data: StatisticsDataPoint[]
  
  // 汇总信息
  summary: {
    totalCount: number
    totalCompleted: number
    avgDuration: number
    qualifiedRate: number
  }
  
  // 是否来自缓存
  fromCache: boolean
  
  // 生成时间
  generatedAt: Date
}

/**
 * 异步统计任务
 */
export interface AsyncStatisticsTask {
  id: string
  query: StatisticsQuery
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: StatisticsResult
  error?: string
  createdAt: Date
  completedAt?: Date
  userId: string
}

/**
 * 统计缓存键
 */
export interface StatisticsCacheKey {
  dimensions: string[]
  timeGranularity?: string
  startDate?: string
  endDate?: string
  filters?: string
}

/**
 * 导出格式
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json'
}

/**
 * 导出查询参数
 */
export interface ExportQuery extends StatisticsQuery {
  format: ExportFormat
  filename?: string
}

/**
 * 导出结果
 */
export interface ExportResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  expiresAt?: Date
}

/**
 * ============================================
 * 审核统计专用类型定义
 * ============================================
 */

/**
 * 审核统计筛选条件
 */
export interface AuditStatisticsFilters {
  startDate: Date
  endDate: Date
  auditorId?: string
  level?: number
  sampleType?: string
  status?: 'approved' | 'rejected' | 'pending'
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

/**
 * 工作量统计 - 按审核人员
 */
export interface WorkloadByAuditor {
  auditorId: string
  auditorName: string
  totalTasks: number
  completedTasks: number
  pendingTasks: number
}

/**
 * 工作量统计 - 按时间段
 */
export interface WorkloadByTimePeriod {
  period: string
  totalTasks: number
  completedTasks: number
  pendingTasks: number
}

/**
 * 工作量统计数据
 */
export interface WorkloadData {
  byAuditor: WorkloadByAuditor[]
  byTimePeriod: WorkloadByTimePeriod[]
}

/**
 * 通过率统计 - 整体数据
 */
export interface OverallPassRate {
  totalTasks: number
  approvedTasks: number
  rejectedTasks: number
  passRate: number
}

/**
 * 通过率统计 - 按审核级别
 */
export interface PassRateByLevel {
  level: number
  levelName: string
  totalTasks: number
  approvedTasks: number
  passRate: number
}

/**
 * 通过率统计 - 按样品类型
 */
export interface PassRateBySampleType {
  sampleType: string
  totalTasks: number
  approvedTasks: number
  passRate: number
}

/**
 * 通过率趋势数据
 */
export interface PassRateTrend {
  period: string
  passRate: number
}

/**
 * 通过率统计数据
 */
export interface PassRateData {
  overall: OverallPassRate
  byLevel: PassRateByLevel[]
  bySampleType: PassRateBySampleType[]
  trend: PassRateTrend[]
}

/**
 * 时效性统计 - 整体数据
 */
export interface OverallDuration {
  averageDuration: number
  medianDuration: number
  maxDuration: number
  minDuration: number
  overtimeTasks: number
  overtimeRate: number
}

/**
 * 时效性统计 - 按审核人员
 */
export interface DurationByAuditor {
  auditorId: string
  auditorName: string
  averageDuration: number
  taskCount: number
}

/**
 * 时效性统计 - 时长分布
 */
export interface DurationDistribution {
  range: string
  count: number
}

/**
 * 时效性统计数据
 */
export interface DurationData {
  overall: OverallDuration
  byAuditor: DurationByAuditor[]
  distribution: DurationDistribution[]
}

/**
 * 问题分类统计 - 按退回原因
 */
export interface IssueByReason {
  reason: string
  count: number
  percentage: number
}

/**
 * 问题分类统计 - 按样品类型
 */
export interface IssueBySampleType {
  sampleType: string
  issueCount: number
  totalTasks: number
  issueRate: number
}

/**
 * 问题分类统计数据
 */
export interface IssueData {
  byReason: IssueByReason[]
  bySampleType: IssueBySampleType[]
}

/**
 * 审核统计缓存键生成函数类型
 */
export type AuditStatisticsCacheKeyGenerator = (
  type: 'workload' | 'passRate' | 'duration' | 'issues',
  filters: AuditStatisticsFilters
) => string

/**
 * 审核统计导出类型
 */
export type AuditStatisticsExportType = 'workload' | 'passRate' | 'duration' | 'issues'

/**
 * 审核统计导出请求
 */
export interface AuditStatisticsExportRequest {
  type: AuditStatisticsExportType
  filters: AuditStatisticsFilters
}
