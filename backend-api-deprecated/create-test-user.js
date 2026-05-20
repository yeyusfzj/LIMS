/**
 * 创建测试用户
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('=== 创建测试用户 ===\n');

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: 'test_auditor' }
    });

    if (existingUser) {
      console.log('✅ 测试用户已存在');
      console.log('   用户名: test_auditor');
      console.log('   密码: Test123!@#');
      return;
    }

    // 创建密码哈希
    const passwordHash = await bcrypt.hash('Test123!@#', 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username: 'test_auditor',
        passwordHash,
        email: 'test_auditor@example.com',
        fullName: '测试审核员',
        department: '质量部',
        position: '审核员',
        status: 'ACTIVE'
      }
    });

    console.log('✅ 测试用户创建成功');
    console.log('   用户ID:', user.id);
    console.log('   用户名: test_auditor');
    console.log('   密码: Test123!@#');

  } catch (error) {
    console.error('❌ 创建失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
