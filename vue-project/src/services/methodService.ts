/**
 * 检测方法服务
 * 
 * 提供检测方法的CRUD操作和相关业务逻辑
 */

import http from './http'
import type { TestMethod } from '@/types'

export interface MethodFilters {
  keyword?: string
  category?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface MethodListResponse {
  data: TestMethod[]
  total: number
  page: number
  pageSize: number
}

export interface CreateMethodRequest {
  code: string
  name: string
  category: string
  version: string
  status: string
  scope?: string
  description?: string
  equipment: Array<{
    name: string
    model: string
    accuracy?: string
    calibration?: string
  }>
  steps: Array<{
    title: string
    description: string
  }>
  precision?: string
  accuracy?: string
  detectionLimit?: string
  measurementRange?: string
  qualityControl?: string
  safetyNotes?: string
  operationNotes?: string
}

export interface UpdateMethodRequest extends CreateMethodRequest {
  id: string
}

class MethodService {
  /**
   * 获取检测方法列表
   */
  async getMethodList(filters: MethodFilters = {}): Promise<MethodListResponse> {
    const params = {
      keyword: filters.keyword,
      category: filters.category,
      status: filters.status,
      page: filters.page || 1,
      pageSize: filters.pageSize || 10
    }
    
    const response = await http.get<MethodListResponse>('/methods', { params })
    return response.data || response
  }

  /**
   * 获取检测方法详情
   */
  async getMethodById(id: string): Promise<TestMethod> {
    const response = await http.get<TestMethod>(`/methods/${id}`)
    return response.data || response
  }

  /**
   * 创建检测方法
   */
  async createMethod(data: CreateMethodRequest): Promise<TestMethod> {
    const response = await http.post<TestMethod>('/methods', data)
    return response.data || response
  }

  /**
   * 更新检测方法
   */
  async updateMethod(id: string, data: UpdateMethodRequest): Promise<TestMethod> {
    const response = await http.put<TestMethod>(`/methods/${id}`, data)
    return response.data || response
  }

  /**
   * 删除检测方法
   */
  async deleteMethod(id: string): Promise<void> {
    const response = await http.delete<void>(`/methods/${id}`)
    return response.data || response
  }

  /**
   * 获取检测方法版本历史
   */
  async getMethodHistory(id: string): Promise<TestMethod[]> {
    const response = await http.get<TestMethod[]>(`/methods/${id}/history`)
    return response.data || response
  }

  /**
   * 复制检测方法
   */
  async copyMethod(id: string, newVersion: string): Promise<TestMethod> {
    const response = await http.post<TestMethod>(`/methods/${id}/copy`, { version: newVersion })
    return response.data || response
  }

  /**
   * 归档检测方法
   */
  async archiveMethod(id: string): Promise<void> {
    const response = await http.post<void>(`/methods/${id}/archive`)
    return response.data || response
  }

  /**
   * 激活检测方法
   */
  async activateMethod(id: string): Promise<void> {
    const response = await http.post<void>(`/methods/${id}/activate`)
    return response.data || response
  }
}

export const methodService = new MethodService()
export default methodService
