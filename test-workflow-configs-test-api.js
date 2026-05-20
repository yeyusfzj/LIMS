/**
 * 测试 workflow-configs-test API
 */

const axios = require('axios');

async function testAPI() {
  console.log('=== 测试 Workflow Configs Test API ===\n');
  
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
    
    // 2. 使用令牌调用测试 API
    console.log('2. 调用测试 API...');
    const response = await axios.get(`${baseURL}/audits/workflow-configs-test`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API 调用成功！');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

testAPI();
