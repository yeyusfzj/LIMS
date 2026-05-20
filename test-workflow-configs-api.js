/**
 * 测试 workflow-configs API
 */

const axios = require('axios');

async function testWorkflowConfigsAPI() {
  console.log('=== 测试 Workflow Configs API ===\n');
  
  const baseURL = 'http://localhost:8000/api/v1';
  
  try {
    // 1. 先登录获取令牌
    console.log('1. 登录获取令牌...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('登录成功！');
    console.log('用户信息:', loginResponse.data.data.user);
    const token = loginResponse.data.data.accessToken;
    console.log('访问令牌:', token.substring(0, 50) + '...\n');
    
    // 2. 使用令牌调用 workflow-configs API
    console.log('2. 调用 workflow-configs API...');
    const configsResponse = await axios.get(`${baseURL}/audits/workflow-configs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API 调用成功！');
    console.log('响应状态:', configsResponse.status);
    console.log('响应数据:', JSON.stringify(configsResponse.data, null, 2));
    
    // 检查数据结构
    if (configsResponse.data.data) {
      console.log('\n配置数量:', Array.isArray(configsResponse.data.data) ? configsResponse.data.data.length : 'N/A');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', error.response.headers);
    }
  }
}

testWorkflowConfigsAPI();
