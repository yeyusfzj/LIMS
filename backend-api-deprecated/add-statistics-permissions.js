/**
 * 添加统计权限并分配给管理员
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addStatisticsPermissions() {
  try {
    console.log('🔧 添加统计权限...\n');

    // 定义统计权限
    const statisticsPermissions = [
      {
        resource: 'statistics',
        action: 'read'
      },
      {
        resource: 'statistics',
        action: 'export'
      },
      {
        resource: 'statistics',
        action: 'manage'
      }
    ];

    // 创建或更新权限
    for (const perm of statisticsPermissions) {
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
      });
      console.log(`✅ 权限已创建/更新: ${perm.resource}:${perm.action}`);
    }

    // 获取管理员角色
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    });

    if (!adminRole) {
      console.log('❌ 未找到管理员角色');
      return;
    }

    console.log(`\n当前管理员权限数量: ${adminRole.permissions.length}`);

    // 获取所有统计权限
    const allStatisticsPermissions = await prisma.permission.findMany({
      where: {
        resource: 'statistics'
      }
    });

    // 为管理员添加统计权限
    for (const permission of allStatisticsPermissions) {
      const exists = adminRole.permissions.some(p => p.id === permission.id);
      if (!exists) {
        await prisma.role.update({
          where: { id: adminRole.id },
          data: {
            permissions: {
              connect: { id: permission.id }
            }
          }
        });
        console.log(`✅ 已为管理员添加权限: ${permission.resource}:${permission.action}`);
      } else {
        console.log(`ℹ️  管理员已有权限: ${permission.resource}:${permission.action}`);
      }
    }

    // 验证结果
    const updatedAdminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    });

    console.log(`\n更新后管理员权限数量: ${updatedAdminRole.permissions.length}`);
    console.log('\n🎉 统计权限添加完成！');

  } catch (error) {
    console.error('❌ 添加统计权限失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStatisticsPermissions();
