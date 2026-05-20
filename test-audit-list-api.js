/**
 * 测试审核任务列表 API
 */

const axios = require('axios');

async function testAuditListAPI() {
  console.log('=== 测试审核任务列表 API ===\n');
  
  const baseURL = 'http://localhost:8000/api/v1';
  
  try {
    // 1. 先登录获取令牌
    console.log('1. 登录获取令牌...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('登录成功！');
    const token = loginResponse.data.data.accessToken;
    console.log('访问令牌:', token.substring(0, 50) + '...\n');
    
    // 2. 使用令牌调用审核任务列表 API
    console.log('2. 调用审核任务列表 API...');
    const auditsResponse = await axios.get(`${baseURL}/audits`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    console.log('API 调用成功！');
    console.log('响应状态:', auditsResponse.status);
    console.log('响应数据:', JSON.stringify(auditsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

testAuditListAPI();
