const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAuditPermissions() {
  console.log('开始修复审核权限...')

  try {
    // 获取 admin 角色
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    })

    if (!adminRole) {
      console.error('未找到 admin 角色')
      return
    }

    console.log(`当前 admin 角色有 ${adminRole.permissions.length} 个权限`)

    // 获取所有 audit 权限
    const auditPermissions = await prisma.permission.findMany({
      where: {
        resource: 'audit'
      }
    })

    console.log(`找到 ${auditPermissions.length} 个 audit 权限`)

    // 检查哪些权限需要添加
    const existingPermissionIds = adminRole.permissions.map(p => p.id)
    const permissionsToAdd = auditPermissions.filter(
      p => !existingPermissionIds.includes(p.id)
    )

    if (permissionsToAdd.length === 0) {
      console.log('admin 角色已经拥有所有 audit 权限')
      return
    }

    console.log(`需要添加 ${permissionsToAdd.length} 个权限:`)
    permissionsToAdd.forEach(p => {
      console.log(`  - ${p.resource}:${p.action}`)
    })

    // 添加权限到 admin 角色
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: permissionsToAdd.map(p => ({ id: p.id }))
        }
      }
    })

    console.log('✓ 审核权限已成功添加到 admin 角色')

    // 验证结果
    const updatedRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    })

    console.log(`更新后 admin 角色有 ${updatedRole.permissions.length} 个权限`)

  } catch (error) {
    console.error('修复权限时出错:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixAuditPermissions()
  .then(() => {
    console.log('完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('失败:', error)
    process.exit(1)
  })
