/**
 * 结果录入API服务
 * 
 * 提供结果录入、查询、更新等功能的API接口
 */

import { http } from '../http'
import type { 
  CreateResultDto, 
  UpdateResultDto, 
  ResultQuery, 
  ResultResponse, 
  PaginatedResultResponse 
} from '@/types/result'

export interface TestResult {
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
  isAbnormal?: boolean
  abnormalReason?: string
  enteredBy: string
  enteredAt: Date
  reviewedBy?: string
  reviewedAt?: Date
}

export interface CreateResultRequest {
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  textValue?: string
  unit?: string
  method: string
  source?: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  instrumentId?: string
}

export interface ResultListQuery {
  sampleId?: string
  testItemId?: string
  parameter?: string
  source?: 'MANUAL' | 'INSTRUMENT' | 'CALCULATED'
  isAbnormal?: boolean
  page?: number
  pageSize?: number
}

/**
 * 结果API服务类
 */
class ResultApiService {
  /**
   * 创建检测结果
   */
  async createResult(data: CreateResultRequest): Promise<TestResult> {
    console.log('创建检测结果:', data)
    const response = await http.post<TestResult>('/results', data)
    return response.data || response
  }

  /**
   * 获取结果详情
   */
  async getResult(id: string): Promise<TestResult> {
    console.log('获取结果详情:', id)
    const response = await http.get<TestResult>(`/results/${id}`)
    return response.data || response
  }

  /**
   * 查询结果列表
   */
  async listResults(query: ResultListQuery = {}): Promise<PaginatedResultResponse> {
    console.log('查询结果列表:', query)
    const response = await http.get<PaginatedResultResponse>('/results', { params: query })
    return response.data || response
  }

  /**
   * 更新结果
   */
  async updateResult(id: string, data: Partial<CreateResultRequest>): Promise<TestResult> {
    console.log('更新结果:', id, data)
    const response = await http.put<TestResult>(`/results/${id}`, data)
    return response.data || response
  }

  /**
   * 删除结果
   */
  async deleteResult(id: string): Promise<void> {
    console.log('删除结果:', id)
    const response = await http.delete(`/results/${id}`)
    return response.data || response
  }

  /**
   * 根据样品ID获取所有结果
   */
  async getResultsBySample(sampleId: string): Promise<TestResult[]> {
    console.log('根据样品ID获取结果:', sampleId)
    const response = await http.get<TestResult[]>(`/samples/${sampleId}/results`)
    return response.data || response
  }

  /**
   * 申请复测
   */
  async requestRetest(resultId: string, reason: string): Promise<any> {
    console.log('申请复测:', resultId, reason)
    const response = await http.post(`/results/${resultId}/retest`, { reason })
    return response.data || response
  }

  /**
   * 批量导入结果
   */
  async importResults(file: File, mapping?: any): Promise<any> {
    console.log('批量导入结果:', file.name)
    const formData = new FormData()
    formData.append('file', file)
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping))
    }
    
    const response = await http.post('/results/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data || response
  }
}

// 导出单例实例
export const resultApi = new ResultApiService()
export default resultApi