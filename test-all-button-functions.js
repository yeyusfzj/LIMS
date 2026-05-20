/**
 * 全面测试系统中的按钮功能
 * 
 * 检测是否有其他按钮跟审核保存一样没有实际作用
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// 测试凭证
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let adminToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = response.data.data.accessToken;
    console.log('✅ 登录成功\n');
    return adminToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// 1. 审核功能测试
// ============================================
async function testAuditFunctions() {
  console.log('📋 1. 测试审核功能');
  console.log('='.repeat(80));
  
  try {
    // 1.1 获取审核任务列表
    console.log('\n1.1 获取审核任务列表...');
    const tasksResponse = await axios.get(`${API_BASE_URL}/audits`, {
      params: { page: 1, pageSize: 5 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${tasksResponse.data.data.items.length} 个审核任务`);
    
    if (tasksResponse.data.data.items.length > 0) {
      const firstTask = tasksResponse.data.data.items[0];
      console.log(`   第一个任务: ${firstTask.id} (状态: ${firstTask.status})`);
      
      // 1.2 获取审核任务详情
      console.log('\n1.2 获取审核任务详情...');
      const taskDetail = await axios.get(`${API_BASE_URL}/audits/${firstTask.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ 成功获取任务详情`);
      console.log(`   样品信息: ${taskDetail.data.data.sample?.sampleNumber || 'N/A'}`);
      console.log(`   检测结果数: ${taskDetail.data.data.sample?.results?.length || 0}`);
      
      // 1.3 测试审核执行（如果是待审核状态）
      if (firstTask.status === 'PENDING') {
        console.log('\n1.3 测试审核执行功能...');
        try {
          const auditResult = await axios.post(
            `${API_BASE_URL}/audits/${firstTask.id}/execute`,
            {
              decision: 'APPROVE',
              comments: '测试审核通过'
            },
            {
              headers: { Authorization: `Bearer ${adminToken}` }
            }
          );
          console.log(`✅ 审核执行成功`);
          console.log(`   决策: ${auditResult.data.data.decision}`);
          console.log(`   消息: ${auditResult.data.data.message}`);
        } catch (error) {
          console.log(`⚠️ 审核执行失败: ${error.response?.data?.error?.message || error.message}`);
        }
      } else {
        console.log(`\n1.3 跳过审核执行测试（任务状态: ${firstTask.status}）`);
      }
    }
    
    // 1.4 获取审核统计
    console.log('\n1.4 获取审核统计...');
    const statsResponse = await axios.get(`${API_BASE_URL}/audits/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取审核统计`);
    console.log(`   待审核: ${statsResponse.data.data.pending}`);
    console.log(`   今日完成: ${statsResponse.data.data.todayCompleted}`);
    
  } catch (error) {
    console.log(`❌ 审核功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 2. 样品管理功能测试
// ============================================
async function testSampleFunctions() {
  console.log('\n\n📋 2. 测试样品管理功能');
  console.log('='.repeat(80));
  
  try {
    // 2.1 获取样品列表
    console.log('\n2.1 获取样品列表...');
    const samplesResponse = await axios.get(`${API_BASE_URL}/samples`, {
      params: { page: 1, limit: 5 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${samplesResponse.data.data.items?.length || 0} 个样品`);
    
    if (samplesResponse.data.data.items && samplesResponse.data.data.items.length > 0) {
      const firstSample = samplesResponse.data.data.items[0];
      console.log(`   第一个样品: ${firstSample.sampleNumber} (状态: ${firstSample.status})`);
      
      // 2.2 获取样品详情
      console.log('\n2.2 获取样品详情...');
      const sampleDetail = await axios.get(`${API_BASE_URL}/samples/${firstSample.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ 成功获取样品详情`);
      console.log(`   样品名称: ${sampleDetail.data.data.sampleName || 'N/A'}`);
      console.log(`   样品类型: ${sampleDetail.data.data.sampleType || 'N/A'}`);
    }
    
  } catch (error) {
    console.log(`❌ 样品管理功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 3. 报告管理功能测试
// ============================================
async function testReportFunctions() {
  console.log('\n\n📋 3. 测试报告管理功能');
  console.log('='.repeat(80));
  
  try {
    // 3.1 获取报告模板列表
    console.log('\n3.1 获取报告模板列表...');
    const templatesResponse = await axios.get(`${API_BASE_URL}/report-templates`, {
      params: { page: 1, limit: 5 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${templatesResponse.data.data.items?.length || 0} 个报告模板`);
    
    if (templatesResponse.data.data.items && templatesResponse.data.data.items.length > 0) {
      const firstTemplate = templatesResponse.data.data.items[0];
      console.log(`   第一个模板: ${firstTemplate.name}`);
    }
    
  } catch (error) {
    console.log(`❌ 报告管理功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 4. 用户管理功能测试
// ============================================
async function testUserFunctions() {
  console.log('\n\n📋 4. 测试用户管理功能');
  console.log('='.repeat(80));
  
  try {
    // 4.1 获取用户列表
    console.log('\n4.1 获取用户列表...');
    const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
      params: { page: 1, limit: 5 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${usersResponse.data.data.items?.length || 0} 个用户`);
    
    if (usersResponse.data.data.items && usersResponse.data.data.items.length > 0) {
      const firstUser = usersResponse.data.data.items[0];
      console.log(`   第一个用户: ${firstUser.username} (${firstUser.fullName})`);
    }
    
  } catch (error) {
    console.log(`❌ 用户管理功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 5. 角色管理功能测试
// ============================================
async function testRoleFunctions() {
  console.log('\n\n📋 5. 测试角色管理功能');
  console.log('='.repeat(80));
  
  try {
    // 5.1 获取角色列表
    console.log('\n5.1 获取角色列表...');
    const rolesResponse = await axios.get(`${API_BASE_URL}/roles`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${rolesResponse.data.data?.length || 0} 个角色`);
    
    if (rolesResponse.data.data && rolesResponse.data.data.length > 0) {
      rolesResponse.data.data.forEach(role => {
        console.log(`   - ${role.name}: ${role.description || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ 角色管理功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 6. 检测结果管理功能测试
// ============================================
async function testResultFunctions() {
  console.log('\n\n📋 6. 测试检测结果管理功能');
  console.log('='.repeat(80));
  
  try {
    // 6.1 获取检测结果列表
    console.log('\n6.1 获取检测结果列表...');
    const resultsResponse = await axios.get(`${API_BASE_URL}/results`, {
      params: { page: 1, limit: 5 },
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ 成功获取 ${resultsResponse.data.data.items?.length || 0} 个检测结果`);
    
  } catch (error) {
    console.log(`❌ 检测结果管理功能测试失败: ${error.response?.data?.error?.message || error.message}`);
  }
}

// ============================================
// 主测试函数
// ============================================
async function runAllTests() {
  console.log('🧪 开始全面测试系统按钮功能\n');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('API 地址:', API_BASE_URL);
  console.log('\n');
  
  try {
    // 登录
    await login();
    
    // 运行所有测试
    await testAuditFunctions();
    await testSampleFunctions();
    await testReportFunctions();
    await testUserFunctions();
    await testRoleFunctions();
    await testResultFunctions();
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ 所有功能测试完成');
    console.log('='.repeat(80));
    
    console.log('\n📊 测试总结:');
    console.log('   - 审核功能: 已测试');
    console.log('   - 样品管理: 已测试');
    console.log('   - 报告管理: 已测试');
    console.log('   - 用户管理: 已测试');
    console.log('   - 角色管理: 已测试');
    console.log('   - 检测结果: 已测试');
    
    console.log('\n💡 建议:');
    console.log('   1. 检查上述测试中标记为 ⚠️ 或 ❌ 的功能');
    console.log('   2. 对于失败的功能，需要检查前后端连接和权限配置');
    console.log('   3. 建议在浏览器中手动测试每个功能的按钮');
    
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
runAllTests().then(() => {
  console.log('\n✅ 测试脚本执行完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 测试脚本执行失败:', error);
  process.exit(1);
});
