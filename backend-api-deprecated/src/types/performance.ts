/**
 * 性能监控相关类型定义
 */

/**
 * API 请求性能指标
 */
export interface ApiPerformanceMetric {
  method: string
  path: string
  statusCode: number
  duration: number
  timestamp: Date
  userId?: string
  ip?: string
  userAgent?: string
}

/**
 * 数据库查询性能指标
 */
export interface DatabaseQueryMetric {
  query: string
  duration: number
  timestamp: Date
  params?: any
  model?: string
  operation?: string
}

/**
 * 慢请求记录
 */
export interface SlowRequest {
  id: string
  method: string
  path: string
  duration: number
  timestamp: Date
  query?: any
  body?: any
  userId?: string
  statusCode: number
}

/**
 * 慢查询记录
 */
export interface SlowQuery {
  id: string
  query: string
  duration: number
  timestamp: Date
  params?: any
  stackTrace?: string
}

/**
 * 性能统计数据
 */
export interface PerformanceStats {
  // API 性能统计
  apiStats: {
    totalRequests: number
    averageDuration: number
    p50Duration: number
    p95Duration: number
    p99Duration: number
    slowRequestCount: number
    errorRate: number
  }
  
  // 数据库性能统计
  databaseStats: {
    totalQueries: number
    averageDuration: number
    slowQueryCount: number
    cacheHitRatio?: number
  }
  
  // 时间范围
  timeRange: {
    start: Date
    end: Date
  }
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorConfig {
  // 慢请求阈值（毫秒）
  slowRequestThreshold: number
  
  // 慢查询阈值（毫秒）
  slowQueryThreshold: number
  
  // 是否启用详细日志
  enableDetailedLogging: boolean
  
  // 是否记录请求体
  logRequestBody: boolean
  
  // 是否记录响应体
  logResponseBody: boolean
  
  // 性能数据保留时间（小时）
  dataRetentionHours: number
}

/**
 * 路径性能统计
 */
export interface PathPerformanceStats {
  path: string
  method: string
  requestCount: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
  errorCount: number
  errorRate: number
}
