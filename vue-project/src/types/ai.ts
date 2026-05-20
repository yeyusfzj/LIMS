/**
 * AI助手相关类型定义
 */

// 消息类型
export type MessageType = 'user' | 'ai' | 'system'

// 消息接口
export interface Message {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  data?: AnalysisData
}

// 分析数据类型
export type AnalysisDataType = 'text' | 'chart' | 'table' | 'metrics' | 'mixed'

// 分析数据接口
export interface AnalysisData {
  type: AnalysisDataType
  title?: string
  summary?: string
  metrics?: Metric[]
  charts?: ChartData[]
  tables?: TableData[]
  recommendations?: string[]
  actions?: Action[]
}

// 指标数据
export interface Metric {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  change?: string
  icon?: string
  color?: string
}

// 图表数据
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'radar'
  title: string
  data: any
  options?: any
}

// 表格数据
export interface TableData {
  title: string
  columns: TableColumn[]
  data: any[]
}

export interface TableColumn {
  prop: string
  label: string
  width?: string | number
}

// 操作按钮
export interface Action {
  label: string
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  handler: string
  icon?: string
}

// 快捷操作
export interface QuickAction {
  id: string
  label: string
  icon: string
  prompt: string
  category: string
  color?: string
}

// AI响应
export interface AIResponse {
  success: boolean
  data: {
    message: string
    type: 'simple' | 'analysis' | 'recommendation'
    analysis?: AnalysisData
    recommendations?: string[]
    actions?: Action[]
  }
  timestamp: number
}

// Dashboard上下文
export interface DashboardContext {
  metrics: {
    totalSamples: number
    totalSamplesTrend: number
    pendingTasks: number
    pendingTasksTrend: number
    qualityRate: number
    qualityRateTrend: number
    abnormalSamples: number
    abnormalSamplesTrend: number
  }
  todoItems: TodoItem[]
  recentActivities: Activity[]
  timestamp: number
  page: string
}

export interface TodoItem {
  id: number
  title: string
  description: string
  type: string
  count: number
  urgent: boolean
  time: string
  icon: string
  color: string
  path: string
}

export interface Activity {
  id: number
  content: string
  timestamp: string
  icon: string
  color: string
  tag: string
  tagType: string
}

// AI洞察
export interface AIInsights {
  greeting: {
    message: string
    timeOfDay: string
  }
  dataAnalysis: DataAnalysisItem[]
  alerts: Alert[]
  suggestions: string[]
  timestamp: number
}

export interface DataAnalysisItem {
  metric: string
  value: string
  trend: 'up' | 'down' | 'stable'
  insight: string
}

export interface Alert {
  id: string
  severity: 'high' | 'medium' | 'low'
  message: string
  action?: string
  actionPath?: string
}

export interface InsightItem {
  icon: string
  color: string
  text: string
}
