// 权限相关类型定义

/**
 * 创建权限DTO
 */
export interface CreatePermissionDto {
  resource: string
  action: string
}

/**
 * 创建角色DTO
 */
export interface CreateRoleDto {
  name: string
  description?: string
}

/**
 * 分配权限DTO
 */
export interface AssignPermissionDto {
  roleId: string
  permissionId: string
}

/**
 * 分配角色DTO
 */
export interface AssignRoleDto {
  userId: string
  roleId: string
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
 * 角色信息
 */
export interface RoleInfo {
  id: string
  name: string
  description?: string
  permissions: PermissionInfo[]
  createdAt: Date
  updatedAt: Date
}

/**
 * 用户权限信息
 */
export interface UserPermissionInfo {
  userId: string
  username: string
  roles: string[]
  permissions: Array<{
    resource: string
    action: string
  }>
}
