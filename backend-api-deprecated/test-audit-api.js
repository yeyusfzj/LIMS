const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  validateStatus: function (status) {
    return status < 500; // 接受所有小于 500 的状态码
  }
});

// 登录并获取令牌
async function login() {
  try {
    const response = await api.post('/auth/login', {
      username: 'test_auditor',
      password: 'Test123!@#'
    });
    
    if (response.status === 200 && response.data.data?.accessToken) {
      return response.data.data.accessToken;
    } else {
      console.error('登录失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('登录异常:', error.message);
    return null;
  }
}

async function testAuditAPIs() {
  console.log('=== 测试审核 API ===\n');
  
  try {
    // 先登录获取令牌
    console.log('0. 登录获取认证令牌...');
    const token = await login();
    
    if (!token) {
      console.log('   ✗ 登录失败，无法继续测试');
      return;
    }
    
    console.log('   ✓ 登录成功，获取到令牌');
    
    // 设置认证头
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 1. 测试获取审核任务列表
    console.log('1. 测试获取审核任务列表...');
    try {
      const listResponse = await api.get('/audits', {
        params: {
          page: 1,
          pageSize: 10
        }
      });
      console.log('   状态码:', listResponse.status);
      console.log('   响应数据:', JSON.stringify(listResponse.data, null, 2));
      console.log('   ✓ 获取审核任务列表成功');
      console.log(`   找到 ${listResponse.data.data?.items?.length || 0} 个审核任务`);
      
      if (listResponse.data.data?.items?.length > 0) {
        const firstTask = listResponse.data.data.items[0];
        console.log(`   第一个任务ID: ${firstTask.id}`);
        console.log(`   关联的 taskId: ${firstTask.taskId}`);
        
        // 2. 测试获取单个审核任务详情
        console.log('\n2. 测试获取审核任务详情...');
        try {
          const detailResponse = await api.get(`/audits/${firstTask.id}`);
          console.log('   ✓ 获取审核任务详情成功');
          console.log(`   任务ID: ${detailResponse.data.data.id}`);
          console.log(`   TaskID: ${detailResponse.data.data.taskId}`);
          console.log(`   Level: ${detailResponse.data.data.level}`);
          console.log(`   Status: ${detailResponse.data.data.status}`);
          
          if (detailResponse.data.data.task) {
            console.log(`   关联任务: ${detailResponse.data.data.task.id}`);
            if (detailResponse.data.data.task.sample) {
              console.log(`   关联样品: ${detailResponse.data.data.task.sample.barcode}`);
            }
          }
        } catch (error) {
          console.log(`   ✗ 获取审核任务详情失败: ${error.response?.data?.message || error.message}`);
        }
        
        // 3. 测试按 taskId 筛选
        console.log('\n3. 测试按 taskId 筛选审核任务...');
        try {
          const filterResponse = await api.get('/audits', {
            params: {
              taskId: firstTask.taskId
            }
          });
          console.log('   ✓ 按 taskId 筛选成功');
          console.log(`   找到 ${filterResponse.data.data?.items?.length || 0} 个审核任务`);
        } catch (error) {
          console.log(`   ✗ 按 taskId 筛选失败: ${error.response?.data?.message || error.message}`);
        }
      }
    } catch (error) {
      console.log(`   ✗ 获取审核任务列表失败:`);
      console.log(`      状态码: ${error.response?.status}`);
      console.log(`      错误信息: ${error.response?.data?.message || error.message}`);
      console.log(`      完整响应:`, error.response?.data);
    }
    
    console.log('\n=== API 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testAuditAPIs();
