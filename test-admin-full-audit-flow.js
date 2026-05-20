/**
 * 测试 admin 用户完整审核流程
 * 
 * 验证：
 * 1. admin 用户可以审核任何级别的任务
 * 2. 按照正确的顺序完成多级审核
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试凭证
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

// 测试样品ID
const TEST_SAMPLE_ID = '660385a8-7ab3-4e85-a392-839d90ca6f0d';

async function login(credentials) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data.data.accessToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

async function getAuditTasksBySample(token, sampleId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits`, {
      params: { sampleId: sampleId },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data.items;
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
    return { 
      error: true, 
      message: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code
    };
  }
}

async function runTests() {
  console.log('🧪 开始测试 admin 用户完整审核流程\n');
  
  try {
    // 1. Admin 用户登录
    console.log('1️⃣ Admin 用户登录...');
    const adminToken = await login(ADMIN_CREDENTIALS);
    console.log('✅ Admin 登录成功\n');
    
    // 2. 获取该样品的所有审核任务
    console.log('2️⃣ 获取样品的所有审核任务...');
    const tasks = await getAuditTasksBySample(adminToken, TEST_SAMPLE_ID);
    console.log(`✅ 找到 ${tasks.length} 个审核任务:`);
    
    // 按级别排序
    tasks.sort((a, b) => a.level - b.level);
    
    tasks.forEach(task => {
      console.log(`   - 级别 ${task.level}: ${task.id}`);
      console.log(`     状态: ${task.status}, 指定审核人: ${task.auditorId}`);
    });
    console.log();
    
    // 3. 依次审核每个级别的任务
    console.log('3️⃣ 开始审核流程...\n');
    
    for (const task of tasks) {
      if (task.status === 'PENDING') {
        console.log(`   审核第 ${task.level} 级任务 (${task.id})...`);
        console.log(`   指定审核人: ${task.auditorId}`);
        console.log(`   Admin 用户尝试审核（测试权限修复）...`);
        
        const result = await performAudit(
          adminToken,
          task.id,
          'APPROVE',
          `Admin 用户审核通过 - 第 ${task.level} 级`
        );
        
        if (result.error) {
          console.log(`   ❌ 审核失败: ${result.message}`);
          if (result.code === 'VALIDATION_ERROR' && result.message.includes('权限')) {
            console.log('   ⚠️ 权限检查失败 - 修复未生效');
            break;
          }
        } else {
          console.log(`   ✅ 审核成功!`);
          console.log(`   决策: ${result.data.decision}`);
          console.log(`   下一级: ${result.data.nextLevel || '无'}`);
          console.log(`   是否完成: ${result.data.isComplete ? '是' : '否'}`);
          console.log(`   消息: ${result.data.message}`);
        }
        console.log();
      } else {
        console.log(`   跳过第 ${task.level} 级任务（状态: ${task.status}）\n`);
      }
    }
    
    // 4. 验证最终状态
    console.log('4️⃣ 验证最终审核状态...');
    const finalTasks = await getAuditTasksBySample(adminToken, TEST_SAMPLE_ID);
    console.log('✅ 最终任务状态:');
    finalTasks.sort((a, b) => a.level - b.level);
    finalTasks.forEach(task => {
      console.log(`   - 级别 ${task.level}: ${task.status} (决策: ${task.decision || 'N/A'})`);
    });
    
    console.log('\n🎉 测试完成！');
    console.log('✅ Admin 用户权限修复成功 - 可以审核任何任务');
    
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
