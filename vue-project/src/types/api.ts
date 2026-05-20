/**
 * API请求和响应类型定义
 * 
 * 设计原则:
 * 1. 遵循RESTful API设计规范
 * 2. 使用泛型提供类型安全
 * 3. 统一的分页、排序、筛选接口
 */

// 分页请求参数 (参考LabWare的分页设计)
export interface PageRequest {
  page: number          // 当前页码,从1开始
  pageSize: number      // 每页数量
  sortBy?: string       // 排序字段
  sortOrder?: 'asc' | 'desc'  // 排序方向
}

// 分页响应数据
export interface PageResponse<T> {
  items: T[]            // 数据列表
  total: number         // 总记录数
  page: number          // 当前页码
  pageSize: number      // 每页数量
  totalPages: number    // 总页数
}

// 样品筛选参数
export interface SampleFilters {
  barcode?: string
  name?: string
  status?: string[]
  sampleType?: string
  client?: string
  location?: string
  createdBy?: string
  startDate?: string
  endDate?: string
}

// 样品列表请求
export interface SampleListRequest extends PageRequest {
  filters?: SampleFilters
}

// 样品创建请求
export interface SampleCreateRequest {
  name: string
  source: string
  client: string
  sampleType: string
  quantity: number
  unit: string
  receivedDate: string
  storageConditions?: {
    temperature?: number
    humidity?: number
    specialRequirements?: string
  }
}

// 样品更新请求
export interface SampleUpdateRequest extends Partial<SampleCreateRequest> {
  id: string
}

// 工作流筛选参数
export interface WorkflowFilters {
  name?: string
  status?: string[]
  applicableTypes?: string[]
}

// 任务筛选参数
export interface TaskFilters {
  keyword?: string
  status?: string[]
  priority?: string[]
  assignee?: string
  startDate?: string
  endDate?: string
}

// 任务列表请求
export interface TaskListRequest extends PageRequest {
  filters?: TaskFilters
}

// 批量操作请求
export interface BatchOperationRequest {
  ids: string[]
  operation: 'delete' | 'transfer' | 'export' | 'approve' | 'reject'
  params?: Record<string, any>
}

// 批量操作响应
export interface BatchOperationResponse {
  success: number       // 成功数量
  failed: number        // 失败数量
  errors?: Array<{      // 错误详情
    id: string
    message: string
  }>
}
