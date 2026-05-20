const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPermissions() {
  try {
    console.log('开始修复管理员报告权限...');
    
    // 获取管理员角色
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' }
    });
    
    if (!adminRole) {
      console.log('未找到管理员角色');
      return;
    }
    
    // 获取 report:sign 和 report:distribute 权限
    const signPerm = await prisma.permission.findUnique({
      where: { resource_action: { resource: 'report', action: 'sign' } }
    });
    
    const distributePerm = await prisma.permission.findUnique({
      where: { resource_action: { resource: 'report', action: 'distribute' } }
    });
    
    if (!signPerm || !distributePerm) {
      console.log('未找到所需权限');
      return;
    }
    
    // 添加权限到管理员角色
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: [
            { id: signPerm.id },
            { id: distributePerm.id }
          ]
        }
      }
    });
    
    console.log('✓ 已添加 report:sign 权限');
    console.log('✓ 已添加 report:distribute 权限');
    console.log('管理员报告权限修复完成！');
    
  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
