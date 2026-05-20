const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    // 查询报告相关权限
    const reportPerms = await prisma.permission.findMany({
      where: { resource: 'report' }
    });
    
    console.log('报告相关权限:');
    reportPerms.forEach(p => {
      console.log(`  - ${p.resource}:${p.action} (ID: ${p.id})`);
    });
    
    // 查询管理员角色的权限
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: {
        permissions: true
      }
    });
    
    console.log('\n管理员角色权限:');
    if (adminRole) {
      const reportPermissions = adminRole.permissions.filter(p => p.resource === 'report');
      reportPermissions.forEach(p => {
        console.log(`  - ${p.resource}:${p.action}`);
      });
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();
