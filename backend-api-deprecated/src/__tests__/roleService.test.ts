import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { roleService } from '../services/roleService'
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto } from '../types/role'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    permission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }

  return {
    PrismaClient: vi.fn(() => mockPrismaClient)
  }
})

const prisma = new PrismaClient()

describe('RoleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRole', () => {
    it('应该成功创建角色', async () => {
      const createData: CreateRoleDto = {
        name: '测试角色',
        description: '这是一个测试角色',
        permissionIds: []
      }

      const mockRole = {
        id: 'role-1',
        name: '测试角色',
        description: '这是一个测试角色',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(null)
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          role: {
            create: vi.fn().mockResolvedValue(mockRole),
            update: vi.fn()
          }
        })
      })
      ;(prisma.role.findUnique as any).mockResolvedValueOnce(null).mockResolvedValueOnce({
        ...mockRole,
        permissions: [],
        users: []
      })

      const result = await roleService.createRole(createData, 'user-1')

      expect(result).toBeDefined()
      expect(result.name).toBe('测试角色')
    })

    it('应该在角色名已存在时抛出错误', async () => {
      const createData: CreateRoleDto = {
        name: '已存在角色',
        description: '测试'
      }

      ;(prisma.role.findUnique as any).mockResolvedValue({
        id: 'existing-role',
        name: '已存在角色'
      })

      await expect(roleService.createRole(createData, 'user-1')).rejects.toThrow('角色名称已存在')
    })

    it('应该在权限不存在时抛出错误', async () => {
      const createData: CreateRoleDto = {
        name: '测试角色',
        permissionIds: ['perm-1', 'perm-2']
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(null)
      ;(prisma.permission.findMany as any).mockResolvedValue([
        { id: 'perm-1' }
      ])

      await expect(roleService.createRole(createData, 'user-1')).rejects.toThrow('部分权限不存在')
    })
  })

  describe('updateRole', () => {
    it('应该成功更新角色', async () => {
      const updateData: UpdateRoleDto = {
        name: '更新后的角色',
        description: '更新后的描述'
      }

      const mockRole = {
        id: 'role-1',
        name: '原角色名',
        description: '原描述',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(mockRole)
      ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          role: {
            update: vi.fn().mockResolvedValue({
              ...mockRole,
              name: '更新后的角色',
              description: '更新后的描述'
            }),
            findUnique: vi.fn().mockResolvedValue({
              ...mockRole,
              permissions: []
            })
          }
        })
      })
      ;(prisma.role.findUnique as any)
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockRole,
          name: '更新后的角色',
          permissions: [],
          users: []
        })

      const result = await roleService.updateRole('role-1', updateData, 'user-1')

      expect(result).toBeDefined()
      expect(result.name).toBe('更新后的角色')
    })

    it('应该在角色不存在时抛出错误', async () => {
      ;(prisma.role.findUnique as any).mockResolvedValue(null)

      await expect(roleService.updateRole('role-1', {}, 'user-1')).rejects.toThrow('角色不存在')
    })
  })

  describe('getRoleById', () => {
    it('应该成功获取角色详情', async () => {
      const mockRole = {
        id: 'role-1',
        name: '测试角色',
        description: '测试描述',
        permissions: [
          { id: 'perm-1', resource: 'sample', action: 'read', createdAt: new Date() }
        ],
        users: [{ userId: 'user-1', roleId: 'role-1' }],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(mockRole)

      const result = await roleService.getRoleById('role-1')

      expect(result).toBeDefined()
      expect(result.id).toBe('role-1')
      expect(result.permissions).toHaveLength(1)
      expect(result.userCount).toBe(1)
    })

    it('应该在角色不存在时抛出错误', async () => {
      ;(prisma.role.findUnique as any).mockResolvedValue(null)

      await expect(roleService.getRoleById('role-1')).rejects.toThrow('角色不存在')
    })
  })

  describe('listRoles', () => {
    it('应该成功获取角色列表', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: '角色1',
          description: '描述1',
          permissions: [],
          users: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'role-2',
          name: '角色2',
          description: '描述2',
          permissions: [],
          users: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      ;(prisma.role.findMany as any).mockResolvedValue(mockRoles)
      ;(prisma.role.count as any).mockResolvedValue(2)

      const result = await roleService.listRoles({ page: 1, pageSize: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(1)
    })

    it('应该支持按名称筛选', async () => {
      ;(prisma.role.findMany as any).mockResolvedValue([])
      ;(prisma.role.count as any).mockResolvedValue(0)

      await roleService.listRoles({ name: '管理员' })

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: '管理员', mode: 'insensitive' }
          })
        })
      )
    })
  })

  describe('deleteRole', () => {
    it('应该成功删除角色', async () => {
      const mockRole = {
        id: 'role-1',
        name: '测试角色',
        users: []
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(mockRole)
      ;(prisma.role.delete as any).mockResolvedValue(mockRole)

      await roleService.deleteRole('role-1', 'user-1')

      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } })
    })

    it('应该在角色不存在时抛出错误', async () => {
      ;(prisma.role.findUnique as any).mockResolvedValue(null)

      await expect(roleService.deleteRole('role-1', 'user-1')).rejects.toThrow('角色不存在')
    })

    it('应该在角色被使用时抛出错误', async () => {
      const mockRole = {
        id: 'role-1',
        name: '测试角色',
        users: [{ userId: 'user-1', roleId: 'role-1' }]
      }

      ;(prisma.role.findUnique as any).mockResolvedValue(mockRole)

      await expect(roleService.deleteRole('role-1', 'user-1')).rejects.toThrow('该角色正在被使用，无法删除')
    })
  })

  describe('assignPermissions', () => {
    it('应该成功为角色分配权限', async () => {
      const mockRole = {
        id: 'role-1',
        name: '测试角色'
      }

      const mockPermissions = [
        { id: 'perm-1', resource: 'sample', action: 'read' },
        { id: 'perm-2', resource: 'sample', action: 'create' }
      ]

      ;(prisma.role.findUnique as any).mockResolvedValue(mockRole)
      ;(prisma.permission.findMany as any).mockResolvedValue(mockPermissions)
      ;(prisma.role.update as any).mockResolvedValue(mockRole)
      ;(prisma.role.findUnique as any)
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce({
          ...mockRole,
          permissions: mockPermissions,
          users: []
        })

      const result = await roleService.assignPermissions('role-1', ['perm-1', 'perm-2'], 'user-1')

      expect(result).toBeDefined()
      expect(prisma.role.update).toHaveBeenCalled()
    })
  })

  describe('createPermission', () => {
    it('应该成功创建权限', async () => {
      const createData: CreatePermissionDto = {
        resource: 'sample',
        action: 'read'
      }

      const mockPermission = {
        id: 'perm-1',
        resource: 'sample',
        action: 'read',
        createdAt: new Date()
      }

      ;(prisma.permission.findUnique as any).mockResolvedValue(null)
      ;(prisma.permission.create as any).mockResolvedValue(mockPermission)

      const result = await roleService.createPermission(createData, 'user-1')

      expect(result).toBeDefined()
      expect(result.resource).toBe('sample')
      expect(result.action).toBe('read')
    })

    it('应该在权限已存在时抛出错误', async () => {
      const createData: CreatePermissionDto = {
        resource: 'sample',
        action: 'read'
      }

      ;(prisma.permission.findUnique as any).mockResolvedValue({
        id: 'perm-1',
        resource: 'sample',
        action: 'read'
      })

      await expect(roleService.createPermission(createData, 'user-1')).rejects.toThrow('权限已存在')
    })
  })

  describe('listPermissions', () => {
    it('应该成功获取权限列表', async () => {
      const mockPermissions = [
        { id: 'perm-1', resource: 'sample', action: 'read', createdAt: new Date() },
        { id: 'perm-2', resource: 'sample', action: 'create', createdAt: new Date() }
      ]

      ;(prisma.permission.findMany as any).mockResolvedValue(mockPermissions)
      ;(prisma.permission.count as any).mockResolvedValue(2)

      const result = await roleService.listPermissions({ page: 1, pageSize: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('deletePermission', () => {
    it('应该成功删除权限', async () => {
      const mockPermission = {
        id: 'perm-1',
        resource: 'sample',
        action: 'read',
        roles: []
      }

      ;(prisma.permission.findUnique as any).mockResolvedValue(mockPermission)
      ;(prisma.permission.delete as any).mockResolvedValue(mockPermission)

      await roleService.deletePermission('perm-1', 'user-1')

      expect(prisma.permission.delete).toHaveBeenCalledWith({ where: { id: 'perm-1' } })
    })

    it('应该在权限被使用时抛出错误', async () => {
      const mockPermission = {
        id: 'perm-1',
        resource: 'sample',
        action: 'read',
        roles: [{ id: 'role-1' }]
      }

      ;(prisma.permission.findUnique as any).mockResolvedValue(mockPermission)

      await expect(roleService.deletePermission('perm-1', 'user-1')).rejects.toThrow('该权限正在被使用，无法删除')
    })
  })
})
