/**
 * 审核统计类型定义
 */

export interface StatisticsFilters {
  startDate?: string
  endDate?: string
  auditorId?: string
  level?: number
  sampleType?: string
  status?: string
}

export interface WorkloadData {
  byAuditor: Array<{
    auditorId: string
    auditorName: string
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    averageCompletionTime?: number
  }>
  byTimePeriod: Array<{
    period: string
    totalTasks: number
    completedTasks: number
    pendingTasks: number
  }>
}

export interface PassRateData {
  overall: {
    totalTasks: number
    approvedTasks: number
    rejectedTasks: number
    passRate: number
  }
  byLevel: Array<{
    level: number
    levelName: string
    totalTasks: number
    approvedTasks: number
    passRate: number
  }>
  bySampleType: Array<{
    sampleType: string
    totalTasks: number
    approvedTasks: number
    passRate: number
  }>
  trend?: Array<{
    period: string
    passRate: number
  }>
}

export interface DurationData {
  overall: {
    averageDuration: number
    medianDuration: number
    maxDuration: number
    minDuration: number
    overtimeTasks: number
    overtimeRate: number
  }
  byAuditor: Array<{
    auditorId: string
    auditorName: string
    averageDuration: number
    taskCount: number
  }>
  distribution: Array<{
    range: string
    count: number
  }>
}

export interface IssueData {
  byReason: Array<{
    reason: string
    count: number
    percentage: number
  }>
  bySampleType: Array<{
    sampleType: string
    issueCount: number
    totalTasks: number
    issueRate: number
  }>
}
