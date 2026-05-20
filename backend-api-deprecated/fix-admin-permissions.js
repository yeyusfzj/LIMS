/**
 * 修复管理员权限
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminPermissions() {
  try {
    console.log('🔧 修复管理员权限...\n');

    // 1. 获取管理员角色
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    });

    if (!adminRole) {
      console.error('❌ 找不到管理员角色');
      return;
    }

    console.log('当前管理员权限数量:', adminRole.permissions.length);

    // 2. 获取所有权限
    const allPermissions = await prisma.permission.findMany();
    console.log('系统总权限数量:', allPermissions.length);

    // 3. 清除现有权限并重新分配所有权限
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          set: [] // 先清空
        }
      }
    });

    console.log('✅ 已清空管理员现有权限');

    // 4. 分配所有权限给管理员
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: allPermissions.map(p => ({ id: p.id }))
        }
      }
    });

    console.log('✅ 已为管理员分配所有权限');

    // 5. 验证结果
    const updatedAdminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: { permissions: true }
    });

    console.log('更新后管理员权限数量:', updatedAdminRole.permissions.length);
    console.log('管理员权限列表:');
    updatedAdminRole.permissions.forEach(p => {
      console.log(`  - ${p.resource}:${p.action}`);
    });

    console.log('\n🎉 管理员权限修复完成！');

  } catch (error) {
    console.error('❌ 修复管理员权限失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPermissions();