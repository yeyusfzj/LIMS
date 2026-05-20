/**
 * 添加仪器管理权限到现有系统
 * 
 * 使用方法:
 * node add-instrument-permissions.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('开始添加仪器管理权限...')

  // 定义仪器管理权限
  const instrumentPermissions = [
    { resource: 'instrument', action: 'create', description: '创建仪器' },
    { resource: 'instrument', action: 'read', description: '查看仪器' },
    { resource: 'instrument', action: 'update', description: '更新仪器' },
    { resource: 'instrument', action: 'delete', description: '删除仪器' },
    { resource: 'transfer', action: 'create', description: '创建流转申请' },
    { resource: 'transfer', action: 'read', description: '查看流转记录' },
    { resource: 'transfer', action: 'confirm', description: '确认/拒绝流转' },
    { resource: 'maintenance', action: 'create', description: '创建维护记录' },
    { resource: 'maintenance', action: 'read', description: '查看维护记录' },
    { resource: 'maintenance', action: 'update', description: '更新维护记录' },
    { resource: 'maintenance', action: 'delete', description: '删除维护记录' },
    { resource: 'calibration', action: 'create', description: '创建校准记录' },
    { resource: 'calibration', action: 'read', description: '查看校准记录' },
    { resource: 'calibration', action: 'update', description: '更新校准记录' },
    { resource: 'calibration', action: 'delete', description: '删除校准记录' },
    { resource: 'disposal', action: 'create', description: '创建报废申请' },
    { resource: 'disposal', action: 'read', description: '查看报废申请' },
    { resource: 'disposal', action: 'approve', description: '审批报废申请' },
    { resource: 'document', action: 'create', description: '上传文档' },
    { resource: 'document', action: 'read', description: '查看文档' },
    { resource: 'document', action: 'delete', description: '删除文档' }
  ]

  // 创建权限记录
  console.log('创建权限记录...')
  const createdPermissions = []
  for (const perm of instrumentPermissions) {
    const permission = await prisma.permission.upsert({
      where: { 
        resource_action: { 
          resource: perm.resource, 
          action: perm.action 
        } 
      },
      update: {},
      create: {
        resource: perm.resource,
        action: perm.action
      }
    })
    createdPermissions.push(permission)
    console.log(`✓ 创建权限: ${perm.resource}:${perm.action} - ${perm.description}`)
  }

  // 获取所有权限ID
  const getPermissionId = (resource, action) => {
    const perm = createdPermissions.find(p => p.resource === resource && p.action === action)
    return perm?.id
  }

  // 为管理员角色添加所有仪器管理权限
  console.log('\n为管理员角色添加权限...')
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
    include: { permissions: true }
  })

  if (adminRole) {
    const adminPermissionIds = createdPermissions.map(p => ({ id: p.id }))
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: adminPermissionIds
        }
      }
    })
    console.log(`✓ 已为管理员角色添加 ${createdPermissions.length} 个权限`)
  } else {
    console.log('⚠ 未找到管理员角色')
  }

  // 为普通用户角色添加基本权限
  console.log('\n为普通用户角色添加权限...')
  const userRole = await prisma.role.findUnique({
    where: { name: 'user' }
  })

  if (userRole) {
    const userPermissions = [
      { id: getPermissionId('instrument', 'read') },
      { id: getPermissionId('transfer', 'create') },
      { id: getPermissionId('transfer', 'read') }
    ].filter(Boolean)

    await prisma.role.update({
      where: { id: userRole.id },
      data: {
        permissions: {
          connect: userPermissions
        }
      }
    })
    console.log(`✓ 已为普通用户角色添加 ${userPermissions.length} 个权限`)
  } else {
    console.log('⚠ 未找到普通用户角色')
  }

  // 为实验室技术员角色添加权限
  console.log('\n为实验室技术员角色添加权限...')
  const labTechRole = await prisma.role.findUnique({
    where: { name: 'lab_technician' }
  })

  if (labTechRole) {
    const labTechPermissions = [
      { id: getPermissionId('instrument', 'read') },
      { id: getPermissionId('transfer', 'create') },
      { id: getPermissionId('transfer', 'read') },
      { id: getPermissionId('maintenance', 'create') },
      { id: getPermissionId('maintenance', 'read') },
      { id: getPermissionId('calibration', 'read') },
      { id: getPermissionId('document', 'read') }
    ].filter(Boolean)

    await prisma.role.update({
      where: { id: labTechRole.id },
      data: {
        permissions: {
          connect: labTechPermissions
        }
      }
    })
    console.log(`✓ 已为实验室技术员角色添加 ${labTechPermissions.length} 个权限`)
  } else {
    console.log('⚠ 未找到实验室技术员角色')
  }

  // 创建设备管理员角色(如果不存在)
  console.log('\n创建设备管理员角色...')
  const equipmentManagerRole = await prisma.role.upsert({
    where: { name: 'equipment_manager' },
    update: {},
    create: {
      name: 'equipment_manager',
      description: '设备管理员',
      permissions: {
        connect: createdPermissions.map(p => ({ id: p.id }))
      }
    }
  })
  console.log(`✓ 设备管理员角色已创建,拥有所有仪器管理权限`)

  // 创建质量管理员角色(如果不存在)
  console.log('\n创建质量管理员角色...')
  const qualityManagerPermissions = [
    { id: getPermissionId('instrument', 'read') },
    { id: getPermissionId('calibration', 'create') },
    { id: getPermissionId('calibration', 'read') },
    { id: getPermissionId('calibration', 'update') },
    { id: getPermissionId('calibration', 'delete') },
    { id: getPermissionId('maintenance', 'read') },
    { id: getPermissionId('document', 'create') },
    { id: getPermissionId('document', 'read') }
  ].filter(Boolean)

  const qualityManagerRole = await prisma.role.upsert({
    where: { name: 'quality_manager' },
    update: {},
    create: {
      name: 'quality_manager',
      description: '质量管理员',
      permissions: {
        connect: qualityManagerPermissions
      }
    }
  })
  console.log(`✓ 质量管理员角色已创建,拥有校准相关权限`)

  console.log('\n✅ 仪器管理权限添加完成!')
  console.log('\n权限统计:')
  console.log(`- 总共创建 ${createdPermissions.length} 个权限`)
  console.log(`- 管理员角色: 所有权限`)
  console.log(`- 普通用户角色: 查看和流转权限`)
  console.log(`- 实验室技术员角色: 查看、流转、维护权限`)
  console.log(`- 设备管理员角色: 所有仪器管理权限`)
  console.log(`- 质量管理员角色: 校准相关权限`)
}

main()
  .catch((e) => {
    console.error('添加权限失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
