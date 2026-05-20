/**
 * 审核API服务层
 * 
 * 封装所有审核相关的API调用，提供统一的接口给前端组件使用。
 * 遵循单一职责原则，专门处理审核业务的HTTP通信。
 */

import http from './http'
import type { AuditTask, AuditDecision, AuditStatistics, AuditApiResponse } from '@/types/audit'

export class AuditService {
  /**
   * 获取审核任务列表
   * @param params 查询参数
   * @returns 审核任务列表
   */
  async listAuditTasks(params?: {
    level?: number
    status?: string
    barcode?: string
    page?: number
    pageSize?: number
  }): Promise<AuditApiResponse<AuditTask[]>> {
    try {
      // HTTP拦截器返回的是完整响应: { message, data: { items, total, page, pageSize } }
      const response = await http.get<any>('/audits', {
        params,
        showError: true
      })
      
      // 审核级别名称映射
      const levelNames: Record<number, string> = {
        1: '分析审核',
        2: '样品审核',
        3: '技术审核',
        4: '质量审核'
      }
      
      // 从 response.data 中提取数据
      const responseData = response.data || response
      const items = (responseData.items || []).map((task: any) => ({
        ...task,
        status: task.status?.toLowerCase() || 'pending',
        auditor: task.auditorId || 'UNASSIGNED',
        sampleName: task.task?.sample?.sampleName || '',
        sampleBarcode: task.task?.sample?.barcode || '',
        levelName: levelNames[task.level] || `级别${task.level}`,
        priority: task.task?.sample?.priority?.toLowerCase() || 'normal'
      }))
      
      // 转换为前端期望的格式
      return {
        success: true,
        data: items,
        pagination: {
          currentPage: responseData.page || 1,
          pageSize: responseData.pageSize || 20,
          total: responseData.total || 0,
          totalPages: Math.ceil((responseData.total || 0) / (responseData.pageSize || 20))
        }
      }
    } catch (error) {
      console.error('获取审核任务列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个审核任务详情
   * @param id 审核任务ID
   * @returns 审核任务详情
   */
  async getAuditTask(id: string): Promise<AuditTask> {
    try {
      console.log('[auditService] 获取审核任务详情，id:', id)
      const response = await http.get<any>(`/audits/${id}`, {
        showError: true
      })
      console.log('[auditService] 收到响应:', response)
      
      // 从 response.data 中提取数据，如果不存在则使用 response 本身
      const taskData = response.data || response
      
      // 审核级别名称映射
      const levelNames: Record<number, string> = {
        1: '分析审核',
        2: '样品审核',
        3: '技术审核',
        4: '质量审核'
      }
      
      // 将状态转换为小写并补充前端需要的字段
      const task = {
        ...taskData,
        status: taskData.status?.toLowerCase() || 'pending',
        auditor: taskData.auditorId || 'UNASSIGNED',
        sampleName: taskData.task?.sample?.sampleName || '',
        sampleBarcode: taskData.task?.sample?.barcode || '',
        levelName: levelNames[taskData.level] || `级别${taskData.level}`,
        priority: taskData.task?.sample?.priority?.toLowerCase() || 'normal'
      } as AuditTask
      
      console.log('[auditService] 转换后的任务数据:', task)
      return task
    } catch (error) {
      console.error('[auditService] 获取审核任务详情失败:', error)
      throw error
    }
  }

  /**
   * 执行审核操作
   * @param id 审核任务ID
   * @param decision 审核决策
   * @returns 审核结果
   */
  async performAudit(id: string, decision: AuditDecision): Promise<{ success: boolean; message: string }> {
    try {
      const response = await http.post<any>(
        `/audits/${id}/execute`,  // 修改为后端实际的端点
        decision,
        {
          showError: true
        }
      )
      // 从 response.data 中提取数据
      const result = response.data || response
      return {
        success: true,
        message: result.message || response.message || '审核操作成功'
      }
    } catch (error) {
      console.error('执行审核操作失败:', error)
      throw error
    }
  }

  /**
   * 获取审核统计信息
   * @returns 审核统计数据
   */
  async getAuditStatistics(): Promise<AuditStatistics> {
    try {
      const response = await http.get<any>('/audits/statistics', {
        showError: true
      })
      // 从 response.data 中提取数据，如果不存在则使用 response 本身
      return response.data || response
    } catch (error) {
      console.error('获取审核统计信息失败:', error)
      throw error
    }
  }

  /**
   * 批量审核操作
   * @param ids 审核任务ID列表
   * @param decision 审核决策
   * @returns 批量审核结果
   */
  async batchAudit(ids: string[], decision: Omit<AuditDecision, 'taskId'>): Promise<{
    success: boolean
    message: string
    results: Array<{ id: string; success: boolean; message: string }>
  }> {
    try {
      const response = await http.post<{
        success: boolean
        message: string
        results: Array<{ id: string; success: boolean; message: string }>
      }>('/audits/batch-review', {
        taskIds: ids,
        ...decision
      }, {
        showError: true
      })
      return response
    } catch (error) {
      console.error('批量审核操作失败:', error)
      throw error
    }
  }

  /**
   * 获取审核历史记录
   * @param taskId 审核任务ID
   * @returns 审核历史记录
   */
  async getAuditHistory(taskId: string): Promise<Array<{
    id: string
    action: string
    result: string
    operator: string
    levelName: string
    timestamp: Date
    comments?: string
  }>> {
    try {
      const response = await http.get<any>(`/audits/${taskId}/history`, {  // 修改为正确的端点
        showError: true
      })
      
      // 从 response.data 中提取数据，如果不存在则使用 response 本身
      const historyData = response.data || response
      const historyArray = Array.isArray(historyData) ? historyData : []
      
      // 转换后端数据格式为前端期望的格式
      return historyArray.map((record: any) => {
        // 从 changes 中提取决策结果
        let result = 'info'
        let levelName = ''
        let comments = ''
        
        if (record.changes) {
          // 如果 changes 中有 decision 字段，使用它作为 result
          if (record.changes.decision) {
            const decisionMap: Record<string, string> = {
              'APPROVE': 'approved',
              'REJECT': 'rejected',
              'RETURN': 'returned'
            }
            result = decisionMap[record.changes.decision] || record.changes.decision.toLowerCase()
          }
          
          // 提取级别名称
          if (record.changes.level) {
            const levelNames: Record<number, string> = {
              1: '分析审核',
              2: '样品审核',
              3: '技术审核',
              4: '质量审核'
            }
            levelName = levelNames[record.changes.level] || `级别${record.changes.level}`
          }
          
          // 提取评论
          if (record.changes.comments) {
            comments = record.changes.comments
          }
        }
        
        // 如果 action 是 'review'，但没有从 changes 中提取到 result，使用 action 作为 result
        if (!result || result === 'info') {
          const actionMap: Record<string, string> = {
            'created': 'info',
            'review': 'approved',
            'reassigned': 'info',
            'updated': 'info'
          }
          result = actionMap[record.action] || 'info'
        }
        
        return {
          id: record.id,
          action: record.action,
          result: result,
          operator: record.performedBy,
          levelName: levelName,
          timestamp: new Date(record.performedAt),
          comments: comments
        }
      })
    } catch (error) {
      console.error('获取审核历史记录失败:', error)
      throw error
    }
  }

  /**
   * 上传审核附件
   * @param taskId 审核任务ID
   * @param file 附件文件
   * @param onProgress 上传进度回调
   * @returns 上传结果
   */
  async uploadAuditAttachment(
    taskId: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; fileId: string; fileName: string; fileUrl: string }> {
    try {
      const response = await http.upload<{ 
        success: boolean
        fileId: string
        fileName: string
        fileUrl: string 
      }>(`/audits/${taskId}/attachments`, file, onProgress)
      return response
    } catch (error) {
      console.error('上传审核附件失败:', error)
      throw error
    }
  }

  /**
   * 删除审核附件
   * @param taskId 审核任务ID
   * @param fileId 文件ID
   * @returns 删除结果
   */
  async deleteAuditAttachment(taskId: string, fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await http.delete<{ success: boolean; message: string }>(
        `/audits/${taskId}/attachments/${fileId}`,
        {
          showError: true
        }
      )
      return response
    } catch (error) {
      console.error('删除审核附件失败:', error)
      throw error
    }
  }

  /**
   * 获取审核任务的样品信息
   * @param taskId 审核任务ID
   * @returns 样品信息
   */
  async getSampleInfo(taskId: string): Promise<{
    id: string
    barcode: string
    name: string
    source: string
    client: string
    receivedDate: Date
    sampleType: string
    quantity: number
    unit: string
    status: string
    currentLocation: string
    createdBy: string
    createdAt: Date
    updatedAt: Date
  }> {
    try {
      const response = await http.get<{
        id: string
        barcode: string
        name: string
        source: string
        client: string
        receivedDate: string
        sampleType: string
        quantity: number
        unit: string
        status: string
        currentLocation: string
        createdBy: string
        createdAt: string
        updatedAt: string
      }>(`/audits/${taskId}/sample`, {
        showError: true
      })
      
      // 转换日期字符串为Date对象
      return {
        ...response,
        receivedDate: new Date(response.receivedDate),
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt)
      }
    } catch (error) {
      console.error('获取样品信息失败:', error)
      throw error
    }
  }

  /**
   * 获取审核任务的检测结果
   * @param taskId 审核任务ID
   * @returns 检测结果列表
   */
  async getTestResults(taskId: string): Promise<Array<{
    id: string
    taskId: string
    testItemId: string
    testItemName: string
    value: number
    unit?: string
    source: 'manual' | 'instrument'
    operator: string
    timestamp: Date
    isAnomaly: boolean
    anomalyInfo?: {
      resultId: string
      type: string
      reason: string
      markedBy: string
      markedAt: Date
      retestRequired: boolean
    }
  }>> {
    try {
      const response = await http.get<Array<{
        id: string
        taskId: string
        testItemId: string
        testItemName: string
        value: number
        unit?: string
        source: 'manual' | 'instrument'
        operator: string
        timestamp: string
        isAnomaly: boolean
        anomalyInfo?: {
          resultId: string
          type: string
          reason: string
          markedBy: string
          markedAt: string
          retestRequired: boolean
        }
      }>>(`/audits/${taskId}/test-results`, {
        showError: true
      })
      
      // 转换时间戳为Date对象
      return response.map(result => ({
        ...result,
        timestamp: new Date(result.timestamp),
        anomalyInfo: result.anomalyInfo ? {
          ...result.anomalyInfo,
          markedAt: new Date(result.anomalyInfo.markedAt)
        } : undefined
      }))
    } catch (error) {
      console.error('获取检测结果失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const auditService = new AuditService()
export default auditService
