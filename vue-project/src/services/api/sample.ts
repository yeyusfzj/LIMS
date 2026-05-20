/**
 * 样品管理API服务
 * 
 * 设计参考:
 * 1. LabVantage的RESTful API设计规范
 * 2. Thermo Fisher SampleManager的样品追踪接口
 * 3. 遵循CRUD操作标准
 * 
 * API端点设计:
 * - GET    /samples          获取样品列表(支持分页、筛选、排序)
 * - GET    /samples/:id      获取单个样品详情
 * - POST   /samples          创建新样品
 * - PUT    /samples/:id      更新样品信息
 * - DELETE /samples/:id      删除样品
 * - POST   /samples/batch    批量操作
 */

import http from '../http'
import type { Sample } from '@/types'
import type {
  PageResponse,
  SampleListRequest,
  SampleCreateRequest,
  SampleUpdateRequest,
  BatchOperationRequest,
  BatchOperationResponse
} from '@/types/api'

/**
 * 样品API服务类
 * 
 * 采用类封装的优势:
 * - 命名空间隔离,避免函数名冲突
 * - 便于扩展和维护
 * - 支持依赖注入和Mock测试
 */
class SampleApi {
  private readonly baseUrl = '/samples'

  /**
   * 获取样品列表
   * 
   * @param params 分页和筛选参数
   * @returns 分页数据
   * 
   * 设计说明:
   * - 支持多条件组合筛选
   * - 支持自定义排序
   * - 后端分页减少数据传输
   */
  async getList(params: SampleListRequest): Promise<PageResponse<Sample>> {
    const response = await http.get(this.baseUrl, {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        ...params.filters
      }
    })
    // 后端返回格式: { success: true, data: { items: [...], pagination: {...} } }
    const data = response.data
    
    console.log('📊 getList API 响应:', response)
    console.log('📊 data:', data)
    console.log('📊 data.items 数量:', data.items?.length)
    console.log('📊 data.pagination:', data.pagination)
    
    // 转换后端蛇形命名为前端驼峰命名
    const items = data.items.map((item: any) => ({
      id: item.id,
      barcode: item.barcode,
      sampleNumber: item.sampleNumber || item.sample_number,
      clientName: item.clientName || item.client_name,
      clientContact: item.clientContact || item.client_contact,
      sampleName: item.sampleName || item.sample_name,
      sampleType: item.sampleType || item.sample_type,
      sampleCategory: item.sampleCategory || item.sample_category,
      quantity: item.quantity,
      unit: item.unit,
      receivedDate: item.receivedDate || item.received_date,
      samplingDate: item.samplingDate || item.sampling_date,
      samplingLocation: item.samplingLocation || item.sampling_location,
      samplingPerson: item.samplingPerson || item.sampling_person,
      storageLocation: item.storageLocation || item.storage_location,
      storageCondition: item.storageCondition || item.storage_condition,
      priority: item.priority,
      description: item.description,
      remarks: item.remarks,
      status: item.status,
      version: item.version,
      parentSampleId: item.parentSampleId || item.parent_sample_id,
      mergedFromIds: item.mergedFromIds || item.merged_from_ids,
      workflowInstanceId: item.workflowInstanceId || item.workflow_instance_id,
      createdBy: item.createdBy || item.created_by,
      createdAt: item.createdAt || item.created_at,
      updatedAt: item.updatedAt || item.updated_at,
      releasedAt: item.releasedAt || item.released_at,
      releasedBy: item.releasedBy || item.released_by
    }))
    
    // 从 pagination 对象中提取分页信息
    const pagination = data.pagination || {}
    
    return {
      items,
      total: pagination.total || 0,
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 20,
      totalPages: pagination.totalPages || 0
    }
  }

  /**
   * 获取样品详情
   * 
   * @param id 样品ID
   * @returns 样品详细信息
   */
  async getById(id: string): Promise<Sample> {
    const response = await http.get(`${this.baseUrl}/${id}`)
    console.log('🔍 getById API 响应:', response)
    // 响应拦截器已经返回了 { success: true, data: {...} }
    // 所以这里直接使用 response.data
    const data = response.data
    console.log('🔍 getById 提取的 data:', data)
    
    // 转换后端蛇形命名为前端驼峰命名
    return {
      id: data.id,
      barcode: data.barcode,
      sampleNumber: data.sample_number,
      clientName: data.client_name,
      clientContact: data.client_contact,
      sampleName: data.sample_name,
      sampleType: data.sample_type,
      sampleCategory: data.sample_category,
      quantity: data.quantity,
      unit: data.unit,
      receivedDate: data.received_date,
      samplingDate: data.sampling_date,
      samplingLocation: data.sampling_location,
      samplingPerson: data.sampling_person,
      storageLocation: data.storage_location,
      storageCondition: data.storage_condition,
      priority: data.priority,
      description: data.description,
      remarks: data.remarks,
      status: data.status,
      version: data.version,
      parentSampleId: data.parent_sample_id,
      mergedFromIds: data.merged_from_ids,
      workflowInstanceId: data.workflow_instance_id,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      releasedAt: data.released_at,
      releasedBy: data.released_by
    } as Sample
  }

  /**
   * 创建样品
   * 
   * @param data 样品数据
   * @returns 创建的样品信息
   * 
   * 设计说明:
   * - 自动生成条码(后端实现)
   * - 记录创建人和创建时间
   * - 触发工作流引擎
   */
  async create(data: SampleCreateRequest): Promise<Sample> {
    console.log('💾 create API 请求 - 原始数据:', data)
    
    // 转换驼峰命名为蛇形命名
    const snakeCaseData: any = {}
    if (data.clientName !== undefined) snakeCaseData.client_name = data.clientName
    if (data.clientContact !== undefined) snakeCaseData.client_contact = data.clientContact
    if (data.sampleName !== undefined) snakeCaseData.sample_name = data.sampleName
    if (data.sampleType !== undefined) snakeCaseData.sample_type = data.sampleType
    if (data.sampleCategory !== undefined) snakeCaseData.sample_category = data.sampleCategory
    if (data.quantity !== undefined) snakeCaseData.quantity = data.quantity
    if (data.unit !== undefined) snakeCaseData.unit = data.unit
    if (data.receivedDate !== undefined) snakeCaseData.received_date = data.receivedDate
    if (data.samplingDate !== undefined) snakeCaseData.sampling_date = data.samplingDate
    if (data.samplingLocation !== undefined) snakeCaseData.sampling_location = data.samplingLocation
    if (data.samplingPerson !== undefined) snakeCaseData.sampling_person = data.samplingPerson
    if (data.storageLocation !== undefined) snakeCaseData.storage_location = data.storageLocation
    if (data.storageCondition !== undefined) snakeCaseData.storage_condition = data.storageCondition
    if (data.priority !== undefined) snakeCaseData.priority = data.priority
    if (data.description !== undefined) snakeCaseData.description = data.description
    if (data.remarks !== undefined) snakeCaseData.remarks = data.remarks
    
    console.log('💾 转换后的数据（蛇形命名）:', snakeCaseData)
    
    const response = await http.post(this.baseUrl, snakeCaseData)
    const item = response.data
    
    // 转换后端蛇形命名为前端驼峰命名
    return {
      id: item.id,
      barcode: item.barcode,
      sampleNumber: item.sample_number,
      clientName: item.client_name,
      clientContact: item.client_contact,
      sampleName: item.sample_name,
      sampleType: item.sample_type,
      sampleCategory: item.sample_category,
      quantity: item.quantity,
      unit: item.unit,
      receivedDate: item.received_date,
      samplingDate: item.sampling_date,
      samplingLocation: item.sampling_location,
      samplingPerson: item.sampling_person,
      storageLocation: item.storage_location,
      storageCondition: item.storage_condition,
      priority: item.priority,
      description: item.description,
      remarks: item.remarks,
      status: item.status,
      version: item.version,
      parentSampleId: item.parent_sample_id,
      mergedFromIds: item.merged_from_ids,
      workflowInstanceId: item.workflow_instance_id,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      releasedAt: item.released_at,
      releasedBy: item.released_by
    } as Sample
  }

  /**
   * 更新样品
   * 
   * @param data 更新数据(包含ID)
   * @returns 更新后的样品信息
   * 
   * 设计说明:
   * - 支持部分更新(PATCH语义)
   * - 记录更新人和更新时间
   * - 触发审计日志
   */
  async update(data: SampleUpdateRequest): Promise<Sample> {
    const { id, ...updateData } = data
    console.log('💾 update API 请求 - 原始数据:', { id, updateData })
    console.log('💾 update API 请求 - updateData详情:', JSON.stringify(updateData, null, 2))
    
    // 转换驼峰命名为蛇形命名
    const snakeCaseData: any = {}
    if (updateData.clientName !== undefined) snakeCaseData.client_name = updateData.clientName
    if (updateData.clientContact !== undefined) snakeCaseData.client_contact = updateData.clientContact
    if (updateData.sampleName !== undefined) snakeCaseData.sample_name = updateData.sampleName
    if (updateData.sampleType !== undefined) snakeCaseData.sample_type = updateData.sampleType
    if (updateData.sampleCategory !== undefined) snakeCaseData.sample_category = updateData.sampleCategory
    if (updateData.quantity !== undefined) snakeCaseData.quantity = updateData.quantity
    if (updateData.unit !== undefined) snakeCaseData.unit = updateData.unit
    if (updateData.receivedDate !== undefined) snakeCaseData.received_date = updateData.receivedDate
    if (updateData.samplingDate !== undefined) snakeCaseData.sampling_date = updateData.samplingDate
    if (updateData.samplingLocation !== undefined) snakeCaseData.sampling_location = updateData.samplingLocation
    if (updateData.samplingPerson !== undefined) snakeCaseData.sampling_person = updateData.samplingPerson
    if (updateData.storageLocation !== undefined) snakeCaseData.storage_location = updateData.storageLocation
    if (updateData.storageCondition !== undefined) snakeCaseData.storage_condition = updateData.storageCondition
    if (updateData.priority !== undefined) snakeCaseData.priority = updateData.priority
    if (updateData.description !== undefined) snakeCaseData.description = updateData.description
    if (updateData.remarks !== undefined) snakeCaseData.remarks = updateData.remarks
    
    console.log('💾 转换后的数据（蛇形命名）:', snakeCaseData)
    console.log('💾 转换后的数据（JSON）:', JSON.stringify(snakeCaseData, null, 2))
    
    const response = await http.patch(`${this.baseUrl}/${id}`, snakeCaseData)
    console.log('💾 update API 响应:', response)
    // 响应拦截器已经返回了 { success: true, data: {...} }
    // 所以这里直接使用 response.data
    const item = response.data
    console.log('💾 update 提取的 item:', item)
    
    // 转换后端蛇形命名为前端驼峰命名
    return {
      id: item.id,
      barcode: item.barcode,
      sampleNumber: item.sample_number,
      clientName: item.client_name,
      clientContact: item.client_contact,
      sampleName: item.sample_name,
      sampleType: item.sample_type,
      sampleCategory: item.sample_category,
      quantity: item.quantity,
      unit: item.unit,
      receivedDate: item.received_date,
      samplingDate: item.sampling_date,
      samplingLocation: item.sampling_location,
      samplingPerson: item.sampling_person,
      storageLocation: item.storage_location,
      storageCondition: item.storage_condition,
      priority: item.priority,
      description: item.description,
      remarks: item.remarks,
      status: item.status,
      version: item.version,
      parentSampleId: item.parent_sample_id,
      mergedFromIds: item.merged_from_ids,
      workflowInstanceId: item.workflow_instance_id,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      releasedAt: item.released_at,
      releasedBy: item.released_by
    } as Sample
  }

  /**
   * 删除样品
   * 
   * @param id 样品ID
   * @returns 删除结果
   * 
   * 设计说明:
   * - 软删除,保留审计记录
   * - 检查关联数据(任务、结果等)
   * - 需要权限验证
   */
  async delete(id: string): Promise<void> {
    const response = await http.delete(`${this.baseUrl}/${id}`)
    return response.data
  }

  /**
   * 批量操作
   * 
   * @param request 批量操作请求
   * @returns 操作结果统计
   * 
   * 支持的操作:
   * - delete: 批量删除
   * - transfer: 批量流转
   * - export: 批量导出
   */
  async batchOperation(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    const response = await http.post(`${this.baseUrl}/batch`, request)
    return response.data
  }

  /**
   * 导出样品数据
   * 
   * @param ids 样品ID列表
   * @param format 导出格式(excel/csv/pdf)
   * @returns 下载文件
   * 
   * 设计说明:
   * - 支持多种格式导出
   * - 异步生成,避免超时
   * - 大数据量分批导出
   */
  async export(ids: string[], format: 'excel' | 'csv' | 'pdf' = 'excel'): Promise<void> {
    return http.download(`${this.baseUrl}/export`, `samples.${format}`)
  }

  /**
   * 获取样品统计信息
   * 
   * @returns 统计数据
   * 
   * 统计维度:
   * - 按状态统计
   * - 按类型统计
   * - 按时间统计
   */
  async getStatistics(): Promise<{
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    recentTrend: Array<{ date: string; count: number }>
  }> {
    return http.get(`${this.baseUrl}/statistics`)
  }

  /**
   * 搜索样品(全文搜索)
   * 
   * @param keyword 搜索关键词
   * @param limit 返回数量限制
   * @returns 搜索结果
   * 
   * 设计说明:
   * - 支持模糊搜索
   * - 搜索条码、名称、来源等字段
   * - 返回高亮匹配结果
   */
  async search(keyword: string, limit: number = 10): Promise<Sample[]> {
    return http.get<Sample[]>(`${this.baseUrl}/search`, {
      params: { keyword, limit }
    })
  }
}

// 导出单例实例
export const sampleApi = new SampleApi()
export default sampleApi
