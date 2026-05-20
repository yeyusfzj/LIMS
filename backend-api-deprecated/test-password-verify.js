/**
 * 测试密码验证
 */

const bcrypt = require('bcrypt');

async function testPasswordVerify() {
  console.log('🔐 测试密码验证\n');
  
  // 测试密码
  const password = 'Admin@123456';
  
  // 生成哈希
  console.log('生成密码哈希...');
  const hash = await bcrypt.hash(password, 12);
  console.log('哈希值:', hash);
  
  // 验证密码
  console.log('\n验证密码...');
  const isValid = await bcrypt.compare(password, hash);
  console.log('验证结果:', isValid ? '✅ 成功' : '❌ 失败');
  
  // 从数据库获取实际哈希并验证
  console.log('\n从数据库获取哈希并验证...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (user) {
      console.log('用户名:', user.username);
      console.log('数据库哈希:', user.passwordHash);
      
      const dbValid = await bcrypt.compare(password, user.passwordHash);
      console.log('数据库密码验证:', dbValid ? '✅ 成功' : '❌ 失败');
      
      // 测试错误密码
      const wrongValid = await bcrypt.compare('wrongpassword', user.passwordHash);
      console.log('错误密码验证:', wrongValid ? '❌ 不应该成功' : '✅ 正确拒绝');
    } else {
      console.log('❌ 未找到 admin 用户');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordVerify().catch(console.error);
