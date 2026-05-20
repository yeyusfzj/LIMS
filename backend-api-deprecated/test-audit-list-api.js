const axios = require('axios');

async function testAuditListAPI() {
  try {
    console.log('测试审核任务列表 API...\n');
    
    // 先登录获取 token
    console.log('1. 登录获取 token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'test_auditor',
      password: 'Test123!@#'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('   ✓ 登录成功\n');
    
    // 获取审核任务列表
    console.log('2. 获取审核任务列表...');
    const listResponse = await axios.get('http://localhost:3000/api/audits', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    });
    
    console.log('   ✓ 请求成功\n');
    console.log('响应数据结构:');
    console.log('─'.repeat(80));
    console.log('状态码:', listResponse.status);
    console.log('响应体:', JSON.stringify(listResponse.data, null, 2));
    console.log('─'.repeat(80));
    
    const data = listResponse.data.data || listResponse.data;
    const items = data.items || [];
    
    console.log(`\n审核任务数量: ${items.length}`);
    
    if (items.length > 0) {
      console.log('\n前3个任务:');
      items.slice(0, 3).forEach((task, index) => {
        console.log(`\n${index + 1}. ID: ${task.id}`);
        console.log(`   级别: ${task.level}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   任务: ${task.task?.nodeName || 'N/A'}`);
        console.log(`   样品: ${task.task?.instance?.sample?.sampleName || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAuditListAPI();
