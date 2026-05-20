/**
 * 审核统计服务
 * 提供审核数据统计和分析功能
 */

import http from './http'

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

/**
 * 获取工作量统计
 */
export async function getWorkloadStatistics(filters: StatisticsFilters) {
  try {
    const response = await http.get<{ data: WorkloadData[] }>('/statistics/audit/workload', {
      params: filters
    })
    return response.data
  } catch (error) {
    console.error('获取工作量统计失败:', error)
    throw error
  }
}

/**
 * 获取通过率统计
 */
export async function getPassRateStatistics(filters: StatisticsFilters) {
  try {
    const response = await http.get<{ data: PassRateData }>('/statistics/audit/pass-rate', {
      params: filters
    })
    return response.data
  } catch (error) {
    console.error('获取通过率统计失败:', error)
    throw error
  }
}

/**
 * 获取时效性统计
 */
export async function getDurationStatistics(filters: StatisticsFilters) {
  try {
    const response = await http.get<{ data: DurationData }>('/statistics/audit/duration', {
      params: filters
    })
    return response.data
  } catch (error) {
    console.error('获取时效性统计失败:', error)
    throw error
  }
}

/**
 * 获取问题分类统计
 */
export async function getIssueStatistics(filters: StatisticsFilters) {
  try {
    const response = await http.get<{ data: IssueData }>('/statistics/audit/issues', {
      params: filters
    })
    return response.data
  } catch (error) {
    console.error('获取问题分类统计失败:', error)
    throw error
  }
}

/**
 * 导出统计数据
 */
export async function exportStatistics(type: 'workload' | 'passRate' | 'duration' | 'issues', filters: StatisticsFilters) {
  try {
    const response = await http.post('/statistics/audit/export', {
      type,
      filters
    }, {
      responseType: 'blob'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10)
    const typeNames = {
      workload: '工作量统计',
      passRate: '通过率统计',
      duration: '时效性统计',
      issues: '问题分类统计'
    }
    link.download = `${typeNames[type]}_${timestamp}.xlsx`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出统计数据失败:', error)
    throw error
  }
}

export default {
  getWorkloadStatistics,
  getPassRateStatistics,
  getDurationStatistics,
  getIssueStatistics,
  exportStatistics
}
