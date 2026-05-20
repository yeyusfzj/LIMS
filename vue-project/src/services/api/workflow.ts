/**
 * 工作流管理API服务
 * 
 * 参考LabWare的工作流引擎设计
 */

import http from '../http'
import type { Workflow, Task } from '@/types'
import type { PageResponse, TaskListRequest } from '@/types/api'

class WorkflowApi {
  private readonly baseUrl = '/workflows'

  // 获取工作流列表
  async getList(): Promise<Workflow[]> {
    const response = await http.get<Workflow[]>(this.baseUrl)
    return response.data || response
  }

  // 获取工作流详情
  async getById(id: string): Promise<Workflow> {
    const response = await http.get<Workflow>(`${this.baseUrl}/${id}`)
    return response.data || response
  }

  // 创建工作流
  async create(data: Partial<Workflow>): Promise<Workflow> {
    const response = await http.post<Workflow>(this.baseUrl, data)
    return response.data || response
  }

  // 更新工作流
  async update(id: string, data: Partial<Workflow>): Promise<Workflow> {
    const response = await http.put<Workflow>(`${this.baseUrl}/${id}`, data)
    return response.data || response
  }

  // 删除工作流
  async delete(id: string): Promise<void> {
    const response = await http.delete<void>(`${this.baseUrl}/${id}`)
    return response.data || response
  }

  // 获取任务列表
  async getTasks(params: TaskListRequest): Promise<PageResponse<Task>> {
    const response = await http.get<PageResponse<Task>>('/tasks', { params })
    return response.data || response
  }

  // 获取任务详情
  async getTaskById(id: string): Promise<Task> {
    const response = await http.get<Task>(`/tasks/${id}`)
    return response.data || response
  }

  // 分配任务
  async assignTask(taskId: string, assignee: string): Promise<Task> {
    const response = await http.post<Task>(`/tasks/${taskId}/assign`, { assignee })
    return response.data || response
  }

  // 完成任务
  async completeTask(taskId: string, data: any): Promise<Task> {
    const response = await http.post<Task>(`/tasks/${taskId}/complete`, data)
    return response.data || response
  }
}

export const workflowApi = new WorkflowApi()
export default workflowApi
