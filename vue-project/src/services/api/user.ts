/**
 * 用户管理API服务
 */

import http from '../http'
import type { User } from '@/types'

class UserApi {
  private readonly baseUrl = '/users'

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    const response = await http.get<User>('/auth/me')
    return response.data || response
  }

  // 登录
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await http.post('/auth/login', { username, password })
    return response.data || response
  }

  // 登出
  async logout(): Promise<void> {
    const response = await http.post('/auth/logout')
    return response.data || response
  }

  // 获取用户列表
  async getList(): Promise<User[]> {
    const response = await http.get<User[]>(this.baseUrl)
    return response.data || response
  }

  // 创建用户
  async create(data: Partial<User>): Promise<User> {
    const response = await http.post<User>(this.baseUrl, data)
    return response.data || response
  }

  // 更新用户
  async update(id: string, data: Partial<User>): Promise<User> {
    const response = await http.put<User>(`${this.baseUrl}/${id}`, data)
    return response.data || response
  }

  // 删除用户
  async delete(id: string): Promise<void> {
    const response = await http.delete<void>(`${this.baseUrl}/${id}`)
    return response.data || response
  }
}

export const userApi = new UserApi()
export default userApi
