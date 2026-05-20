// 角色和权限管理相关类型定义

/**
 * 创建角色 DTO
 */
export interface CreateRoleDto {
  name: string
  description?: string
  permissionIds?: string[] // 权限 ID 列表
}

/**
 * 更新角色 DTO
 */
export interface UpdateRoleDto {
  name?: string
  description?: string
  permissionIds?: string[] // 权限 ID 列表
}

/**
 * 角色查询参数
 */
export interface RoleQuery {
  page?: number
  pageSize?: number
  name?: string
  hasPermission?: string // 筛选包含特定权限的角色
}

/**
 * 权限信息
 */
export interface PermissionInfo {
  id: string
  resource: string
  action: string
  createdAt: Date
}

/**
 * 角色响应数据
 */
export interface RoleResponse {
  id: string
  name: string
  description?: string
  permissions: PermissionInfo[]
  userCount?: number // 拥有该角色的用户数量
  createdAt: Date
  updatedAt: Date
}

/**
 * 分页角色结果
 */
export interface PaginatedRoleResult {
  items: RoleResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 创建权限 DTO
 */
export interface CreatePermissionDto {
  resource: string
  action: string
}

/**
 * 权限查询参数
 */
export interface PermissionQuery {
  page?: number
  pageSize?: number
  resource?: string
  action?: string
}

/**
 * 分页权限结果
 */
export interface PaginatedPermissionResult {
  items: PermissionInfo[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 角色权限分配 DTO
 */
export interface AssignPermissionsDto {
  permissionIds: string[]
}

/**
 * 用户角色分配 DTO
 */
export interface AssignRolesDto {
  roleIds: string[]
}
