/**
 * 验证审核任务状态
 * 
 * 检查前10个审核任务的状态是否为待审核
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试凭证
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data.data.accessToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function getAuditTasks(token, page = 1, pageSize = 10) {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      params: { page, pageSize },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ 获取审核任务失败:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🧪 验证审核任务状态\n');
  
  try {
    // 1. Admin 用户登录
    console.log('1️⃣ Admin 用户登录...');
    const adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin 登录成功\n');
    
    // 2. 获取前10个审核任务
    console.log('2️⃣ 获取前10个审核任务...');
    const result = await getAuditTasks(adminToken, 1, 10);
    console.log(`✅ 找到 ${result.items.length} 个审核任务\n`);
    
    // 3. 检查状态
    console.log('3️⃣ 检查任务状态:');
    console.log('=' .repeat(100));
    console.log('序号 | 任务ID                               | 级别 | 状态      | 样品编号          | 审核人');
    console.log('-'.repeat(100));
    
    let pendingCount = 0;
    result.items.forEach((task, index) => {
      const taskIdShort = task.id.substring(0, 8) + '...';
      const sampleNumber = task.sample?.sampleNumber || 'N/A';
      const auditorIdShort = task.auditorId.substring(0, 8) + '...';
      
      console.log(
        `${String(index + 1).padStart(4)} | ${taskIdShort.padEnd(36)} | ${String(task.level).padStart(4)} | ${task.status.padEnd(9)} | ${sampleNumber.padEnd(17)} | ${auditorIdShort}`
      );
      
      if (task.status === 'PENDING') {
        pendingCount++;
      }
    });
    
    console.log('=' .repeat(100));
    console.log(`\n📊 统计:`);
    console.log(`   - 总任务数: ${result.items.length}`);
    console.log(`   - 待审核任务: ${pendingCount}`);
    console.log(`   - 其他状态任务: ${result.items.length - pendingCount}`);
    
    if (pendingCount === result.items.length) {
      console.log('\n✅ 所有任务都已重置为待审核状态！');
    } else if (pendingCount > 0) {
      console.log(`\n⚠️ 有 ${pendingCount} 个任务为待审核状态，${result.items.length - pendingCount} 个任务为其他状态`);
    } else {
      console.log('\n❌ 没有待审核任务');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests().then(() => {
  console.log('\n✅ 验证完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 验证失败:', error);
  process.exit(1);
});
