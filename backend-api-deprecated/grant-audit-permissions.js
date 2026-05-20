/**
 * 为测试用户授予审核权限
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function grantPermissions() {
  try {
    console.log('=== 授予审核权限 ===\n');

    // 查找测试用户
    const user = await prisma.user.findUnique({
      where: { username: 'test_auditor' }
    });

    if (!user) {
      console.log('❌ 测试用户不存在');
      return;
    }

    console.log('✅ 找到测试用户:', user.username);

    // 查找或创建审核员角色
    let auditorRole = await prisma.role.findUnique({
      where: { name: 'auditor' }
    });

    if (!auditorRole) {
      console.log('创建审核员角色...');
      auditorRole = await prisma.role.create({
        data: {
          name: 'auditor',
          description: '审核员角色'
        }
      });
      console.log('✅ 审核员角色创建成功');
    } else {
      console.log('✅ 审核员角色已存在');
    }

    // 创建审核相关权限
    const permissions = [
      { resource: 'audit', action: 'read' },
      { resource: 'audit', action: 'create' },
      { resource: 'audit', action: 'update' },
      { resource: 'audit', action: 'delete' },
      { resource: 'audit', action: 'review' },
      { resource: 'audit', action: 'approve' }
    ];

    console.log('\n创建权限...');
    for (const perm of permissions) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action
          }
        },
        create: perm,
        update: {}
      });
      console.log(`  ✅ ${perm.resource}:${perm.action}`);

      // 关联权限到角色
      await prisma.role.update({
        where: { id: auditorRole.id },
        data: {
          permissions: {
            connect: { id: permission.id }
          }
        }
      });
    }

    // 将角色分配给用户
    console.log('\n分配角色给用户...');
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: auditorRole.id
        }
      },
      create: {
        userId: user.id,
        roleId: auditorRole.id
      },
      update: {}
    });

    console.log('✅ 权限授予完成');
    console.log('\n用户:', user.username);
    console.log('角色: auditor');
    console.log('权限: audit:read, audit:create, audit:update, audit:delete, audit:review, audit:approve');

  } catch (error) {
    console.error('❌ 授权失败:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

grantPermissions();
