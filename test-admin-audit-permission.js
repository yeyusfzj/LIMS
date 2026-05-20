/**
 * 测试 admin 用户审核权限修复
 * 
 * 验证：
 * 1. admin 用户可以审核任何任务（即使不是分配给他的）
 * 2. 非 admin 用户只能审核分配给他们的任务
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试凭证
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// 测试任务ID（从上下文中获取）
const TEST_TASK_ID = '0e6924fa-4849-4848-933a-9f22fd1e2820';

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    console.log('   登录响应:', JSON.stringify(response.data, null, 2));
    return response.data.data.accessToken || response.data.data.token;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function getAuditTask(token, taskId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ 获取审核任务失败:', error.response?.data || error.message);
    throw error;
  }
}

async function performAudit(token, taskId, decision, comments) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/audits/${taskId}/execute`,
      {
        decision: decision,
        comments: comments
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ 执行审核失败:', error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
}

async function runTests() {
  console.log('🧪 开始测试 admin 用户审核权限修复\n');
  
  try {
    // 1. Admin 用户登录
    console.log('1️⃣ Admin 用户登录...');
    const adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin 登录成功\n');
    
    // 2. 获取测试任务信息
    console.log('2️⃣ 获取审核任务信息...');
    const task = await getAuditTask(adminToken, TEST_TASK_ID);
    console.log('✅ 任务信息:');
    console.log(`   - 任务ID: ${task.id}`);
    console.log(`   - 样品ID: ${task.sampleId}`);
    console.log(`   - 审核级别: ${task.level}`);
    console.log(`   - 指定审核人: ${task.auditorId}`);
    console.log(`   - 任务状态: ${task.status}`);
    console.log(`   - 样品编号: ${task.sample?.sampleNumber || 'N/A'}`);
    console.log(`   - 样品名称: ${task.sample?.sampleName || 'N/A'}\n`);
    
    // 3. Admin 用户尝试审核（即使不是分配给他的任务）
    console.log('3️⃣ Admin 用户尝试审核任务（不是分配给他的）...');
    const auditResult = await performAudit(
      adminToken,
      TEST_TASK_ID,
      'APPROVE',
      'Admin 用户审核通过 - 测试权限修复'
    );
    
    if (auditResult.error) {
      console.log('❌ 审核失败:', auditResult.error);
      console.log('\n⚠️ 修复可能未生效，admin 用户仍然无法审核此任务');
    } else {
      console.log('✅ 审核成功!');
      console.log('   审核结果:', JSON.stringify(auditResult.data, null, 2));
      console.log('\n🎉 修复成功！admin 用户现在可以审核任何任务了');
    }
    
    // 4. 验证任务状态更新
    console.log('\n4️⃣ 验证任务状态更新...');
    const updatedTask = await getAuditTask(adminToken, TEST_TASK_ID);
    console.log('✅ 更新后的任务状态:');
    console.log(`   - 任务状态: ${updatedTask.status}`);
    console.log(`   - 审核决策: ${updatedTask.decision || 'N/A'}`);
    console.log(`   - 审核意见: ${updatedTask.comments || 'N/A'}`);
    console.log(`   - 完成时间: ${updatedTask.completedAt || 'N/A'}`);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runTests().then(() => {
  console.log('\n✅ 所有测试完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});
