/**
 * 检测方法类型定义
 */

export interface Equipment {
  name: string
  model: string
  accuracy?: string
  calibration?: string
}

export interface MethodStep {
  title: string
  description: string
}

export interface TestMethod {
  id: string
  code: string
  name: string
  category: string
  version: string
  status: 'draft' | 'active' | 'archived'
  scope?: string
  description?: string
  equipment: Equipment[]
  steps: MethodStep[]
  precision?: string
  accuracy?: string
  detectionLimit?: string
  measurementRange?: string
  qualityControl?: string
  safetyNotes?: string
  operationNotes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMethodRequest {
  code: string
  name: string
  category: string
  version: string
  status: 'draft' | 'active' | 'archived'
  scope?: string
  description?: string
  equipment: Equipment[]
  steps: MethodStep[]
  precision?: string
  accuracy?: string
  detectionLimit?: string
  measurementRange?: string
  qualityControl?: string
  safetyNotes?: string
  operationNotes?: string
}

export interface UpdateMethodRequest extends Partial<CreateMethodRequest> {}

export interface MethodFilters {
  keyword?: string
  category?: string
  status?: string
  page?: number
  pageSize?: number
}
