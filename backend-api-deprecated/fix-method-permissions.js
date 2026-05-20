/**
 * 修复检测方法权限
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixMethodPermissions() {
  try {
    console.log('开始修复检测方法权限...')

    // 获取 admin 角色
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    })

    if (!adminRole) {
      console.error('未找到 admin 角色')
      return
    }

    console.log('当前 admin 角色权限数量:', adminRole.permissions.length)

    // 获取 method 相关权限
    const methodPermissions = await prisma.permission.findMany({
      where: {
        resource: 'method'
      }
    })

    console.log('找到的 method 权限:', methodPermissions.map(p => `${p.resource}:${p.action}`))

    // 为 admin 角色添加 method 权限
    for (const permission of methodPermissions) {
      const exists = adminRole.permissions.some(p => p.id === permission.id)
      
      if (!exists) {
        await prisma.role.update({
          where: { id: adminRole.id },
          data: {
            permissions: {
              connect: { id: permission.id }
            }
          }
        })
        console.log(`✓ 已添加权限: ${permission.resource}:${permission.action}`)
      } else {
        console.log(`- 权限已存在: ${permission.resource}:${permission.action}`)
      }
    }

    // 获取 lab_technician 角色
    const labTechRole = await prisma.role.findUnique({
      where: { name: 'lab_technician' },
      include: { permissions: true }
    })

    if (labTechRole) {
      // 为 lab_technician 添加 method:read 和 method:update 权限
      const readPerm = methodPermissions.find(p => p.action === 'read')
      const updatePerm = methodPermissions.find(p => p.action === 'update')

      if (readPerm && !labTechRole.permissions.some(p => p.id === readPerm.id)) {
        await prisma.role.update({
          where: { id: labTechRole.id },
          data: {
            permissions: {
              connect: { id: readPerm.id }
            }
          }
        })
        console.log(`✓ 已为 lab_technician 添加权限: method:read`)
      }

      if (updatePerm && !labTechRole.permissions.some(p => p.id === updatePerm.id)) {
        await prisma.role.update({
          where: { id: labTechRole.id },
          data: {
            permissions: {
              connect: { id: updatePerm.id }
            }
          }
        })
        console.log(`✓ 已为 lab_technician 添加权限: method:update`)
      }
    }

    console.log('\n✓ 权限修复完成！')

  } catch (error) {
    console.error('修复权限失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixMethodPermissions()
