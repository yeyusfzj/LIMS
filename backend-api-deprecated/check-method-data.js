/**
 * 检查数据库中的检测方法数据
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('========================================');
  console.log('检查数据库中的检测方法数据');
  console.log('========================================\n');

  try {
    // 查询所有检测方法
    const methods = await prisma.testMethod.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        version: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`数据库中共有 ${methods.length} 条检测方法记录\n`);

    if (methods.length > 0) {
      console.log('检测方法列表:');
      methods.forEach((method, index) => {
        console.log(`\n${index + 1}. ${method.code}`);
        console.log(`   名称: ${method.name}`);
        console.log(`   类别: ${method.category}`);
        console.log(`   版本: ${method.version}`);
        console.log(`   状态: ${method.status}`);
        console.log(`   ID: ${method.id}`);
        console.log(`   创建时间: ${method.createdAt}`);
        console.log(`   更新时间: ${method.updatedAt}`);
      });
    } else {
      console.log('⚠️  数据库中没有检测方法数据！');
      console.log('请运行种子脚本: npm run seed');
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
