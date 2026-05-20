// 用户管理相关类型定义

import { UserStatus } from '@prisma/client'

/**
 * 创建用户 DTO
 */
export interface CreateUserDto {
  username: string
  password: string
  email: string
  fullName: string
  department?: string
  position?: string
  phone?: string
  roleIds?: string[] // 角色 ID 列表
}

/**
 * 更新用户 DTO
 */
export interface UpdateUserDto {
  email?: string
  fullName?: string
  department?: string
  position?: string
  phone?: string
  status?: UserStatus
  roleIds?: string[] // 角色 ID 列表
}

/**
 * 用户查询参数
 */
export interface UserQuery {
  page?: number
  pageSize?: number
  username?: string
  email?: string
  fullName?: string
  department?: string
  status?: UserStatus
  roleId?: string
}

/**
 * 密码重置 DTO
 */
export interface ResetPasswordDto {
  newPassword: string
}

/**
 * 修改密码 DTO
 */
export interface ChangePasswordDto {
  oldPassword: string
  newPassword: string
}

/**
 * 用户响应数据
 */
export interface UserResponse {
  id: string
  username: string
  email: string
  fullName: string
  department?: string
  position?: string
  phone?: string
  status: UserStatus
  roles: RoleInfo[]
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

/**
 * 角色信息
 */
export interface RoleInfo {
  id: string
  name: string
  description?: string
}

/**
 * 分页结果
 */
export interface PaginatedUserResult {
  items: UserResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
